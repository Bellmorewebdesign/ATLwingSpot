// Browser smoke test for the dashboard. Needs Playwright with Chromium.
// Run from aws/franchise-dashboard/dashboard:  node tests/ui.smoke.js [screenshot-dir]
//
// Serves web/ with the same Content-Security-Policy CloudFront sends, fakes
// Cognito's API and the dashboard API with page.route, and drives the real
// page: branded sign-in (wrong password, MFA, MFA setup, new password),
// sorting like a file browser, previews, the full message, notes, archive,
// CSV import and export, token refresh, sign-out, pages for long lists, the
// account panel (devices, signing devices out, changing the password), a
// device signed out from elsewhere, the firewall's block, the idle sign-out,
// and the phone layout. Fails on any page error or CSP violation.
//
// WEB_DIR=<folder> runs it against a build (python3 build.py web <folder>).
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const WEB = process.env.WEB_DIR ? path.resolve(process.env.WEB_DIR) : path.join(__dirname, '..', 'web');
const IDP = 'https://cognito-idp.us-east-1.amazonaws.com/';
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; " +
  "connect-src 'self' https://cognito-idp.us-east-1.amazonaws.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; " +
  "require-trusted-types-for 'script'; trusted-types 'none'";
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const NEW_PASSWORD = 'Fresh7start2026';
const SHOTS = process.argv[2];
const PASSWORD = 'Good4pass99';

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/config.js') {
      res.writeHead(200, { 'content-type': 'text/javascript', 'content-security-policy': CSP });
      return res.end(`window.ATL_CONFIG = ${JSON.stringify({ region: 'us-east-1', clientId: 'test-client' })};`);
    }
    const file = path.join(WEB, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
    if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'content-security-policy': CSP });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

function jwt(payload) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'none' })}.${b(payload)}.sig`;
}
// Access tokens carry what the page reads from them: the token id (jti), the
// sign-in id that survives refreshes (origin_jti), the user and sign-in time.
let signIns = 0;
function accessToken(jti, sid, user) {
  return jwt({ jti, origin_jti: sid, username: user, auth_time: Math.floor(Date.now() / 1000) });
}
const tokens = (user, sid) => {
  sid = sid || 'sess-' + (++signIns);
  return {
    AccessToken: accessToken('access-1', sid, user), IdToken: jwt({ 'cognito:username': user }),
    RefreshToken: 'refresh-1', ExpiresIn: 3600, TokenType: 'Bearer',
  };
};
const claimsOf = (header) => JSON.parse(Buffer.from(String(header).replace('Bearer ', '').split('.')[1], 'base64url').toString());

const LONG = 'Hi! I own two restaurants in Savannah and have been a fan since the Hempstead opening. ' +
  'I would like to talk about bringing ATL Wing Spot to coastal Georgia, ideally two or three units over the next two years.\n\n' +
  'Best time to reach me is weekday mornings.';

function seed() {
  return [
    { submissionId: 'a', createdAt: '2026-11-18T23:17:41Z', entity: 'SUB', status: 'new', firstName: 'Dana', lastName: 'Okafor',
      email: 'dana@example.com', phone: '516-555-0142', territory: 'New Jersey', message: 'Interested in two units.' },
    { submissionId: 'b', createdAt: '2026-11-10T15:00:00Z', entity: 'SUB', status: 'new', firstName: 'Lee', lastName: 'Park',
      email: 'lee@example.com', phone: '404-555-0199', territory: 'Georgia', message: LONG },
    { submissionId: 'c', createdAt: '2026-11-15T12:30:00Z', entity: 'SUB', status: 'new', firstName: 'Zoe', lastName: 'Brown',
      email: 'zoe@example.com', phone: '718-555-0123', territory: 'New York', message: '<img src=x onerror=alert(1)>' },
    { submissionId: 'd', createdAt: '2026-09-02T09:05:00Z', entity: 'SUB', status: 'new', firstName: 'Ana', lastName: 'Diaz',
      email: 'ana@example.com', phone: '', territory: 'Texas', message: '' },
  ];
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const problems = [];
  const calls = [];
  let db = seed();
  const history = {};
  // Fake sign-in log, as the API keeps it: id -> row.
  const devices = {};
  const IPHONE = { browser: 'Safari', os: 'iOS', device: 'Phone', city: 'Rahway', region: 'NJ', country: 'US', lastIp: '198.51.100.20', firstIp: '198.51.100.20' };

  async function newPage(viewport, extra) {
    const ctx = await browser.newContext(Object.assign(
      { viewport: viewport || { width: 1366, height: 860 }, acceptDownloads: true }, extra || {}));
    // Gmail compose opens in a new tab: answer it locally, record the URL.
    await ctx.route('https://mail.google.com/**', (route) => {
      calls.push({ gmail: route.request().url() });
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>gmail compose</p>' });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      // The import test sends a deliberate duplicate (409) and the sign-in tests
      // deliberately fail (400); Chrome logs every non-2xx fetch as an error.
      // (and 401/403 where a test makes the API or the firewall refuse on purpose).
      if (m.type() === 'error' && !/status of (409|400|401|403)/.test(m.text())) problems.push('console: ' + m.text());
    });
    page.on('dialog', (d) => { problems.push('unexpected browser dialog: ' + d.message()); d.dismiss(); });

    // ---- fake Cognito
    await page.route(IDP + '**', async (route) => {
      const req = route.request();
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const action = (req.headers()['x-amz-target'] || '').split('.').pop();
      const body = JSON.parse(req.postData() || '{}');
      calls.push({ idp: action, body });
      const ok = (data) => route.fulfill({ status: 200, contentType: 'application/x-amz-json-1.1', headers: cors, body: JSON.stringify(data) });
      const fail = (type, message) => route.fulfill({ status: 400, contentType: 'application/x-amz-json-1.1', headers: cors,
        body: JSON.stringify({ __type: type, message }) });
      assert.equal(body.ClientId === undefined || body.ClientId === 'test-client', true);
      if (action === 'InitiateAuth' && body.AuthFlow === 'USER_PASSWORD_AUTH') {
        const { USERNAME: u, PASSWORD: p } = body.AuthParameters;
        if (u === 'blocked') {
          return route.fulfill({ status: 403, contentType: 'application/x-amz-json-1.1', headers: cors,
            body: JSON.stringify({ __type: 'ForbiddenException', message: 'Request not allowed due to WAF block.' }) });
        }
        if (p !== PASSWORD && p !== NEW_PASSWORD) return fail('NotAuthorizedException', 'Incorrect username or password.');
        if (u === 'ATLWingSpotAdmin') return ok({ AuthenticationResult: tokens(u) });
        if (u === 'mfa-user') return ok({ ChallengeName: 'SOFTWARE_TOKEN_MFA', Session: 's-mfa', ChallengeParameters: { USER_ID_FOR_SRP: u } });
        if (u === 'setup-user') return ok({ ChallengeName: 'MFA_SETUP', Session: 's-setup', ChallengeParameters: { USER_ID_FOR_SRP: u } });
        if (u === 'new-user') return ok({ ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: 's-new', ChallengeParameters: { USER_ID_FOR_SRP: u } });
        return fail('NotAuthorizedException', 'Incorrect username or password.');
      }
      if (action === 'InitiateAuth' && body.AuthFlow === 'REFRESH_TOKEN_AUTH') {
        assert.equal(body.AuthParameters.REFRESH_TOKEN, 'refresh-1');
        // Same sign-in, new access token: origin_jti carries over.
        const sid = 'sess-' + signIns;
        return ok({ AuthenticationResult: { AccessToken: accessToken('access-2', sid, 'ATLWingSpotAdmin'),
          IdToken: jwt({ 'cognito:username': 'ATLWingSpotAdmin' }), ExpiresIn: 3600 } });
      }
      if (action === 'RespondToAuthChallenge') {
        const r = body.ChallengeResponses;
        if (body.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
          if (r.SOFTWARE_TOKEN_MFA_CODE !== '123456') return fail('CodeMismatchException', 'Invalid code received for user');
          return ok({ AuthenticationResult: tokens(r.USERNAME) });
        }
        if (body.ChallengeName === 'MFA_SETUP') {
          assert.equal(body.Session, 's-verified');
          return ok({ AuthenticationResult: tokens(r.USERNAME) });
        }
        if (body.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
          assert.equal(r.NEW_PASSWORD, 'Brand9newpass');
          return ok({ AuthenticationResult: tokens(r.USERNAME) });
        }
      }
      if (action === 'AssociateSoftwareToken') return ok({ SecretCode: 'JBSWY3DPEHPK3PXPJBSWY3DP', Session: 's-assoc' });
      if (action === 'VerifySoftwareToken') {
        assert.equal(body.Session, 's-assoc');
        return body.UserCode === '654321' ? ok({ Status: 'SUCCESS', Session: 's-verified' }) : fail('EnableSoftwareTokenMFAException', 'Code mismatch');
      }
      if (action === 'RevokeToken') return ok({});
      if (action === 'ChangePassword') {
        assert.ok(body.AccessToken, 'ChangePassword sends the access token');
        if (body.PreviousPassword !== PASSWORD) return fail('NotAuthorizedException', 'Incorrect username or password.');
        return ok({});
      }
      if (action === 'GlobalSignOut') return ok({});
      return fail('InvalidParameterException', 'unexpected ' + action);
    });

    // ---- fake dashboard API
    await page.route(`${base}/api/**`, async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const auth = req.headers().authorization;
      const claims = claimsOf(auth);
      assert.ok(claims.jti === 'access-1' || claims.jti === 'access-2', 'API call carries the access token');
      calls.push({ api: req.method() + ' ' + u.pathname + u.search, token: claims.jti, sid: claims.origin_jti,
        body: req.postData() && JSON.parse(req.postData()) });
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

      // The sign-in log: every call records its device; a signed-out device is refused.
      const sid = claims.origin_jti;
      const row = devices[sid] || (devices[sid] = { id: sid, username: claims.username, browser: 'Chrome', os: 'Windows',
        device: 'Computer', city: 'Bellmore', region: 'NY', country: 'US', firstIp: '203.0.113.7', lastIp: '203.0.113.7',
        signedInAt: new Date().toISOString(), status: 'active' });
      if (row.status === 'signed_out') return json(401, { error: 'session_revoked', message: 'This device was signed out.' });
      row.lastSeenAt = new Date().toISOString();
      const sm = u.pathname.match(/^\/api\/sessions(?:\/([^/]+))?$/);
      if (sm) {
        const target = sm[1] && decodeURIComponent(sm[1]);
        const signOut = (r) => { r.status = 'signed_out'; r.revokedAt = new Date().toISOString(); r.revokedBy = claims.username; };
        if (req.method() === 'GET' && !target) {
          return json(200, { sessions: Object.values(devices).map((d) => Object.assign({}, d, { current: d.id === sid })) });
        }
        if (req.method() === 'DELETE' && target) {
          if (!devices[target]) return json(404, { message: 'No such device.' });
          signOut(devices[target]);
          return json(200, { revoked: target, current: target === sid });
        }
        if (req.method() === 'POST' && target === 'revoke-others') {
          const others = Object.values(devices).filter((d) => d.id !== sid && d.status === 'active');
          others.forEach(signOut);
          return json(200, { revoked: others.length });
        }
      }
      const m = u.pathname.match(/^\/api\/submissions(?:\/([^/]+))?$/);
      const id = m && m[1] && decodeURIComponent(m[1]);
      if (req.method() === 'GET' && !id) {
        const archived = u.searchParams.get('archived') === '1';
        return json(200, { items: db.filter((s) => !!s.archivedAt === archived), nextCursor: null });
      }
      if (req.method() === 'GET' && id) {
        const s = db.find((x) => x.submissionId === id);
        return s ? json(200, { submission: s, history: history[id] || [] }) : json(404, { message: 'No such submission.' });
      }
      if (req.method() === 'PATCH' && id) {
        const body = JSON.parse(req.postData());
        const s = db.find((x) => x.submissionId === id);
        const changes = {};
        if ('notes' in body) { changes.notes = { from: s.notes, to: body.notes }; if (body.notes) s.notes = body.notes; else delete s.notes; }
        if ('archived' in body) { changes.archived = { from: !!s.archivedAt, to: body.archived }; if (body.archived) s.archivedAt = '2026-11-19T00:00:00Z'; else delete s.archivedAt; }
        (history[id] = history[id] || []).unshift({ at: '2026-11-19T01:00:00Z#abcd', actor: 'ATLWingSpotAdmin', action: 'update', changes });
        return json(200, { submission: s });
      }
      if (req.method() === 'POST' && !id) {
        const body = JSON.parse(req.postData());
        if (db.some((x) => x.email === body.email && body.createdAt && x.createdAt.startsWith(body.createdAt.slice(0, 10)))) {
          return json(409, { error: 'duplicate', message: 'That submission is already in the list.' });
        }
        const s = Object.assign({ submissionId: 'n' + db.length, entity: 'SUB', status: 'new', source: 'import' }, body,
          { createdAt: body.createdAt.length === 10 ? body.createdAt + 'T12:00:00Z' : body.createdAt });
        db.push(s);
        return json(201, { submission: s });
      }
      return json(404, { message: 'no route' });
    });
    return { ctx, page };
  }

  async function signIn(page, user, pass) {
    await page.fill('#username', user);
    await page.fill('#password', pass);
    await page.click('#signin-form button[type=submit]');
  }
  const names = (page) => page.$$eval('#rows tr td.c-name', (tds) => tds.map((t) => t.textContent));
  const shot = async (page, name, opts) => { if (SHOTS) await page.screenshot(Object.assign({ path: path.join(SHOTS, name + '.png') }, opts)); };

  // ================================================================ desktop
  {
    const { ctx, page } = await newPage();
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');

    // Real brand assets load, under the strict CSP.
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.$eval('.signin-logo', (img) => img.complete && img.naturalWidth > 0), 'logo loads');
    assert.ok(await page.evaluate(() => document.fonts.check('40px Anton')), 'Anton loads');
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Manrope Variable"')), 'Manrope loads');
    for (const href of ['brand/favicon-32.png', 'brand/favicon-512.png', 'brand/apple-touch-icon.png']) {
      assert.equal((await page.request.get(base + '/' + href)).status(), 200, href);
    }
    assert.equal(await page.getAttribute('link[rel=icon][sizes="32x32"]', 'href'), 'brand/favicon-32.png');
    await page.waitForTimeout(200);
    await shot(page, 'signin');

    // Discreet: a neutral tab title and heading, robots told to stay out.
    assert.equal(await page.title(), 'Sign in');
    assert.equal(await page.textContent('.signin h1'), 'Sign in.');
    assert.match(await page.getAttribute('meta[name=robots]', 'content'), /noindex.*nofollow.*noarchive.*nosnippet/);
    const robots = await page.request.get(base + '/robots.txt');
    assert.equal(await robots.text(), 'User-agent: *\nDisallow: /\n');

    // Empty, then wrong password.
    await page.click('#signin-form button[type=submit]');
    assert.equal(await page.textContent('#signin-error'), 'Enter your username and password.');
    await signIn(page, 'ATLWingSpotAdmin', 'wrong-password-1');
    await page.waitForSelector('#signin-error:has-text("Wrong username or password.")');
    assert.equal(await page.inputValue('#password'), '', 'password cleared after a failed try');
    assert.equal(new URL(page.url()).search, '', 'nothing in the URL');

    // Right password.
    await signIn(page, 'ATLWingSpotAdmin', PASSWORD);
    await page.waitForSelector('#app:not([hidden])');
    const init = calls.filter((c) => c.idp === 'InitiateAuth').pop().body;
    assert.deepEqual(init, { AuthFlow: 'USER_PASSWORD_AUTH', ClientId: 'test-client',
      AuthParameters: { USERNAME: 'ATLWingSpotAdmin', PASSWORD } });
    assert.equal(await page.inputValue('#password'), '', 'password not left in the form');
    assert.equal(await page.textContent('#who'), 'ATLWingSpotAdmin');
    await page.waitForSelector('#rows tr');
    assert.equal(await page.textContent('#count'), '4 leads');
    assert.equal(await page.title(), 'Leads');
    assert.equal(await page.isVisible('#pager'), false, 'no page controls for a short list');

    // Newest first by default.
    assert.deepEqual(await names(page), ['Dana Okafor', 'Zoe Brown', 'Lee Park', 'Ana Diaz']);
    assert.equal(await page.getAttribute('th.c-date', 'aria-sort'), 'descending');
    assert.equal(await page.inputValue('#sort'), 'createdAt:desc');

    // Preview column: one line of the message.
    assert.match(await page.textContent('#rows tr:has-text("Lee Park") td.c-msg'), /^Hi! I own two restaurants in Savannah/);
    assert.equal(await page.textContent('#rows tr:has-text("Ana Diaz") td.c-msg'), 'No message');
    await shot(page, 'list');

    // Sort like a file browser: click a header, click again to flip.
    await page.click('th.c-name button');
    assert.deepEqual(await names(page), ['Ana Diaz', 'Dana Okafor', 'Lee Park', 'Zoe Brown']);
    assert.equal(await page.getAttribute('th.c-name', 'aria-sort'), 'ascending');
    assert.equal(await page.getAttribute('th.c-date', 'aria-sort'), null);
    await page.click('th.c-name button');
    assert.deepEqual(await names(page), ['Zoe Brown', 'Lee Park', 'Dana Okafor', 'Ana Diaz']);
    assert.equal(await page.inputValue('#sort'), 'name:desc');
    await page.click('th.c-date button');
    assert.equal(await page.getAttribute('th.c-date', 'aria-sort'), 'descending', 'dates start newest first');
    await page.click('th.c-state button');
    assert.deepEqual(await names(page), ['Lee Park', 'Dana Okafor', 'Zoe Brown', 'Ana Diaz']);   // Georgia, NJ, NY, Texas
    await page.selectOption('#sort', 'createdAt:asc');
    assert.deepEqual(await names(page), ['Ana Diaz', 'Lee Park', 'Zoe Brown', 'Dana Okafor']);
    assert.equal(await page.getAttribute('th.c-date', 'aria-sort'), 'ascending');

    // The choice survives a reload (and so does the session).
    await page.reload();
    await page.waitForSelector('#rows tr');
    assert.equal(await page.inputValue('#sort'), 'createdAt:asc');
    assert.deepEqual(await names(page), ['Ana Diaz', 'Lee Park', 'Zoe Brown', 'Dana Okafor']);
    await page.selectOption('#sort', 'createdAt:desc');

    // Reply straight from the list: Gmail compose in a new tab, addressed,
    // titled and quoting the message. The lead itself does not open.
    const [gmail] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('#rows tr:has-text("Lee Park") .reply'),
    ]);
    await gmail.waitForLoadState();
    const g = new URL(gmail.url());
    assert.equal(g.hostname, 'mail.google.com');
    assert.equal(g.searchParams.get('view'), 'cm');
    assert.equal(g.searchParams.get('to'), 'lee@example.com');
    assert.equal(g.searchParams.get('su'), 'Re: Your ATL Wing Spot franchise inquiry');
    assert.match(g.searchParams.get('body'), /^Hi Lee,\n[\s\S]*Lee Park wrote:\n> Hi! I own two restaurants/);
    assert.equal(await gmail.evaluate(() => window.opener), null, 'no window.opener handed to Gmail');
    await gmail.close();
    assert.equal(await page.isVisible('#detail'), false, 'Reply does not open the lead');
    // Rows without an email get no Reply button; every other row has one.
    assert.equal(await page.locator('#rows tr .reply').count(), 4);

    // Search.
    await page.fill('#search', 'savannah');
    assert.deepEqual(await names(page), ['Lee Park']);
    assert.equal(await page.textContent('#count'), '1 of 4 leads match');
    await page.fill('#search', '');

    // Full message; applicant text is shown as text, never run as HTML.
    await page.click('#rows tr:has-text("Lee Park")');
    await page.waitForSelector('#detail[open]');
    assert.equal(await page.textContent('#d-message'), LONG);
    assert.match(await page.getAttribute('#d-reply-btn', 'href'), /^mailto:lee@example\.com\?subject=Re%3A%20Your%20ATL/);
    assert.equal(await page.getAttribute('#d-email a', 'href'), 'mailto:lee@example.com');
    assert.equal(await page.getAttribute('#d-call-btn', 'href'), 'tel:4045550199');
    const [gmail2] = await Promise.all([page.context().waitForEvent('page'), page.click('#d-reply-btn')]);
    await gmail2.waitForLoadState();
    assert.equal(new URL(gmail2.url()).searchParams.get('to'), 'lee@example.com');
    await gmail2.close();
    await page.fill('#d-notes', 'Strong candidate, call Monday.');
    await page.click('#d-form button[type=submit]');
    // History sits in a collapsed <details>, so it is attached but not visible.
    await page.waitForSelector('#d-history li:has-text("Notes updated")', { state: 'attached' });
    assert.deepEqual(calls.filter((c) => c.api && c.api.startsWith('PATCH')).pop().body, { notes: 'Strong candidate, call Monday.' });
    await page.waitForTimeout(350);
    await shot(page, 'detail');
    await page.click('#detail .close');

    await page.click('#rows tr:has-text("Zoe Brown")');
    await page.waitForSelector('#detail[open]');
    assert.equal(await page.textContent('#d-message'), '<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('#d-message img').count(), 0);

    // Archive, see it under Archived, bring it back.
    await page.click('#d-archive');
    await page.waitForSelector('#d-archive:has-text("Move back to leads")');
    await page.click('#detail .close');
    assert.deepEqual(await names(page), ['Dana Okafor', 'Lee Park', 'Ana Diaz']);
    await page.click('#view-archived');
    await page.waitForSelector('#archived-banner:not([hidden])');
    await page.waitForSelector('#rows tr:has-text("Zoe Brown")');
    assert.equal(await page.textContent('#count'), '1 archived lead');
    await page.click('#rows tr:has-text("Zoe Brown")');
    await page.click('#d-archive');
    await page.waitForSelector('#d-archive:has-text("Archive")');
    await page.click('#detail .close');
    await page.click('#back-to-inbox');
    assert.equal(await page.textContent('#count'), '4 leads');

    // Import: two good rows, one duplicate, one bad row.
    const csv = [
      'First Name,Last Name,Email,Phone,State,Date Received,Message',
      'Ray,Cole,ray@example.com,+1 404 555 0111,Georgia,3/14/2026,Looking at Atlanta',
      'Sam,Ito,sam@example.com,,Texas,2026-02-01,',
      'Ana,Diaz,ana@example.com,,,9/2/2026,',
      'No,Email,,,,,',
    ].join('\n');
    await page.click('#import');
    await page.setInputFiles('#import-file', { name: 'old.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForSelector('#import-preview:has-text("3 rows ready to import")');
    await page.click('#import-go');
    await page.waitForSelector('#import-result:has-text("2 imported")');
    assert.match(await page.textContent('#import-result'), /1 already in the list/);
    await page.click('#import-dialog .close');
    await page.waitForSelector('#rows tr:has-text("Ray Cole")');

    // Export what is on screen.
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const exported = fs.readFileSync(await download.path(), 'utf8').split('\r\n');
    assert.equal(exported[0], '﻿Received,First name,Last name,Email,Phone,State,Message,Notes,Source,ID');
    assert.ok(exported.some((l) => l.includes("'+1 404 555 0111")), 'phone guarded against formula injection');

    // An expired access token is refreshed quietly.
    await page.evaluate(() => sessionStorage.setItem('expires_at', '1'));
    await page.click('#refresh');
    await page.waitForFunction(() => document.getElementById('count').textContent.includes('leads'));
    assert.ok(calls.some((c) => c.idp === 'InitiateAuth' && c.body.AuthFlow === 'REFRESH_TOKEN_AUTH'));
    const last = calls.filter((c) => c.api).pop();
    assert.equal(last.token, 'access-2');
    assert.equal(devices[last.sid].status, 'active', 'a refresh is the same sign-in, not a new device');

    // Sign out: revoked with Cognito, marked in the sign-in log, forgotten here.
    await page.click('#signout');
    await page.waitForSelector('#signin:not([hidden])');
    assert.ok(calls.some((c) => c.idp === 'RevokeToken' && c.body.Token === 'refresh-1'));
    await page.waitForFunction(() => true);
    assert.ok(calls.some((c) => c.api === 'DELETE /api/sessions/' + last.sid), 'sign-out recorded in the log');
    assert.equal(devices[last.sid].status, 'signed_out');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('access_token')), null);
    await ctx.close();
  }

  // ================================================================ extra sign-in steps
  {
    const { ctx, page } = await newPage();
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');

    // The firewall's per-IP limit on sign-in calls shows a plain message.
    await signIn(page, 'blocked', PASSWORD);
    await page.waitForSelector('#signin-error:has-text("Too many sign-in attempts from this network")');

    // Authenticator code: wrong, then right.
    await signIn(page, 'mfa-user', PASSWORD);
    await page.waitForSelector('#challenge-form:not([hidden])');
    assert.match(await page.textContent('#challenge-text'), /6-digit code/);
    await page.fill('#challenge-input', '000000');
    await page.click('#challenge-form button[type=submit]');
    await page.waitForSelector('#challenge-error:has-text("That code did not work")');
    await page.fill('#challenge-input', '123 456');
    await page.click('#challenge-form button[type=submit]');
    await page.waitForSelector('#app:not([hidden])');
    const mfa = calls.filter((c) => c.idp === 'RespondToAuthChallenge').pop().body;
    assert.deepEqual(mfa, { ChallengeName: 'SOFTWARE_TOKEN_MFA', ClientId: 'test-client', Session: 's-mfa',
      ChallengeResponses: { USERNAME: 'mfa-user', SOFTWARE_TOKEN_MFA_CODE: '123456' } });
    await page.click('#signout');

    // First-time authenticator setup.
    await signIn(page, 'setup-user', PASSWORD);
    await page.waitForSelector('#challenge-key:not([hidden])');
    assert.equal(await page.textContent('#challenge-key'), 'JBSW Y3DP EHPK 3PXP JBSW Y3DP');
    await page.fill('#challenge-input', '654321');
    await page.click('#challenge-form button[type=submit]');
    await page.waitForSelector('#app:not([hidden])');
    await page.click('#signout');

    // New password required; "Start over" returns to the first form.
    await signIn(page, 'new-user', PASSWORD);
    await page.waitForSelector('#challenge-form:not([hidden])');
    await page.click('#challenge-cancel');
    await page.waitForSelector('#signin-form:not([hidden])');
    await signIn(page, 'new-user', PASSWORD);
    await page.waitForSelector('#challenge-form:not([hidden])');
    assert.equal(await page.getAttribute('#challenge-input', 'type'), 'password');
    await page.fill('#challenge-input', 'short1');
    await page.click('#challenge-form button[type=submit]');
    assert.match(await page.textContent('#challenge-error'), /10 characters/);
    await page.fill('#challenge-input', 'Brand9newpass');
    await page.click('#challenge-form button[type=submit]');
    await page.waitForSelector('#app:not([hidden])');
    await ctx.close();
  }

  // ================================================================ long lists, account, devices
  {
    db = seed();
    for (let i = 0; i < 116; i++) {
      const at = new Date(Date.UTC(2026, 9, 1, 12) - i * 7 * 3600e3).toISOString().replace(/\.\d{3}Z$/, 'Z');
      db.push({ submissionId: 'bulk' + i, createdAt: at, entity: 'SUB', status: 'new', firstName: 'Lead',
        lastName: String(i + 1).padStart(3, '0'), email: `lead${i + 1}@example.com`, phone: '555-0' + (100 + i),
        territory: i % 2 ? 'Georgia' : 'New York', message: 'Bulk lead ' + (i + 1) });
    }
    for (const k of Object.keys(devices)) delete devices[k];
    const earlier = new Date(Date.now() - 3 * 3600e3).toISOString();
    devices['sess-iphone'] = Object.assign({ id: 'sess-iphone', username: 'ATLWingSpotAdmin', signedInAt: earlier,
      lastSeenAt: earlier, status: 'active' }, IPHONE);
    devices['sess-tablet'] = { id: 'sess-tablet', username: 'ATLWingSpotAdmin', browser: 'Chrome', os: 'Android', device: 'Tablet',
      city: 'Hempstead', region: 'NY', country: 'US', firstIp: '192.0.2.40', lastIp: '192.0.2.41', signedInAt: earlier,
      lastSeenAt: earlier, status: 'active' };

    const { ctx, page } = await newPage();
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');
    await signIn(page, 'ATLWingSpotAdmin', PASSWORD);
    await page.waitForSelector('#rows tr');

    // Pages: 120 leads, 50 to a page. Sort and search cover every lead.
    assert.equal(await page.textContent('#count'), '120 leads · showing 1–50');
    assert.equal(await page.locator('#rows tr').count(), 50);
    assert.equal(await page.textContent('#page-info'), 'Page 1 of 3');
    assert.ok(await page.isDisabled('#page-prev'));
    await page.click('#page-next');
    assert.equal(await page.textContent('#count'), '120 leads · showing 51–100');
    await page.click('#page-next');
    assert.equal(await page.locator('#rows tr').count(), 20);
    assert.ok(await page.isDisabled('#page-next'));
    await shot(page, 'pages', { fullPage: true });
    await page.selectOption('#sort', 'createdAt:asc');
    assert.equal(await page.textContent('#page-info'), 'Page 1 of 3', 'a new sort starts at page 1');
    assert.equal((await names(page))[0], 'Lead 116', 'oldest of all 120, not of the page');
    await page.fill('#search', 'lead116@');
    assert.deepEqual(await names(page), ['Lead 116']);
    assert.equal(await page.isVisible('#pager'), false);
    await page.fill('#search', 'georgia');
    assert.equal(await page.textContent('#count'), '59 of 120 leads match · showing 1–50');
    await page.fill('#search', '');
    await page.selectOption('#page-size', '100');
    assert.equal(await page.textContent('#page-info'), 'Page 1 of 2');
    await page.reload();
    await page.waitForSelector('#rows tr');
    assert.equal(await page.inputValue('#page-size'), '100', 'per-page choice remembered');
    await page.selectOption('#page-size', '50');
    await page.selectOption('#sort', 'createdAt:desc');

    // Account: every signed-in device, with IP, place, browser and OS.
    await page.click('#account-btn');
    await page.waitForSelector('#account[open]');
    await page.waitForSelector('#device-list li.device');
    assert.equal(await page.locator('#device-list li.device').count(), 3);
    const mine = page.locator('#device-list li.device.is-current');
    assert.match(await mine.textContent(), /Chrome on Windows/);
    assert.match(await mine.textContent(), /This device/);
    assert.match(await mine.textContent(), /Computer · Bellmore, NY, US · IP\u00a0203\.0\.113\.7/);
    const iphone = page.locator('#device-list li.device:has-text("Safari on iOS")');
    assert.match(await iphone.textContent(), /Phone · Rahway, NJ, US · IP\u00a0198\.51\.100\.20/);
    assert.match(await page.textContent('#device-list li.device:has-text("Chrome on Android")'),
      /IP\u00a0192\.0\.2\.41 \(signed in from 192\.0\.2\.40\)/);
    await page.waitForTimeout(300);
    await shot(page, 'account');

    // Sign one device out, then every other one.
    assert.match(await page.textContent('#device-list > li.device:first-child'), /This device/, 'this device listed first');
    await iphone.locator('button:has-text("Sign out")').click();
    await page.waitForSelector('#device-list li.past summary:has-text("Earlier sign-ins (1)")');
    await page.click('#device-list li.past summary');
    await page.waitForSelector('#device-list li.device:has-text("Safari on iOS"):has-text("Signed out")');
    assert.ok(calls.some((c) => c.api === 'DELETE /api/sessions/sess-iphone'));
    await page.click('#revoke-others');
    await page.waitForSelector('#device-list li.past summary:has-text("Earlier sign-ins (2)")');
    assert.equal(await page.locator('#device-list > li.device').count(), 1, 'only this device still active');
    await page.click('#device-list li.past summary');
    await page.waitForSelector('#device-list li.device:has-text("Chrome on Android"):has-text("Signed out")');
    assert.ok(await page.isDisabled('#revoke-others'), 'nothing left to sign out');
    assert.equal(devices['sess-tablet'].status, 'signed_out');

    // Change password: checked here first, then by Cognito.
    await page.fill('#pw-current', 'not-it-12345');
    await page.fill('#pw-new', NEW_PASSWORD);
    await page.fill('#pw-confirm', NEW_PASSWORD);
    await page.click('#password-form button[type=submit]');
    await page.waitForSelector('#pw-error:has-text("Your current password is not right.")');
    await page.fill('#pw-current', PASSWORD);
    await page.fill('#pw-confirm', 'Different12345');
    await page.click('#password-form button[type=submit]');
    assert.equal(await page.textContent('#pw-error'), 'The two new passwords do not match.');
    await page.fill('#pw-new', 'short1');
    await page.fill('#pw-confirm', 'short1');
    await page.click('#password-form button[type=submit]');
    assert.match(await page.textContent('#pw-error'), /10 characters/);
    await page.fill('#pw-new', NEW_PASSWORD);
    await page.fill('#pw-confirm', NEW_PASSWORD);
    const sidBefore = calls.filter((c) => c.api).pop().sid;
    await page.click('#password-form button[type=submit]');
    await page.waitForSelector('#signin-error:has-text("Password changed. Sign in with your new password.")');
    const change = calls.filter((c) => c.idp === 'ChangePassword').pop().body;
    assert.equal(change.PreviousPassword, PASSWORD);
    assert.equal(change.ProposedPassword, NEW_PASSWORD);
    assert.ok(calls.some((c) => c.idp === 'GlobalSignOut'), 'every refresh token revoked with Cognito');
    assert.ok(calls.some((c) => c.api === 'DELETE /api/sessions/' + sidBefore));
    assert.equal(devices[sidBefore].status, 'signed_out');
    assert.equal(await page.title(), 'Sign in');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('access_token')), null);
    assert.equal(await page.inputValue('#pw-new'), '', 'password fields cleared');

    // Signed out from another device: the very next request is refused.
    await signIn(page, 'ATLWingSpotAdmin', NEW_PASSWORD);
    await page.waitForSelector('#rows tr');
    devices[calls.filter((c) => c.api).pop().sid].status = 'signed_out';
    await page.click('#refresh');
    await page.waitForSelector('#signin-error:has-text("This device was signed out. Sign in again.")');
    assert.equal(await page.isVisible('#app'), false);
    await ctx.close();
  }

  // ================================================================ idle sign-out
  {
    db = seed();
    const { ctx, page } = await newPage();
    await page.clock.install();
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');
    await signIn(page, 'ATLWingSpotAdmin', PASSWORD);
    await page.waitForSelector('#rows tr');
    await page.clock.fastForward('58:00');
    assert.equal(await page.isVisible('#app'), true, 'still signed in after 58 quiet minutes');
    await page.mouse.click(5, 300);                       // activity resets the clock
    await page.clock.fastForward('58:00');
    assert.equal(await page.isVisible('#app'), true, 'activity keeps the session');
    await page.clock.fastForward('03:00');
    await page.waitForSelector('#signin-error:has-text("Signed out after an hour without activity.")');
    await ctx.close();
  }

  // ================================================================ phone
  {
    db = seed();
    const { ctx, page } = await newPage({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await shot(page, 'signin-phone');
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, 'sign-in: no sideways scroll, got ' + overflow);

    await signIn(page, 'ATLWingSpotAdmin', PASSWORD);
    await page.waitForSelector('#rows tr');
    assert.equal(await page.isVisible('.list thead'), false, 'cards, not a table');
    assert.equal(await page.isVisible('#sort'), true, 'sort menu on phones');
    assert.match(await page.textContent('#rows tr:has-text("Lee Park") td.c-meta'), /Georgia · 404-555-0199/);
    assert.ok(await page.isVisible('#rows tr:has-text("Lee Park") td.c-msg'), 'message preview on the card');
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, 'list: no sideways scroll, got ' + overflow);
    // Reply on the card: hands a mailto: draft to the phone's mail app (no
    // Gmail tab) and does not open the lead.
    assert.ok(await page.isVisible('#rows tr:has-text("Lee Park") .reply'));
    const href = await page.getAttribute('#rows tr:has-text("Lee Park") .reply', 'href');
    assert.match(href, /^mailto:lee@example\.com\?subject=/);
    const followed = await page.evaluate(() => new Promise((resolve) => {
      // On the button itself (the page's handler stops the click bubbling to
      // the row), registered after the page's, so it runs second. It reads
      // whether the page let the mailto: through, then stops the real
      // navigation so the test browser does not try to open a mail app.
      const a = [...document.querySelectorAll('#rows tr')].find((tr) => tr.textContent.includes('Lee Park')).querySelector('.reply');
      a.addEventListener('click', (e) => { const p = e.defaultPrevented; e.preventDefault(); resolve(p); }, { once: true });
      a.click();
    }));
    assert.equal(followed, false, 'phone: the mailto link is followed, not swapped for Gmail');
    assert.equal(await page.isVisible('#detail'), false);
    await page.selectOption('#sort', 'name:asc');
    assert.deepEqual(await names(page), ['Ana Diaz', 'Dana Okafor', 'Lee Park', 'Zoe Brown']);
    await page.selectOption('#sort', 'createdAt:desc');
    await shot(page, 'list-phone');

    // A lead opens full screen, with a back arrow.
    await page.click('#rows tr:has-text("Lee Park")');
    await page.waitForSelector('#detail[open]');
    const box = await page.locator('#detail').boundingBox();
    assert.equal(Math.round(box.width), 390);
    assert.equal(Math.round(box.height), 844);
    assert.equal(await page.isVisible('#detail .back'), true);
    assert.equal(await page.isVisible('#detail .close'), false);
    await page.waitForTimeout(200);
    await shot(page, 'detail-phone');
    await page.click('#detail .back');
    assert.equal(await page.isVisible('#detail'), false);

    // Account on a phone: full screen; Sign out lives inside it.
    assert.equal(await page.isVisible('#signout'), false);
    await page.click('#account-btn');
    await page.waitForSelector('#device-list li.device');
    assert.equal(await page.isVisible('#signout-2'), true);
    const acct = await page.locator('#account').boundingBox();
    assert.equal(Math.round(acct.width), 390);
    await page.waitForTimeout(200);
    await shot(page, 'account-phone');
    await page.click('#account .back');

    // The narrowest phones in common use.
    await page.setViewportSize({ width: 320, height: 640 });
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, '320px: no sideways scroll, got ' + overflow);
    await ctx.close();
  }

  await browser.close();
  server.close();
  if (problems.length) {
    console.error('Problems:\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log('ui smoke: all checks passed');
}

main().catch((e) => { console.error(e); process.exit(1); });

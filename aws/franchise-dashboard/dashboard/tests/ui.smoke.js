// Browser smoke test for the dashboard. Needs Playwright with Chromium.
// Run from aws/franchise-dashboard/dashboard:  node tests/ui.smoke.js [screenshot-dir]
//
// Serves web/ with the same Content-Security-Policy CloudFront sends, fakes
// Cognito's API and the dashboard API with page.route, and drives the real
// page: branded sign-in (wrong password, MFA, MFA setup, new password),
// sorting like a file browser, previews, the full message, notes, archive,
// CSV import and export, token refresh, sign-out, and the phone layout.
// Fails on any page error or CSP violation.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const WEB = path.join(__dirname, '..', 'web');
const IDP = 'https://cognito-idp.us-east-1.amazonaws.com/';
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; " +
  "connect-src 'self' https://cognito-idp.us-east-1.amazonaws.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
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
const tokens = (user, access) => ({
  AccessToken: access || 'access-1', IdToken: jwt({ 'cognito:username': user }),
  RefreshToken: 'refresh-1', ExpiresIn: 3600, TokenType: 'Bearer',
});

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

  async function newPage(viewport) {
    const ctx = await browser.newContext({ viewport: viewport || { width: 1366, height: 860 }, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      // The import test sends a deliberate duplicate (409) and the sign-in tests
      // deliberately fail (400); Chrome logs every non-2xx fetch as an error.
      if (m.type() === 'error' && !/status of (409|400)/.test(m.text())) problems.push('console: ' + m.text());
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
        if (p !== PASSWORD) return fail('NotAuthorizedException', 'Incorrect username or password.');
        if (u === 'ATLWingSpotAdmin') return ok({ AuthenticationResult: tokens(u) });
        if (u === 'mfa-user') return ok({ ChallengeName: 'SOFTWARE_TOKEN_MFA', Session: 's-mfa', ChallengeParameters: { USER_ID_FOR_SRP: u } });
        if (u === 'setup-user') return ok({ ChallengeName: 'MFA_SETUP', Session: 's-setup', ChallengeParameters: { USER_ID_FOR_SRP: u } });
        if (u === 'new-user') return ok({ ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: 's-new', ChallengeParameters: { USER_ID_FOR_SRP: u } });
        return fail('NotAuthorizedException', 'Incorrect username or password.');
      }
      if (action === 'InitiateAuth' && body.AuthFlow === 'REFRESH_TOKEN_AUTH') {
        assert.equal(body.AuthParameters.REFRESH_TOKEN, 'refresh-1');
        const t = tokens('ATLWingSpotAdmin', 'access-2');
        delete t.RefreshToken;
        return ok({ AuthenticationResult: t });
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
      return fail('InvalidParameterException', 'unexpected ' + action);
    });

    // ---- fake dashboard API
    await page.route(`${base}/api/**`, async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const auth = req.headers().authorization;
      assert.ok(auth === 'Bearer access-1' || auth === 'Bearer access-2', 'API call carries the access token');
      calls.push({ api: req.method() + ' ' + u.pathname + u.search, auth, body: req.postData() && JSON.parse(req.postData()) });
      const m = u.pathname.match(/^\/api\/submissions(?:\/([^/]+))?$/);
      const id = m && m[1] && decodeURIComponent(m[1]);
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
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

    // Search.
    await page.fill('#search', 'savannah');
    assert.deepEqual(await names(page), ['Lee Park']);
    assert.equal(await page.textContent('#count'), '1 of 4 leads match');
    await page.fill('#search', '');

    // Full message; applicant text is shown as text, never run as HTML.
    await page.click('#rows tr:has-text("Lee Park")');
    await page.waitForSelector('#detail[open]');
    assert.equal(await page.textContent('#d-message'), LONG);
    assert.equal(await page.getAttribute('#d-email-btn', 'href'), 'mailto:lee@example.com');
    assert.equal(await page.getAttribute('#d-call-btn', 'href'), 'tel:4045550199');
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
    assert.equal(calls.filter((c) => c.api).pop().auth, 'Bearer access-2');

    // Sign out revokes the session and clears it.
    await page.click('#signout');
    await page.waitForSelector('#signin:not([hidden])');
    assert.ok(calls.some((c) => c.idp === 'RevokeToken' && c.body.Token === 'refresh-1'));
    assert.equal(await page.evaluate(() => sessionStorage.getItem('access_token')), null);
    await ctx.close();
  }

  // ================================================================ extra sign-in steps
  {
    const { ctx, page } = await newPage();
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');

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

  // ================================================================ phone
  {
    db = seed();
    const { ctx, page } = await newPage({ width: 390, height: 844 });
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

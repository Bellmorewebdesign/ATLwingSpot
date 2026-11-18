// Browser smoke test for the dashboard. Needs Playwright with Chromium.
// Run from aws/franchise-dashboard/dashboard:  node tests/ui.smoke.js [screenshot-dir]
//
// Serves web/ with the same Content-Security-Policy CloudFront sends, fakes
// the API and Cognito with page.route, and drives the real page: sign-in
// redirect, the OAuth callback, list, search, detail edit, archive, add,
// CSV import and export. Fails on any page error or CSP violation.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const WEB = path.join(__dirname, '..', 'web');
const COGNITO = 'https://auth.test.example';
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; " +
  `connect-src 'self' ${COGNITO}; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const SHOTS = process.argv[2];

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/config.js') {
      res.writeHead(200, { 'content-type': 'text/javascript', 'content-security-policy': CSP });
      return res.end(`window.ATL_CONFIG = ${JSON.stringify({ cognitoDomain: COGNITO, clientId: 'test-client' })};`);
    }
    const file = path.join(WEB, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
    if (!file.startsWith(WEB) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'content-security-policy': CSP });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

function jwt(payload) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'none' })}.${b(payload)}.sig`;
}

function fakeBackend() {
  const db = [
    { submissionId: 'a', createdAt: '2026-11-18T23:17:41Z', entity: 'SUB', status: 'new', firstName: 'Dana', lastName: 'Okafor',
      email: 'dana@example.com', phone: '516-555-0142', territory: 'New Jersey', message: 'Interested in two units.' },
    { submissionId: 'b', createdAt: '2026-11-10T15:00:00Z', entity: 'SUB', status: 'contacted', firstName: 'Lee', lastName: 'Park',
      email: 'lee@example.com', phone: '404-555-0199', territory: 'Georgia', message: '<img src=x onerror=alert(1)>', lastContactedAt: '2026-11-12' },
  ];
  const history = {};
  const calls = [];
  return { db, history, calls };
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const problems = [];
  const be = fakeBackend();

  async function newPage(viewport) {
    const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      // The duplicate in the import test is a deliberate 409; Chrome logs every
      // non-2xx fetch as a console error.
      if (m.type() === 'error' && !/status of 409/.test(m.text())) problems.push('console: ' + m.text());
    });
    page.on('dialog', (d) => { problems.push('unexpected browser dialog: ' + d.message()); d.dismiss(); });

    await page.route(`${COGNITO}/**`, async (route) => {
      const u = new URL(route.request().url());
      if (u.pathname === '/oauth2/token') {
        const form = new URLSearchParams(route.request().postData());
        be.calls.push({ token: Object.fromEntries(form) });
        return route.fulfill({
          status: 200, contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({
            access_token: 'access-1', id_token: jwt({ 'cognito:username': 'ATLWingSpotAdmin' }),
            refresh_token: 'refresh-1', expires_in: 3600, token_type: 'Bearer',
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>login page</p>' });
    });

    await page.route(`${base}/api/**`, async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      assert.equal(req.headers().authorization, 'Bearer access-1');
      const m = u.pathname.match(/^\/api\/submissions(?:\/([^/]+))?$/);
      const id = m && m[1] && decodeURIComponent(m[1]);
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (req.method() === 'GET' && !id) {
        const archived = u.searchParams.get('archived') === '1';
        const items = be.db.filter((s) => !!s.archivedAt === archived).sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
        return json(200, { items, nextCursor: null });
      }
      if (req.method() === 'GET' && id) {
        const s = be.db.find((x) => x.submissionId === id);
        return s ? json(200, { submission: s, history: be.history[id] || [] }) : json(404, { message: 'No such submission.' });
      }
      if (req.method() === 'PATCH' && id) {
        const body = JSON.parse(req.postData());
        be.calls.push({ patch: id, body });
        const s = be.db.find((x) => x.submissionId === id);
        const changes = {};
        if ('status' in body) { changes.status = { from: s.status, to: body.status }; s.status = body.status; }
        if ('notes' in body) { changes.notes = { from: s.notes, to: body.notes }; if (body.notes) s.notes = body.notes; else delete s.notes; }
        if ('lastContactedAt' in body) { changes.lastContactedAt = { to: body.lastContactedAt }; s.lastContactedAt = body.lastContactedAt || undefined; }
        if ('archived' in body) { changes.archived = { from: !!s.archivedAt, to: body.archived }; if (body.archived) s.archivedAt = '2026-11-19T00:00:00Z'; else delete s.archivedAt; }
        (be.history[id] = be.history[id] || []).unshift({ at: '2026-11-19T01:00:00Z#abcd', actor: 'ATLWingSpotAdmin', action: 'update', changes });
        return json(200, { submission: s });
      }
      if (req.method() === 'POST' && !id) {
        const body = JSON.parse(req.postData());
        be.calls.push({ post: body });
        if (be.db.some((x) => x.email === body.email && body.createdAt && x.createdAt.startsWith(body.createdAt.slice(0, 10)))) {
          return json(409, { error: 'duplicate', message: 'That submission is already in the list.' });
        }
        const s = Object.assign({ submissionId: 'n' + be.db.length, entity: 'SUB', status: 'new', source: body.createdAt ? 'import' : 'manual',
          createdBy: 'ATLWingSpotAdmin' }, body, { createdAt: body.createdAt ? (body.createdAt.length === 10 ? body.createdAt + 'T12:00:00Z' : body.createdAt) : '2026-11-19T02:00:00Z' });
        be.db.push(s);
        return json(201, { submission: s });
      }
      return json(404, { message: 'no route' });
    });
    return { ctx, page };
  }

  // 1. Signed out: the sign-in screen, and the button goes to Cognito with PKCE.
  {
    const { ctx, page } = await newPage();
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');
    assert.equal(await page.isVisible('#app'), false);
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().startsWith(COGNITO + '/oauth2/authorize')),
      page.click('#signin-btn'),
    ]);
    const q = new URL(req.url()).searchParams;
    assert.equal(q.get('client_id'), 'test-client');
    assert.equal(q.get('response_type'), 'code');
    assert.equal(q.get('code_challenge_method'), 'S256');
    assert.equal(q.get('redirect_uri'), base + '/');
    assert.ok(q.get('state') && q.get('code_challenge'));
    // Back on the dashboard's own origin, where sessionStorage lives (the
    // click above left for the login page, as the real flow does).
    await page.goto(base + '/');
    await page.waitForSelector('#signin:not([hidden])');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'signin.png') });

    // 2. Coming back with ?code=…: exchanged with the verifier, URL cleaned.
    const stored = await page.evaluate(() => ({ s: sessionStorage.getItem('pkce_state'), v: sessionStorage.getItem('pkce_verifier') }));
    assert.ok(stored.s && stored.v, 'PKCE state kept for the callback');
    await page.goto(`${base}/?code=the-code&state=${stored.s}`);
    await page.waitForSelector('#app:not([hidden])');
    const tokenCall = be.calls.find((c) => c.token);
    assert.equal(tokenCall.token.grant_type, 'authorization_code');
    assert.equal(tokenCall.token.code, 'the-code');
    assert.equal(tokenCall.token.code_verifier, stored.v);
    assert.equal(new URL(page.url()).search, '', 'code removed from the address bar');
    assert.equal(await page.textContent('#who'), 'ATLWingSpotAdmin');

    // A callback with the wrong state is refused.
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(`${base}/?code=x&state=forged`);
    await page.waitForSelector('#signin-error:not([hidden])');
    await ctx.close();
  }

  // 3. Signed in: list, chips, search, detail, edit, archive, add, import, export.
  {
    const { ctx, page } = await newPage();
    await page.addInitScript(([idt]) => {
      if (!sessionStorage.getItem('access_token')) {
        sessionStorage.setItem('access_token', 'access-1');
        sessionStorage.setItem('id_token', idt);
        sessionStorage.setItem('refresh_token', 'refresh-1');
        sessionStorage.setItem('expires_at', String(Date.now() + 3600e3));
      }
    }, [jwt({ 'cognito:username': 'ATLWingSpotAdmin' })]);
    await page.goto(base + '/');
    await page.waitForSelector('#rows tr');
    assert.equal(await page.locator('#rows tr').count(), 2);
    assert.match(await page.textContent('#rows tr:first-child'), /Dana Okafor/);
    assert.match(await page.textContent('#chips'), /2All open/);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'list.png') });

    await page.fill('#search', 'georgia');
    assert.equal(await page.locator('#rows tr').count(), 1);
    await page.fill('#search', '');
    await page.click('.chip:has-text("Contacted")');
    assert.equal(await page.locator('#rows tr').count(), 1);
    await page.click('.chip:has-text("All open")');

    // Detail: applicant text is shown as text, not run as HTML.
    await page.click('#rows tr:has-text("Lee Park")');
    await page.waitForSelector('#detail[open]');
    assert.equal(await page.textContent('#d-message'), '<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('#d-message img').count(), 0);
    assert.equal(await page.getAttribute('#d-email', 'href'), 'mailto:lee@example.com');

    await page.selectOption('#d-status', 'qualified');
    await page.fill('#d-notes', 'Strong candidate.');
    await page.click('#d-form button[type=submit]');
    await page.waitForSelector('#d-history li:has-text("Status: Contacted → Qualified")');
    const patch = be.calls.filter((c) => c.patch).pop();
    assert.deepEqual(patch.body, { status: 'qualified', notes: 'Strong candidate.' });
    if (SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, 'detail.png') }); }

    await page.click('#d-archive');
    await page.waitForSelector('#d-archive:has-text("Move back to open")');
    await page.click('#detail [data-close]');
    assert.equal(await page.locator('#rows tr').count(), 1, 'archived row leaves the open list');
    await page.selectOption('#filter', 'archived');
    await page.waitForSelector('#rows tr:has-text("Lee Park")');
    await page.selectOption('#filter', 'open');

    // Add one by hand.
    await page.click('#add');
    await page.fill('#add-form [name=firstName]', 'Ana');
    await page.fill('#add-form [name=lastName]', 'Diaz');
    await page.fill('#add-form [name=email]', 'ana@example.com');
    await page.fill('#add-form [name=createdAt]', '2026-06-01');
    await page.click('#add-form button[type=submit]');
    await page.waitForSelector('#rows tr:has-text("Ana Diaz")');
    assert.equal(await page.isVisible('#add-dialog'), false);

    // Import: two good rows, one duplicate of Ana, one bad row.
    const csv = [
      'First Name,Last Name,Email,Phone,State,Date Received,Status',
      'Ray,Cole,ray@example.com,+1 404 555 0111,Georgia,3/14/2026,FDD sent',
      'Sam,Ito,sam@example.com,,Texas,2026-02-01,',
      'Ana,Diaz,ana@example.com,,,6/1/2026,',
      'No,Email,,,,,',
    ].join('\n');
    await page.click('#import');
    await page.setInputFiles('#import-file', { name: 'old.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForSelector('#import-preview:has-text("3 rows ready to import")');
    assert.match(await page.textContent('#import-preview'), /Row 5: missing or invalid email/);
    await page.click('#import-go');
    await page.waitForSelector('#import-result:has-text("2 imported")');
    assert.match(await page.textContent('#import-result'), /1 already in the list/);
    const ray = be.calls.find((c) => c.post && c.post.email === 'ray@example.com').post;
    assert.deepEqual(ray, { firstName: 'Ray', lastName: 'Cole', email: 'ray@example.com', phone: '+1 404 555 0111',
      territory: 'Georgia', createdAt: '2026-03-14', status: 'fdd_sent' });
    await page.click('#import-dialog [data-close]');
    await page.waitForSelector('#rows tr:has-text("Ray Cole")');

    // Export.
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const exported = fs.readFileSync(await download.path(), 'utf8');
    assert.match(exported, /^﻿Received,First name,Last name,Email/);
    assert.match(exported, /'\+1 404 555 0111/, 'phone guarded against formula injection');
    assert.match(exported, /FDD sent/);

    // Phone layout: no sideways scrolling.
    await page.setViewportSize({ width: 375, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, 'no horizontal scroll at phone width, got ' + overflow);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'phone.png'), fullPage: true });

    // Sign out clears the session and goes to Cognito's logout.
    const [logout] = await Promise.all([
      page.waitForRequest((r) => r.url().startsWith(COGNITO + '/logout')),
      page.click('#signout'),
    ]);
    assert.equal(new URL(logout.url()).searchParams.get('logout_uri'), base + '/');
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

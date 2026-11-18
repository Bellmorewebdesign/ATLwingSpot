/*
 * ATL Wing Spot franchise dashboard.
 *
 * Sign-in is Cognito's hosted login with the OAuth 2 authorization-code flow
 * and PKCE: this page never sees the password. Tokens live in sessionStorage,
 * so closing the tab signs out. Every API call carries the access token and
 * is checked by API Gateway before it reaches any code.
 *
 * Everything from the API is put on the page with textContent, never as HTML.
 */
(function () {
  'use strict';

  var CFG = window.ATL_CONFIG || {};
  var L = window.ATL_LIB;
  var REDIRECT = location.origin + '/';
  var STATUS_LABEL = {};
  L.STATUSES.forEach(function (s) { STATUS_LABEL[s[0]] = s[1]; });

  function $(id) { return document.getElementById(id); }

  function el(tag, props) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(n, arguments[i]);
    return n;
  }
  function append(n, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { append(n, k); }); return; }
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }

  // ------------------------------------------------------------- storage
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  // ---------------------------------------------------------------- auth
  function b64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomToken(n) {
    var a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return b64url(a);
  }
  function challengeFor(verifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
      .then(function (d) { return b64url(new Uint8Array(d)); });
  }

  function startSignIn() {
    var verifier = randomToken(48), state = randomToken(18);
    store.set('pkce_verifier', verifier);
    store.set('pkce_state', state);
    return challengeFor(verifier).then(function (challenge) {
      var q = new URLSearchParams({
        response_type: 'code', client_id: CFG.clientId, redirect_uri: REDIRECT, scope: 'openid',
        state: state, code_challenge_method: 'S256', code_challenge: challenge,
      });
      location.assign(CFG.cognitoDomain + '/oauth2/authorize?' + q);
    });
  }

  function tokenCall(params) {
    return fetch(CFG.cognitoDomain + '/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    }).then(function (res) {
      if (!res.ok) throw new Error('Sign-in failed (' + res.status + '). Please try again.');
      return res.json();
    });
  }

  function keepTokens(t) {
    store.set('access_token', t.access_token);
    if (t.id_token) store.set('id_token', t.id_token);
    if (t.refresh_token) store.set('refresh_token', t.refresh_token);
    store.set('expires_at', String(Date.now() + (t.expires_in || 3600) * 1000));
  }
  function clearTokens() {
    ['access_token', 'id_token', 'refresh_token', 'expires_at', 'pkce_verifier', 'pkce_state'].forEach(store.del);
  }

  /* Coming back from the login page with ?code=… (or ?error=…). */
  function finishSignIn() {
    var q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return Promise.resolve();
    history.replaceState(null, '', '/');
    if (q.has('error')) return Promise.reject(new Error(q.get('error_description') || q.get('error')));
    var state = store.get('pkce_state'), verifier = store.get('pkce_verifier');
    store.del('pkce_state');
    store.del('pkce_verifier');
    if (!state || state !== q.get('state') || !verifier) {
      return Promise.reject(new Error('That sign-in link expired. Please sign in again.'));
    }
    return tokenCall({
      grant_type: 'authorization_code', client_id: CFG.clientId, code: q.get('code'),
      redirect_uri: REDIRECT, code_verifier: verifier,
    }).then(keepTokens);
  }

  var refreshing = null;
  function accessToken() {
    var tok = store.get('access_token'), exp = Number(store.get('expires_at') || 0);
    if (tok && Date.now() < exp - 60000) return Promise.resolve(tok);
    var rt = store.get('refresh_token');
    if (!rt) return Promise.resolve(null);
    if (!refreshing) {
      refreshing = tokenCall({ grant_type: 'refresh_token', client_id: CFG.clientId, refresh_token: rt })
        .then(keepTokens)
        .catch(clearTokens)
        .then(function () { refreshing = null; });
    }
    return refreshing.then(function () { return store.get('access_token'); });
  }

  function username() {
    var t = store.get('id_token');
    if (!t) return '';
    try {
      var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return p['cognito:username'] || '';
    } catch (e) { return ''; }
  }

  function signOut() {
    var rt = store.get('refresh_token');
    clearTokens();
    var revoke = rt
      ? fetch(CFG.cognitoDomain + '/oauth2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: rt, client_id: CFG.clientId }),
      }).catch(function () { /* best effort */ })
      : Promise.resolve();
    revoke.then(function () {
      location.assign(CFG.cognitoDomain + '/logout?' +
        new URLSearchParams({ client_id: CFG.clientId, logout_uri: REDIRECT }));
    });
  }

  // ----------------------------------------------------------------- API
  function ApiError(status, body) {
    this.status = status;
    this.body = body || {};
    this.message = (body && body.message) || 'Something went wrong. Try again.';
  }

  function api(method, path, body) {
    return accessToken().then(function (tok) {
      if (!tok) {
        showSignIn('Your session ended. Please sign in again.');
        throw new ApiError(401);
      }
      var headers = { Authorization: 'Bearer ' + tok };
      if (body) headers['Content-Type'] = 'application/json';
      return fetch('/api' + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.status === 401) {
          clearTokens();
          showSignIn('Your session ended. Please sign in again.');
        }
        if (!res.ok) throw new ApiError(res.status, data);
        return data;
      });
    });
  }

  function describeErr(e) {
    var f = e.body && e.body.fields;
    if (f && typeof f === 'object') {
      var bits = Object.keys(f).filter(function (k) { return k !== 'submissionId'; })
        .map(function (k) { return k + ': ' + f[k]; });
      if (bits.length) return e.message + ' (' + bits.join(', ') + ')';
    }
    return e.message;
  }

  // ---------------------------------------------------------- formatting
  var dtf = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  var df = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
  function fmtDateTime(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '—' : dtf.format(d);
  }
  function fmtDate(value) {
    var p = String(value || '').split('-').map(Number);
    return p[0] ? df.format(new Date(p[0], p[1] - 1, p[2])) : '—';
  }
  function fullName(s) {
    return ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || '(no name)';
  }
  function pill(status) {
    return el('span', { class: 'pill ' + status }, STATUS_LABEL[status] || status || '—');
  }

  // The toast is a popover, so it sits in the top layer above an open
  // dialog; re-showing it moves it to the top of that layer.
  var toastTimer;
  function toast(msg, bad) {
    var t = $('toast');
    t.textContent = msg;
    if (t.showPopover) {
      try { t.hidePopover(); } catch (e) { /* was not showing */ }
      t.showPopover();
    }
    t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.className = 'toast';
      if (t.hidePopover) setTimeout(function () { try { t.hidePopover(); } catch (e) { /* ignore */ } }, 250);
    }, 3500);
  }
  function setLine(msg) { $('status-line').textContent = msg; }

  // --------------------------------------------------------------- state
  var state = { open: [], archived: null, view: 'open', search: '', current: null };

  function loadAll(archived) {
    var out = [];
    function page(cursor) {
      var q = new URLSearchParams();
      if (archived) q.set('archived', '1');
      if (cursor) q.set('cursor', cursor);
      var qs = q.toString();
      return api('GET', '/submissions' + (qs ? '?' + qs : '')).then(function (res) {
        out = out.concat(res.items);
        return res.nextCursor ? page(res.nextCursor) : out;
      });
    }
    return page(null);
  }

  function refresh() {
    setLine('Loading…');
    return loadAll(false).then(function (open) {
      state.open = open;
      return state.view === 'archived' ? loadAll(true) : null;
    }).then(function (archived) {
      state.archived = archived;
      render();
    }).catch(function (e) {
      if (e.status !== 401) { setLine(''); toast(e.message, true); }
    });
  }

  var SEARCHED = ['firstName', 'lastName', 'email', 'phone', 'territory', 'message', 'notes'];
  function visible() {
    var base = state.view === 'archived'
      ? (state.archived || [])
      : state.open.filter(function (s) { return state.view === 'open' || s.status === state.view; });
    var q = state.search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(function (s) {
      return fullName(s).toLowerCase().indexOf(q) !== -1 || SEARCHED.some(function (k) {
        return String(s[k] || '').toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  function insertSorted(list, s) {
    var i = list.findIndex(function (x) { return x.createdAt < s.createdAt; });
    if (i === -1) list.push(s); else list.splice(i, 0, s);
  }
  function replaceLocal(s) {
    function notIt(x) { return x.submissionId !== s.submissionId; }
    state.open = state.open.filter(notIt);
    if (state.archived) state.archived = state.archived.filter(notIt);
    if (s.archivedAt) { if (state.archived) insertSorted(state.archived, s); }
    else insertSorted(state.open, s);
  }

  // -------------------------------------------------------------- render
  function render() {
    renderChips();
    var rows = visible();
    $('rows').replaceChildren.apply($('rows'), rows.map(rowFor));
    $('empty').hidden = rows.length > 0;
    var total = state.view === 'archived' ? (state.archived || []).length
      : state.view === 'open' ? state.open.length
        : state.open.filter(function (s) { return s.status === state.view; }).length;
    setLine(rows.length === total ? rows.length + ' shown' : rows.length + ' of ' + total + ' shown');
  }

  function renderChips() {
    var counts = {};
    state.open.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });
    function chip(key, label, n) {
      return el('button', {
        type: 'button', class: 'chip' + (state.view === key ? ' on' : ''),
        'aria-pressed': state.view === key ? 'true' : 'false',
        onclick: function () { setView(key); },
      }, el('b', null, String(n)), label);
    }
    var chips = [chip('open', 'All open', state.open.length)].concat(
      L.STATUSES.map(function (s) { return chip(s[0], s[1], counts[s[0]] || 0); }));
    $('chips').replaceChildren.apply($('chips'), chips);
  }

  function rowFor(s) {
    function open() { openDetail(s.submissionId); }
    return el('tr', {
      tabindex: '0',
      onclick: open,
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } },
    },
    el('td', { 'data-label': 'Received', class: 'nowrap' }, fmtDateTime(s.createdAt)),
    el('td', { 'data-label': 'Name', class: 'name' }, fullName(s)),
    el('td', { 'data-label': 'State' }, s.territory || '—'),
    el('td', { 'data-label': 'Email' }, s.email || '—'),
    el('td', { 'data-label': 'Phone', class: 'nowrap' }, s.phone || '—'),
    el('td', { 'data-label': 'Status' }, pill(s.status)),
    el('td', { 'data-label': 'Last contacted', class: 'nowrap' }, s.lastContactedAt ? fmtDate(s.lastContactedAt) : '—'));
  }

  function setView(v) {
    state.view = v;
    $('filter').value = v;
    if (v === 'archived' && !state.archived) refresh(); else render();
  }

  // -------------------------------------------------------------- detail
  function openDetail(id) {
    return api('GET', '/submissions/' + encodeURIComponent(id)).then(function (res) {
      state.current = res.submission;
      fillDetail(res.submission, res.history || []);
      if (!$('detail').open) $('detail').showModal();
    }).catch(function (e) { if (e.status !== 401) toast(e.message, true); });
  }

  function fillDetail(s, history) {
    $('d-name').textContent = fullName(s);
    $('d-received').textContent = 'Received ' + fmtDateTime(s.createdAt) + (s.archivedAt ? ' · Archived' : '');
    var em = $('d-email');
    em.textContent = s.email || '—';
    if (s.email) em.href = 'mailto:' + s.email; else em.removeAttribute('href');
    var ph = $('d-phone');
    ph.textContent = s.phone || '—';
    if (s.phone) ph.href = 'tel:' + s.phone.replace(/[^\d+]/g, ''); else ph.removeAttribute('href');
    $('d-territory').textContent = s.territory || '—';
    $('d-source').textContent = s.source === 'import' ? 'Imported by ' + (s.createdBy || 'staff')
      : s.source === 'manual' ? 'Added by ' + (s.createdBy || 'staff') : 'Website form';
    $('d-message').textContent = s.message || '(no message)';
    $('d-status').value = s.status || 'new';
    $('d-contacted').value = s.lastContactedAt || '';
    $('d-notes').value = s.notes || '';
    $('d-archive').textContent = s.archivedAt ? 'Move back to open' : 'Archive';
    var items = history.length ? history.map(historyItem) : [el('li', { class: 'muted' }, 'No changes yet.')];
    $('d-history').replaceChildren.apply($('d-history'), items);
  }

  function describeChange(k, c) {
    if (k === 'status') return 'Status: ' + (STATUS_LABEL[c.from] || c.from || '—') + ' → ' + (STATUS_LABEL[c.to] || c.to);
    if (k === 'lastContactedAt') return 'Last contacted: ' + (c.to ? fmtDate(c.to) : 'cleared');
    if (k === 'notes') return c.to ? 'Notes updated' : 'Notes cleared';
    if (k === 'archived') return c.to ? 'Archived' : 'Moved back to open';
    return k;
  }

  function historyItem(h) {
    var what = h.action === 'create'
      ? ((h.changes || {}).source === 'import' ? 'Imported' : 'Added by hand')
      : Object.keys(h.changes || {}).map(function (k) { return describeChange(k, h.changes[k]); }).join('; ');
    return el('li', null,
      el('div', null, what),
      el('div', { class: 'when' }, fmtDateTime(String(h.at || '').split('#')[0]) + ' · ' + (h.actor || '')));
  }

  function pendingEdits() {
    var s = state.current, patch = {};
    var st = $('d-status').value;
    if (st !== s.status) patch.status = st;
    var lc = $('d-contacted').value;
    if (lc !== (s.lastContactedAt || '')) patch.lastContactedAt = lc;
    var notes = $('d-notes').value.replace(/\s+$/, '');
    if (notes !== (s.notes || '')) patch.notes = notes;
    return patch;
  }

  function saveChange(patch, msg) {
    var id = state.current.submissionId;
    return api('PATCH', '/submissions/' + encodeURIComponent(id), patch).then(function (res) {
      replaceLocal(res.submission);
      render();
      toast(msg);
      return openDetail(id);
    }).catch(function (e) { if (e.status !== 401) toast(describeErr(e), true); });
  }

  // -------------------------------------------------------------- import
  var importRows = null;

  function onImportFile() {
    var file = $('import-file').files[0];
    importRows = null;
    $('import-go').disabled = true;
    $('import-result').replaceChildren();
    if (!file) { $('import-preview').replaceChildren(); return; }
    if (file.size > 5 * 1024 * 1024) {
      $('import-preview').replaceChildren(el('p', { class: 'error' }, 'That file is over 5 MB.'));
      return;
    }
    file.text().then(function (text) {
      var out = L.rowsFromCsv(text);
      if (out.error) {
        $('import-preview').replaceChildren(el('p', { class: 'error' }, out.error));
        return;
      }
      var good = out.rows.filter(function (r) { return !r.errors.length; });
      var bad = out.rows.filter(function (r) { return r.errors.length; });
      var undated = good.filter(function (r) { return !r.data.createdAt; }).length;
      var parts = [el('p', null,
        el('strong', null, good.length + (good.length === 1 ? ' row' : ' rows') + ' ready to import'),
        bad.length ? ', ' + bad.length + ' will be skipped' : '')];
      if (undated) parts.push(el('p', { class: 'muted' }, undated + ' have no date: they will be dated today, and importing them twice would add them twice.'));
      if (out.unmapped.length) parts.push(el('p', { class: 'muted' }, 'Ignored columns: ' + out.unmapped.join(', ')));
      if (bad.length) {
        parts.push(el('ul', null, bad.slice(0, 50).map(function (r) {
          return el('li', null, 'Row ' + r.line + ': missing or invalid ' + r.errors.join(', '));
        })));
      }
      $('import-preview').replaceChildren.apply($('import-preview'), parts);
      importRows = good;
      $('import-go').disabled = !good.length;
    });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function runImport() {
    if (!importRows) return;
    var rows = importRows, added = 0, dup = 0, failed = [], i = 0, retries = 0, stopped = false;
    importRows = null;
    $('import-go').disabled = true;
    $('import-file').disabled = true;

    function next() {
      if (i >= rows.length || stopped) return Promise.resolve();
      $('import-result').replaceChildren(el('p', null, 'Importing ' + (i + 1) + ' of ' + rows.length + '…'));
      return api('POST', '/submissions', rows[i].data).then(function () {
        added++; i++; retries = 0;
      }).catch(function (e) {
        if (e.status === 401) { stopped = true; return; }
        if (e.status === 429 && retries < 5) { retries++; return sleep(1000 * retries); }
        if (e.status === 409) dup++;
        else failed.push('Row ' + rows[i].line + ': ' + describeErr(e));
        i++; retries = 0;
      }).then(next);
    }

    return next().then(function () {
      $('import-file').disabled = false;
      $('import-result').replaceChildren(
        el('p', null, el('strong', null, added + ' imported'),
          dup ? ', ' + dup + ' already in the list' : '',
          failed.length ? ', ' + failed.length + ' failed' : '',
          stopped ? '. Stopped: sign in again to continue.' : ''),
        failed.length ? el('ul', null, failed.map(function (f) { return el('li', null, f); })) : null);
      return refresh();
    });
  }

  // -------------------------------------------------------------- export
  var EXPORT_COLUMNS = [
    ['createdAt', 'Received'], ['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'],
    ['phone', 'Phone'], ['territory', 'State / territory'], ['message', 'Message'], ['status', 'Status'],
    ['lastContactedAt', 'Last contacted'], ['notes', 'Notes'], ['source', 'Source'], ['submissionId', 'ID'],
  ];

  function exportCsv() {
    var rows = visible();
    if (!rows.length) { toast('Nothing to export'); return; }
    var csv = L.toCsv(rows.map(function (s) {
      return Object.assign({}, s, { status: STATUS_LABEL[s.status] || s.status, source: s.source || 'website form' });
    }), EXPORT_COLUMNS);
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = el('a', { href: url, download: 'franchise-submissions-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // --------------------------------------------------------------- wiring
  function statusOptions(select, extra) {
    var opts = (extra || []).concat(L.STATUSES);
    select.replaceChildren.apply(select, opts.map(function (s) { return el('option', { value: s[0] }, s[1]); }));
  }

  function wire() {
    statusOptions($('filter'), [['open', 'All open']]);
    $('filter').append(el('option', { value: 'archived' }, 'Archived'));
    statusOptions($('d-status'));
    statusOptions($('add-status'));

    $('signin-btn').addEventListener('click', startSignIn);
    $('signout').addEventListener('click', signOut);
    $('refresh').addEventListener('click', refresh);
    $('filter').addEventListener('change', function () { setView($('filter').value); });
    $('search').addEventListener('input', function () { state.search = $('search').value; render(); });
    $('export').addEventListener('click', exportCsv);

    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    document.querySelectorAll('dialog').forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });   // backdrop
    });

    $('d-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.current) return;
      var patch = pendingEdits();
      if (!Object.keys(patch).length) { toast('Nothing changed'); return; }
      saveChange(patch, 'Saved');
    });
    $('d-archive').addEventListener('click', function () {
      if (!state.current) return;
      var patch = pendingEdits();               // keep anything typed but not saved
      patch.archived = !state.current.archivedAt;
      saveChange(patch, patch.archived ? 'Archived' : 'Moved back to open');
    });

    $('add').addEventListener('click', function () {
      $('add-form').reset();
      $('add-error').hidden = true;
      $('add-dialog').showModal();
    });
    $('add-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var body = {};
      new FormData($('add-form')).forEach(function (v, k) {
        var t = String(v).trim();
        if (t) body[k] = t;
      });
      api('POST', '/submissions', body).then(function (res) {
        replaceLocal(res.submission);
        $('add-dialog').close();
        render();
        toast('Added');
      }).catch(function (err) {
        if (err.status === 401) return;
        $('add-error').textContent = err.status === 409 ? 'That one is already in the list.' : describeErr(err);
        $('add-error').hidden = false;
      });
    });

    $('import').addEventListener('click', function () {
      importRows = null;
      $('import-file').value = '';
      $('import-file').disabled = false;
      $('import-preview').replaceChildren();
      $('import-result').replaceChildren();
      $('import-go').disabled = true;
      $('import-dialog').showModal();
    });
    $('import-file').addEventListener('change', onImportFile);
    $('import-go').addEventListener('click', runImport);
  }

  function showSignIn(msg) {
    document.querySelectorAll('dialog[open]').forEach(function (d) { d.close(); });
    $('app').hidden = true;
    $('signin').hidden = false;
    $('signin-error').textContent = msg || '';
    $('signin-error').hidden = !msg;
  }
  function showApp() {
    $('signin').hidden = true;
    $('app').hidden = false;
    $('who').textContent = username();
  }

  function boot() {
    if (!CFG.cognitoDomain || !CFG.clientId) {
      showSignIn('This page is not set up yet (config.js is missing).');
      $('signin-btn').disabled = true;
      return;
    }
    wire();
    finishSignIn().then(accessToken).then(function (tok) {
      if (!tok) { showSignIn(); return; }
      showApp();
      return refresh();
    }).catch(function (e) { showSignIn(e.message); });
  }

  boot();
})();

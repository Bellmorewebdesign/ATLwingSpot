/*
 * ATL Wing Spot franchise dashboard.
 *
 * Sign-in: the branded form on this page sends the username and password
 * straight to Amazon Cognito's API over HTTPS (InitiateAuth,
 * USER_PASSWORD_AUTH) and gets tokens back. Nothing else ever sees the
 * password, and it is cleared from the form as soon as it has been sent.
 * Tokens live in sessionStorage, so closing the tab signs out. Every API call
 * carries the access token, which API Gateway checks before any code runs.
 *
 * Everything from the API is put on the page with textContent, never as HTML.
 */
(function () {
  'use strict';

  var CFG = window.ATL_CONFIG || {};
  var L = window.ATL_LIB;
  var IDP = 'https://cognito-idp.' + (CFG.region || 'us-east-1') + '.amazonaws.com/';

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
  function show(id, msg) { var e = $(id); e.textContent = msg || ''; e.hidden = !msg; }

  // ------------------------------------------------------------- storage
  var session = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  // Only for the remembered sort order, a per-browser convenience.
  var prefs = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  // ---------------------------------------------------------------- auth
  function idp(action, body) {
    return fetch(IDP, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.' + action,
      },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(friendly(data, res.status));
          err.code = String(data.__type || '').split('#').pop();
          throw err;
        }
        return data;
      });
    }, function () {
      throw new Error('Could not reach the sign-in service. Check your connection.');
    });
  }

  function friendly(data, status) {
    var type = String(data.__type || '').split('#').pop(), msg = String(data.message || '');
    // The firewall's per-IP limit on sign-in calls.
    if (type === 'ForbiddenException' || (!type && status === 403)) {
      return 'Too many sign-in attempts from this network. Wait a few minutes, then try again.';
    }
    if (type === 'NotAuthorizedException') {
      return /attempts exceeded/i.test(msg) ? 'Too many attempts. Wait a few minutes, then try again.'
        : /expired/i.test(msg) ? 'That took too long. Start over.'
          : 'Wrong username or password.';
    }
    if (type === 'TooManyRequestsException' || type === 'LimitExceededException') return 'Too many attempts. Wait a few minutes, then try again.';
    if (type === 'CodeMismatchException' || type === 'EnableSoftwareTokenMFAException') return 'That code did not work. Try the newest one.';
    if (type === 'ExpiredCodeException') return 'That code expired. Try the newest one.';
    if (type === 'InvalidPasswordException') return 'Use at least 10 characters, including a number.';
    if (type === 'PasswordResetRequiredException') return 'This login needs a new password. Run create-admin.sh to set one.';
    return 'Sign-in failed. Try again.';
  }

  function keepTokens(r) {
    session.set('access_token', r.AccessToken);
    if (r.IdToken) session.set('id_token', r.IdToken);
    if (r.RefreshToken) session.set('refresh_token', r.RefreshToken);
    session.set('expires_at', String(Date.now() + (r.ExpiresIn || 3600) * 1000));
  }
  function clearTokens() {
    ['access_token', 'id_token', 'refresh_token', 'expires_at'].forEach(session.del);
  }

  var refreshing = null;
  function accessToken() {
    var tok = session.get('access_token'), exp = Number(session.get('expires_at') || 0);
    if (tok && Date.now() < exp - 60000) return Promise.resolve(tok);
    var rt = session.get('refresh_token');
    if (!rt) return Promise.resolve(null);
    if (!refreshing) {
      refreshing = idp('InitiateAuth', {
        AuthFlow: 'REFRESH_TOKEN_AUTH', ClientId: CFG.clientId, AuthParameters: { REFRESH_TOKEN: rt },
      }).then(function (r) { keepTokens(r.AuthenticationResult); })
        .catch(clearTokens)
        .then(function () { refreshing = null; });
    }
    return refreshing.then(function () { return session.get('access_token'); });
  }

  function claimsOf(name) {
    var t = session.get(name);
    if (!t) return {};
    try {
      return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) { return {}; }
  }
  function username() { return claimsOf('id_token')['cognito:username'] || ''; }
  // The same id the API files this sign-in under (see the API's _session_id).
  function currentSessionId() {
    var c = claimsOf('access_token');
    return c.origin_jti || (c.username && c.auth_time ? c.username + '@' + c.auth_time : '');
  }
  function noop() { /* best effort */ }

  // The sign-in conversation: password first, then any extra step Cognito asks for.
  var pending = null;   // { username, session, challenge }

  function busy(form, on, label) {
    var b = form.querySelector('button[type=submit]');
    b.disabled = on;
    b.querySelector('.label').textContent = on ? 'One moment…' : label;
  }

  function onSignIn(e) {
    e.preventDefault();
    var form = $('signin-form'), user = $('username').value.trim(), pass = $('password').value;
    show('signin-error', '');
    if (!user || !pass) { show('signin-error', 'Enter your username and password.'); return; }
    busy(form, true);
    idp('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH', ClientId: CFG.clientId, AuthParameters: { USERNAME: user, PASSWORD: pass },
    }).then(function (r) {
      $('password').value = '';
      return afterAuth(r, user);
    }).catch(function (err) {
      $('password').value = '';
      show('signin-error', err.message);
      $('password').focus();
    }).then(function () { busy(form, false, 'Sign in'); });
  }

  function afterAuth(r, user) {
    if (r.AuthenticationResult) {
      keepTokens(r.AuthenticationResult);
      pending = null;
      return enterApp();
    }
    pending = {
      username: (r.ChallengeParameters && r.ChallengeParameters.USER_ID_FOR_SRP) || user,
      session: r.Session,
      challenge: r.ChallengeName,
    };
    return showChallenge();
  }

  function showChallenge() {
    var input = $('challenge-input');
    $('signin-form').hidden = true;
    $('challenge-form').hidden = false;
    show('challenge-error', '');
    $('challenge-key').hidden = true;
    input.value = '';
    if (pending.challenge === 'NEW_PASSWORD_REQUIRED') {
      $('challenge-text').textContent = 'Choose a new password: at least 10 characters, including a number.';
      $('challenge-label').textContent = 'New password';
      input.type = 'password';
      input.autocomplete = 'new-password';
      input.removeAttribute('inputmode');
    } else if (pending.challenge === 'SOFTWARE_TOKEN_MFA' || pending.challenge === 'MFA_SETUP') {
      $('challenge-label').textContent = '6-digit code';
      input.type = 'text';
      input.autocomplete = 'one-time-code';
      input.setAttribute('inputmode', 'numeric');
      if (pending.challenge === 'SOFTWARE_TOKEN_MFA') {
        $('challenge-text').textContent = 'Enter the 6-digit code from your authenticator app.';
      } else {
        $('challenge-text').textContent = 'One-time setup: add this key to an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows.';
        return idp('AssociateSoftwareToken', { Session: pending.session }).then(function (r) {
          pending.session = r.Session;
          $('challenge-key').textContent = r.SecretCode.replace(/(.{4})/g, '$1 ').trim();
          $('challenge-key').hidden = false;
          input.focus();
        }).catch(function (err) { show('challenge-error', err.message); });
      }
    } else {
      $('challenge-text').textContent = 'This login needs a step this page does not support (' + pending.challenge + ').';
    }
    input.focus();
    return Promise.resolve();
  }

  function respond(extra) {
    return idp('RespondToAuthChallenge', {
      ChallengeName: pending.challenge, ClientId: CFG.clientId, Session: pending.session,
      ChallengeResponses: Object.assign({ USERNAME: pending.username }, extra),
    });
  }

  function onChallenge(e) {
    e.preventDefault();
    if (!pending) return;
    var form = $('challenge-form'), raw = $('challenge-input').value, code = raw.replace(/\s/g, '');
    var step;
    show('challenge-error', '');
    if (pending.challenge === 'NEW_PASSWORD_REQUIRED') {
      if (raw.length < 10 || !/\d/.test(raw)) { show('challenge-error', 'Use at least 10 characters, including a number.'); return; }
      step = respond({ NEW_PASSWORD: raw });
    } else if (pending.challenge === 'SOFTWARE_TOKEN_MFA') {
      step = respond({ SOFTWARE_TOKEN_MFA_CODE: code });
    } else if (pending.challenge === 'MFA_SETUP') {
      step = idp('VerifySoftwareToken', { Session: pending.session, UserCode: code, FriendlyDeviceName: 'ATL dashboard' })
        .then(function (r) { pending.session = r.Session; return respond({}); });
    } else {
      return;
    }
    busy(form, true);
    var user = pending.username;
    step.then(function (r) {
      $('challenge-input').value = '';
      return afterAuth(r, user);
    }).catch(function (err) {
      show('challenge-error', err.message);
    }).then(function () { busy(form, false, 'Continue'); });
  }

  function startOver() {
    pending = null;
    $('challenge-form').hidden = true;
    $('signin-form').hidden = false;
    show('signin-error', '');
    $('password').value = '';
    $('username').focus();
  }

  // Marks this sign-in as signed out in the device log, revokes the refresh
  // token with Cognito, and forgets every token in this tab.
  function signOut(message, info) {
    var rt = session.get('refresh_token'), tok = session.get('access_token'), sid = currentSessionId();
    var mark = tok && sid
      ? fetch('/api/sessions/' + encodeURIComponent(sid), { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } }).catch(noop)
      : Promise.resolve();
    clearTokens();
    if (rt) idp('RevokeToken', { Token: rt, ClientId: CFG.clientId }).catch(noop);
    state.all = [];
    state.archived = null;
    state.page = 1;
    showSignIn(message, info);
    return mark;
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
          showSignIn(data && data.error === 'session_revoked'
            ? 'This device was signed out. Sign in again.'
            : 'Your session ended. Please sign in again.');
        }
        if (res.status === 403 && !(data && data.error)) {
          data = { message: 'Too many requests from this network. Wait a few minutes, then try again.' };
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
  var longFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  var dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  var yearFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  var dayTimeFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  // List column, like an inbox: this year's leads show day and time, older
  // ones just the date. The full date and time are in the tooltip and the lead.
  function whenList(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.getFullYear() === new Date().getFullYear() ? dayTimeFmt.format(d) : yearFmt.format(d);
  }
  function when(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '—' : longFmt.format(d);
  }
  function whenShort(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.getFullYear() === new Date().getFullYear() ? dayFmt.format(d) : yearFmt.format(d);
  }
  function fullName(s) {
    return ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || '(no name)';
  }

  var toastTimer;
  function toast(msg, bad) {
    var t = $('toast');
    t.textContent = msg;
    if (t.showPopover) {
      try { t.hidePopover(); } catch (e) { /* was not showing */ }
      t.showPopover();   // top layer, so it shows above an open dialog
    }
    t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.className = 'toast';
      if (t.hidePopover) setTimeout(function () { try { t.hidePopover(); } catch (e) { /* ignore */ } }, 250);
    }, 3200);
  }

  // --------------------------------------------------------------- state
  var state = { all: [], archived: null, showArchived: false, search: '', sortKey: 'createdAt', sortDir: 'desc',
    current: null, page: 1, pageSize: Number(prefs.get('atl.pageSize')) || 50 };

  (function restoreSort() {
    var saved = String(prefs.get('atl.sort') || '').split(':');
    if (L.SORT_KEYS.indexOf(saved[0]) !== -1 && (saved[1] === 'asc' || saved[1] === 'desc')) {
      state.sortKey = saved[0];
      state.sortDir = saved[1];
    }
  })();

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
    $('count').textContent = 'Loading…';
    return (state.showArchived ? loadAll(true) : loadAll(false)).then(function (rows) {
      if (state.showArchived) state.archived = rows; else state.all = rows;
      render();
    }).catch(function (e) {
      if (e.status !== 401) { $('count').textContent = ''; toast(e.message, true); }
    });
  }

  var SEARCHED = ['firstName', 'lastName', 'email', 'phone', 'territory', 'message', 'notes'];
  function visible() {
    var base = state.showArchived ? (state.archived || []) : state.all;
    var q = state.search.trim().toLowerCase();
    if (q) {
      base = base.filter(function (s) {
        return fullName(s).toLowerCase().indexOf(q) !== -1 || SEARCHED.some(function (k) {
          return String(s[k] || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }
    return L.sortRows(base, state.sortKey, state.sortDir);
  }

  function replaceLocal(s) {
    function notIt(x) { return x.submissionId !== s.submissionId; }
    state.all = state.all.filter(notIt);
    if (state.archived) state.archived = state.archived.filter(notIt);
    if (s.archivedAt) { if (state.archived) state.archived.push(s); }
    else state.all.push(s);
  }

  // -------------------------------------------------------------- render
  function render() {
    var rows = visible();
    var pg = L.paginate(rows.length, state.page, state.pageSize);
    state.page = pg.page;
    state.pageSize = pg.size;
    $('rows').replaceChildren.apply($('rows'), rows.slice(pg.start, pg.end).map(rowFor));
    $('pager').hidden = rows.length <= L.PAGE_SIZES[0];
    $('page-info').textContent = 'Page ' + pg.page + ' of ' + pg.pages;
    $('page-prev').disabled = pg.page <= 1;
    $('page-next').disabled = pg.page >= pg.pages;
    $('page-size').value = String(pg.size);
    renderSort();
    $('archived-banner').hidden = !state.showArchived;
    $('view-archived').setAttribute('aria-pressed', state.showArchived ? 'true' : 'false');

    var total = (state.showArchived ? (state.archived || []) : state.all).length;
    var noun = state.showArchived ? 'archived lead' : 'lead';
    $('count').textContent = (state.search.trim()
      ? rows.length + ' of ' + total + ' ' + noun + (total === 1 ? '' : 's') + ' match'
      : total + ' ' + noun + (total === 1 ? '' : 's')) +
      (pg.pages > 1 ? ' · showing ' + (pg.start + 1) + '–' + pg.end : '');

    var empty = !rows.length;
    $('empty').hidden = !empty;
    if (empty) {
      $('empty').textContent = state.search.trim() ? 'No leads match “' + state.search.trim() + '”.'
        : state.showArchived ? 'Nothing archived.' : 'No leads yet. New franchise inquiries will show up here.';
    }
  }

  function renderSort() {
    document.querySelectorAll('.list th').forEach(function (th) {
      var b = th.querySelector('button');
      if (!b) return;
      var key = b.dataset.sort;
      if (key === state.sortKey) th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });
    $('sort').value = state.sortKey + ':' + state.sortDir;
  }

  function goToPage(n) {
    state.page = n;
    render();
    window.scrollTo(0, 0);   // back to the toolbar, clear of the sticky header
  }

  function setSort(key, dir) {
    state.page = 1;
    state.sortKey = key;
    state.sortDir = dir;
    prefs.set('atl.sort', key + ':' + dir);
    render();
  }

  // Reply: Gmail in a new tab on a computer; the device's mail app (the Gmail
  // app, usually) on a phone. Either way the draft is addressed, titled and
  // quotes their message.
  var desktop = window.matchMedia('(hover: hover) and (pointer: fine)');
  function onReply(draft) {
    return function (e) {
      e.stopPropagation();                     // a list row would open the lead
      if (desktop.matches) {
        e.preventDefault();
        window.open(draft.gmail, '_blank', 'noopener,noreferrer');
      }
    };
  }
  function replyButton(s, cls) {
    var draft = L.replyDraft(s, when(s.createdAt));
    if (!draft) return null;
    return el('a', { class: cls, href: draft.mailto, onclick: onReply(draft),
      'aria-label': 'Reply to ' + fullName(s) }, 'Reply');
  }

  function rowFor(s) {
    function open() { openDetail(s.submissionId); }
    var meta = [s.territory, s.phone].filter(Boolean).join(' · ') || s.email || '';
    return el('tr', {
      tabindex: '0',
      onclick: open,
      onkeydown: function (e) {
        if (e.target !== e.currentTarget) return;   // Enter on the Reply button
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      },
    },
    el('td', { class: 'c-date' },
      el('span', { class: 'd-long', title: when(s.createdAt) }, whenList(s.createdAt)),
      el('span', { class: 'd-short' }, whenShort(s.createdAt))),
    el('td', { class: 'c-name' }, fullName(s)),
    el('td', { class: 'c-state' }, s.territory || '—'),
    el('td', { class: 'c-email' }, s.email || '—'),
    el('td', { class: 'c-phone' }, s.phone || '—'),
    el('td', { class: 'c-meta' }, meta),
    el('td', { class: 'c-msg' }, L.preview(s.message) || 'No message'),
    el('td', { class: 'c-reply' }, replyButton(s, 'btn btn-sm reply')));
  }

  // -------------------------------------------------------------- detail
  function openDetail(id) {
    return api('GET', '/submissions/' + encodeURIComponent(id)).then(function (res) {
      state.current = res.submission;
      fillDetail(res.submission, res.history || []);
      if (!$('detail').open) {
        $('detail').showModal();
        $('detail').scrollTop = 0;
      }
    }).catch(function (e) { if (e.status !== 401) toast(e.message, true); });
  }

  function fillDetail(s, history) {
    $('d-name').textContent = fullName(s);
    $('d-received').textContent = 'Received ' + when(s.createdAt) + (s.archivedAt ? ' · Archived' : '');
    var reply = $('d-reply-btn'), call = $('d-call-btn'), draft = L.replyDraft(s, when(s.createdAt));
    reply.hidden = !draft;
    if (draft) {
      reply.href = draft.mailto;
      reply.onclick = onReply(draft);
    }
    var digits = String(s.phone || '').replace(/[^\d+]/g, '');
    call.hidden = !digits;
    if (digits) call.href = 'tel:' + digits;
    $('d-email').replaceChildren(s.email ? el('a', { href: 'mailto:' + s.email }, s.email) : '—');
    $('d-phone').textContent = s.phone || '—';
    $('d-territory').textContent = s.territory || '—';
    $('d-source').textContent = s.source === 'import' ? 'Imported' : s.source === 'manual' ? 'Added by hand' : 'Website form';
    $('d-message').textContent = s.message || 'No message.';
    $('d-notes').value = s.notes || '';
    $('d-archive').textContent = s.archivedAt ? 'Move back to leads' : 'Archive';
    var items = history.length ? history.map(historyItem) : [el('li', { class: 'muted' }, 'No changes yet.')];
    $('d-history').replaceChildren.apply($('d-history'), items);
  }

  function describeChange(k, c) {
    if (k === 'notes') return c.to ? 'Notes updated' : 'Notes cleared';
    if (k === 'archived') return c.to ? 'Archived' : 'Moved back to leads';
    if (k === 'status') return 'Status changed';
    if (k === 'lastContactedAt') return 'Last contacted changed';
    return k;
  }

  function historyItem(h) {
    var what = h.action === 'create'
      ? ((h.changes || {}).source === 'import' ? 'Imported' : 'Added')
      : Object.keys(h.changes || {}).map(function (k) { return describeChange(k, h.changes[k]); }).join('; ');
    return el('li', null,
      el('div', null, what),
      el('div', { class: 'when' }, when(String(h.at || '').split('#')[0]) + ' · ' + (h.actor || '')));
  }

  function notesEdit() {
    var notes = $('d-notes').value.replace(/\s+$/, '');
    return notes !== (state.current.notes || '') ? { notes: notes } : {};
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
    ['phone', 'Phone'], ['territory', 'State'], ['message', 'Message'], ['notes', 'Notes'],
    ['source', 'Source'], ['submissionId', 'ID'],
  ];

  function exportCsv() {
    var rows = visible();
    if (!rows.length) { toast('Nothing to export'); return; }
    var csv = L.toCsv(rows.map(function (s) {
      return Object.assign({}, s, { source: s.source || 'website form' });
    }), EXPORT_COLUMNS);
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = el('a', { href: url, download: 'atl-franchise-leads-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // ------------------------------------------------------------- account
  function ago(iso) {
    var secs = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(secs)) return '—';
    if (secs < 90) return 'just now';
    if (secs < 3600) return Math.round(secs / 60) + ' min ago';
    if (secs < 86400) return Math.round(secs / 3600) + ' h ago';
    var days = Math.round(secs / 86400);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  var STATUS_TEXT = { active: 'Active', signed_out: 'Signed out', expired: 'Expired' };

  function deviceItem(s) {
    var place = [s.city, s.region, s.country].filter(Boolean).join(', ');
    var ip = s.lastIp ? 'IP\u00a0' + s.lastIp + (s.firstIp && s.firstIp !== s.lastIp ? ' (signed in from ' + s.firstIp + ')' : '') : '';
    var kind = s.device && s.device !== 'Unknown' ? s.device : '';
    var side = [s.current ? el('span', { class: 'tag current' }, 'This device') : null,
      el('span', { class: 'tag ' + s.status }, STATUS_TEXT[s.status] || s.status)];
    if (s.status === 'active') {
      side.push(el('button', { class: 'btn btn-sm btn-outline', type: 'button',
        onclick: function () { revokeDevice(s); } }, 'Sign out'));
    }
    return el('li', { class: 'device' + (s.current ? ' is-current' : '') + (s.status !== 'active' ? ' is-off' : '') },
      el('div', { class: 'device-name' }, (s.browser || 'Unknown browser') + ' on ' + (s.os || 'unknown system')),
      el('div', { class: 'device-side' }, side),
      el('div', { class: 'device-meta' }, [kind, place, ip].filter(Boolean).join(' · ') || 'Location unknown'),
      el('div', { class: 'device-meta' }, 'Signed in ' + when(s.signedInAt) + ' · active ' + ago(s.lastSeenAt) +
        (s.username ? ' · ' + s.username : '')),
      s.revokedAt ? el('div', { class: 'device-meta' }, 'Signed out ' + when(s.revokedAt) + (s.revokedBy ? ' by ' + s.revokedBy : '')) : null);
  }

  function loadSessions() {
    $('device-list').replaceChildren(el('li', { class: 'muted' }, 'Loading…'));
    return api('GET', '/sessions').then(function (res) {
      // This device first, then other active ones, newest first; past
      // sign-ins fold away under "Earlier sign-ins".
      var list = (res.sessions || []).slice().sort(function (a, b) {
        return (b.current - a.current) || ((b.status === 'active') - (a.status === 'active')) ||
          String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
      });
      var live = list.filter(function (x) { return x.status === 'active'; });
      var past = list.filter(function (x) { return x.status !== 'active'; });
      var items = live.map(deviceItem);
      if (past.length) {
        items.push(el('li', { class: 'past' }, el('details', { class: 'history' },
          el('summary', null, 'Earlier sign-ins (' + past.length + ')'),
          el('ul', { class: 'devices' }, past.map(deviceItem)))));
      }
      if (!items.length) items = [el('li', { class: 'muted' }, 'No sign-ins recorded yet.')];
      $('device-list').replaceChildren.apply($('device-list'), items);
      $('revoke-others').disabled = !list.some(function (s) { return !s.current && s.status === 'active'; });
    }).catch(function (e) {
      if (e.status !== 401) $('device-list').replaceChildren(el('li', { class: 'error' }, e.message));
    });
  }

  function revokeDevice(s) {
    if (s.current) { signOut('Signed out.', true); return; }
    api('DELETE', '/sessions/' + encodeURIComponent(s.id)).then(function () {
      toast('Device signed out');
      return loadSessions();
    }).catch(function (e) { if (e.status !== 401) toast(e.message, true); });
  }

  function revokeOthers() {
    api('POST', '/sessions/revoke-others').then(function (r) {
      toast(r.revoked === 1 ? '1 device signed out' : r.revoked + ' devices signed out');
      return loadSessions();
    }).catch(function (e) { if (e.status !== 401) toast(e.message, true); });
  }

  function openAccount() {
    $('account-who').textContent = 'Signed in as ' + username();
    $('pw-username').value = username();
    show('pw-error', '');
    $('account').showModal();
    loadSessions();
  }

  // Change the password with Cognito. "Sign out every device" then signs
  // every other device out in the log, revokes every refresh token with
  // Cognito (GlobalSignOut) and signs this tab out, so the new password is
  // needed everywhere, here included.
  function onChangePassword(e) {
    e.preventDefault();
    var form = $('password-form'), cur = $('pw-current').value, nw = $('pw-new').value, again = $('pw-confirm').value;
    show('pw-error', '');
    if (!cur || !nw) { show('pw-error', 'Fill in your current and new password.'); return; }
    if (nw.length < 10 || !/\d/.test(nw)) { show('pw-error', 'Use at least 10 characters, including a number.'); return; }
    if (nw !== again) { show('pw-error', 'The two new passwords do not match.'); return; }
    if (nw === cur) { show('pw-error', 'Pick a password you have not just used.'); return; }
    var everywhere = $('pw-signout').checked;
    busy(form, true);
    accessToken().then(function (tok) {
      if (!tok) throw new Error('Your session ended. Sign in again.');
      return idp('ChangePassword', { AccessToken: tok, PreviousPassword: cur, ProposedPassword: nw });
    }).then(function () {
      ['pw-current', 'pw-new', 'pw-confirm'].forEach(function (id) { $(id).value = ''; });
      if (!everywhere) { toast('Password changed'); return null; }
      return api('POST', '/sessions/revoke-others').catch(noop)
        .then(accessToken)
        .then(function (tok) { return tok ? idp('GlobalSignOut', { AccessToken: tok }).catch(noop) : null; })
        .then(function () { return signOut('Password changed. Sign in with your new password.', true); });
    }).catch(function (err) {
      var msg = err.message;
      if (err.code === 'NotAuthorizedException' && !/attempts/i.test(msg)) msg = 'Your current password is not right.';
      show('pw-error', msg);
    }).then(function () { busy(form, false, 'Change password'); });
  }

  // Sign out after an hour without a click, tap or key press.
  var IDLE_LIMIT_MS = 60 * 60 * 1000, lastActive = Date.now();
  function noteActivity() { lastActive = Date.now(); }
  function checkIdle() {
    if (!$('app').hidden && Date.now() - lastActive > IDLE_LIMIT_MS) {
      signOut('Signed out after an hour without activity.', true);
    }
  }

  // --------------------------------------------------------------- wiring
  function wire() {
    $('signin-form').addEventListener('submit', onSignIn);
    $('challenge-form').addEventListener('submit', onChallenge);
    $('challenge-cancel').addEventListener('click', startOver);
    $('signout').addEventListener('click', function () { signOut(); });

    var sel = $('sort');
    sel.replaceChildren.apply(sel, L.SORTS.map(function (s) { return el('option', { value: s[0] + ':' + s[1] }, s[2]); }));
    sel.addEventListener('change', function () {
      var v = sel.value.split(':');
      setSort(v[0], v[1]);
    });
    document.querySelectorAll('.list th button').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.dataset.sort;
        if (key === state.sortKey) setSort(key, state.sortDir === 'asc' ? 'desc' : 'asc');
        else setSort(key, L.defaultDir(key));
      });
    });

    $('search').addEventListener('input', function () { state.search = $('search').value; state.page = 1; render(); });
    var size = $('page-size');
    size.replaceChildren.apply(size, L.PAGE_SIZES.map(function (n) { return el('option', { value: String(n) }, String(n)); }));
    size.addEventListener('change', function () {
      state.pageSize = Number(size.value);
      prefs.set('atl.pageSize', size.value);
      state.page = 1;
      render();
    });
    $('page-prev').addEventListener('click', function () { goToPage(state.page - 1); });
    $('page-next').addEventListener('click', function () { goToPage(state.page + 1); });
    $('account-btn').addEventListener('click', openAccount);
    $('signout-2').addEventListener('click', function () { signOut(); });
    $('revoke-others').addEventListener('click', revokeOthers);
    $('password-form').addEventListener('submit', onChangePassword);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, noteActivity, { capture: true, passive: true });
    });
    setInterval(checkIdle, 30000);
    document.addEventListener('visibilitychange', checkIdle);
    $('refresh').addEventListener('click', refresh);
    $('export').addEventListener('click', exportCsv);
    $('view-archived').addEventListener('click', function () {
      state.showArchived = !state.showArchived;
      state.page = 1;
      if (state.showArchived && !state.archived) refresh(); else render();
    });
    $('back-to-inbox').addEventListener('click', function () {
      state.showArchived = false;
      state.page = 1;
      render();
    });

    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    document.querySelectorAll('dialog').forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });   // backdrop
    });

    $('d-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.current) return;
      var patch = notesEdit();
      if (!Object.keys(patch).length) { toast('Nothing changed'); return; }
      saveChange(patch, 'Notes saved');
    });
    $('d-archive').addEventListener('click', function () {
      if (!state.current) return;
      var patch = notesEdit();                  // keep anything typed but not saved
      patch.archived = !state.current.archivedAt;
      saveChange(patch, patch.archived ? 'Archived' : 'Moved back to leads');
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

  // info: a neutral notice ("Signed out.") rather than a problem.
  function showSignIn(msg, info) {
    document.title = 'Sign in';
    document.querySelectorAll('dialog[open]').forEach(function (d) { d.close(); });
    pending = null;
    $('app').hidden = true;
    $('signin').hidden = false;
    $('challenge-form').hidden = true;
    $('signin-form').hidden = false;
    show('signin-error', msg || '');
    $('signin-error').classList.toggle('info', !!info);
    setTimeout(function () { ($('username').value ? $('password') : $('username')).focus(); }, 0);
  }

  function enterApp() {
    document.title = 'Leads';
    lastActive = Date.now();
    $('signin').hidden = true;
    $('app').hidden = false;
    $('who').textContent = username();
    return refresh();
  }

  function boot() {
    if (!CFG.clientId) {
      show('signin-error', 'This page is not set up yet (config.js is missing).');
      $('signin').hidden = false;
      $('signin-form').querySelector('button').disabled = true;
      return;
    }
    wire();
    renderSort();
    accessToken().then(function (tok) {
      if (tok) return enterApp();
      showSignIn();
    });
  }

  boot();
})();

/*
 * Sign-in for the dashboard, and the loader for everything behind it.
 *
 * This is the only script anyone gets before signing in. The username and
 * password go straight to Amazon Cognito's API over HTTPS (InitiateAuth,
 * USER_PASSWORD_AUTH); the password is cleared from the form as soon as it
 * has been sent. Tokens live in sessionStorage, so closing the tab signs out.
 *
 * The dashboard itself (its markup, code and styles) is not public. After a
 * sign-in, loadApp() asks the API for a one-time pass (valid two minutes),
 * fetches the private files with it from /api/app/, and drops the pass. The
 * only way those files reach the page is through the "atl-loader" Trusted
 * Types policy below, which the Content-Security-Policy names as the only one
 * allowed.
 */
(function () {
  'use strict';

  var CFG = window.ATL_CONFIG || {};
  var IDP = 'https://cognito-idp.' + (CFG.region || 'us-east-1') + '.amazonaws.com/';
  var APP = '/api/app/';
  var APP_SCRIPTS = [APP + 'lib.js', APP + 'app.js'];

  function $(id) { return document.getElementById(id); }
  function show(id, msg) { var e = $(id); e.textContent = msg || ''; e.hidden = !msg; }

  // ------------------------------------------------------------- storage
  var session = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  // Only for the remembered sort order, a per-browser convenience.

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

  // Leave the dashboard: forget the tokens and reload, so nothing from behind
  // the sign-in (markup, code, data) stays in the page. The message shows on
  // the fresh sign-in screen.
  function leave(message, info) {
    clearTokens();
    session.set('flash', JSON.stringify({ m: message || '', i: !!info }));
    location.replace('/');
  }

  // Marks this sign-in as signed out in the device log and revokes the
  // refresh token with Cognito (waiting at most a couple of seconds), then
  // leaves.
  function signOut(message, info) {
    var rt = session.get('refresh_token'), tok = session.get('access_token'), sid = currentSessionId();
    var jobs = [];
    if (tok && sid) {
      jobs.push(fetch('/api/sessions/' + encodeURIComponent(sid),
        { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok }, keepalive: true }).catch(noop));
    }
    if (rt) jobs.push(idp('RevokeToken', { Token: rt, ClientId: CFG.clientId }).catch(noop));
    var wait = new Promise(function (r) { setTimeout(r, 2500); });
    return Promise.race([Promise.all(jobs), wait]).then(function () {
      leave(message === undefined ? 'Signed out.' : message, message === undefined ? true : info);
    });
  }

  // ------------------------------------------------------------- loader
  var policy = null;
  function loaderPolicy() {
    if (policy || !window.trustedTypes || !window.trustedTypes.createPolicy) return policy;
    policy = window.trustedTypes.createPolicy('atl-loader', {
      // Only the dashboard's own two scripts, from the gated path.
      createScriptURL: function (url) {
        if (APP_SCRIPTS.indexOf(url) === -1) throw new Error('Blocked script ' + url);
        return url;
      },
      // Only ever called with the markup fetched from /api/app/app.html.
      createHTML: function (html) { return html; },
    });
    return policy;
  }

  function setPass(value, seconds) {
    document.cookie = 'atl_app=' + value + '; Path=' + APP + '; Max-Age=' + seconds + '; Secure; SameSite=Strict';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var p = loaderPolicy();
      s.src = p ? p.createScriptURL(src) : src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('load ' + src)); };
      document.head.append(s);
    });
  }

  function loadCss(href) {
    return new Promise(function (resolve, reject) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = resolve;
      l.onerror = function () { reject(new Error('load ' + href)); };
      document.head.append(l);
    });
  }

  function loadApp() {
    return accessToken().then(function (tok) {
      if (!tok) throw new Error('signed out');
      return fetch('/api/app-ticket', { method: 'POST', headers: { Authorization: 'Bearer ' + tok } });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) {
          var err = new Error('signed out');
          err.revoked = data.error === 'session_revoked';
          throw err;
        }
        if (!res.ok || !data.ticket) throw new Error('ticket ' + res.status);
        return data.ticket;
      });
    }).then(function (ticket) {
      setPass(ticket, 120);
      return Promise.all([
        loadCss(APP + 'app.css'),
        fetch(APP + 'app.html', { credentials: 'same-origin' }).then(function (r) {
          if (!r.ok) throw new Error('load app.html');
          return r.text();
        }),
      ]);
    }).then(function (parts) {
      var p = loaderPolicy();
      $('app-root').innerHTML = p ? p.createHTML(parts[1]) : parts[1];
      return loadScript(APP_SCRIPTS[0]).then(function () { return loadScript(APP_SCRIPTS[1]); });
    }).then(function () {
      setPass('', 0);
    }, function (err) {
      setPass('', 0);
      throw err;
    });
  }

  // ------------------------------------------------------------- screens
  // info: a neutral notice ("Signed out.") rather than a problem.
  function showSignIn(msg, info) {
    document.title = 'Sign in';
    pending = null;
    $('signin').hidden = false;
    $('challenge-form').hidden = true;
    $('signin-form').hidden = false;
    show('signin-error', msg || '');
    $('signin-error').classList.toggle('info', !!info);
    setTimeout(function () { ($('username').value ? $('password') : $('username')).focus(); }, 0);
  }

  function enterApp() {
    $('signin').hidden = true;
    return loadApp().then(function () {
      window.ATL_APP.start();
    }).catch(function (err) {
      leave(err && err.revoked ? 'This device was signed out. Sign in again.'
        : 'Could not open the dashboard. Sign in again.');
    });
  }

  window.ATL_AUTH = {
    accessToken: accessToken,
    idp: idp,
    busy: busy,
    username: username,
    currentSessionId: currentSessionId,
    signOut: signOut,
    leave: leave,
    noop: noop,
  };

  function boot() {
    if (!CFG.clientId) {
      show('signin-error', 'This page is not set up yet.');
      $('signin').hidden = false;
      $('signin-form').querySelector('button').disabled = true;
      return;
    }
    $('signin-form').addEventListener('submit', onSignIn);
    $('challenge-form').addEventListener('submit', onChallenge);
    $('challenge-cancel').addEventListener('click', startOver);
    var flash = null;
    try { flash = JSON.parse(session.get('flash') || 'null'); } catch (e) { flash = null; }
    session.del('flash');
    accessToken().then(function (tok) {
      if (tok) return enterApp();
      showSignIn(flash && flash.m, flash && flash.i);
    });
  }

  boot();
})();

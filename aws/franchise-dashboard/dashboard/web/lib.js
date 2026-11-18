/*
 * Pure helpers for the dashboard: CSV in and out, column matching, date and
 * status clean-up. No DOM and no network, so they run under Node for tests.
 */
(function (root) {
  'use strict';

  var STATUSES = [
    ['new', 'New'],
    ['contacted', 'Contacted'],
    ['qualified', 'Qualified'],
    ['discovery', 'Discovery call'],
    ['fdd_sent', 'FDD sent'],
    ['signed', 'Signed'],
    ['declined', 'Declined'],
  ];

  var LIMITS = { firstName: 100, lastName: 100, email: 254, phone: 40, territory: 120, message: 4000, notes: 10000 };

  // Column names people actually use, after normKey() (lower case, letters
  // and digits only). "First Name", "first_name" and "FIRST NAME" all match.
  var ALIASES = {
    firstName: ['firstname', 'first', 'fname', 'givenname'],
    lastName: ['lastname', 'last', 'lname', 'surname', 'familyname'],
    fullName: ['name', 'fullname', 'applicant', 'contactname'],
    email: ['email', 'emailaddress', 'mail', 'email1'],
    phone: ['phone', 'phonenumber', 'tel', 'telephone', 'mobile', 'cell'],
    territory: ['territory', 'state', 'stateterritory', 'stateorterritory', 'location', 'market', 'region', 'area'],
    message: ['message', 'comments', 'comment', 'inquiry', 'enquiry', 'details'],
    createdAt: ['date', 'received', 'receivedon', 'receivedat', 'datereceived', 'submitted', 'submittedat',
      'submittedon', 'createdat', 'timestamp'],
    status: ['status', 'stage'],
    notes: ['notes', 'note', 'internalnotes'],
  };
  var FIELD_BY_ALIAS = {};
  Object.keys(ALIASES).forEach(function (field) {
    ALIASES[field].forEach(function (a) { FIELD_BY_ALIAS[a] = field; });
  });

  var EMAIL_RE = /^[^\s@<>,;:\\"]{1,64}@[A-Za-z0-9.-]{1,252}\.[A-Za-z]{2,}$/;

  function normKey(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /* RFC 4180-ish: quoted fields, "" escapes, commas and newlines inside quotes,
     CRLF/LF/CR line ends, a leading byte-order mark. Blank lines are dropped. */
  function parseCsv(text) {
    text = String(text || '');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    var rows = [], row = [], field = '', quoted = false, i = 0, c;
    while (i < text.length) {
      c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"' && field === '') { quoted = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = ''; i++; continue;
      }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return v.trim() !== ''; }); });
  }

  function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

  function ymd(y, m, d) {
    y = +y; m = +m; d = +d;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return y + '-' + pad(m) + '-' + pad(d);
  }

  /* '' when empty, null when unreadable, otherwise YYYY-MM-DD or a UTC ISO
     date-time the API accepts. US order for slashes (3/14/2026). */
  function normalizeDate(s) {
    s = String(s == null ? '' : s).trim();
    if (!s) return '';
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return ymd(m[1], m[2], m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (m) return ymd(m[3].length === 2 ? '20' + m[3] : m[3], m[1], m[2]);
    if (!/\d{4}/.test(s)) return null;          // refuse "yesterday", "Tuesday"…
    var t = Date.parse(s);
    if (isNaN(t)) return null;
    return new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  /* '' when empty, null when unknown, otherwise a status key. Accepts keys
     ("fdd_sent") and labels ("FDD sent", "Discovery call"). */
  function normalizeStatus(s) {
    var k = normKey(s);
    if (!k) return '';
    for (var i = 0; i < STATUSES.length; i++) {
      if (normKey(STATUSES[i][0]) === k || normKey(STATUSES[i][1]) === k) return STATUSES[i][0];
    }
    if (k === 'discovery' || k === 'discoverycall') return 'discovery';
    return null;
  }

  // Undo the spreadsheet guard that toCsv adds, so exports re-import cleanly.
  function unguard(v) {
    return /^'[=+\-@]/.test(v) ? v.slice(1) : v;
  }

  /* -> { rows: [{line, data, errors}], unmapped: [header…], error? } */
  function rowsFromCsv(text) {
    var table = parseCsv(text);
    if (!table.length) return { rows: [], unmapped: [], error: 'The file is empty.' };
    var headers = table[0], map = {}, used = {}, unmapped = [];
    headers.forEach(function (h, i) {
      var field = FIELD_BY_ALIAS[normKey(h)];
      if (field && !used[field]) { map[i] = field; used[field] = true; }
      else if (String(h).trim()) unmapped.push(String(h).trim());
    });
    if (!used.email) {
      return { rows: [], unmapped: unmapped, error: 'No Email column found. Check the first row has column names.' };
    }

    var rows = table.slice(1).map(function (cells, n) {
      var raw = {};
      Object.keys(map).forEach(function (i) { raw[map[i]] = unguard(String(cells[i] == null ? '' : cells[i]).trim()); });
      var data = {}, errors = [];

      var first = raw.firstName || '', last = raw.lastName || '';
      if (!first && !last && raw.fullName) {
        var parts = raw.fullName.split(/\s+/);
        last = parts.length > 1 ? parts.pop() : '';
        first = parts.join(' ');
      }
      if (first) data.firstName = first; else errors.push('first name');
      if (last) data.lastName = last; else errors.push('last name');

      if (!raw.email) errors.push('email');
      else if (!EMAIL_RE.test(raw.email)) errors.push('email');
      else data.email = raw.email;

      ['phone', 'territory', 'message', 'notes'].forEach(function (f) { if (raw[f]) data[f] = raw[f]; });

      var d = normalizeDate(raw.createdAt);
      if (d === null) errors.push('date');
      else if (d) data.createdAt = d;

      var st = normalizeStatus(raw.status);
      if (st === null) errors.push('status');
      else if (st) data.status = st;

      Object.keys(LIMITS).forEach(function (f) {
        if (data[f] && data[f].length > LIMITS[f]) { errors.push(f + ' (too long)'); delete data[f]; }
      });

      return { line: n + 2, data: data, errors: errors };
    });
    return { rows: rows, unmapped: unmapped };
  }

  /* One CSV cell. Anything starting with = + - @ gets a leading apostrophe so
     a spreadsheet shows it as text instead of running it as a formula: these
     values were typed by members of the public. */
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /* columns: [[key, header], …] */
  function toCsv(rows, columns) {
    var lines = [columns.map(function (c) { return csvCell(c[1]); }).join(',')];
    rows.forEach(function (r) {
      lines.push(columns.map(function (c) { return csvCell(r[c[0]]); }).join(','));
    });
    return lines.join('\r\n') + '\r\n';
  }

  var lib = {
    STATUSES: STATUSES,
    parseCsv: parseCsv,
    normalizeDate: normalizeDate,
    normalizeStatus: normalizeStatus,
    rowsFromCsv: rowsFromCsv,
    csvCell: csvCell,
    toCsv: toCsv,
  };
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.ATL_LIB = lib;
})(this);

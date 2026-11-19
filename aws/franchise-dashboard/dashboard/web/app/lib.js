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

  /* ------------------------------------------------------------ sorting
     File Explorer style: click a column to sort by it, click again to flip.
     Dates start newest first, text starts A to Z. Blank values always sort
     last, whichever way round, so they never crowd the top of the list. */
  var SORT_KEYS = ['createdAt', 'name', 'territory', 'email', 'phone', 'message'];
  var SORTS = [
    ['createdAt', 'desc', 'Newest first'], ['createdAt', 'asc', 'Oldest first'],
    ['name', 'asc', 'Name A–Z'], ['name', 'desc', 'Name Z–A'],
    ['territory', 'asc', 'State A–Z'], ['territory', 'desc', 'State Z–A'],
    ['email', 'asc', 'Email A–Z'], ['email', 'desc', 'Email Z–A'],
    ['phone', 'asc', 'Phone 0–9'], ['phone', 'desc', 'Phone 9–0'],
    ['message', 'asc', 'Message A–Z'], ['message', 'desc', 'Message Z–A'],
  ];
  function defaultDir(key) { return key === 'createdAt' ? 'desc' : 'asc'; }

  var collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

  function sortValue(row, key) {
    if (key === 'name') return ((row.firstName || '') + ' ' + (row.lastName || '')).trim();
    if (key === 'phone') {
      // Digits only, without a leading US country code, so "1-212-…" sorts
      // with the other 212 numbers instead of after every 10-digit one.
      var digits = String(row.phone || '').replace(/\D/g, '');
      return digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
    }
    if (key === 'message') return String(row.message || '').replace(/\s+/g, ' ').trim();
    return row[key] == null ? '' : String(row[key]).trim();
  }

  function sortRows(rows, key, dir) {
    var mult = dir === 'asc' ? 1 : -1;
    return rows.map(function (r, i) { return [sortValue(r, key), i, r]; }).sort(function (a, b) {
      var ae = a[0] === '', be = b[0] === '';
      if (ae !== be) return ae ? 1 : -1;
      var c = key === 'createdAt' ? (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0) : collator.compare(a[0], b[0]);
      return c ? c * mult : a[1] - b[1];          // stable for ties
    }).map(function (x) { return x[2]; });
  }

  /* One line of message for the list: whitespace collapsed. */
  function preview(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  /* ------------------------------------------------------------ replying
     The same draft two ways: a mailto: link (opens the device's email app,
     e.g. the Gmail app on a phone) and a Gmail compose link (opens Gmail in
     the browser). The original message is quoted underneath, trimmed so the
     link stays short enough for every mail app to accept. */
  var QUOTE_LIMIT = 800;
  var REPLY_SUBJECT = 'Re: Your ATL Wing Spot franchise inquiry';

  function enc(v) { return encodeURIComponent(v); }

  function replyDraft(row, receivedText) {
    var email = String(row.email || '').trim();
    if (!email) return null;
    var first = String(row.firstName || '').trim();
    var name = ((row.firstName || '') + ' ' + (row.lastName || '')).trim() || email;
    var msg = String(row.message || '').trim();
    if (msg.length > QUOTE_LIMIT) msg = msg.slice(0, QUOTE_LIMIT).replace(/\s+\S*$/, '') + ' …';
    var lines = ['Hi ' + (first || 'there') + ',', '', '', ''];
    if (msg) {
      lines.push((receivedText ? 'On ' + receivedText + ', ' : '') + name + ' wrote:');
      msg.split(/\r?\n/).forEach(function (l) { lines.push('> ' + l); });
    }
    return {
      to: email,
      subject: REPLY_SUBJECT,
      body: lines.join('\n'),
      // RFC 6068: line breaks in a mailto body are CRLF.
      mailto: 'mailto:' + enc(email).replace(/%40/g, '@') +
        '?subject=' + enc(REPLY_SUBJECT) + '&body=' + enc(lines.join('\r\n')),
      gmail: 'https://mail.google.com/mail/?view=cm&fs=1&to=' + enc(email) +
        '&su=' + enc(REPLY_SUBJECT) + '&body=' + enc(lines.join('\n')),
    };
  }

  /* ------------------------------------------------------------ pages
     Search, sort and the Archived view work on every lead; pages only cut
     the result into screens. */
  var PAGE_SIZES = [25, 50, 100];

  function paginate(total, page, size) {
    size = PAGE_SIZES.indexOf(size) === -1 ? 50 : size;
    var pages = Math.max(1, Math.ceil(total / size));
    page = Math.min(Math.max(1, Math.floor(page) || 1), pages);
    var start = total ? (page - 1) * size : 0;
    return { page: page, pages: pages, size: size, start: start, end: Math.min(start + size, total) };
  }

  var lib = {
    PAGE_SIZES: PAGE_SIZES,
    paginate: paginate,
    replyDraft: replyDraft,
    SORT_KEYS: SORT_KEYS,
    SORTS: SORTS,
    defaultDir: defaultDir,
    sortRows: sortRows,
    preview: preview,
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

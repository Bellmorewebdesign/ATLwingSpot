// Tests for web/lib.js.  Run from aws/franchise-dashboard/dashboard:  node --test tests/lib.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const L = require(path.join(__dirname, '..', 'web', 'lib.js'));

test('parseCsv handles quotes, escaped quotes, commas and newlines in fields', () => {
  const rows = L.parseCsv('a,b,c\r\n"x, y","He said ""hi""","line1\nline2"\n\n1,2,3');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['x, y', 'He said "hi"', 'line1\nline2'], ['1', '2', '3']]);
});

test('parseCsv strips a byte-order mark and copes with no trailing newline or lone CR', () => {
  assert.deepEqual(L.parseCsv('﻿Email\rA@B.co'), [['Email'], ['A@B.co']]);
});

test('normalizeDate', () => {
  assert.equal(L.normalizeDate(''), '');
  assert.equal(L.normalizeDate('2026-03-14'), '2026-03-14');
  assert.equal(L.normalizeDate('2026-3-4'), '2026-03-04');
  assert.equal(L.normalizeDate('3/14/2026'), '2026-03-14');
  assert.equal(L.normalizeDate('3/14/26'), '2026-03-14');
  assert.equal(L.normalizeDate('2/30/2026'), null);
  assert.equal(L.normalizeDate('2026-13-01'), null);
  assert.equal(L.normalizeDate('yesterday'), null);
  assert.equal(L.normalizeDate('2026-03-14T09:30:00Z'), '2026-03-14T09:30:00Z');
  assert.match(L.normalizeDate('Mar 14, 2026 9:30 AM'), /^2026-03-1[45]T\d\d:30:00Z$/);
});

test('normalizeStatus accepts keys and labels, refuses unknowns', () => {
  assert.equal(L.normalizeStatus(''), '');
  assert.equal(L.normalizeStatus('FDD sent'), 'fdd_sent');
  assert.equal(L.normalizeStatus('fdd_sent'), 'fdd_sent');
  assert.equal(L.normalizeStatus('Discovery call'), 'discovery');
  assert.equal(L.normalizeStatus('SIGNED'), 'signed');
  assert.equal(L.normalizeStatus('won'), null);
});

test('rowsFromCsv maps common column names and reports bad rows by line', () => {
  const csv = [
    'First Name,Last Name,Email Address,Phone Number,State,Date Received,Notes,Favourite Colour',
    'Ada,Lovelace,ada@example.com,404-555-0100,Georgia,3/14/2026,Called twice,blue',
    'Bob,,bob@example.com,,,,,',
    'Cy,Young,not-an-email,,,,,',
    'Di,Ross,di@example.com,,,someday,,',
  ].join('\n');
  const out = L.rowsFromCsv(csv);
  assert.deepEqual(out.unmapped, ['Favourite Colour']);
  assert.equal(out.rows.length, 4);
  assert.deepEqual(out.rows[0], {
    line: 2,
    errors: [],
    data: {
      firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '404-555-0100',
      territory: 'Georgia', notes: 'Called twice', createdAt: '2026-03-14',
    },
  });
  assert.deepEqual(out.rows[1].errors, ['last name']);
  assert.deepEqual(out.rows[2].errors, ['email']);
  assert.deepEqual(out.rows[3].errors, ['date']);
  assert.equal(out.rows[3].line, 5);
});

test('rowsFromCsv splits a single Name column', () => {
  const out = L.rowsFromCsv('Name,Email\nMary Ann Smith,m@example.com\nCher,c@example.com');
  assert.equal(out.rows[0].data.firstName, 'Mary Ann');
  assert.equal(out.rows[0].data.lastName, 'Smith');
  assert.deepEqual(out.rows[1].errors, ['last name']);
});

test('rowsFromCsv needs an Email column', () => {
  assert.match(L.rowsFromCsv('Name,Phone\nA B,1').error, /No Email column/);
  assert.match(L.rowsFromCsv('').error, /empty/);
});

test('csvCell neutralises spreadsheet formulas and quotes when needed', () => {
  assert.equal(L.csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(L.csvCell('+14045550100'), "'+14045550100");
  assert.equal(L.csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(L.csvCell('a,b'), '"a,b"');
  assert.equal(L.csvCell(null), '');
  assert.equal(L.csvCell('plain'), 'plain');
});

test('an export re-imports to the same data', () => {
  const cols = [['createdAt', 'Received'], ['firstName', 'First name'], ['lastName', 'Last name'],
    ['email', 'Email'], ['phone', 'Phone'], ['territory', 'State / territory'], ['message', 'Message'],
    ['status', 'Status'], ['notes', 'Notes']];
  const rows = [{
    createdAt: '2026-03-14T09:30:00Z', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',
    phone: '+1 404 555 0100', territory: 'Georgia', message: 'Two units,\n"soon"', status: 'FDD sent',
    notes: '=not a formula',
  }];
  const back = L.rowsFromCsv(L.toCsv(rows, cols)).rows[0];
  assert.deepEqual(back.errors, []);
  assert.deepEqual(back.data, {
    createdAt: '2026-03-14T09:30:00Z', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',
    phone: '+1 404 555 0100', territory: 'Georgia', message: 'Two units,\n"soon"', status: 'fdd_sent',
    notes: '=not a formula',
  });
});

const ROWS = [
  { submissionId: 'a', createdAt: '2026-11-01T10:00:00Z', firstName: 'dana', lastName: 'Okafor', territory: 'New Jersey', phone: '(516) 555-0142', message: 'Two units' },
  { submissionId: 'b', createdAt: '2026-11-03T10:00:00Z', firstName: 'Ana', lastName: 'Diaz', territory: '', phone: '404-555-0100', message: '' },
  { submissionId: 'c', createdAt: '2026-10-20T10:00:00Z', firstName: 'Lee', lastName: 'Park', territory: 'Georgia', phone: '', message: 'about 10 stores' },
  { submissionId: 'd', createdAt: '2026-11-02T10:00:00Z', firstName: 'Lee', lastName: 'Adams', territory: 'georgia', phone: '1-212-555-0199', message: 'about 9 stores' },
];
const ids = (rows) => rows.map((r) => r.submissionId).join('');

test('sortRows by date both ways', () => {
  assert.equal(ids(L.sortRows(ROWS, 'createdAt', 'desc')), 'bdac');
  assert.equal(ids(L.sortRows(ROWS, 'createdAt', 'asc')), 'cadb');
});

test('sortRows by name ignores case and is stable for ties', () => {
  assert.equal(ids(L.sortRows(ROWS, 'name', 'asc')), 'badc');
  assert.equal(ids(L.sortRows(ROWS, 'name', 'desc')), 'cdab');
});

test('blank values sort last whichever way round', () => {
  assert.equal(ids(L.sortRows(ROWS, 'territory', 'asc')), 'cdab');
  assert.equal(ids(L.sortRows(ROWS, 'territory', 'desc')).slice(-1), 'b');
  assert.equal(ids(L.sortRows(ROWS, 'message', 'asc')).slice(-1), 'b');
  assert.equal(ids(L.sortRows(ROWS, 'message', 'desc')).slice(-1), 'b');
});

test('numbers inside text sort naturally, phone sorts by digits', () => {
  assert.equal(ids(L.sortRows(ROWS, 'message', 'asc')).slice(0, 2), 'dc');   // 9 before 10
  assert.equal(ids(L.sortRows(ROWS, 'phone', 'asc')), 'dbac');
});

test('sortRows does not change the input', () => {
  const copy = ROWS.slice();
  L.sortRows(ROWS, 'name', 'asc');
  assert.deepEqual(ROWS, copy);
});

test('every sort option is a known key and direction', () => {
  for (const [k, d] of L.SORTS) {
    assert.ok(L.SORT_KEYS.includes(k));
    assert.ok(d === 'asc' || d === 'desc');
  }
  assert.equal(L.defaultDir('createdAt'), 'desc');
  assert.equal(L.defaultDir('name'), 'asc');
});

test('preview collapses whitespace', () => {
  assert.equal(L.preview('  Hi,\n\n  two units\tplease '), 'Hi, two units please');
  assert.equal(L.preview(null), '');
});

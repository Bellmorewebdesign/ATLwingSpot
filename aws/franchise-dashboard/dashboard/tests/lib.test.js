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

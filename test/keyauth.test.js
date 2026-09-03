const test = require('node:test');
const assert = require('node:assert/strict');
const { extractLicenseKey } = require('../src/keyauth');

test('extracts a KeyAuth string response', () => {
  assert.equal(extractLicenseKey('  MNX-TEST-KEY  '), 'MNX-TEST-KEY');
});

test('extracts a KeyAuth license record response', () => {
  assert.equal(extractLicenseKey({ key: 'MNX-RECOVERED-KEY', note: 'order' }), 'MNX-RECOVERED-KEY');
});

test('rejects an empty KeyAuth response', () => {
  assert.equal(extractLicenseKey({ key: '' }), null);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLicenseKey } = require('../src/license-redemption');

test('normalizes a pasted license key', () => {
  assert.equal(normalizeLicenseKey('  MNX-ABCD-1234  '), 'MNX-ABCD-1234');
});

test('rejects whitespace inside a license key', () => {
  assert.throws(() => normalizeLicenseKey('MNX ABCD 1234'), /valid license key/);
});

test('rejects an empty license key', () => {
  assert.throws(() => normalizeLicenseKey(''), /valid license key/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { versionAtLeast } = require('../src/app-auth');

test('free desktop minimum version comparison rejects older clients', () => {
  assert.equal(versionAtLeast('1.15.0', '1.15.1'), false);
  assert.equal(versionAtLeast('1.15.1', '1.15.1'), true);
  assert.equal(versionAtLeast('1.16.0', '1.15.1'), true);
  assert.equal(versionAtLeast('1.14.99', '1.15.1'), false);
});

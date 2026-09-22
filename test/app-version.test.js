const test = require('node:test');
const assert = require('node:assert/strict');
const { accountAccess } = require('../src/app-auth');

test('desktop account access remains an async entitlement check', () => {
  assert.equal(typeof accountAccess, 'function');
  assert.equal(accountAccess.constructor.name, 'AsyncFunction');
});

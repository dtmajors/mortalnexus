const test = require('node:test');
const assert = require('node:assert/strict');
const { versionAtLeast, activeTrialExpiry } = require('../src/app-auth');

test('free desktop minimum version comparison rejects older clients', () => {
  assert.equal(versionAtLeast('1.15.0', '1.15.1'), false);
  assert.equal(versionAtLeast('1.15.1', '1.15.1'), true);
  assert.equal(versionAtLeast('1.16.0', '1.15.1'), true);
  assert.equal(versionAtLeast('1.14.99', '1.15.1'), false);
});

test('premium trial access ends at its exact expiry time', () => {
  const now = Date.parse('2026-09-10T12:00:00.000Z');
  assert.equal(activeTrialExpiry('2026-09-10T11:59:59.999Z', now), null);
  assert.equal(activeTrialExpiry('2026-09-10T12:00:00.000Z', now), null);
  assert.equal(activeTrialExpiry('2026-09-11T12:00:00.000Z', now).toISOString(), '2026-09-11T12:00:00.000Z');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { BLOCK_MESSAGE, isPrivateAddress, lookupIpReputation, assertSignupAllowed } = require('../src/ip-reputation');

test('private and local addresses do not call the external network service', async () => {
  await db.initializeDatabase();
  assert.equal(isPrivateAddress('127.0.0.1'), true);
  assert.equal(isPrivateAddress('192.168.1.10'), true);
  assert.equal(isPrivateAddress('203.0.113.42'), false);
  const result = await lookupIpReputation('::1', {
    fetchImpl: async () => { throw new Error('should not be called'); }
  });
  assert.equal(result.checked, false);
  assert.equal(result.blocked, false);
});

test('VPN detections block signup and are cached', async () => {
  await db.initializeDatabase();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: true,
      async json() {
        return { status: 'ok', '45.86.210.136': { detections: { vpn: true, proxy: false, tor: false, anonymous: true } } };
      }
    };
  };

  const first = await lookupIpReputation('45.86.210.136', { fetchImpl });
  const second = await lookupIpReputation('45.86.210.136', { fetchImpl });
  assert.equal(first.blocked, true);
  assert.equal(first.reason, 'VPN');
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
  await assert.rejects(() => assertSignupAllowed('45.86.210.136'), new RegExp(BLOCK_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('ordinary residential connections remain eligible to register', async () => {
  await db.initializeDatabase();
  const result = await lookupIpReputation('8.8.8.8', {
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { status: 'ok', '8.8.8.8': { detections: { vpn: false, proxy: false, tor: false, anonymous: false } } };
      }
    })
  });
  assert.equal(result.blocked, false);
  assert.equal(result.checked, true);
});

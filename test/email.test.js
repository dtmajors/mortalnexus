const test = require('node:test');
const assert = require('node:assert/strict');
const { config } = require('../src/config');
const { sendOwnerAccountCreatedEmail, sendOwnerPurchaseEmail, formatMoney } = require('../src/email');

test('formats purchase totals from cents', () => {
  assert.equal(formatMoney(1999, 'usd'), '$19.99');
});

test('owner account and purchase emails use stable idempotency keys', async (t) => {
  const originalFetch = global.fetch;
  const originalApiKey = config.resendApiKey;
  const originalRecipient = config.ownerNotificationEmail;
  const requests = [];
  config.resendApiKey = 'test-key';
  config.ownerNotificationEmail = 'owner@example.com';
  global.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ id: 'email-id' }) };
  };
  t.after(() => {
    global.fetch = originalFetch;
    config.resendApiKey = originalApiKey;
    config.ownerNotificationEmail = originalRecipient;
  });

  await sendOwnerAccountCreatedEmail({
    userId: 'user-123',
    email: 'player@example.com',
    displayName: 'Player',
    method: 'discord',
    discordUsername: 'player.discord'
  });
  await sendOwnerPurchaseEmail({
    orderId: 'order-456',
    email: 'player@example.com',
    displayName: 'Player',
    provider: 'paypal',
    amountTotal: 1999,
    currency: 'usd',
    status: 'paid'
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.headers['Idempotency-Key'], 'mortal-nexus-owner-account-user-123');
  assert.equal(requests[1].options.headers['Idempotency-Key'], 'mortal-nexus-owner-purchase-order-456');
  assert.deepEqual(requests.map((request) => request.body.to), [['owner@example.com'], ['owner@example.com']]);
  assert.match(requests[1].body.subject, /\$19\.99 via PayPal/);
});

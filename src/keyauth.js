const { config } = require('./config');
const { randomToken } = require('./security');

async function createLicense({ orderId, email }) {
  if (!config.keyAuthSellerKey) {
    if (config.isProduction) throw new Error('KeyAuth fulfillment is not configured.');
    return `MNX-DEMO-${randomToken(6).toUpperCase()}`;
  }

  const params = new URLSearchParams({
    sellerkey: config.keyAuthSellerKey,
    type: 'add',
    format: 'json',
    expiry: config.keyAuthExpiry,
    mask: config.keyAuthMask,
    level: config.keyAuthLevel,
    amount: '1',
    note: `Mortal Nexus order ${orderId} - ${email}`,
    displayToken: 'false'
  });

  const response = await fetch(`https://keyauth.win/api/seller/?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'User-Agent': 'Mortal-Nexus-Store/1.0' },
    signal: AbortSignal.timeout(15_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || `KeyAuth returned HTTP ${response.status}.`);
  }

  const key = Array.isArray(data.key) ? data.key[0] : data.key;
  if (!key || typeof key !== 'string') throw new Error('KeyAuth did not return a license key.');
  return key.trim();
}

module.exports = { createLicense };

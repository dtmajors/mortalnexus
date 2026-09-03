const { config } = require('./config');
const { randomToken } = require('./security');

function extractLicenseKey(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!value || typeof value !== 'object') return null;
  for (const field of ['key', 'license', 'code']) {
    if (typeof value[field] === 'string' && value[field].trim()) return value[field].trim();
  }
  return null;
}

async function sellerRequest(params) {
  const response = await fetch(`https://keyauth.win/api/seller/?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'User-Agent': 'Mortal-Nexus-Store/1.0' },
    signal: AbortSignal.timeout(15_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || `KeyAuth returned HTTP ${response.status}.`);
  }
  return data;
}

async function createLicense({ orderId }) {
  if (!config.keyAuthSellerKey) {
    if (config.isProduction) throw new Error('KeyAuth fulfillment is not configured.');
    return `MNX-DEMO-${randomToken(6).toUpperCase()}`;
  }

  const existing = await sellerRequest(new URLSearchParams({
    sellerkey: config.keyAuthSellerKey,
    type: 'fetchallkeys',
    format: 'json'
  }));
  const recovered = (Array.isArray(existing.keys) ? existing.keys : []).find((item) => (
    item && typeof item === 'object' && String(item.note || '').includes(orderId)
  ));
  const recoveredKey = extractLicenseKey(recovered);
  if (recoveredKey) return recoveredKey;

  const params = new URLSearchParams({
    sellerkey: config.keyAuthSellerKey,
    type: 'add',
    format: 'json',
    expiry: config.keyAuthExpiry,
    mask: config.keyAuthMask,
    level: config.keyAuthLevel,
    amount: '1',
    note: `Mortal Nexus order ${orderId}`,
    displayToken: 'true'
  });

  const data = await sellerRequest(params);
  const rawKey = Array.isArray(data.key) ? data.key[0] : data.key;
  const key = extractLicenseKey(rawKey) || extractLicenseKey(Array.isArray(data.keys) ? data.keys[0] : data.keys);
  if (!key) throw new Error('KeyAuth did not return a license key.');
  return key;
}

async function validateLicense(licenseKey) {
  if (!config.keyAuthSellerKey) throw new Error('KeyAuth validation is not configured.');
  const data = await sellerRequest(new URLSearchParams({
    sellerkey: config.keyAuthSellerKey,
    type: 'info',
    format: 'json',
    key: licenseKey
  }));
  const status = String(data.status || '');
  if (status.toLowerCase().includes('ban')) throw new Error('This license key is banned.');
  return {
    valid: true,
    status,
    level: String(data.level || ''),
    duration: String(data.duration || '')
  };
}

module.exports = { createLicense, validateLicense, extractLicenseKey };

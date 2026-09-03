const crypto = require('node:crypto');
const db = require('./db');
const { validateLicense } = require('./keyauth');
const { hashToken, encryptLicense, decryptLicense } = require('./security');

function normalizeLicenseKey(value) {
  const key = String(value || '').trim();
  if (key.length < 8 || key.length > 200 || /\s/.test(key)) {
    throw new Error('Enter a valid license key.');
  }
  return key;
}

async function backfillLicenseHashes() {
  const result = await db.query('SELECT id, encrypted_key FROM licenses WHERE key_hash IS NULL');
  for (const license of result.rows) {
    try {
      const keyHash = hashToken(decryptLicense(license.encrypted_key));
      await db.query('UPDATE licenses SET key_hash = $1 WHERE id = $2 AND key_hash IS NULL', [keyHash, license.id]);
    } catch (error) {
      console.error(`License fingerprint backfill failed for ${license.id.slice(0, 8)}:`, error.message);
    }
  }
}

async function redeemLicense({ licenseKey, userId }) {
  const key = normalizeLicenseKey(licenseKey);
  const keyHash = hashToken(key);
  const existing = await db.query('SELECT user_id FROM licenses WHERE key_hash = $1', [keyHash]);
  if (existing.rows[0]) {
    if (existing.rows[0].user_id === userId) return { created: false };
    throw new Error('This license key has already been claimed.');
  }

  await validateLicense(key);
  const inserted = await db.query(
    `INSERT INTO licenses (id, order_id, user_id, encrypted_key, key_hint, key_hash, provider)
     VALUES ($1, NULL, $2, $3, $4, $5, 'keyauth')
     ON CONFLICT DO NOTHING RETURNING id`,
    [crypto.randomUUID(), userId, encryptLicense(key), key.slice(-6), keyHash]
  );
  if (inserted.rows[0]) return { created: true };

  const claimed = await db.query('SELECT user_id FROM licenses WHERE key_hash = $1', [keyHash]);
  if (claimed.rows[0]?.user_id === userId) return { created: false };
  throw new Error('This license key has already been claimed.');
}

module.exports = { normalizeLicenseKey, backfillLicenseHashes, redeemLicense };

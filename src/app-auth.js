const os = require('node:os');
const db = require('./db');
const { randomToken, hashToken, verifyPassword, decryptLicense } = require('./security');
const { validateLicense } = require('./keyauth');
const { createDesktopFirebaseToken } = require('./firebase-admin');
const { config } = require('./config');

const SESSION_DAYS = 30;

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function bearerToken(req) {
  const header = String(req.headers.authorization || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    canEdit: user.can_edit === true
  };
}

async function ownedLicense(userId) {
  const result = await db.query(
    `SELECT id, key_hint, encrypted_key FROM licenses
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const license = result.rows[0] || null;
  if (!license) {
    if (!config.freeDesktopEnabled) {
      throw new Error('This account does not have Mortal Nexus Premium. Claim or purchase a license on mortalnexus.com, then sign in again.');
    }
    return null;
  }
  try {
    await validateLicense(decryptLicense(license.encrypted_key));
    return license;
  } catch (error) {
    console.warn(`Premium entitlement validation failed for account ${String(userId).slice(0, 8)}: ${error.message}`);
    if (!config.freeDesktopEnabled) {
      throw new Error('The license linked to this account could not be validated. Check your account or try again shortly.');
    }
    return null;
  }
}

async function responseFor(user, license, sessionToken, expiresAt) {
  const premium = Boolean(license);
  return {
    success: true,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
    account: publicUser(user),
    license: license ? { hint: license.key_hint } : null,
    entitlement: { tier: premium ? 'premium' : 'free', premium },
    firebaseToken: await createDesktopFirebaseToken(user, { premium })
  };
}

async function createAppSession(user, license, deviceName, appVersion) {
  const token = randomToken(40);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.query(
    `INSERT INTO app_sessions
      (token_hash, user_id, license_id, device_name, app_version, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [hashToken(token), user.id, license?.id || null, cleanText(deviceName || os.hostname(), 120), cleanText(appVersion, 32), expiresAt]
  );
  await db.query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
  return responseFor(user, license, token, expiresAt);
}

async function login({ email, password, deviceName, appVersion }) {
  const normalizedEmail = cleanText(email, 254).toLowerCase();
  const found = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  const user = found.rows[0];
  if (!user || !user.password_hash || !(await verifyPassword(String(password || ''), user.password_hash))) {
    throw new Error('The email or password is incorrect.');
  }
  const license = await ownedLicense(user.id);
  return createAppSession(user, license, deviceName, appVersion);
}

async function startDeviceLogin() {
  const token = randomToken(40);
  const displayCode = randomToken(6).toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.query(
    'INSERT INTO app_device_codes (token_hash, display_code, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), displayCode, expiresAt]
  );
  return {
    deviceToken: token,
    displayCode,
    verificationUrl: `${require('./config').config.baseUrl}/app/connect?code=${encodeURIComponent(displayCode)}`,
    expiresAt: expiresAt.toISOString()
  };
}

async function approveDeviceLogin(displayCode, userId) {
  const result = await db.query(
    `UPDATE app_device_codes SET approved_user_id = $1
     WHERE display_code = $2 AND expires_at > NOW() AND used_at IS NULL RETURNING display_code`,
    [userId, cleanText(displayCode, 40).toUpperCase()]
  );
  if (!result.rows[0]) throw new Error('This app sign-in request expired. Start again from Mortal Nexus.');
}

async function completeDeviceLogin({ deviceToken, deviceName, appVersion }) {
  const found = await db.query(
    `SELECT c.*, u.* FROM app_device_codes c
     LEFT JOIN users u ON u.id = c.approved_user_id
     WHERE c.token_hash = $1 AND c.expires_at > NOW() AND c.used_at IS NULL`,
    [hashToken(deviceToken)]
  );
  const row = found.rows[0];
  if (!row) throw new Error('This app sign-in request expired.');
  if (!row.approved_user_id) return { success: false, pending: true, message: 'Waiting for Discord sign-in approval.' };
  const user = {
    id: row.approved_user_id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    can_edit: row.can_edit
  };
  const license = await ownedLicense(user.id);
  await db.query('UPDATE app_device_codes SET used_at = NOW() WHERE token_hash = $1', [hashToken(deviceToken)]);
  return createAppSession(user, license, deviceName, appVersion);
}

async function resume({ token, deviceName, appVersion }) {
  if (!token) throw new Error('Your Mortal Nexus sign-in has expired.');
  const found = await db.query(
    `SELECT s.*, u.email, u.display_name, u.role, u.can_edit
     FROM app_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL`,
    [hashToken(token)]
  );
  const session = found.rows[0];
  if (!session) throw new Error('Your Mortal Nexus sign-in has expired or was revoked.');
  const license = await ownedLicense(session.user_id);
  await db.query(
    `UPDATE app_sessions SET last_seen_at = NOW(), device_name = $1, app_version = $2, license_id = $3
     WHERE token_hash = $4`,
    [cleanText(deviceName, 120), cleanText(appVersion, 32), license?.id || null, hashToken(token)]
  );
  return responseFor({
    id: session.user_id,
    email: session.email,
    display_name: session.display_name,
    role: session.role,
    can_edit: session.can_edit
  }, license, token, new Date(session.expires_at));
}

async function logout(token) {
  if (token) await db.query('UPDATE app_sessions SET revoked_at = NOW() WHERE token_hash = $1', [hashToken(token)]);
}

async function authenticate(token) {
  if (!token) return null;
  const result = await db.query(
    `SELECT s.user_id, s.license_id FROM app_sessions s
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL`,
    [hashToken(token)]
  );
  if (result.rows[0]) {
    await db.query('UPDATE app_sessions SET last_seen_at = NOW() WHERE token_hash = $1', [hashToken(token)]);
  }
  return result.rows[0] || null;
}

module.exports = { bearerToken, login, resume, logout, authenticate, startDeviceLogin, approveDeviceLogin, completeDeviceLogin };

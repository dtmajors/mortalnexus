const os = require('node:os');
const db = require('./db');
const { randomToken, hashToken, verifyPassword } = require('./security');
const { normalizeLicenseKey } = require('./license-redemption');
const { validateLicense } = require('./keyauth');
const { createDesktopFirebaseToken } = require('./firebase-admin');

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

async function ownedLicense(userId, licenseKey) {
  const key = normalizeLicenseKey(licenseKey);
  const result = await db.query(
    `SELECT id, key_hint FROM licenses
     WHERE user_id = $1 AND key_hash = $2 LIMIT 1`,
    [userId, hashToken(key)]
  );
  if (!result.rows[0]) throw new Error('This license key is not linked to this account. Claim it from your website account first.');
  await validateLicense(key);
  return result.rows[0];
}

async function responseFor(user, license, sessionToken, expiresAt) {
  return {
    success: true,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
    account: publicUser(user),
    license: { hint: license.key_hint },
    firebaseToken: await createDesktopFirebaseToken(user)
  };
}

async function createAppSession(user, license, deviceName, appVersion) {
  const token = randomToken(40);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.query(
    `INSERT INTO app_sessions
      (token_hash, user_id, license_id, device_name, app_version, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [hashToken(token), user.id, license.id, cleanText(deviceName || os.hostname(), 120), cleanText(appVersion, 32), expiresAt]
  );
  await db.query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
  return responseFor(user, license, token, expiresAt);
}

async function login({ email, password, licenseKey, deviceName, appVersion }) {
  const normalizedEmail = cleanText(email, 254).toLowerCase();
  const found = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  const user = found.rows[0];
  if (!user || !user.password_hash || !(await verifyPassword(String(password || ''), user.password_hash))) {
    throw new Error('The email or password is incorrect.');
  }
  const license = await ownedLicense(user.id, licenseKey);
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

async function completeDeviceLogin({ deviceToken, licenseKey, deviceName, appVersion }) {
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
  const license = await ownedLicense(user.id, licenseKey);
  await db.query('UPDATE app_device_codes SET used_at = NOW() WHERE token_hash = $1', [hashToken(deviceToken)]);
  return createAppSession(user, license, deviceName, appVersion);
}

async function resume({ token, licenseKey, deviceName, appVersion }) {
  if (!token) throw new Error('Your Mortal Nexus sign-in has expired.');
  const found = await db.query(
    `SELECT s.*, u.email, u.display_name, u.role, u.can_edit, l.key_hint
     FROM app_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN licenses l ON l.id = s.license_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL`,
    [hashToken(token)]
  );
  const session = found.rows[0];
  if (!session) throw new Error('Your Mortal Nexus sign-in has expired or was revoked.');
  const license = await ownedLicense(session.user_id, licenseKey);
  if (license.id !== session.license_id) throw new Error('This app session belongs to a different license.');
  await db.query(
    `UPDATE app_sessions SET last_seen_at = NOW(), device_name = $1, app_version = $2
     WHERE token_hash = $3`,
    [cleanText(deviceName, 120), cleanText(appVersion, 32), hashToken(token)]
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
     JOIN licenses l ON l.id = s.license_id AND l.user_id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL`,
    [hashToken(token)]
  );
  if (result.rows[0]) {
    await db.query('UPDATE app_sessions SET last_seen_at = NOW() WHERE token_hash = $1', [hashToken(token)]);
  }
  return result.rows[0] || null;
}

module.exports = { bearerToken, login, resume, logout, authenticate, startDeviceLogin, approveDeviceLogin, completeDeviceLogin };

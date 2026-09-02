const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { config } = require('./config');

const SESSION_COOKIE = 'mn_session';
const CSRF_COOKIE = 'mn_csrf';

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge
  };
}

async function createSession(res, userId) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, expiresAt]
  );
  res.cookie(SESSION_COOKIE, token, cookieOptions(1000 * 60 * 60 * 24 * 30));
}

async function destroySession(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

async function loadUser(req, res, next) {
  try {
    const token = req.cookies[SESSION_COOKIE];
    req.user = null;
    if (token) {
      const result = await db.query(
        `SELECT u.id, u.email, u.display_name, u.role, u.discord_id,
                u.discord_username, u.discord_avatar, u.discord_joined_at,
                u.can_edit, u.firebase_editor_email, u.created_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [hashToken(token)]
      );
      req.user = result.rows[0] || null;
    }
    res.locals.user = req.user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireUser(req, res, next) {
  if (!req.user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).render('error', { title: 'Access denied', status: 403, message: 'This page is limited to the Mortal Nexus administrator.' });
  next();
}

function ensureCsrf(req, res, next) {
  let token = req.cookies[CSRF_COOKIE];
  if (!token) {
    token = randomToken(24);
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24
    });
  }
  res.locals.csrfToken = token;
  next();
}

function verifyCsrf(req, res, next) {
  const cookie = String(req.cookies[CSRF_COOKIE] || '');
  const body = String(req.body.csrf_token || '');
  const valid = cookie.length === body.length && cookie.length > 0 && crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(body));
  if (!valid) return res.status(403).render('error', { title: 'Request expired', status: 403, message: 'Please refresh the page and try again.' });
  next();
}

function encryptionKey() {
  return crypto.createHash('sha256').update(config.licenseEncryptionKey).digest();
}

function encryptLicense(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decryptLicense(payload) {
  const [iv, tag, ciphertext] = String(payload).split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function safeNext(value, fallback = '/account') {
  const next = String(value || '');
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

module.exports = {
  randomToken,
  hashToken,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  loadUser,
  requireUser,
  requireAdmin,
  ensureCsrf,
  verifyCsrf,
  encryptLicense,
  decryptLicense,
  safeNext
};

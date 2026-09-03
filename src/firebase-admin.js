const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { config } = require('./config');

let adminApp;

function serviceAccount() {
  if (!config.firebaseServiceAccountJson) {
    throw new Error('Firebase administration is not configured.');
  }
  try {
    const parsed = JSON.parse(config.firebaseServiceAccountJson);
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    return parsed;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
}

function firebaseAuth() {
  if (!adminApp) {
    adminApp = getApps()[0] || initializeApp({
      credential: cert(serviceAccount()),
      databaseURL: config.firebaseDatabaseUrl
    });
  }
  return getAuth(adminApp);
}

function normalizeEditorEmail(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const username = raw.includes('@') ? raw.split('@')[0] : raw;
  if (!/^[a-z0-9._-]{1,32}$/.test(username)) {
    throw new Error('Use a valid Mortal Nexus editor username.');
  }
  return `${username}@mortalnexus.app`;
}

async function setEditorPermission(emailOrUsername, enabled) {
  const email = normalizeEditorEmail(emailOrUsername);
  if (!email) throw new Error('An editor username is required.');
  let user;
  try {
    user = await firebaseAuth().getUserByEmail(email);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      throw new Error(`No app account exists for ${email}. Have the user sign in or create that Firebase account first.`);
    }
    throw error;
  }
  const claims = { ...(user.customClaims || {}) };
  if (enabled) claims.editor = true;
  else delete claims.editor;
  if (user.disabled === enabled) {
    await firebaseAuth().updateUser(user.uid, { disabled: !enabled });
  }
  await firebaseAuth().setCustomUserClaims(user.uid, claims);
  await getDatabase(adminApp).ref(`mortalNexus/access/editors/${user.uid}`).set(enabled ? true : null);
  await firebaseAuth().revokeRefreshTokens(user.uid);
  return { uid: user.uid, email, enabled };
}

async function revokeAllEditors() {
  let pageToken;
  let scanned = 0;
  let revoked = 0;
  firebaseAuth();
  await getDatabase(adminApp).ref('mortalNexus/access/editors').remove();
  do {
    const page = await firebaseAuth().listUsers(1000, pageToken);
    for (const user of page.users) {
      scanned += 1;
      if (!String(user.email || '').toLowerCase().endsWith('@mortalnexus.app')) continue;
      const claims = { ...(user.customClaims || {}) };
      delete claims.editor;
      if (!user.disabled) await firebaseAuth().updateUser(user.uid, { disabled: true });
      await firebaseAuth().setCustomUserClaims(user.uid, claims);
      await firebaseAuth().revokeRefreshTokens(user.uid);
      revoked += 1;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return { scanned, revoked };
}

async function createDesktopFirebaseToken(user) {
  if (!user?.id) throw new Error('A website account is required for Firebase access.');
  return firebaseAuth().createCustomToken(String(user.id), {
    editor: user.can_edit === true,
    accountName: String(user.display_name || '').slice(0, 60),
    websiteAccount: true
  });
}

module.exports = { normalizeEditorEmail, setEditorPermission, revokeAllEditors, createDesktopFirebaseToken };

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { CLEANUP_ACTION, removeTrialsAndRevokeAllSessions } = require('../src/access-cleanup');

test('trial removal clears old access and invalidates every existing sign-in once', async () => {
  await db.initializeDatabase();
  await db.query(
    `INSERT INTO users (id, email, display_name, premium_trial_started_at, premium_trial_expires_at)
     VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '1 day')`,
    ['cleanup-user', 'cleanup@example.com', 'Cleanup User']
  );
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ('website-token', 'cleanup-user', NOW() + INTERVAL '1 day')`
  );
  await db.query(
    `INSERT INTO app_sessions (token_hash, user_id, expires_at)
     VALUES ('app-token', 'cleanup-user', NOW() + INTERVAL '1 day')`
  );
  await db.query(
    `INSERT INTO app_device_codes (token_hash, display_code, expires_at)
     VALUES ('device-token', 'DEVICE', NOW() + INTERVAL '1 day')`
  );
  await db.query(
    `INSERT INTO brave_login_tickets (token_hash, user_id, expires_at)
     VALUES ('brave-token', 'cleanup-user', NOW() + INTERVAL '1 day')`
  );

  const result = await removeTrialsAndRevokeAllSessions();
  assert.deepEqual(result, {
    applied: true,
    trialsRevoked: 1,
    appSessionsRevoked: 1,
    websiteSessionsRevoked: 1,
    pendingDeviceLoginsRevoked: 2
  });

  const user = await db.query(
    'SELECT premium_trial_started_at, premium_trial_expires_at FROM users WHERE id = $1',
    ['cleanup-user']
  );
  assert.equal(user.rows[0].premium_trial_started_at, null);
  assert.equal(user.rows[0].premium_trial_expires_at, null);
  assert.equal((await db.query('SELECT 1 FROM sessions')).rows.length, 0);
  assert.ok((await db.query("SELECT revoked_at FROM app_sessions WHERE token_hash = 'app-token'")).rows[0].revoked_at);
  assert.equal((await db.query('SELECT 1 FROM app_device_codes')).rows.length, 0);
  assert.equal((await db.query('SELECT 1 FROM brave_login_tickets')).rows.length, 0);
  assert.equal((await db.query('SELECT 1 FROM admin_audit_log WHERE action = $1', [CLEANUP_ACTION])).rows.length, 1);

  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ('new-website-token', 'cleanup-user', NOW() + INTERVAL '1 day')`
  );
  assert.deepEqual(await removeTrialsAndRevokeAllSessions(), { applied: false });
  assert.equal((await db.query("SELECT 1 FROM sessions WHERE token_hash = 'new-website-token'")).rows.length, 1);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');

test('app sessions support accounts without a license', async () => {
  await db.initializeDatabase();
  const user = await db.query(
    `INSERT INTO users (id, email, display_name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    ['free-account-id', 'free-account@example.com', 'Free Account']
  );

  await db.query(
    `INSERT INTO app_sessions (token_hash, user_id, license_id, expires_at)
     VALUES ($1, $2, NULL, NOW() + INTERVAL '1 day')`,
    ['free-session-token', user.rows[0].id]
  );

  const session = await db.query(
    'SELECT license_id FROM app_sessions WHERE token_hash = $1',
    ['free-session-token']
  );
  assert.equal(session.rows.length, 1);
  assert.equal(session.rows[0].license_id, null);
});

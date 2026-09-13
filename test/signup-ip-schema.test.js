const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');

test('user records retain the account creation IP', async () => {
  await db.initializeDatabase();
  const user = await db.query(
    `INSERT INTO users (id, email, display_name, signup_ip)
     VALUES ($1, $2, $3, $4)
     RETURNING signup_ip`,
    ['signup-ip-account', 'signup-ip@example.com', 'Signup IP', '203.0.113.42']
  );

  assert.equal(user.rows[0].signup_ip, '203.0.113.42');
});

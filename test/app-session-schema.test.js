const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { accountAccess } = require('../src/app-auth');

test('desktop access requires a linked Premium license', async () => {
  await db.initializeDatabase();
  const user = await db.query(
    `INSERT INTO users (id, email, display_name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    ['free-account-id', 'free-account@example.com', 'Free Account']
  );

  await assert.rejects(
    accountAccess(user.rows[0].id),
    /requires Premium/
  );

  await db.query(
    `INSERT INTO licenses (id, user_id, encrypted_key, key_hint)
     VALUES ($1, $2, $3, $4)`,
    ['premium-license-id', user.rows[0].id, 'encrypted', '...PAID']
  );
  const access = await accountAccess(user.rows[0].id);
  assert.equal(access.license.id, 'premium-license-id');
});

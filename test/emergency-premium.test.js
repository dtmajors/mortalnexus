const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { grantEmergencyPremium } = require('../src/fulfillment');

test('a paid order can grant temporary Premium while license fulfillment is unavailable', async () => {
  await db.initializeDatabase();
  await db.query(
    `INSERT INTO users (id, email, display_name)
     VALUES ($1, $2, $3)`,
    ['emergency-premium-user', 'paid@example.com', 'Paid Customer']
  );

  const granted = await grantEmergencyPremium({
    id: 'emergency-premium-order',
    user_id: 'emergency-premium-user',
  });
  const result = await db.query(
    'SELECT premium_trial_started_at, premium_trial_expires_at FROM users WHERE id = $1',
    ['emergency-premium-user']
  );

  assert.equal(granted, true);
  assert.ok(result.rows[0].premium_trial_started_at);
  assert.ok(new Date(result.rows[0].premium_trial_expires_at).getTime() > Date.now() + (6 * 24 * 60 * 60 * 1000));
});

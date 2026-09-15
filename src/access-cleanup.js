const crypto = require('node:crypto');
const db = require('./db');

const CLEANUP_ACTION = 'system.free_trials_removed_and_sessions_revoked_v1';

async function removeTrialsAndRevokeAllSessions() {
  return db.transaction(async (client) => {
    const priorRun = await client.query(
      'SELECT id FROM admin_audit_log WHERE action = $1 LIMIT 1',
      [CLEANUP_ACTION]
    );
    if (priorRun.rows[0]) return { applied: false };

    const trials = await client.query(
      `UPDATE users
          SET premium_trial_started_at = NULL,
              premium_trial_expires_at = NULL,
              updated_at = NOW()
        WHERE premium_trial_started_at IS NOT NULL
           OR premium_trial_expires_at IS NOT NULL
        RETURNING id`
    );
    const appSessions = await client.query(
      'UPDATE app_sessions SET revoked_at = NOW() WHERE revoked_at IS NULL RETURNING token_hash'
    );
    const websiteSessions = await client.query('DELETE FROM sessions RETURNING token_hash');
    const deviceCodes = await client.query('DELETE FROM app_device_codes RETURNING token_hash');
    const braveTickets = await client.query('DELETE FROM brave_login_tickets RETURNING token_hash');
    const result = {
      applied: true,
      trialsRevoked: trials.rows.length,
      appSessionsRevoked: appSessions.rows.length,
      websiteSessionsRevoked: websiteSessions.rows.length,
      pendingDeviceLoginsRevoked: deviceCodes.rows.length + braveTickets.rows.length
    };

    await client.query(
      `INSERT INTO admin_audit_log (id, action, details)
       VALUES ($1, $2, $3)`,
      [crypto.randomUUID(), CLEANUP_ACTION, JSON.stringify(result)]
    );
    return result;
  });
}

module.exports = { CLEANUP_ACTION, removeTrialsAndRevokeAllSessions };

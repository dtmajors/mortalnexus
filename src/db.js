const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { newDb } = require('pg-mem');
const { config } = require('./config');

let pool;

function createPool() {
  if (config.databaseUrl) {
    return new Pool({
      connectionString: config.databaseUrl,
      ssl: config.isProduction ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30_000
    });
  }

  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({ name: 'now', returns: 'timestamptz', implementation: () => new Date() });
  const adapter = memory.adapters.createPg();
  return new adapter.Pool();
}

async function initializeDatabase() {
  pool = createPool();
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
  await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
  await pool.query('DELETE FROM password_resets WHERE expires_at < NOW() OR used_at IS NOT NULL');
  return pool;
}

function query(text, params) {
  if (!pool) throw new Error('Database has not been initialized.');
  return pool.query(text, params);
}

async function transaction(handler) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { initializeDatabase, query, transaction };

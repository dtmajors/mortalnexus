const fs = require('node:fs');
const path = require('node:path');
const { cert } = require('firebase-admin/app');
const { config } = require('../src/config');

async function main() {
  const serviceAccount = JSON.parse(config.firebaseServiceAccountJson);
  if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  const credential = cert(serviceAccount);
  const token = await credential.getAccessToken();
  const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'MortalNexus-IronCodex-LocalTest', 'firebase-rtdb-rules.json'), 'utf8');
  const endpoint = `${config.firebaseDatabaseUrl.replace(/\/$/, '')}/.settings/rules.json`;
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: rules
  });
  if (!response.ok) throw new Error(`Firebase rules deployment failed (${response.status}): ${await response.text()}`);
  console.log('Firebase Realtime Database rules deployed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

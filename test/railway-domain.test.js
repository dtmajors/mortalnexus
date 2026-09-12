const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('Railway root redirects to the public Mortal Nexus domain', () => {
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(serverSource, /req\.path === '\/'/);
  assert.match(serverSource, /hostname\.endsWith\('\.up\.railway\.app'\)/);
  assert.match(serverSource, /res\.redirect\(308, 'https:\/\/www\.mortalnexus\.com\/'\)/);
});

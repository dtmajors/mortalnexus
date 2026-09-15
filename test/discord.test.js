const test = require('node:test');
const assert = require('node:assert/strict');

process.env.APP_BASE_URL = 'https://www.mortalnexus.com';
process.env.DISCORD_CLIENT_ID = '123456789';
process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
process.env.DISCORD_GUILD_ID = '987654321';

const { authorizationUrl } = require('../src/discord');

test('Discord sign-in reuses an existing authorization without forcing the consent page', () => {
  const url = new URL(authorizationUrl('oauth-state'));
  assert.equal(url.origin, 'https://discord.com');
  assert.equal(url.pathname, '/oauth2/authorize');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://www.mortalnexus.com/auth/discord/callback');
  assert.equal(url.searchParams.get('scope'), 'identify email guilds.join');
  assert.equal(url.searchParams.get('state'), 'oauth-state');
  assert.equal(url.searchParams.has('prompt'), false);
});

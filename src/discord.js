const { config } = require('./config');

const DISCORD_API = 'https://discord.com/api/v10';

function redirectUri() {
  return `${config.baseUrl}/auth/discord/callback`;
}

function authorizationUrl(state) {
  if (!config.discordEnabled) throw new Error('Discord sign-in is not configured.');
  const params = new URLSearchParams({
    client_id: config.discordClientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: 'identify email guilds.join',
    state,
    prompt: 'consent'
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function discordRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Discord returned HTTP ${response.status}.`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: config.discordClientId,
    client_secret: config.discordClientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri()
  });
  const token = await discordRequest(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!token?.access_token) throw new Error('Discord did not return an access token.');
  return token.access_token;
}

async function fetchProfile(accessToken) {
  return discordRequest(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function joinGuild(userId, accessToken) {
  return discordRequest(`${DISCORD_API}/guilds/${config.discordGuildId}/members/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${config.discordBotToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ access_token: accessToken })
  });
}

async function authenticateDiscord(code) {
  if (!config.discordEnabled) throw new Error('Discord sign-in is not configured.');
  const accessToken = await exchangeCode(code);
  const profile = await fetchProfile(accessToken);
  if (!profile?.id || !profile?.email) {
    throw new Error('Discord did not provide the account email. Please authorize the email permission.');
  }
  if (profile.verified !== true) {
    throw new Error('Verify your email with Discord before signing in to Mortal Nexus.');
  }
  await joinGuild(profile.id, accessToken);
  return profile;
}

module.exports = { authorizationUrl, authenticateDiscord };

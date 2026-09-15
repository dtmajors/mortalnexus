const { isIP } = require('node:net');
const db = require('./db');
const { config } = require('./config');

const CACHE_MS = 24 * 60 * 60 * 1000;
const BLOCK_MESSAGE = 'Account creation is unavailable while a VPN, proxy, or Tor connection is active. Turn it off and try again.';

function isPrivateAddress(value) {
  const ip = String(value || '').trim().toLowerCase();
  const version = isIP(ip);
  if (!version) return true;
  if (version === 4) {
    const octets = ip.split('.').map(Number);
    return octets[0] === 0
      || octets[0] === 10
      || octets[0] === 127
      || (octets[0] === 169 && octets[1] === 254)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 192 && octets[1] === 168);
  }
  return ip === '::' || ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd')
    || /^fe[89ab]/.test(ip);
}

function detectionReason(detections) {
  const reasons = [];
  if (detections.vpn) reasons.push('VPN');
  if (detections.proxy) reasons.push('proxy');
  if (detections.tor) reasons.push('Tor');
  if (!reasons.length && detections.anonymous) reasons.push('anonymous network');
  return reasons.join(', ');
}

async function saveResult(ip, blocked, reason) {
  await db.query(
    `INSERT INTO ip_reputation_checks (ip, blocked, reason, checked_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (ip) DO UPDATE SET
       blocked = EXCLUDED.blocked,
       reason = EXCLUDED.reason,
       provider = 'proxycheck.io',
       checked_at = NOW()`,
    [ip, blocked, reason || null]
  );
}

async function lookupIpReputation(ip, options = {}) {
  if (!ip || isPrivateAddress(ip)) return { blocked: false, reason: null, checked: false };

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const cached = await db.query('SELECT blocked, reason, checked_at FROM ip_reputation_checks WHERE ip = $1', [ip]);
  if (cached.rows[0] && now - new Date(cached.rows[0].checked_at).getTime() < CACHE_MS) {
    return { blocked: cached.rows[0].blocked === true, reason: cached.rows[0].reason, checked: true, cached: true };
  }

  const fetchImpl = options.fetchImpl || global.fetch;
  const url = new URL(`https://proxycheck.io/v3/${encodeURIComponent(ip)}`);
  url.searchParams.set('tag', 'Mortal Nexus signup');
  if (config.proxycheckApiKey) url.searchParams.set('key', config.proxycheckApiKey);

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mortal-Nexus-Signup/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const record = payload[ip] || Object.values(payload).find((value) => value && value.detections);
    if (!record?.detections) throw new Error(payload.message || 'The response did not include detection data.');
    const reason = detectionReason(record.detections);
    const blocked = Boolean(reason);
    await saveResult(ip, blocked, reason);
    return { blocked, reason: reason || null, checked: true, cached: false };
  } catch (error) {
    console.error(`Signup network check failed for ${ip}:`, error.message);
    return { blocked: false, reason: null, checked: false, error: error.message };
  }
}

async function assertSignupAllowed(ip) {
  const result = await lookupIpReputation(ip);
  if (result.blocked) {
    const error = new Error(BLOCK_MESSAGE);
    error.code = 'SIGNUP_NETWORK_BLOCKED';
    throw error;
  }
  return result;
}

module.exports = { BLOCK_MESSAGE, isPrivateAddress, lookupIpReputation, assertSignupAllowed };

const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';

function value(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

const config = {
  isProduction,
  port: Number(value('PORT', '3000')),
  baseUrl: value('APP_BASE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  braveBaseUrl: value('BRAVE_BASE_URL', 'https://brave.mortalnexus.com').replace(/\/$/, ''),
  databaseUrl: value('DATABASE_URL'),
  sessionSecret: value('SESSION_SECRET', 'mortal-nexus-local-development-secret-change-me'),
  licenseEncryptionKey: value('LICENSE_ENCRYPTION_KEY', 'mortal-nexus-local-license-secret-change-me'),
  stripeSecretKey: value('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: value('STRIPE_WEBHOOK_SECRET'),
  stripePriceId: value('STRIPE_PRICE_ID'),
  productPriceDisplay: value('PRODUCT_PRICE_DISPLAY', '$19.99'),
  paypalClientId: value('PAYPAL_CLIENT_ID'),
  paypalClientSecret: value('PAYPAL_CLIENT_SECRET'),
  paypalWebhookId: value('PAYPAL_WEBHOOK_ID'),
  paypalMode: value('PAYPAL_MODE', 'live').toLowerCase(),
  paypalPrice: value('PAYPAL_PRICE', '19.99'),
  paypalCurrency: value('PAYPAL_CURRENCY', 'USD').toUpperCase(),
  keyAuthSellerKey: value('KEYAUTH_SELLER_KEY'),
  keyAuthMask: value('KEYAUTH_LICENSE_MASK', 'MNX-****-****-****-****'),
  keyAuthExpiry: value('KEYAUTH_LICENSE_EXPIRY', '9999'),
  keyAuthLevel: value('KEYAUTH_LICENSE_LEVEL', '1'),
  freeDesktopEnabled: value('FREE_DESKTOP_ENABLED', 'false').toLowerCase() === 'true',
  downloadUrl: value('DOWNLOAD_URL', '/download/latest'),
  githubReleaseRepo: value('GITHUB_RELEASE_REPO', 'dtmajors/mortalnexus'),
  githubReleaseToken: value('GITHUB_RELEASE_TOKEN'),
  githubReleaseAsset: value('GITHUB_RELEASE_ASSET', 'MortalNexusSetup.exe'),
  discordUrl: value('DISCORD_URL', 'https://discord.gg/MmV7gNV5ZG'),
  discordClientId: value('DISCORD_CLIENT_ID'),
  discordClientSecret: value('DISCORD_CLIENT_SECRET'),
  discordBotToken: value('DISCORD_BOT_TOKEN'),
  discordGuildId: value('DISCORD_GUILD_ID', '1082658912123244694'),
  firebaseServiceAccountJson: value('FIREBASE_SERVICE_ACCOUNT_JSON'),
  firebaseDatabaseUrl: value('FIREBASE_DATABASE_URL', 'https://momap-9cb64-default-rtdb.firebaseio.com'),
  supportEmail: value('SUPPORT_EMAIL', 'support@mortalnexus.com'),
  adminEmail: value('ADMIN_EMAIL').toLowerCase(),
  adminDiscordId: value('ADMIN_DISCORD_ID'),
  adminBootstrapSecret: value('ADMIN_BOOTSTRAP_SECRET'),
  resendApiKey: value('RESEND_API_KEY'),
  emailFrom: value('EMAIL_FROM', 'Mortal Nexus <noreply@mortalnexus.com>')
};

config.discordEnabled = Boolean(
  config.discordClientId &&
  config.discordClientSecret &&
  config.discordBotToken &&
  config.discordGuildId
);
config.paypalEnabled = Boolean(config.paypalClientId && config.paypalClientSecret && config.paypalWebhookId);

function validateProductionConfig() {
  if (!isProduction) return;
  if (!['live', 'sandbox'].includes(config.paypalMode)) throw new Error('PAYPAL_MODE must be live or sandbox.');
  if (!/^\d+\.\d{2}$/.test(config.paypalPrice) || Number(config.paypalPrice) <= 0) throw new Error('PAYPAL_PRICE must be a positive amount such as 19.99.');
  const required = [
    ['DATABASE_URL', config.databaseUrl],
    ['SESSION_SECRET', process.env.SESSION_SECRET],
    ['LICENSE_ENCRYPTION_KEY', process.env.LICENSE_ENCRYPTION_KEY],
    ['STRIPE_SECRET_KEY', config.stripeSecretKey],
    ['STRIPE_WEBHOOK_SECRET', config.stripeWebhookSecret],
    ['STRIPE_PRICE_ID', config.stripePriceId],
    ['PAYPAL_CLIENT_ID', config.paypalClientId],
    ['PAYPAL_CLIENT_SECRET', config.paypalClientSecret],
    ['PAYPAL_WEBHOOK_ID', config.paypalWebhookId],
    ['PAYPAL_PRICE', config.paypalPrice],
    ['KEYAUTH_SELLER_KEY', config.keyAuthSellerKey],
    ['DISCORD_CLIENT_ID', config.discordClientId],
    ['DISCORD_CLIENT_SECRET', config.discordClientSecret],
    ['DISCORD_BOT_TOKEN', config.discordBotToken],
    ['DISCORD_GUILD_ID', config.discordGuildId],
    ['FIREBASE_SERVICE_ACCOUNT_JSON', config.firebaseServiceAccountJson],
    ['ADMIN_EMAIL', config.adminEmail],
    ['ADMIN_BOOTSTRAP_SECRET', config.adminBootstrapSecret],
    ['RESEND_API_KEY', config.resendApiKey],
    ['EMAIL_FROM', process.env.EMAIL_FROM]
  ];
  if (config.downloadUrl === '/download/latest') {
    required.push(
      ['GITHUB_RELEASE_REPO', config.githubReleaseRepo],
      ['GITHUB_RELEASE_TOKEN', config.githubReleaseToken],
      ['GITHUB_RELEASE_ASSET', config.githubReleaseAsset]
    );
  }
  const missing = required.filter(([, current]) => !current).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing required production variables: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateProductionConfig };

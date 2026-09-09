const { config } = require('./config');

async function sendEmail({ to, subject, html, idempotencyKey }) {
  if (!config.resendApiKey) return { skipped: true };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
    },
    body: JSON.stringify({ from: config.emailFrom, to: [to], subject, html }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Email delivery failed with HTTP ${response.status}.`);
  return response.json();
}

async function sendLicenseEmail({ email, displayName, licenseKey, orderId }) {
  return sendEmail({
    to: email,
    subject: 'Your Mortal Nexus license key',
    html: `<div style="background:#07090e;color:#f5f7fb;padding:32px;font-family:Arial,sans-serif"><h1 style="margin:0 0 16px">Mortal Nexus is ready</h1><p>Hi ${escapeHtml(displayName || 'there')},</p><p>Your lifetime Mortal Nexus license is:</p><p style="font-size:20px;letter-spacing:1px;background:#111620;border:1px solid #334055;padding:16px"><strong>${escapeHtml(licenseKey)}</strong></p><p>Download the current installer from your account: <a style="color:#55d9ff" href="${config.baseUrl}/account">${config.baseUrl}/account</a></p><p style="color:#98a3b5">Keep this key private. It is tied to your Mortal Nexus access.</p></div>`,
    idempotencyKey: orderId ? `mortal-nexus-license-${orderId}` : undefined
  });
}

async function sendPasswordResetEmail({ email, token }) {
  const url = `${config.baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: 'Reset your Mortal Nexus password',
    html: `<div style="background:#07090e;color:#f5f7fb;padding:32px;font-family:Arial,sans-serif"><h1>Reset your password</h1><p>This link expires in one hour.</p><p><a style="display:inline-block;background:#e93667;color:white;padding:12px 18px;text-decoration:none" href="${url}">Reset password</a></p><p style="color:#98a3b5">If you did not request this, you can ignore this email.</p></div>`
  });
}

async function sendOwnerAccountCreatedEmail({ userId, email, displayName, method, discordUsername }) {
  if (!config.ownerNotificationEmail) return { skipped: true };
  const signupMethod = method === 'discord' ? 'Discord' : 'email and password';
  const discordRow = discordUsername
    ? `<tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Discord</td><td style="padding:6px 0">${escapeHtml(discordUsername)}</td></tr>`
    : '';
  return sendEmail({
    to: config.ownerNotificationEmail,
    subject: `New Mortal Nexus account: ${displayName || email}`,
    html: ownerEmailLayout({
      eyebrow: 'NEW ACCOUNT',
      title: 'A player created an account',
      body: `<table style="border-collapse:collapse;margin-top:18px"><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Name</td><td style="padding:6px 0"><strong>${escapeHtml(displayName || 'Not provided')}</strong></td></tr><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Email</td><td style="padding:6px 0">${escapeHtml(email)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Signup</td><td style="padding:6px 0">${escapeHtml(signupMethod)}</td></tr>${discordRow}</table>`
    }),
    idempotencyKey: `mortal-nexus-owner-account-${userId}`
  });
}

async function sendOwnerPurchaseEmail({ orderId, email, displayName, provider, amountTotal, currency, status }) {
  if (!config.ownerNotificationEmail) return { skipped: true };
  const providerName = provider === 'paypal' ? 'PayPal' : provider === 'stripe' ? 'Stripe' : String(provider || 'Unknown');
  const amount = formatMoney(amountTotal, currency);
  return sendEmail({
    to: config.ownerNotificationEmail,
    subject: `New Mortal Nexus purchase: ${amount} via ${providerName}`,
    html: ownerEmailLayout({
      eyebrow: 'NEW PURCHASE',
      title: `${amount} received through ${escapeHtml(providerName)}`,
      body: `<table style="border-collapse:collapse;margin-top:18px"><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Customer</td><td style="padding:6px 0"><strong>${escapeHtml(displayName || 'Mortal Nexus customer')}</strong></td></tr><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Email</td><td style="padding:6px 0">${escapeHtml(email)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Payment</td><td style="padding:6px 0">${escapeHtml(providerName)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Order</td><td style="padding:6px 0">${escapeHtml(orderId)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#98a3b5">Status</td><td style="padding:6px 0">${escapeHtml(status || 'paid')}</td></tr></table><p style="margin:22px 0 0"><a style="display:inline-block;background:#e93667;color:white;padding:12px 18px;text-decoration:none" href="${config.baseUrl}/admin">Open administration</a></p>`
    }),
    idempotencyKey: `mortal-nexus-owner-purchase-${orderId}`
  });
}

function ownerEmailLayout({ eyebrow, title, body }) {
  return `<div style="background:#07090e;color:#f5f7fb;padding:32px;font-family:Arial,sans-serif"><p style="margin:0 0 8px;color:#55d9ff;font-size:12px;font-weight:bold;letter-spacing:1px">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 12px">${title}</h1>${body}<p style="margin:24px 0 0;color:#68758a;font-size:12px">Automated Mortal Nexus owner notification</p></div>`;
}

function formatMoney(amountTotal, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase()
  }).format(Number(amountTotal || 0) / 100);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

module.exports = {
  sendLicenseEmail,
  sendPasswordResetEmail,
  sendOwnerAccountCreatedEmail,
  sendOwnerPurchaseEmail,
  formatMoney
};

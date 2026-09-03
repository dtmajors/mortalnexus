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

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

module.exports = { sendLicenseEmail, sendPasswordResetEmail };

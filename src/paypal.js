const crypto = require('node:crypto');
const { config } = require('./config');

const apiBase = config.paypalMode === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

let cachedToken = null;
let tokenExpiresAt = 0;

function paypalEnabled() {
  return config.paypalEnabled;
}

async function accessToken() {
  if (!config.paypalClientId || !config.paypalClientSecret) throw new Error('PayPal is not configured.');
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const credentials = Buffer.from(`${config.paypalClientId}:${config.paypalClientSecret}`).toString('base64');
  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error(body.error_description || `PayPal authentication returned HTTP ${response.status}.`);
  cachedToken = body.access_token;
  tokenExpiresAt = Date.now() + Math.max(60, Number(body.expires_in || 300) - 60) * 1000;
  return cachedToken;
}

async function paypalRequest(path, { method = 'GET', body, requestId } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.details?.[0]?.description || data.message || `PayPal returned HTTP ${response.status}.`;
    throw new Error(detail);
  }
  return data;
}

async function createPayPalOrder({ userId }) {
  const requestId = crypto.randomUUID();
  const order = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    requestId,
    body: {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: 'mortal_nexus_lifetime',
        custom_id: userId,
        invoice_id: requestId,
        description: 'Mortal Nexus lifetime license',
        amount: { currency_code: config.paypalCurrency, value: config.paypalPrice }
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Mortal Nexus',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${config.baseUrl}/checkout/paypal/return`,
            cancel_url: `${config.baseUrl}/#pricing`
          }
        }
      }
    }
  });
  const approvalUrl = order.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href;
  if (!order.id || !approvalUrl) throw new Error('PayPal did not return an approval link.');
  return { id: order.id, approvalUrl };
}

async function capturePayPalOrder(orderId) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    requestId: `capture-${orderId}`.slice(0, 108)
  });
}

async function getPayPalOrder(orderId) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

async function completePayPalOrder(orderId) {
  const order = await getPayPalOrder(orderId);
  if (order.status === 'COMPLETED') return order;
  if (order.status !== 'APPROVED') throw new Error('PayPal payment has not been approved.');
  return capturePayPalOrder(orderId);
}

async function verifyPayPalWebhook(headers, event) {
  if (!config.paypalWebhookId) return false;
  const verification = await paypalRequest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: config.paypalWebhookId,
      webhook_event: event
    }
  });
  return verification.verification_status === 'SUCCESS';
}

function completedPayPalPayment(order) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.find((item) => item.status === 'COMPLETED');
  if (order.status !== 'COMPLETED' || !unit || !capture) throw new Error('PayPal payment has not completed.');
  if (unit.reference_id !== 'mortal_nexus_lifetime') throw new Error('PayPal returned an unexpected product.');
  if (
    unit.amount?.currency_code !== config.paypalCurrency ||
    unit.amount?.value !== config.paypalPrice ||
    capture.amount?.currency_code !== config.paypalCurrency ||
    capture.amount?.value !== config.paypalPrice
  ) {
    throw new Error('PayPal returned an unexpected payment amount.');
  }
  if (!unit.custom_id) throw new Error('PayPal order is missing its customer reference.');
  return {
    userId: unit.custom_id,
    paymentId: capture.id,
    amountTotal: Math.round(Number(capture.amount?.value || unit.amount.value) * 100),
    currency: String(capture.amount?.currency_code || unit.amount.currency_code).toLowerCase()
  };
}

module.exports = {
  paypalEnabled,
  createPayPalOrder,
  capturePayPalOrder,
  completePayPalOrder,
  getPayPalOrder,
  verifyPayPalWebhook,
  completedPayPalPayment
};

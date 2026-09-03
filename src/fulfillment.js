const crypto = require('node:crypto');
const Stripe = require('stripe');
const db = require('./db');
const { config } = require('./config');
const { createLicense } = require('./keyauth');
const { encryptLicense, decryptLicense } = require('./security');
const { sendLicenseEmail } = require('./email');
const { getPayPalOrder, completedPayPalPayment } = require('./paypal');

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

function stripeClient() {
  if (!stripe) throw new Error('Stripe is not configured.');
  return stripe;
}

async function sendOrderLicenseEmail(order, licenseKey) {
  if (order.license_email_status === 'sent') return;
  const userResult = order.user_id
    ? await db.query('SELECT display_name FROM users WHERE id = $1', [order.user_id])
    : { rows: [] };
  try {
    await sendLicenseEmail({
      email: order.customer_email,
      displayName: userResult.rows[0]?.display_name,
      licenseKey,
      orderId: order.id
    });
    await db.query(
      "UPDATE orders SET license_email_status = 'sent', license_email_error = NULL, license_email_sent_at = NOW(), updated_at = NOW() WHERE id = $1",
      [order.id]
    );
    order.license_email_status = 'sent';
  } catch (error) {
    await db.query(
      "UPDATE orders SET license_email_status = 'failed', license_email_error = $2, updated_at = NOW() WHERE id = $1",
      [order.id, error.message.slice(0, 500)]
    );
    console.error(`License email failed for order ${order.id}:`, error.message);
  }
}

async function fulfillRecordedOrder(order) {
  const existing = await db.query('SELECT * FROM licenses WHERE order_id = $1', [order.id]);
  if (existing.rows[0]) {
    const licenseKey = decryptLicense(existing.rows[0].encrypted_key);
    await sendOrderLicenseEmail(order, licenseKey);
    return { order: { ...order, status: 'fulfilled' }, licenseKey, created: false };
  }

  const claim = await db.query(
    "UPDATE orders SET status = 'fulfilling', updated_at = NOW() WHERE id = $1 AND status = 'paid' RETURNING *",
    [order.id]
  );
  if (!claim.rows[0]) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const completed = await db.query('SELECT * FROM licenses WHERE order_id = $1', [order.id]);
      if (completed.rows[0]) {
        const licenseKey = decryptLicense(completed.rows[0].encrypted_key);
        await sendOrderLicenseEmail(order, licenseKey);
        return { order: { ...order, status: 'fulfilled' }, licenseKey, created: false };
      }
    }
    throw new Error('License generation is already in progress.');
  }

  try {
    const licenseKey = await createLicense({ orderId: order.id, email: order.customer_email });
    await db.query(
      `INSERT INTO licenses (id, order_id, user_id, encrypted_key, key_hint)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (order_id) DO NOTHING`,
      [crypto.randomUUID(), order.id, order.user_id, encryptLicense(licenseKey), licenseKey.slice(-6)]
    );
    await db.query("UPDATE orders SET status = 'fulfilled', failure_reason = NULL, updated_at = NOW() WHERE id = $1", [order.id]);
    order.status = 'fulfilled';
    await sendOrderLicenseEmail(order, licenseKey);
    return { order, licenseKey, created: true };
  } catch (error) {
    await db.query("UPDATE orders SET status = 'fulfillment_failed', failure_reason = $2, updated_at = NOW() WHERE id = $1", [order.id, error.message.slice(0, 500)]);
    throw error;
  }
}

async function fulfillCheckoutSession(sessionId) {
  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') throw new Error('Payment has not completed.');

  const userId = session.metadata?.user_id || session.client_reference_id || null;
  const email = session.customer_details?.email || session.customer_email;
  if (!email) throw new Error('Stripe did not return the customer email.');

  const orderResult = await db.query(
    `INSERT INTO orders
      (id, user_id, stripe_session_id, stripe_payment_intent_id, provider, provider_order_id,
       provider_payment_id, customer_email, amount_total, currency, status, paid_at)
     VALUES ($1, $2, $3, $4, 'stripe', $3, $4, $5, $6, $7, 'paid', NOW())
     ON CONFLICT (stripe_session_id) DO UPDATE SET
       status = CASE WHEN orders.status IN ('fulfilled', 'fulfilling') THEN orders.status ELSE 'paid' END,
       provider = 'stripe', provider_order_id = EXCLUDED.provider_order_id,
       provider_payment_id = EXCLUDED.provider_payment_id,
       stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
       amount_total = EXCLUDED.amount_total, currency = EXCLUDED.currency,
       paid_at = COALESCE(orders.paid_at, NOW()), updated_at = NOW()
     RETURNING *`,
    [crypto.randomUUID(), userId, session.id, String(session.payment_intent || ''), email.toLowerCase(), session.amount_total || 0, session.currency || 'usd']
  );
  return fulfillRecordedOrder(orderResult.rows[0]);
}

async function fulfillPayPalOrder(orderId, suppliedOrder = null) {
  const paypalOrder = suppliedOrder || await getPayPalOrder(orderId);
  const payment = completedPayPalPayment(paypalOrder);
  const userResult = await db.query('SELECT id, email FROM users WHERE id = $1', [payment.userId]);
  const user = userResult.rows[0];
  if (!user) throw new Error('The PayPal order does not match a Mortal Nexus account.');

  const orderResult = await db.query(
    `INSERT INTO orders
      (id, user_id, provider, provider_order_id, provider_payment_id, customer_email,
       amount_total, currency, status, paid_at)
     VALUES ($1, $2, 'paypal', $3, $4, $5, $6, $7, 'paid', NOW())
     ON CONFLICT (provider, provider_order_id) DO UPDATE SET
       status = CASE WHEN orders.status IN ('fulfilled', 'fulfilling') THEN orders.status ELSE 'paid' END,
       provider_payment_id = EXCLUDED.provider_payment_id,
       amount_total = EXCLUDED.amount_total, currency = EXCLUDED.currency,
       paid_at = COALESCE(orders.paid_at, NOW()), updated_at = NOW()
     RETURNING *`,
    [crypto.randomUUID(), user.id, paypalOrder.id, payment.paymentId, user.email.toLowerCase(), payment.amountTotal, payment.currency]
  );
  return fulfillRecordedOrder(orderResult.rows[0]);
}

async function retryOrderFulfillment(orderId) {
  const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = result.rows[0];
  if (!order) throw new Error('Order not found.');
  if (order.provider === 'paypal') return fulfillPayPalOrder(order.provider_order_id);
  return fulfillCheckoutSession(order.stripe_session_id);
}

async function getLicensesForUser(userId) {
  const result = await db.query(
    `SELECT l.id, l.encrypted_key, l.key_hint, l.created_at,
            o.id AS order_id, o.amount_total, o.currency, o.status, o.paid_at, o.provider
     FROM licenses l JOIN orders o ON o.id = l.order_id
     WHERE l.user_id = $1 ORDER BY l.created_at DESC`,
    [userId]
  );
  return result.rows.map((row) => ({ ...row, license_key: decryptLicense(row.encrypted_key) }));
}

module.exports = {
  stripeClient,
  fulfillCheckoutSession,
  fulfillPayPalOrder,
  retryOrderFulfillment,
  getLicensesForUser
};

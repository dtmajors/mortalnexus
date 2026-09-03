const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const db = require('./src/db');
const { config, validateProductionConfig } = require('./src/config');
const {
  randomToken,
  hashToken,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  loadUser,
  requireUser,
  requireAdmin,
  ensureCsrf,
  verifyCsrf,
  safeNext
} = require('./src/security');
const { sendPasswordResetEmail } = require('./src/email');
const { stripeClient, fulfillCheckoutSession, getLicensesForUser } = require('./src/fulfillment');
const { authorizationUrl, authenticateDiscord } = require('./src/discord');
const { normalizeEditorEmail, setEditorPermission, revokeAllEditors } = require('./src/firebase-admin');
const { streamLatestInstaller } = require('./src/releases');

validateProductionConfig();

const app = express();
let httpServer;
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: config.isProduction ? '30d' : 0 }));
app.use('/vendor/lucide.js', express.static(path.join(__dirname, 'node_modules', 'lucide', 'dist', 'umd', 'lucide.js')));

// Stripe requires the original request body to validate webhook signatures.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = stripeClient().webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await fulfillCheckoutSession(event.data.object.id);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failed:', error.message);
    res.status(400).send('Webhook failed.');
  }
});

app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(loadUser);
app.use(ensureCsrf);
app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.price = config.productPriceDisplay;
  res.locals.downloadUrl = config.downloadUrl;
  res.locals.discordUrl = config.discordUrl;
  res.locals.supportEmail = config.supportEmail;
  res.locals.discordAuthEnabled = config.discordEnabled;
  res.locals.notice = req.query.notice || '';
  res.locals.error = req.query.error || '';
  next();
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const downloadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

app.get('/health', (req, res) => res.json({ ok: true, service: 'mortal-nexus-store' }));

app.get('/', (req, res) => res.render('home', { title: 'Mortal Nexus | The Mortal Online 2 Companion' }));
app.get('/features', (req, res) => res.redirect('/#features'));
app.get('/pricing', (req, res) => res.redirect('/#pricing'));
app.get('/buy', requireUser, (req, res) => res.redirect('/#pricing'));
app.get('/support', (req, res) => res.render('support', { title: 'Support | Mortal Nexus' }));
app.get('/terms', (req, res) => res.render('legal', { title: 'Terms of Sale | Mortal Nexus', document: 'terms' }));
app.get('/privacy', (req, res) => res.render('legal', { title: 'Privacy Policy | Mortal Nexus', document: 'privacy' }));

app.get('/register', (req, res) => {
  if (req.user) return res.redirect('/account');
  res.render('auth', { title: 'Create Account | Mortal Nexus', mode: 'register', next: safeNext(req.query.next, '/account') });
});

app.post('/register', authLimiter, verifyCsrf, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const displayName = String(req.body.display_name || '').trim().slice(0, 60);
    const password = String(req.body.password || '');
    const nextUrl = safeNext(req.body.next, '/account');
    if (!/^\S+@\S+\.\S+$/.test(email) || displayName.length < 2 || password.length < 10) {
      return res.status(400).render('auth', { title: 'Create Account | Mortal Nexus', mode: 'register', next: nextUrl, formError: 'Use a valid email, a display name, and a password of at least 10 characters.' });
    }
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) return res.status(409).render('auth', { title: 'Create Account | Mortal Nexus', mode: 'register', next: nextUrl, formError: 'An account already exists for that email.' });

    const role = 'customer';
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO users (id, email, display_name, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [id, email, displayName, await hashPassword(password), role]
    );
    await createSession(res, id);
    res.redirect(nextUrl);
  } catch (error) {
    next(error);
  }
});

app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/account');
  res.render('auth', { title: 'Sign In | Mortal Nexus', mode: 'login', next: safeNext(req.query.next, '/account') });
});

app.post('/login', authLimiter, verifyCsrf, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const nextUrl = safeNext(req.body.next, '/account');
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).render('auth', { title: 'Sign In | Mortal Nexus', mode: 'login', next: nextUrl, formError: 'The email or password is incorrect.' });
    }
    await db.query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
    await createSession(res, user.id);
    res.redirect(nextUrl);
  } catch (error) {
    next(error);
  }
});

function oauthCookieOptions(maxAge) {
  return { httpOnly: true, secure: config.isProduction, sameSite: 'lax', path: '/', maxAge };
}

app.get('/auth/discord', authLimiter, (req, res) => {
  if (!config.discordEnabled) return res.redirect('/login?error=Discord%20sign-in%20is%20not%20configured.');
  const state = randomToken(24);
  const nextUrl = safeNext(req.query.next, '/account');
  res.cookie('mn_discord_state', state, oauthCookieOptions(10 * 60 * 1000));
  res.cookie('mn_discord_next', nextUrl, oauthCookieOptions(10 * 60 * 1000));
  res.redirect(authorizationUrl(state));
});

app.get('/auth/discord/callback', authLimiter, async (req, res, next) => {
  const clearOauthCookies = () => {
    res.clearCookie('mn_discord_state', { path: '/' });
    res.clearCookie('mn_discord_next', { path: '/' });
  };
  try {
    const expectedState = String(req.cookies.mn_discord_state || '');
    const returnedState = String(req.query.state || '');
    const validState = expectedState.length > 0 && expectedState.length === returnedState.length
      && crypto.timingSafeEqual(Buffer.from(expectedState), Buffer.from(returnedState));
    const nextUrl = safeNext(req.cookies.mn_discord_next, '/account');
    clearOauthCookies();
    if (!validState || req.query.error || !req.query.code) {
      return res.redirect('/login?error=Discord%20sign-in%20was%20not%20completed.');
    }

    const profile = await authenticateDiscord(String(req.query.code));
    const email = String(profile.email).trim().toLowerCase();
    const displayName = String(profile.global_name || profile.username || 'Mortal Nexus user').trim().slice(0, 60);
    const existing = await db.query('SELECT * FROM users WHERE discord_id = $1 OR email = $2 ORDER BY discord_id = $1 DESC LIMIT 1', [profile.id, email]);
    let user = existing.rows[0];
    if (!user) {
      const id = crypto.randomUUID();
      const role = 'customer';
      await db.query(
        `INSERT INTO users (id, email, display_name, password_hash, discord_id, discord_username, discord_avatar, discord_joined_at, last_login_at, role)
         VALUES ($1, $2, $3, NULL, $4, $5, $6, NOW(), NOW(), $7)`,
        [id, email, displayName, profile.id, profile.username, profile.avatar || null, role]
      );
      user = { id };
    } else {
      await db.query(
        `UPDATE users SET discord_id = $1, discord_username = $2, discord_avatar = $3,
         discord_joined_at = COALESCE(discord_joined_at, NOW()), last_login_at = NOW(), updated_at = NOW()
         WHERE id = $4`,
        [profile.id, profile.username, profile.avatar || null, user.id]
      );
    }
    await createSession(res, user.id);
    res.redirect(nextUrl);
  } catch (error) {
    clearOauthCookies();
    console.error('Discord sign-in failed:', error.message);
    res.redirect(`/login?error=${encodeURIComponent(error.message || 'Discord sign-in failed.')}`);
  }
});

app.post('/logout', verifyCsrf, async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.redirect('/?notice=You%20are%20signed%20out.');
  } catch (error) {
    next(error);
  }
});

app.get('/forgot-password', (req, res) => res.render('forgot-password', { title: 'Reset Password | Mortal Nexus', sent: false }));
app.post('/forgot-password', authLimiter, verifyCsrf, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows[0]) {
      const token = randomToken();
      await db.query('DELETE FROM password_resets WHERE user_id = $1', [result.rows[0].id]);
      await db.query(
        'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [hashToken(token), result.rows[0].id, new Date(Date.now() + 60 * 60 * 1000)]
      );
      await sendPasswordResetEmail({ email, token });
    }
    res.render('forgot-password', { title: 'Reset Password | Mortal Nexus', sent: true });
  } catch (error) {
    next(error);
  }
});

app.get('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    const result = token ? await db.query('SELECT token_hash FROM password_resets WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL', [hashToken(token)]) : { rows: [] };
    res.render('reset-password', { title: 'Choose New Password | Mortal Nexus', token, valid: Boolean(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/reset-password', authLimiter, verifyCsrf, async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    const result = await db.query('SELECT * FROM password_resets WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL', [hashToken(token)]);
    const reset = result.rows[0];
    if (!reset || password.length < 10) return res.status(400).render('reset-password', { title: 'Choose New Password | Mortal Nexus', token, valid: Boolean(reset), formError: 'The link is invalid or the password is shorter than 10 characters.' });
    await db.transaction(async (client) => {
      await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [await hashPassword(password), reset.user_id]);
      await client.query('UPDATE password_resets SET used_at = NOW() WHERE token_hash = $1', [reset.token_hash]);
      await client.query('DELETE FROM sessions WHERE user_id = $1', [reset.user_id]);
    });
    res.redirect('/login?notice=Password%20updated.%20You%20can%20sign%20in%20now.');
  } catch (error) {
    next(error);
  }
});

app.get('/account', requireUser, async (req, res, next) => {
  try {
    const licenses = await getLicensesForUser(req.user.id);
    const orders = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.render('account', { title: 'Your Account | Mortal Nexus', licenses, orders: orders.rows });
  } catch (error) {
    next(error);
  }
});

app.get('/download/latest', downloadLimiter, requireUser, async (req, res, next) => {
  try {
    const access = await db.query('SELECT 1 FROM licenses WHERE user_id = $1 LIMIT 1', [req.user.id]);
    if (!access.rows.length) {
      return res.status(403).render('error', {
        title: 'License Required | Mortal Nexus',
        status: 403,
        message: 'A fulfilled Mortal Nexus license is required to download the installer.'
      });
    }
    await streamLatestInstaller(res);
  } catch (error) {
    if (res.headersSent) {
      console.error('Installer stream failed:', error.message);
      return res.end();
    }
    next(error);
  }
});

app.get('/admin/bootstrap', requireUser, async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return res.redirect('/admin');
    if (!config.adminEmail || req.user.email.toLowerCase() !== config.adminEmail) {
      return res.status(403).render('error', {
        title: 'Access Denied | Mortal Nexus',
        status: 403,
        message: 'This account is not the configured primary administrator.'
      });
    }
    const existing = await db.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (existing.rows.length) {
      return res.status(409).render('error', {
        title: 'Administrator Already Created | Mortal Nexus',
        status: 409,
        message: 'The initial administrator has already been created.'
      });
    }
    res.render('admin-bootstrap', { title: 'Create Administrator | Mortal Nexus', formError: '' });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/bootstrap', authLimiter, requireUser, verifyCsrf, async (req, res, next) => {
  try {
    const supplied = String(req.body.bootstrap_secret || '');
    const expected = config.adminBootstrapSecret;
    const validEmail = config.adminEmail && req.user.email.toLowerCase() === config.adminEmail;
    const validSecret = supplied.length > 0 && supplied.length === expected.length
      && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    const existing = await db.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (!validEmail || !validSecret || existing.rows.length) {
      return res.status(403).render('admin-bootstrap', {
        title: 'Create Administrator | Mortal Nexus',
        formError: 'Administrator setup could not be completed.'
      });
    }
    await db.query("UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1", [req.user.id]);
    res.redirect('/admin?notice=Primary%20administrator%20created.');
  } catch (error) {
    next(error);
  }
});

app.post('/checkout', checkoutLimiter, requireUser, verifyCsrf, async (req, res, next) => {
  try {
    if (!config.stripePriceId) {
      if (config.isProduction) throw new Error('Checkout is not configured.');
      return res.redirect('/checkout/demo');
    }
    const checkout = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      line_items: [{ price: config.stripePriceId, quantity: 1 }],
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      metadata: { user_id: req.user.id, product: 'mortal_nexus_lifetime' },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${config.baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.baseUrl}/#pricing`
    });
    res.redirect(303, checkout.url);
  } catch (error) {
    next(error);
  }
});

app.get('/checkout/demo', requireUser, async (req, res, next) => {
  try {
    if (config.isProduction) return res.status(404).end();
    res.render('checkout-success', { title: 'Checkout Preview | Mortal Nexus', state: 'demo', licenseKey: 'MNX-DEMO-CHECKOUT-PREVIEW', order: null });
  } catch (error) {
    next(error);
  }
});

app.get('/checkout/success', requireUser, async (req, res, next) => {
  try {
    const sessionId = String(req.query.session_id || '');
    if (!sessionId) return res.status(400).render('checkout-success', { title: 'Purchase Status | Mortal Nexus', state: 'pending', licenseKey: null, order: null });
    const result = await fulfillCheckoutSession(sessionId);
    if (result.order.user_id && result.order.user_id !== req.user.id) return res.status(403).render('error', { title: 'Access denied', status: 403, message: 'This purchase belongs to another account.' });
    res.render('checkout-success', { title: 'Mortal Nexus Is Ready', state: 'complete', licenseKey: result.licenseKey, order: result.order });
  } catch (error) {
    console.error('Checkout confirmation failed:', error.message);
    res.status(202).render('checkout-success', { title: 'Purchase Processing | Mortal Nexus', state: 'pending', licenseKey: null, order: null });
  }
});

app.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const [users, orders, metrics] = await Promise.all([
      db.query(`SELECT id, email, display_name, role, discord_id, discord_username,
                discord_joined_at, can_edit, firebase_editor_email, created_at
                FROM users ORDER BY created_at DESC LIMIT 100`),
      db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100'),
      db.query("SELECT COUNT(*)::int AS orders, COALESCE(SUM(amount_total) FILTER (WHERE status = 'fulfilled'), 0)::int AS revenue, COUNT(*) FILTER (WHERE status = 'fulfillment_failed')::int AS failures FROM orders")
    ]);
    res.render('admin', { title: 'Store Admin | Mortal Nexus', users: users.rows, orders: orders.rows, metrics: metrics.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/users/:id/role', requireAdmin, verifyCsrf, async (req, res, next) => {
  try {
    const role = String(req.body.role || '');
    if (!['admin', 'customer'].includes(role)) throw new Error('Invalid account role.');
    const target = await db.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows[0]) throw new Error('Account not found.');
    if (role !== 'admin' && config.adminEmail && target.rows[0].email.toLowerCase() === config.adminEmail) {
      throw new Error('The primary administrator cannot be demoted.');
    }
    await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, req.params.id]);
    res.redirect('/admin?notice=Account%20role%20updated.');
  } catch (error) {
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
});

app.post('/admin/users/:id/editor', requireAdmin, verifyCsrf, async (req, res) => {
  try {
    const enabled = req.body.enabled === 'true';
    const target = await db.query('SELECT id, firebase_editor_email FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows[0]) throw new Error('Account not found.');
    const editorEmail = normalizeEditorEmail(req.body.editor_username || target.rows[0].firebase_editor_email);
    await setEditorPermission(editorEmail, enabled);
    await db.query(
      'UPDATE users SET can_edit = $1, firebase_editor_email = $2, updated_at = NOW() WHERE id = $3',
      [enabled, editorEmail, req.params.id]
    );
    res.redirect(`/admin?notice=${encodeURIComponent(enabled ? 'Editor access granted. The user must sign in again.' : 'Editor access revoked immediately.')}`);
  } catch (error) {
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
});

app.post('/admin/editors/revoke-all', requireAdmin, verifyCsrf, async (req, res) => {
  try {
    const result = await revokeAllEditors();
    await db.query('UPDATE users SET can_edit = FALSE, updated_at = NOW() WHERE can_edit = TRUE');
    res.redirect(`/admin?notice=${encodeURIComponent(`Revoked editor access from ${result.revoked} of ${result.scanned} Firebase accounts.`)}`);
  } catch (error) {
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
});

app.post('/admin/orders/:id/retry', requireAdmin, verifyCsrf, async (req, res, next) => {
  try {
    const result = await db.query('SELECT stripe_session_id FROM orders WHERE id = $1', [req.params.id]);
    if (result.rows[0]) await fulfillCheckoutSession(result.rows[0].stripe_session_id);
    res.redirect('/admin?notice=Fulfillment%20checked.');
  } catch (error) {
    res.redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }
});

app.use((req, res) => res.status(404).render('error', { title: 'Page Not Found | Mortal Nexus', status: 404, message: 'That page does not exist.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).render('error', { title: 'Something Went Wrong | Mortal Nexus', status: 500, message: config.isProduction ? 'The request could not be completed. Please try again.' : error.message });
});

async function start() {
  await db.initializeDatabase();
  httpServer = app.listen(config.port, '0.0.0.0', () => {
    const address = httpServer.address();
    console.log(`Mortal Nexus website running at ${config.baseUrl} on ${address.address}:${address.port}`);
  });
}

start().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});

module.exports = app;

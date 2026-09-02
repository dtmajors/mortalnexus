# Mortal Nexus Website

Production storefront, customer portal, license delivery, and administration for Mortal Nexus.

## Included

- Responsive sales pages using real Mortal Nexus screenshots
- Local email/password accounts and Discord OAuth sign-in
- Automatic Discord server join after Discord authorization
- Stripe Checkout with dynamic payment methods
- Signed, idempotent Stripe webhook fulfillment
- Server-side KeyAuth Seller API license generation
- Encrypted CD-key storage and customer purchase history
- License-only installer downloads from a private GitHub release
- Admin controls for orders, customer roles, and Firebase map editors
- One-click revocation of every legacy Firebase editor account
- Optional license and password-reset email through Resend
- Railway PostgreSQL initialization and health check

## Security Model

- The production desktop build opens the KeyAuth license gate before its local server or UI starts. The preview bypass is opt-in at build time and is disabled in the release build.
- Stripe, KeyAuth Seller, Discord bot, Firebase Admin, GitHub, session, and encryption secrets exist only in Railway environment variables.
- `/download/latest` requires a signed-in customer with a fulfilled license. Railway streams the installer from the private GitHub release without exposing the GitHub token.
- Firebase write access is controlled by a live UID allowlist. Revoking a user in `/admin` removes that UID immediately and revokes its refresh tokens.
- House Hunter stays visible in the desktop navigation but its local route is server-gated behind the shared under-construction password.

No client application can be made mathematically impossible to patch. The shipped build nevertheless fails closed, contains no ordinary production bypass, and requires KeyAuth validation before loading application content.

## Local Preview

Node.js 22 or newer is required.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:3000`. Without production services, the site uses an in-memory development database and a safe checkout preview. It does not create a real license.

## Railway Deployment

1. Push this folder to `https://github.com/dtmajors/mortalnexus`.
2. In Railway, create a project from that repository.
3. Add PostgreSQL and connect it to the website service. Railway supplies `DATABASE_URL`.
4. Add every production variable from `.env.example` to the website service.
5. Set `NODE_ENV=production` and `APP_BASE_URL=https://www.mortalnexus.com`.
6. Set the service health-check path to `/health`.
7. Deploy and confirm `/health` returns `{ "ok": true }`.

Railway variables must include:

- `DATABASE_URL`
- `SESSION_SECRET`
- `LICENSE_ENCRYPTION_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- `KEYAUTH_SELLER_KEY`
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_DATABASE_URL`
- `GITHUB_RELEASE_TOKEN`
- `ADMIN_EMAIL`, `ADMIN_BOOTSTRAP_SECRET`

Generate separate long random values for `SESSION_SECRET` and `LICENSE_ENCRYPTION_KEY`. Back up the encryption key securely; replacing it makes previously stored CD keys unreadable.

## Namecheap DNS

Namecheap Premium DNS is not required.

1. In Railway, open the website service, then **Settings > Public Networking > Custom Domain**.
2. Add both `www.mortalnexus.com` and `mortalnexus.com`.
3. Railway shows the exact CNAME or ALIAS and TXT verification records for each name.
4. In Namecheap **Advanced DNS**, add those records exactly as Railway shows them.
5. Keep `APP_BASE_URL=https://www.mortalnexus.com` as the canonical URL.
6. Wait for Railway to show a green verification check. Railway then provisions HTTPS automatically.

Both the routing record and Railway TXT verification record are required. See [Railway custom domains](https://docs.railway.com/networking/domains/working-with-domains).

## Discord Sign-In And Auto-Join

1. Create a Discord application and bot in the Discord Developer Portal.
2. Add this exact OAuth redirect:

   `https://www.mortalnexus.com/auth/discord/callback`

3. Add the bot to Discord server `1082658912123244694` (the server behind `https://discord.gg/MmV7gNV5ZG`).
4. Give the bot the minimum permission required by Discord's Add Guild Member endpoint, including **Create Instant Invite**.
5. Put the client ID, client secret, bot token, and guild ID in Railway.

The website requests `identify`, `email`, and `guilds.join`. Discord sign-in then adds the authorized user to the configured server. Users with Membership Screening enabled may still need to accept the server rules. See [Discord OAuth scopes](https://docs.discord.com/developers/platform/oauth2-and-permissions) and [Add Guild Member](https://docs.discord.com/developers/resources/guild#add-guild-member).

## Stripe And Payment Methods

1. Create a one-time Mortal Nexus product and price in Stripe.
2. Put the price ID in `STRIPE_PRICE_ID`.
3. Enable the desired cards, wallets, and eligible local payment methods in the Stripe Dashboard.
4. Add a webhook at `https://www.mortalnexus.com/webhooks/stripe`.
5. Subscribe it to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
6. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

Checkout intentionally does not hardcode `payment_method_types`; Stripe dynamically shows eligible methods enabled in the Dashboard. See [Stripe Checkout payment methods](https://docs.stripe.com/payments/checkout/payment-methods).

## KeyAuth

The paid webhook calls the KeyAuth Seller API `type=add` action. Confirm these values match the same KeyAuth application used by the desktop build:

- `KEYAUTH_LICENSE_MASK`, default `MNX-****-****-****-****`
- `KEYAUTH_LICENSE_EXPIRY`, default `9999`
- `KEYAUTH_LICENSE_LEVEL`, default `1`

Complete a Stripe test-mode purchase and activate the generated key in the production desktop build before accepting live payments.

## Private Installer Downloads

The source repository can remain private. Create a fine-grained GitHub token limited to `dtmajors/mortalnexus` with read-only **Contents** access, then set:

- `DOWNLOAD_URL=/download/latest`
- `GITHUB_RELEASE_REPO=dtmajors/mortalnexus`
- `GITHUB_RELEASE_TOKEN=...`
- `GITHUB_RELEASE_ASSET=MortalNexusSetup.exe`

Build the desktop release from `MortalNexus-IronCodex-LocalTest`:

```powershell
.\build-release.ps1
```

Create a GitHub release and upload this exact asset name:

```powershell
gh release create v1.13.0 .\dist\MortalNexusSetup.exe --repo dtmajors/mortalnexus --title "Mortal Nexus 1.13.0"
```

The customer download button streams the latest release asset only after confirming that the signed-in account owns a fulfilled license.

## Firebase Editor Administration

1. In Firebase, create a service account for project `momap-9cb64`.
2. Store the complete JSON as the single Railway variable `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. From the desktop project, authenticate Firebase CLI and deploy the included project configuration before launch:

   `npx firebase-tools deploy --only database`
4. Sign in as the website administrator and open `/admin`.
5. Use **Revoke all editors** once to clear every previous editor UID and disable legacy editor accounts.
6. Grant editing per customer by entering that customer's app editor username.

Realtime Database rules are enforced on Firebase's servers. Deploying local rules overwrites the currently active rules, so review them first. See [Firebase rule deployment](https://firebase.google.com/docs/rules/manage-deploy).

## First Administrator

Set `ADMIN_EMAIL` and a separate long `ADMIN_BOOTSTRAP_SECRET` before deployment. Register or use Discord with that email, sign in, then open `/admin/bootstrap` and enter the Railway-held bootstrap secret. The endpoint closes after the first administrator is created. Email alone never grants administrator access.

From `/admin`, the primary administrator can:

- Review customers, revenue, purchases, and fulfillment failures
- Retry failed KeyAuth fulfillment
- Promote or demote secondary administrators
- Grant or revoke map editor access
- Revoke all legacy editor accounts

## Prelaunch Checklist

- Railway production variables pass startup validation
- `www.mortalnexus.com` and the apex domain show valid HTTPS
- Discord sign-in creates or links the customer and joins the server
- Stripe test purchase creates exactly one order and one KeyAuth license
- The licensed account can download `MortalNexusSetup.exe`; an unlicensed account receives 403
- The production desktop app rejects invalid keys and opens with a valid key
- The Firebase rules are deployed and **Revoke all editors** has been run once
- The v1.13.0 installer removes public, Iron Codex Preview, and Private installs before installing the single production version

## Email

Email is optional. Set `RESEND_API_KEY` and a verified `EMAIL_FROM` domain to send license and password-reset messages. CD keys remain available in the customer account if email is unavailable.

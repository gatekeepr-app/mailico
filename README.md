# Mailico

A Gmail-style mail client that sends email through [Resend](https://resend.com) from a company domain selected during first-run setup.

## Features

- Gmail-like interface: sidebar, email list, reading pane, search, starring, drafts, trash.
- Compose with **To**, **Cc** and **Bcc** recipient fields (chip inputs, comma/Enter to add).
- **From** field: uses the sender display name and company email assigned by Admin or HR. The domain is enforced on the server — requests with any other sender domain are rejected.
- Deterministic fallback avatars use stable name-derived initials and HSL gradients when no profile photo is available.
- Drafts auto-save while you compose and can be reopened to edit.
- Sent and received emails are recorded in Convex so users can review matching mailbox entries.
- Installable PWA with a private offline fallback, unread app icon badges, and opt-in push notifications for new inbound mail.

## Setup

1. Configure the environment variables below. An account can be created before `RESEND_API_KEY` is available; password reset and mail delivery need the key.
2. Configure local Next.js env in `.env.local`:

   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud
   NEXT_PUBLIC_CONVEX_SITE_URL=https://your-dev-deployment.convex.site
   RESEND_API_KEY= # add after creating a Resend key
   RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx
   MAILICO_INTERNAL_SECRET=use-a-long-random-secret
   MAILICO_EMPLOYEE_API_KEY=use-a-separate-long-random-secret
   MAILICO_OWNER_SETUP_TOKEN=use-a-different-random-secret-at-least-32-characters
   ```

3. Configure Convex env for auth and server-side email:

   ```bash
   npx convex env set SITE_URL http://localhost:3000
   npx convex env set APP_NAME "Mailico"
   npx convex env set AUTH_FROM_EMAIL "auth@your-verified-sender-domain.example"
   npx convex env set BETTER_AUTH_SECRET "your-32-byte-or-longer-secret"
   # After creating the Resend key:
   npx convex env set RESEND_API_KEY "re_xxxxxxxx"
   npx convex env set MAILICO_INTERNAL_SECRET "same-long-random-secret"
   ```

   `SITE_URL` and `BETTER_AUTH_SECRET` must be set in Convex because `convex/auth.ts` runs in Convex, not in Vercel or the local Next.js process.

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Open http://localhost:3000, create and sign in to an account, then complete `/setup` with the one-time owner setup token. Choose the company domain and first sender address (for example `admin@mail.darvizlabs.online`). The token must be configured in the Next.js server environment and can be removed after the company is set up.

6. In setup, confirm the Resend key is configured and use **Yes, check Resend**. Mailico validates the server-side key and looks up the configured domain status. If needed, add the domain to [Resend](https://resend.com/domains), publish its DNS records, and check again. Create the [Resend API key](https://resend.com/api-keys) if one is not configured yet.

The first account that submits a valid one-time owner setup token becomes the business owner and receives the initial admin sender. New users register normally, then request a company address from `/mail`; admins and HR leads review those requests in `/admin`.

For inbound email, configure the Resend webhook to `POST /api/receive` and set its signing secret as `RESEND_WEBHOOK_SECRET` in the Next.js environment. Set a separate high-entropy `MAILICO_INTERNAL_SECRET` in both Next.js and Convex environments; it authenticates internal Next.js-to-Convex persistence calls for inbound and sent mail. Resend's Svix signature is verified against the raw request body before parsing. Inbound ingestion fails closed when either secret is missing, and the database-writing mutation is internal-only.

## Production Env

Vercel needs the public Convex URLs:

```env
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CONVEX_SITE_URL=...
NEXT_PUBLIC_APP_NAME=Your product name
RESEND_API_KEY=...
RESEND_WEBHOOK_SECRET=...
MAILICO_INTERNAL_SECRET=...
MAILICO_EMPLOYEE_API_KEY=...
MAILICO_OWNER_SETUP_TOKEN=...
```

Generate a VAPID key pair with `pnpm exec web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in Convex for both development and production. Use a distinct key pair for each deployment and keep it stable after users subscribe. For example:

```bash
npx convex env set VAPID_PUBLIC_KEY "your-public-key"
npx convex env set VAPID_PRIVATE_KEY "your-private-key"
npx convex env set VAPID_SUBJECT "mailto:admin@darvizlabs.online"
npx convex env set VAPID_PUBLIC_KEY "your-production-public-key" --prod
npx convex env set VAPID_PRIVATE_KEY "your-production-private-key" --prod
npx convex env set VAPID_SUBJECT "mailto:admin@darvizlabs.online" --prod
```

The private key stays in Convex and is never sent to the browser. The Next.js app uses its existing Convex URL and `MAILICO_INTERNAL_SECRET` to expose only the public key. Push is enabled only when all three VAPID values are present. The browser asks for notification permission only after the user turns notifications on; on iOS, Mailico must first be added to the Home Screen. The service worker caches only the generic offline page and does not store signed-in pages, mailbox contents, or API responses.

Mailico serves an installable web manifest, 192px/512px/maskable app icons, and an Apple touch icon. When offline, navigation falls back to a generic page asking the user to reconnect; private inbox data is not available offline.

Convex production needs the auth and server-side secrets:

```bash
npx convex env set SITE_URL https://your-production-domain.example --prod
npx convex env set APP_NAME "Your product name" --prod
npx convex env set AUTH_FROM_EMAIL "auth@your-verified-sender-domain.example" --prod
npx convex env set BETTER_AUTH_SECRET "your-production-secret" --prod
npx convex env set RESEND_API_KEY "re_xxxxxxxx" --prod
npx convex env set MAILICO_INTERNAL_SECRET "same-long-random-secret" --prod
```

Set `MAILICO_INTERNAL_SECRET` in both Vercel and Convex, and set `RESEND_WEBHOOK_SECRET` in Vercel. Configure the Resend webhook signing secret in Vercel and point the webhook at `https://your-production-domain.example/api/receive`.
Set `MAILICO_OWNER_SETUP_TOKEN` only in the Next.js server environment before first-run setup. Use a separate high-entropy value and remove it after the owner has completed setup.

Set Convex `APP_NAME` and `AUTH_FROM_EMAIL` for the deployment. `AUTH_FROM_EMAIL` must belong to a verified Resend sending domain; if omitted, the app derives `auth@<SITE_URL hostname>`. Set `SITE_URL` to the clone's canonical URL and `TRUSTED_ORIGINS` to any additional approved origins (comma-separated). The company mail domain is selected during `/setup` and stored in Convex, so it does not need a source change.

If `BETTER_AUTH_SECRET` changes after Better Auth has generated JWKS signing keys, clear the stale `jwks` rows in the Better Auth Convex component or restore the original secret. Otherwise `/api/auth/convex/token` can fail with `Failed to decrypt private key`.

## Sending API

`POST /api/send`

```json
{
  "to": ["customer@example.com"],
  "cc": ["boss@example.com"],
  "bcc": ["audit@example.com"],
  "subject": "Hello",
  "body": "Plain text body"
}
```

Server-side rules:

- The authenticated user must have an assigned sender at the configured company domain.
- At least one `to` recipient is required; recipients are basic email validated.
- Each user can send up to 30 messages per hour; the quota is enforced in Convex across server instances.
- `replyTo` is set to the sender so replies land back on the custom address.

## Employee provisioning API

`POST /api/employees` creates a pending employee invitation and sends the same password setup email used by the admin invite flow. The employee can then verify their primary email and set a password. The API-created employee starts without a department; an admin can assign one later.

Configure a unique high-entropy `MAILICO_EMPLOYEE_API_KEY` in the Vercel server environment. Keep it private and send it as a bearer token. This key is separate from `MAILICO_INTERNAL_SECRET`.

```http
Authorization: Bearer <MAILICO_EMPLOYEE_API_KEY>
Content-Type: application/json
```

```json
{
  "name": "Taylor Morgan",
  "employeeId": "EMP-1042",
  "primaryEmail": "taylor@example.com",
  "assignedEmail": "taylor.morgan@mail.example.com"
}
```

The `assignedEmail` must use the company domain configured in `/setup`. A successful request returns HTTP `201` with `ok`, the employee data, `invitationStatus: "pending"`, and `emailSent`. Repeating the same request for an active pending invitation returns success without sending another email; changing employee details for that same primary email returns `409`. Invalid input returns `422`, duplicate email/address/employee ID returns `409`, an invalid bearer key returns `401`, missing server configuration returns `503`, and unavailable mail delivery returns `502`.

## Storage note

Sent, received, drafts, and per-user read/star/trash state are stored in Convex. Inbox visibility is keyed by recipient email, so a user sees received mail for their account email and assigned company email. Resend status checks validate the Next.js API key; password recovery and auth email delivery also need the key in Convex.

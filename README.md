# Mailico

A Gmail-style mail client that sends email through [Resend](https://resend.com) from any address on the `mail.darvizlabs.online` domain.

## Features

- Gmail-like interface: sidebar, email list, reading pane, search, starring, drafts, trash.
- Compose with **To**, **Cc** and **Bcc** recipient fields (chip inputs, comma/Enter to add).
- **From** field: uses the sender display name and company email assigned by Admin or HR. The domain is enforced on the server — requests with any other sender domain are rejected.
- Deterministic fallback avatars use stable name-derived initials and HSL gradients when no profile photo is available.
- Drafts auto-save while you compose and can be reopened to edit.
- Sent and received emails are recorded in Convex so users can review matching mailbox entries.

## Setup

1. Verify the `mail.darvizlabs.online` domain in [Resend](https://resend.com/domains) and add the required DNS records.
2. Create a [Resend API key](https://resend.com/api-keys).
3. Configure local Next.js env in `.env.local`:

   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud
   NEXT_PUBLIC_CONVEX_SITE_URL=https://your-dev-deployment.convex.site
   RESEND_API_KEY=re_xxxxxxxx
   ```

4. Configure Convex env for auth and server-side email:

   ```bash
   npx convex env set SITE_URL http://localhost:3000
   npx convex env set BETTER_AUTH_SECRET "your-32-byte-or-longer-secret"
   npx convex env set RESEND_API_KEY "re_xxxxxxxx"
   ```

   `SITE_URL` and `BETTER_AUTH_SECRET` must be set in Convex because `convex/auth.ts` runs in Convex, not in Vercel or the local Next.js process.

5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

6. Open http://localhost:3000, sign in/register, then use `/mail`.

## Production Env

Vercel needs the public Convex URLs:

```env
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CONVEX_SITE_URL=...
```

Convex production needs the auth and server-side secrets:

```bash
npx convex env set SITE_URL https://mailico.darvizlabs.online --prod
npx convex env set BETTER_AUTH_SECRET "your-production-secret" --prod
npx convex env set RESEND_API_KEY "re_xxxxxxxx" --prod
```

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

- The authenticated user must have an assigned `@mail.darvizlabs.online` sender address.
- At least one `to` recipient is required; recipients are basic email validated.
- `replyTo` is set to the sender so replies land back on the custom address.

## Storage note

Sent, received, and draft messages are stored in Convex. Inbox visibility is keyed by recipient email, so a user sees received mail for their account email and assigned company email. Read/star/trash/archive state is not yet durable.

# Mailico Auth + Data Setup

This document captures how the identity + data layers are wired after reintroducing IdentityDB, and what still needs to happen before pointing at production services.

## IdentityDB client

- `IDENTITY_DB_URL` defaults to `https://lovely-magpie-923.convex.site`; override in `.env.local` when running a local IdentityDB (`http://localhost:3210`).
- `IDENTITY_COOKIE_NAME` (`mailicoIdentitySession`) stores the session token as an HTTP-only, secure cookie (7‑day TTL). All Next.js server routes call `requireIdentity()` before touching Convex.
- `/api/auth/register`/`login`/`logout`/`session` are thin proxies around the IdentityDB endpoints. Frontend helpers live in `src/lib/auth-api.ts`.

## Convex integration

- Convex is assumed to run remotely (`NEXT_PUBLIC_CONVEX_URL`/`CONVEX_URL`). Because Convex queries cannot call `fetch`, token validation now happens entirely on the Next.js side before invoking Convex.
- If the Convex deployment is unreachable, APIs will fail with 500 responses; no mock fallback is present anymore.
- To re-enable strict validation inside Convex, move the authorization logic into an Action and have queries/mutations call that action for verification.

## Required env vars

```
IDENTITY_DB_URL=https://lovely-magpie-923.convex.site/
NEXT_PUBLIC_CONVEX_URL=<convex deployment>
CONVEX_ADMIN_SECRET=<matches convex deployment secret>
CONVEX_DEPLOYMENT=<team:project slug for npx convex dev>
```

## Local dev checklist

1. `npm install`
2. `npx convex dev` (in a separate terminal) or ensure `NEXT_PUBLIC_CONVEX_URL` points to a deployed Convex project.
3. `npm run dev`
4. Visit `/auth?mode=signup` → register (IdentityDB must be reachable). Successful auth sets `mailicoIdentitySession` and allows access to `/profile`, `/inbox`, etc.

## Pending hardening

- Implement Convex Actions if we want it to independently verify `sessionToken`s rather than trusting Next.js.
- Finish login/logout UI polish (password reset link, toast messaging, etc.) and wire IdentityDB’s `/auth/login` responses into a future dashboard redirect (currently just refreshes + toast).

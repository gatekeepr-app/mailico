# IdentityDB Profile Setup, Fetch, and CRUD Guide

IdentityDB centralizes account profiles (name, avatar, email metadata) so that every frontend or Convex project in the workspace can lean on the same identity record. This guide describes the canonical flow for creating, reading, updating, and (eventually) deleting a profile through the HTTP API exposed in `convex/http.ts`.

## Quick Reference

| Action | Endpoint | Convex handler |
| --- | --- | --- |
| Create profile during registration | `POST /auth/register` | `internal.auth.registerUser` |
| Fetch profile for an existing session | `POST /auth/validate` or `POST /auth/me` | `internal.auth.validateSession` / `internal.auth.getCurrentUser` |
| Update profile fields | `POST /auth/update-profile` | `internal.auth.updateUserProfile` |
| Delete / deactivate profile | _Not implemented; see [Deletion](#deletion)_ | — |

All endpoints accept JSON, require `Content-Type: application/json`, and return JSON. Base URLs mirror the authentication guide in `docs/IDENTITY_AUTH.md`:

- Development: `http://localhost:3210`
- Production: `https://lovely-magpie-923.convex.site/`

## Data Model

Profiles live in the Convex `users` table defined in `convex/schema.ts`.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | `Id<"users">` | Primary identifier; stable across all apps |
| `email` | string | Trimmed and lowercased; unique per profile |
| `passwordHash` | string | Never returned by HTTP endpoints |
| `name` | string | Sanitized to ensure a non-empty trimmed value |
| `avatarUrl` | string \| undefined | Optional public avatar URL |
| `emailVerified` | boolean | Currently always `false` until verification lands |
| `createdAt` | number | Milliseconds since epoch; mirrors `_creationTime` |

Use `_id` or `email` as the foreign key when linking a profile to app-specific data.

## Create (Setup)

1. Call `POST /auth/register` with `email`, `password`, `name`, and optional `avatarUrl`.
2. IdentityDB normalizes the email, enforces password policy (length ≥ 8 plus lower, upper, numeric, special characters), trims the name, and inserts the row.
3. A seven-day session token is returned; save it in an HTTP-only cookie or secure storage.

Example:

```ts
const res = await fetch(`${IDENTITY_BASE}/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "MySecure!Pass1",
    name: "Ada Lovelace",
    avatarUrl: "https://example.com/avatar.png"
  })
});
const { sessionToken } = await res.json();
```

## Read (Fetch)

- Use `POST /auth/validate` when you only need to confirm a token and fetch the public profile server-side.
- Use `POST /auth/me` from clients that conceptually ask for “current user”; it shares the same implementation but keeps the contract semantic.
- Both endpoints accept `{ "sessionToken": string }` and return the full public profile (everything except `passwordHash`) or `null` if the session is invalid or expired.

Sample validation helper inside another Convex function or Next.js route:

```ts
const identityRes = await fetch(`${IDENTITY_BASE}/auth/validate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionToken })
});
if (!identityRes.ok) throw new Error("Identity service unavailable");
const identity = await identityRes.json();
if (!identity) throw new Error("Session expired");
```

## Update

`POST /auth/update-profile` updates the mutable fields (`name`, `avatarUrl`) for the user owning the provided session token.

- Request body: `{ "sessionToken": string, "name": string, "avatarUrl"?: string }`
- Validation mirrors registration: the name must still be non-empty after trimming. Supplying an empty string will raise an error before hitting storage.
- Response: Latest public user record so clients can refresh caches.

```ts
await fetch(`${IDENTITY_BASE}/auth/update-profile`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionToken,
    name: "Dr. Ada Byron",
    avatarUrl: "https://cdn.example.com/avatars/ada-v2.png"
  })
});
```

### Testing Updates Locally

When running `npx convex dev`, you can exercise the same mutation without the HTTP layer:

```sh
npx convex run internal.auth.updateUserProfile '{
  "sessionToken": "<token>",
  "name": "New Name",
  "avatarUrl": "https://example.com/new.png"
}'
```

## Deletion

IdentityDB currently lacks a hosted endpoint for deleting or deactivating a profile. Until we implement it:

1. **Preferred:** Build an app-specific “soft delete” flag in your consuming service while leaving the canonical profile intact. This avoids dangling foreign keys in other apps that may also rely on the same identity.
2. **Manual administrative deletion:** If you must purge a user, run a protected Convex script or dashboard mutation that removes the row from `users` and cascades through `sessions`. Example mutation outline:
   - Validate the caller has admin privileges.
   - `ctx.db.delete("users", id)` to drop the profile.
   - Delete any `sessions` rows referencing that `userId` to revoke access.
3. Document each manual deletion event so dependent products know why a profile vanished.

Track the future HTTP route (`POST /auth/delete-profile`) in your backlog; it should wrap a new internal mutation that performs the cascading delete described above.

## Best Practices

- Always run profile reads/writes through the HTTP API instead of hitting Convex tables directly from other services. This keeps validation centralized.
- Cache the latest profile data in your frontend state, but revalidate with `/auth/validate` on navigation or privileged actions to honor revocations.
- Never store `passwordHash` or mutate Convex tables from outside IdentityDB; treat this repo as the single source of truth for account metadata.
- When adding new profile fields, update `convex/schema.ts`, expose them in `internal.auth.updateUserProfile`, and revise this guide plus `docs/IDENTITY_AUTH.md` so client teams know how to use them.

Keep this document in sync with any API or schema changes so onboarding teams can self-serve profile CRUD workflows.

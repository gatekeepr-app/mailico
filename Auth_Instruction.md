# IdentityDB Authentication HTTP API

IdentityDB exposes a single set of HTTP endpoints that every project in this workspace can call for registration, login, session validation, and profile management. Each consuming app keeps its own Convex database for product data but delegates identity concerns to this service.

## Base URL

- **Development:** `http://localhost:3210` (when running `npx convex dev` inside `IdentityDB`)
- **Production:** `https://lovely-magpie-923.convex.site/`

All examples below assume the production URL. Replace it with the dev URL when testing locally.

### Common Requirements

- Method: always `POST`
- Headers: `Content-Type: application/json`
- Responses: JSON
- Errors: Non-2xx responses include an error message string in the JSON body; surface that message in clients.

Passwords must be at least 8 characters and include lowercase, uppercase, numeric, and special characters. Emails are trimmed and lowercased before storage. Session tokens expire 7 days after creation.

## Endpoint Reference

| Path | Purpose |
| --- | --- |
| `POST /auth/register` | Create a user and issue an initial session token |
| `POST /auth/login` | Validate credentials and issue a new session |
| `POST /auth/logout` | Invalidate a session token |
| `POST /auth/validate` | Return the public profile for an active session or `null` |
| `POST /auth/me` | Alias of validate for convenience |
| `POST /auth/change-password` | Change the password for a logged-in user |
| `POST /auth/update-profile` | Update name/avatar for the current user |

### 1. Register — `POST /auth/register`

**Request body**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string | ✅ | Unique per IdentityDB, case-insensitive |
| `password` | string | ✅ | Must satisfy password policy |
| `name` | string | ✅ | Trimmed; must be non-empty |
| `avatarUrl` | string | optional | Public avatar URL; omit if unknown |

**Response**

```json
{
  "sessionToken": "<token string>"
}
```

Use the returned token to authenticate subsequent calls.

### 2. Login — `POST /auth/login`

**Request body**

```json
{
  "email": "user@example.com",
  "password": "MySecure!Pass1"
}
```

**Response**

```json
{
  "user": {
    "_id": "<Convex Id>",
    "_creationTime": 1731290992000,
    "email": "user@example.com",
    "name": "Ada Lovelace",
    "avatarUrl": "https://example.com/avatar.png",
    "emailVerified": false,
    "createdAt": 1731290992000
  },
  "sessionToken": "<token string>"
}
```

### 3. Logout — `POST /auth/logout`

```json
{
  "sessionToken": "<token to revoke>"
}
```

Response: `{ "success": true }` even if the token was already invalid.

### 4. Validate Session — `POST /auth/validate`

```json
{
  "sessionToken": "<token>"
}
```

Returns the same public user object as `/auth/login` or `null` if the token is expired/invalid. Use this inside your own Convex functions to authorize requests.

### 5. Current User — `POST /auth/me`

Identical contract to `/auth/validate`; provided for semantic clarity on the client.

### 6. Change Password — `POST /auth/change-password`

```json
{
  "sessionToken": "<token>",
  "currentPassword": "OldPass1!",
  "newPassword": "NewPass2@"
}
```

Response: `{}` on success. The session remains valid after the change.

### 7. Update Profile — `POST /auth/update-profile`

```json
{
  "sessionToken": "<token>",
  "name": "New Name",
  "avatarUrl": "https://example.com/new.png"
}
```

Response: Updated public user record.

## Integration Pattern

1. **Client flow**
   - Call `/auth/register` or `/auth/login` to obtain a `sessionToken`.
   - Store the token securely (HTTP-only cookie, secure storage, or server session).
   - Include the token when making app-specific API calls so your backend can validate it.

2. **Server-side validation in other apps**

```ts
const res = await fetch(`${IDENTITY_DB_URL}/auth/validate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionToken })
});

if (!res.ok) throw new Error("Identity service unavailable");
const identity = await res.json();
if (!identity) throw new Error("Invalid session");
```

3. **Local user mirrors (optional)**
   - Use `identity._id` or `identity.email` as the foreign key into app-specific tables if you need additional metadata.

## Error Handling

- 400: validation errors (missing fields, weak password, duplicate email, invalid current password). The JSON body contains an `error` string.
- 401: typically unused—IdentityDB encodes auth problems as 400 with a descriptive error message.
- 500: unexpected Convex error. Log and retry or surface “Identity service unavailable”.

Always surface the `error` string during development so problems are easy to debug.

## Operational Notes

- Session lifetime: 7 days. Clients should re-login once `/auth/validate` returns `null`.
- Password hashing uses `bcryptjs` with 12 salt rounds.
- Email verification: flag exists (`emailVerified`) but no verification pipeline is implemented yet.
- Logging: `convex/http.ts` can emit payload diagnostics when developing; remove or disable logs before production if not needed.

This document lives at `docs/IDENTITY_AUTH.md`; update it whenever endpoints or behaviors change.

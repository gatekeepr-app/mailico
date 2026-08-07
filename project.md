# Mailico Project Notes

## Purpose

Mailico is an internal email tool for departments and employees. It sends email through Resend from the fixed company sending domain `@mail.darvizlabs.online`.

## Current Product Direction

- `/` is reserved for a future public marketing page and should remain separate from the authenticated product.
- `/mail` is the authenticated internal mail app.
- `/login` and `/register` are the Better Auth email/password entry points.
- `/reset-password/[token]` lets users complete password reset from emailed links.
- `/changelog` renders the real project changelog from `opencode.md`.
- `/manual` documents the internal workflows for admins, HR, and employees.

## Authentication

- Auth is implemented with Better Auth running on Convex via `@convex-dev/better-auth`.
- Password reset is enabled through Better Auth and sends reset links with Resend from `auth@mail.darvizlabs.online`.
- Convex deployment: `dev:terrific-hyena-970` for project `mailico`.
- The first app profile created becomes `admin`; later users default to `user`.
- Better Auth trusted origins are configured in `convex/auth.ts` for `SITE_URL`, `https://mailico.darvizlabs.online`, `http://localhost:3000`, `http://127.0.0.1:3000`, and optional comma-separated `TRUSTED_ORIGINS`.
- `contact.gatekeepr@gmail.com` is the only true admin account. `chief` and `hrLead` roles can access `/admin` with constrained permissions.
- If `BETTER_AUTH_SECRET` is changed after JWKS keys exist, the Better Auth component `jwks` table must be cleared or the original secret restored.

## Avatars

- Shared avatar logic lives in `lib/avatar.ts` and `components/ui/avatar.tsx`.
- Fallback avatars are deterministic: the user's trimmed name generates a stable hue and up to two uppercase initials.
- Do not store avatar colors in Convex; the same name must produce the same gradient on server and client.
- Uploaded/profile images should be preserved when available, with deterministic gradient fallback on missing or failed image URLs.

## Roles

- `admin`: reserved for `contact.gatekeepr@gmail.com`; universal access, can manage all users, roles, departments, email assignments, and view all messages.
- `chief`: can access `/admin`, assign non-admin roles, assign departments, and assign company email addresses.
- `hrLead`: can access `/admin`, assign departments, and assign company email addresses, but cannot change roles.
- `hr`: legacy stored role treated like `hrLead` for compatibility.
- `user`: can only send from their assigned company email and view messages they sent or that were addressed to their assigned email.

## Admin UI

- `/admin` uses a left Departments card that creates departments and lists existing departments.
- Employee management is rendered as a table with shadcn-style Table and Select primitives.
- Role and department edits are row-level forms; company email local parts still send as `@mail.darvizlabs.online`.

## Department Basics

- Departments are simple named records in Convex.
- Users can be assigned to departments by admins or HR.

## Email Rules

- The sender domain must remain exactly `mail.darvizlabs.online`.
- Users cannot edit their From email manually.
- Sending should use the account creation name as the display name.
- A user must have an assigned company email before sending.
- Users only see messages they sent or messages received at their account email or assigned company email.
- Admin page access does not grant universal inbox visibility.
- Sent, received, and draft messages are persisted in Convex.
- Inbound messages can be recorded through `POST /api/receive`; configure `RECEIVE_WEBHOOK_SECRET` to require the `x-mailico-secret` header.

## Stack

- Next.js 16 App Router
- React 19
- pnpm
- Tailwind CSS v4
- shadcn/ui (radix preset)
- Convex
- Better Auth
- Resend

## Environment

- `.env.local` / Vercel env applies to the Next.js runtime only.
- Convex env applies to files under `convex/`, including `convex/auth.ts`.
- `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` are required in local/Vercel env for the browser and Next adapter.
- Convex env vars include `SITE_URL`, `BETTER_AUTH_SECRET`, and `RESEND_API_KEY`.
- `SITE_URL` is the canonical URL for the current Convex environment: `http://localhost:3000` for local dev or `https://mailico.darvizlabs.online` for production.
- `BETTER_AUTH_SECRET` must be a strong non-public secret and must not be prefixed with `NEXT_PUBLIC_`.

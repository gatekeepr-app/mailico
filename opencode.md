# OpenCode Changelog

This file captures implementation context for future OpenCode sessions. It intentionally records task-level decisions, constraints, and current state.

## 2026-08-07 - Initial Mail UI

- Created a Next.js 16 app in an empty repo.
- Added a Gmail-like client interface with sidebar, search, email list, reading pane, compose modal, drafts, sent mail, starred messages, and trash.
- Added Resend send API at `/api/send`.
- Enforced sender domain server-side as `@mail.darvizlabs.online`.
- Initially allowed the user to type the sender local part before the fixed domain.
- Stored demo mail state in localStorage.
- Added `.env.example` and documented `RESEND_API_KEY` setup.

## 2026-08-07 - Sending Debug

- Email sending initially failed because the running Next server did not have `RESEND_API_KEY` loaded.
- Confirmed `.env.local` contained a Resend key after the server had already started.
- Restarting the server was required for the API route to see the env var.

## 2026-08-07 - Package Manager and Auth Foundation

- Switched the project from npm to pnpm.
- Removed `package-lock.json` and generated `pnpm-lock.yaml`.
- Installed Convex, Better Auth, and `@convex-dev/better-auth`.
- Confirmed Convex was already connected to project `mailico` at deployment `dev:terrific-hyena-970`.
- Verified the root Convex database had no existing tables, so the requested wipe had nothing to delete.
- Added Better Auth Convex component setup:
  - `convex/convex.config.ts`
  - `convex/auth.config.ts`
  - `convex/auth.ts`
  - `convex/http.ts`
  - `lib/auth-client.ts`
  - `lib/auth-server.ts`
  - `app/api/auth/[...all]/route.ts`
- Set Convex env vars `BETTER_AUTH_SECRET` and `SITE_URL`.
- Wrapped the app in `ConvexBetterAuthProvider`.
- Added `/login` and `/register` with Better Auth email/password.
- Added shadcn/ui with radix preset and created Button, Input, Label, Card, and Sonner components.

## 2026-08-07 - Internal Tool Requirements Update

- Product direction changed from a self-service sender to an internal company mail tool.
- `/` must be kept for a future marketing page.
- Authenticated app should move to `/mail`.
- Admin account exists conceptually and needs universal access.
- HR must be allowed to assign users company email addresses and departments, without admin-level control.
- Departments should remain basic.
- Users must not change their From email.
- Sending must use the user's account creation name as the display name.
- Users should only see messages they sent or messages addressed to their assigned company email.
- Added app-owned Convex schema draft for `departments`, `userProfiles`, and `messages`.
- Added Convex profile functions for first-user admin bootstrap, staff assignment, department creation, and profile lookup.
- Added Convex message functions for recording sent messages and listing messages visible to the current user.

## Current Next Steps

- `/` moved to a minimal marketing placeholder.
- Authenticated mail UI moved to `/mail`.
- `/admin` added for Admin/HR people, department, role, and company-email assignment.
- Compose no longer allows editing From; it displays the assigned company email.
- `/api/send` now derives sender name/email from the authenticated Convex profile and ignores client-supplied From.
- Sent messages are recorded in Convex after Resend sends successfully.
- Visible mail is loaded from Convex and filtered by role/assigned email.
- localStorage is now limited to drafts only.
- `/changelog` renders this file.

## 2026-08-07 - Account Recovery and Manual

- Added show/hide password toggles on login, register, and reset-password forms.
- Added forgot-password dialog on `/login` using shadcn/ui Dialog.
- Configured Better Auth password reset email sending through Resend in Convex auth config.
- Set Convex `RESEND_API_KEY` env var for reset email delivery.
- Added `/reset-password/[token]` to let users set a new password from reset links.
- Added toast notifications for reset request, reset success/failure, login failure, and sign-up failure.
- Added `/manual` with user-facing instructions for account setup, roles, admin/HR assignment, sending, viewing, and password recovery.

## Open Follow-Ups

- Add durable read/star/trash state in Convex if those folders should persist beyond drafts.
- Add inbound email ingestion/webhooks if real received mail should enter Mailico from outside sent records.
- Expand the marketing page when copy/design is ready.

## 2026-08-07 - Production Readiness Fixes

- Replaced unbounded `messages.collect()` mailbox loading with indexed cursor-paginated mailbox entries.
- Added `mailboxEntries` table to avoid scanning every message for each user mailbox.
- Added message indexes for sender/time, global created time, and idempotency keys.
- Added user profile indexes for updated time and department.
- Added paginated Admin/HR employee listing with load-more behavior.
- Split mailbox list payloads from full message details; list entries now use `bodyPreview`, and full body loads only when opening a message.
- Restricted Bcc visibility to sender/admin through the full message query.
- Added send idempotency key flow using compose draft IDs and Resend idempotency header.
- Added a Resend request timeout to avoid unbounded external API waits.
- Removed first-user auto-admin bootstrap; new admin bootstrap should use existing admin profile or `ADMIN_EMAILS`.
- Avoided unnecessary profile writes on every `/mail` mount when profile fields are unchanged.
- Added admin mutation error toasts for department/profile updates.
- Escaped reset-password email HTML interpolation.

## 2026-08-07 - Avatars and Auth Env Recovery

- Added deterministic fallback avatar utilities in `lib/avatar.ts`.
- Added shared `components/ui/avatar.tsx` with image-first rendering, failed-image fallback, circular sizing, white initials, and stable HSL gradients.
- Replaced manual fallback initials in `TopBar`, `EmailView`, and `AdminPanel` with the shared Avatar component.
- Added Better Auth `trustedOrigins` in `convex/auth.ts` for the live domain, localhost, loopback, `SITE_URL`, and optional `TRUSTED_ORIGINS`.
- Clarified that `convex/auth.ts` reads Convex env, not Vercel env or `.env.local`.
- Diagnosed `/api/auth/convex/token` 500 as a Better Auth JWKS decrypt failure after `BETTER_AUTH_SECRET` changed.
- Cleared one stale `jwks` row from the mounted Better Auth Convex component; unauthenticated `/api/auth/convex/token` now returns `401 Unauthorized` instead of `500`.
- Verification passed with targeted ESLint and `npm run build`.

## 2026-08-07 - Admin Access Rules

- Set `contact.gatekeepr@gmail.com` as the only true admin account.
- Kept `role` and `departmentId` fields in Convex user profiles.
- Added `chief` and `hrLead` role support while preserving legacy `hr` values.
- Allowed `chief` and `hrLead` to access `/admin`.
- Allowed `chief` to assign non-admin roles, departments, and company email addresses.
- Allowed `hrLead`/legacy `hr` to assign departments and company email addresses, but not change roles.

## 2026-08-07 - Admin Table Layout

- Refactored `/admin` into a two-column management layout.
- Kept the Departments card in the left rail and added a list of existing departments.
- Changed employee management from stacked cards to a table format.
- Added shadcn-style `components/ui/table.tsx` and `components/ui/select.tsx` primitives.
- Replaced native role/department selects with shadcn Select and `SelectItem` controls.

## 2026-08-07 - Minimal Home Route

- Replaced the `/` placeholder with a minimal public Mailico landing page.
- Added a restrained editorial layout with sign-in, workspace, and manual entry points.
- Kept authenticated product routes separate at `/mail` and `/admin`.

## 2026-08-07 - Received Mail and Convex Drafts

- Added `POST /api/receive` for inbound mail ingestion into Convex.
- Added `recordInboundMessage` to create received messages and inbox entries by recipient email.
- Inbox queries now merge the current profile's account email and assigned company email.
- Added a Convex `drafts` table with list/upsert/delete functions.
- Replaced browser localStorage draft persistence with Convex-backed draft autosave.

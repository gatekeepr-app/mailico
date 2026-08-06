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

## Roles

- `admin`: universal access, can manage all users, roles, departments, email assignments, and view all messages.
- `hr`: can manage basic employee assignments and assign company email addresses, but cannot grant or modify admin access.
- `user`: can only send from their assigned company email and view messages they sent or that were addressed to their assigned email.

## Department Basics

- Departments are simple named records in Convex.
- Users can be assigned to departments by admins or HR.

## Email Rules

- The sender domain must remain exactly `mail.darvizlabs.online`.
- Users cannot edit their From email manually.
- Sending should use the account creation name as the display name.
- A user must have an assigned company email before sending.
- Users only see messages they sent or messages received at their assigned company email.
- Admin sees all messages.

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

- `RESEND_API_KEY` is local-only and must not be committed.
- `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` are required locally.
- Convex env vars include `BETTER_AUTH_SECRET` and `SITE_URL`.

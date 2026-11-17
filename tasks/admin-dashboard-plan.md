# Admin dashboard route plan

## Scope

One company workspace per deployment. Every page is scoped to the authenticated user's company; company settings, directory data, requests, and mail configuration stay backed by Convex. The UI uses environment-configurable application identity and deployment URL, while the company mail domain is supplied during first-run setup.

## Route map

| Route | Purpose | Access |
| --- | --- | --- |
| `/admin` | Live operational overview, pending address requests, employee directory, departments, Resend status, and shortcuts | Admin, Chief, HR Lead, HR |
| `/admin/employees` | Invite employees, list/cancel pending invitations, assign roles/departments/company addresses, send password reset emails to the employee's verified primary account email | Admin, Chief, HR Lead, HR; invite is owner-only; role changes follow existing role policy |
| `/admin/departments` | Create departments, customize each department-head position title, and inspect assignment status | Admin or Chief can change titles; staff can inspect departments |
| `/admin/requests` | Approve or decline company email address requests | Admin, Chief, HR Lead, HR (mutations remain Convex-authorized) |
| `/admin/settings` | Check Resend status and correct an unverified company domain | Business owner only |

## Employee onboarding and password reset

1. Owner creates an invitation and provides an email address where the employee can receive the invitation link.
2. At `/invite/[token]`, the employee enters their personal or primary email and creates a password.
3. The token-authorized Convex mutation updates the pending invitation's account email; Better Auth sends verification to the entered address. The invitation is not accepted until that address is verified and the user signs in.
4. The verified account email becomes the employee's primary account email in their profile.
5. Staff selects **Reset password** for the employee. The browser calls Better Auth using that primary email, and the existing time-limited reset link is sent by the configured Resend sender. The UI uses neutral copy so it does not disclose account existence.

## Clone/deployment configuration

- `NEXT_PUBLIC_APP_NAME`: UI/metadata brand (defaults to `Mailico`).
- Convex `APP_NAME`: email and Better Auth brand (defaults to `Mailico`).
- Convex `SITE_URL`: canonical app URL used for Better Auth callback URLs and the default auth sender domain.
- Convex `TRUSTED_ORIGINS`: comma-separated extra origins when the app has multiple approved hosts. Only explicitly configured origins are trusted; local development uses `SITE_URL=http://localhost:3000`.
- Convex `AUTH_FROM_EMAIL`: verified sender address for auth/verification/reset mail. If omitted, sender falls back to `auth@<SITE_URL hostname>`.
- `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL`: point the clone to its own Convex deployment.
- Company mail domain: set interactively in `/setup`, then stored in Convex company settings; it is not embedded in source.
- Department-head titles: customized per department in `/admin/departments`; assignment stays in the employee role/department controls. Internally, this remains the controlled `hrLead` capability so title edits never grant mailbox access.

Keep the auth sender domain verified in Resend. Changing a deployment's site origin requires matching `SITE_URL` and any additional `TRUSTED_ORIGINS` in Convex, plus the clone's Vercel hostname.

## Later candidates

- Audit log route once durable actor/action history exists.
- Billing/plan management once subscription state and entitlements exist.
- Organization profile and DNS instructions once the company settings schema supports them.
- Invitation delivery history/resend once invitation delivery attempts are persisted.

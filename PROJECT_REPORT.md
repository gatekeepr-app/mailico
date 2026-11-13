# Mailico Codebase Report

**Assessment date:** 2026-11-13  
**Project:** Mailico (`0.1.0`)  
**Scope:** Static review of the checked-out application source, project notes, and package configuration. No dependencies, credentials, live services, or deployment settings were exercised.

## Executive summary

Mailico is an internal email client built with Next.js 16, React 19, Convex, Better Auth, and Resend. Its main flows are present: account sign-in, profile and staff administration, drafts, outbound email, inbound email ingestion, and mailbox views. Convex is used for message persistence and access checks; Resend handles message delivery.

The architecture is compact and understandable, with server-side enforcement for sender-domain assignment and recipient validation. The most consequential concern is inbound mail ingestion: the HTTP route accepts events without authenticating them whenever `RECEIVE_WEBHOOK_SECRET` is unset, and the corresponding Convex mutation is callable without authentication. This creates a path to inject forged mail into stored mailboxes if the endpoint or Convex deployment is reachable. Other notable gaps are inconsistent admin behavior, incomplete mailbox state features, and limited operational protections around email sending.

## Product and architecture

- **Web application:** Next.js App Router pages under `app/`; client mailbox UI in `components/MailApp.tsx`.
- **Authentication:** Better Auth via `@convex-dev/better-auth`; Convex-backed user profiles and role assignments.
- **Data:** Convex tables for profiles, departments, messages, mailbox entries, and drafts (`convex/schema.ts`).
- **Email delivery:** `POST /api/send` calls Resend after resolving the authenticated user's assigned company address.
- **Email intake:** `POST /api/receive` parses inbound Resend events, retrieves message content, then stores it in Convex.
- **Access model:** Profiles have `admin`, `chief`, `hrLead`, `hr`, or `user` roles. Staff assignment and department operations are implemented in `convex/profiles.ts`.

## Findings and recommendations

### High priority: authenticate inbound email events

`app/api/receive/route.ts` only rejects requests when `RECEIVE_WEBHOOK_SECRET` is configured and the `x-mailico-secret` header does not match. If the secret is unset, arbitrary requests can submit inbound payloads. The route then invokes `api.mail.recordInboundMessage`, whose mutation does not require an authenticated caller or verify a webhook signature. This allows forged sender/recipient/subject/body data to be stored as received mail.

**Recommendation:** Require a configured secret or, preferably, validate Resend's webhook signature and timestamp before processing. Fail closed if the verifier is not configured. Consider restricting direct access to the Convex mutation (for example, moving ingestion behind a trusted action or validating a signed internal credential), since route-level protection alone does not protect a publicly exposed Convex mutation.

### Medium priority: align admin mailbox visibility with the stated behavior

`convex/mail.ts` permits admins to read any message through `getMessage`, but `listMailboxEntries` only queries inbox entries for the current profile's account and assigned email. Sent messages also use the current user's key. Sent and inbound message creation writes an `admin:all` owner entry, but the listing query never uses that key. As a result, admin detail access is broader than the admin's mailbox listing, and the `admin:all` index entries are not used by that listing path.

**Recommendation:** Decide whether admins should have a universal inbox as the notes imply. If so, include the admin owner key in the admin query and implement the same policy for sent mail; otherwise remove or revise the unused entries and documentation. Keep the authorization checks and UI semantics consistent.

### Medium priority: document and enforce registration/admin bootstrap

The project notes say the first profile created becomes admin, but `ensureCurrentProfile` assigns `admin` only to `contact.gatekeepr@gmail.com`; all other new users become `user`. Email verification is also disabled in Better Auth (`requireEmailVerification: false`). The code therefore does not match the bootstrap note, and the public registration flow can create unverified accounts unless registration is otherwise controlled outside this repository.

**Recommendation:** Update the bootstrap documentation to match the fixed admin account, and decide whether open registration and unverified email addresses are intended. If membership is internal-only, gate sign-up or require email verification and an approved company identity.

### Medium priority: validate inputs again at trusted persistence boundaries

`/api/send` performs recipient validation and enforces the sender domain, but `recordSentMessage` itself only checks that the caller has an assigned email. It does not enforce the allowed domain or validate its recipients. `upsertDraft` accepts an arbitrary `fromEmail` and unbounded fields. These mutations currently appear intended for authenticated app use, but Convex mutations are callable independently of the Next.js route and should enforce critical invariants themselves.

**Recommendation:** Centralize and repeat relevant validation in Convex mutations: allowed sender domain, email syntax, maximum recipient and text lengths, and ownership/shape constraints for draft data. Treat the UI and API checks as usability checks, not the only trust boundary.

### Medium priority: add send-operation resilience and abuse controls

`/api/send` caps recipient count and request text length, applies a Resend timeout, and supports idempotency. It has no visible rate limit or send quota. It also returns the upstream Resend error message directly and may return caught exception text to the client. If sending succeeds but persistence fails, the endpoint reports an error even though the email may already have been delivered; retry behavior depends on the idempotency key and provider retention.

**Recommendation:** Add per-user rate limits/quotas, normalize client-facing errors, log provider failures with a request correlation ID, and define a recoverable delivery/persistence state for the send-then-store failure window.

### Lower priority: mailbox controls are presentational or incomplete

`MailApp` maps every loaded message to `read: true` and `starred: false`; `toggleStar` and `markUnread` are no-ops. Archive/trash actions explicitly report that mailbox state is not synced. Starred, trash, and unread counts therefore cannot reflect persistent message state. Search filters only the currently loaded entries and drafts, not the full mailbox.

**Recommendation:** Persist per-user mailbox state in Convex and implement pagination-aware search or label the current search behavior as limited to loaded results. Until then, hide or clearly disable controls that suggest state changes.

## Strengths

- Sender identity is taken from the authenticated profile, not an arbitrary client-supplied `From` value.
- Outbound sender domain, recipient syntax, recipient count, and message body size receive server-side checks in the route.
- Outbound message HTML is generated from escaped plain text rather than accepting arbitrary client HTML.
- Mailbox message reads apply a server-side visibility check, including recipient ownership checks and BCC filtering for non-senders.
- Drafts are scoped by authenticated owner and draft key.
- Staff role assignment and sender-address uniqueness are enforced in Convex mutations.
- The README and `project.md` explain required environment variables and separate Next.js runtime configuration from Convex configuration.

## Suggested next steps

1. Make inbound webhook authentication mandatory and protect the ingestion mutation.
2. Choose and align admin mailbox visibility across queries, UI, and project notes.
3. Confirm registration policy and correct the admin bootstrap documentation.
4. Enforce critical sender, recipient, and length constraints inside Convex mutations.
5. Implement persistent mailbox state and send throttling before treating the UI as a complete Gmail-style client.

## Verification limits

This report is based on static source inspection. It does not claim runtime behavior has been confirmed, and it does not include a dependency vulnerability scan, deployment review, penetration test, or execution of the build/lint scripts.

## Implementation update — 2026-11-13

The initial findings were addressed in the working tree after this assessment:

- Inbound requests now verify Resend's Svix signature against the raw payload. Inbound and sent-message persistence use secret-guarded Convex HTTP actions that call internal-only mutations.
- Admin inbox and sent listings now follow the admin role's universal visibility policy.
- First-run setup now stores a company domain and owner sender, assigns the owner admin role, and checks the configured Resend key/domain status. Account creation can proceed before Resend is configured.
- Employees can request company sender addresses; admin and HR users review requests in the portal, and approval updates the employee profile used by sending.
- Admin bootstrap no longer depends on a hardcoded account address; the configured setup owner is the admin.
- Sender-domain, recipient-count, recipient-format, subject-length, and body-length checks run at the Convex persistence boundary. The send route also enforces request-size limits and returns generic provider/runtime errors.
- A Convex-backed quota limits each user to 30 sends per hour.
- Starred, read, and trash state now persists per user, with UI actions for starring, marking unread, reading on open, trashing, restoring, and bulk actions.

The changes have received static review and `git diff --check`; build, lint, and runtime behavior have not been verified. Search still applies to the currently loaded mailbox pages, and the message view's Archive and Delete controls share the trash/restore behavior. Account recovery emails still use Mailico's service sender domain `mail.darvizlabs.online`; that domain must remain verified in Resend.

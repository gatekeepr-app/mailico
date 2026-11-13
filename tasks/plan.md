# Mailico remediation plan

## Overview

Harden and complete Mailico's one-company-per-deployment onboarding and internal mail flows. Work is ordered so that identity and mailbox boundaries are designed before adding more mailbox features. Initial remediation slices have started; their implementation and verification status is tracked in `tasks/todo.md`. No tests or builds have been run as part of those slices.

## Product decisions

- **Deployment model:** one company per deployment. State this in onboarding and deployment docs; do not begin shared-tenant SaaS work without a separate architecture plan.
- **Membership:** retain the desired ability to create an account, but an account is not a company member until its email is verified and an owner/HR approval or valid invitation grants membership.
- **Owner bootstrap:** one explicit, one-time setup claim configured out-of-band. The first random public signup must never determine who owns the company.
- **Mailbox identity:** access follows an approved immutable profile/mailbox ID. Email addresses are routing aliases; changing or reusing an alias must not implicitly transfer historical mail.
- **MVP boundary:** secure enrollment, setup recovery, reliable send/receive, search, and mailbox lifecycle come before attachments and advanced Gmail features.

## Dependency graph

```text
Enrollment policy + owner bootstrap
  ├── remove legacy role shortcut
  └── approved membership state
        ├── identity-bound mailbox migration
        │     └── alias reassignment and offboarding
        ├── address request workflow and notifications
        └── safe mailbox search and counts

Company setup recovery + complete Resend diagnostics
  └── reliable send and account recovery
        └── outbox/idempotency/quota behavior

Mailbox lifecycle model
  └── separate archive/trash and retention
        └── future attachment and shared-mailbox design
```

## Task list

### Phase 1: Close onboarding and identity trust gaps

#### Task 1 — Protect first-owner bootstrap

**Description:** Replace “first authenticated user to submit setup wins” with an explicit, one-time owner claim. Use a deployment-provided bootstrap credential or a verified owner invitation created out of band. Keep the secret server-side, expire/revoke it, and record who claimed it.

**Acceptance criteria:**
- [ ] A normal signed-up account cannot complete company setup without the bootstrap claim.
- [ ] Exactly one claim can succeed, including two concurrent claim attempts.
- [ ] The claim is consumed atomically and cannot be replayed; no secret is returned to the browser or stored in client-visible data.

**Verification:** Add focused tests for unauthenticated setup, authenticated non-owner, expired/replayed claim, and concurrent first-use. Run the onboarding flow in an isolated local environment.

**Dependencies:** Product decision above.  
**Files likely touched:** `convex/profiles.ts`, `convex/schema.ts`, `components/SetupWizard.tsx`, setup/auth configuration.  
**Estimated scope:** Medium.

#### Task 2 — Make signup produce an untrusted account until verified and admitted

**Description:** Keep self-service account creation, but require proof of account-email ownership before membership or mailbox access. Add a pending/invited/active membership state and ensure setup, admin functions, mailbox queries, drafts, and sending use the state consistently. Decide whether an invitation or owner/HR approval activates the account.

**Acceptance criteria:**
- [ ] Unverified and pending accounts cannot access employee/admin data, request company addresses, send mail, or create mailbox identities.
- [ ] Email verification is actually required server-side; failed/disabled verification cannot silently create an active member.
- [ ] The employee sees clear “verify email” and “awaiting membership approval” states, with retry/resend guidance.

**Verification:** Test unverified, verified-pending, approved, rejected, expired invitation, and duplicate signup cases. Confirm existing users migrate to an intentional status.

**Dependencies:** Task 1 and membership-policy decision.  
**Files likely touched:** `convex/auth.ts`, `convex/profiles.ts`, `convex/schema.ts`, registration/login/setup/mail/admin pages.  
**Estimated scope:** Large; split schema/auth and UI into separate implementation PRs after the membership state contract is approved.

#### Task 3 — Remove the hard-coded legacy administrator grant

**Description:** Remove `LEGACY_ADMIN_EMAIL` as an authorization rule. If an existing deployment needs migration, use a one-time operator-controlled migration that maps the verified intended owner to `ownerAuthUserId`, then demotes all other legacy admin profiles.

**Acceptance criteria:**
- [ ] No email string alone can grant `admin` or staff access.
- [ ] Before setup, staff-only queries and mutations have no caller with implicit admin privileges.
- [ ] After setup, only the configured owner has `admin`, and staff permissions match the documented role matrix.

**Verification:** Test legacy email before and after setup, a different verified email, and a forged/unverified address.

**Dependencies:** Task 1.  
**Files likely touched:** `convex/profiles.ts`, `lib/admin.ts`, migration/upgrade notes.  
**Estimated scope:** Small to medium.

### Checkpoint: Identity boundary

- [ ] Owner setup cannot be claimed by a random public account.
- [ ] Email proof and company membership are separate explicit states.
- [ ] No email string or legacy fallback grants a role.
- [ ] Existing profiles have a reviewed migration path.

### Phase 2: Make mailbox ownership and offboarding safe

#### Task 4 — Move mailbox authorization from address strings to profile identity

**Description:** Define the intended mailbox owners, then migrate `mailboxEntries` from `email:<address>` ownership to immutable profile/mailbox IDs. Keep a separate explicit owner-wide view if the owner is allowed universal visibility. For old entries that map to multiple profiles, quarantine or limit access to the owner instead of guessing.

**Acceptance criteria:**
- [ ] Two profiles cannot read a message merely because their account and assigned addresses collide.
- [ ] BCC visibility, sent-message ownership, and owner-wide access continue to follow explicit policy.
- [ ] Changing an email alias does not change historical mailbox authorization.
- [ ] Migration is idempotent, handles unresolved/conflicting recipients safely, and can be rolled back.

**Verification:** Use two dummy profiles with overlapping account/assigned addresses; test inbound To/Cc/Bcc and sent mail. Repeat after alias change and profile migration.

**Dependencies:** Tasks 1–3; mailbox ownership policy approved.  
**Files likely touched:** `convex/schema.ts`, `convex/mail.ts`, a migration, `components/MailApp.tsx`.  
**Estimated scope:** Large; define/migrate storage before replacing all query paths.

#### Task 5 — Add employee suspension, offboarding, and safe alias transfer

**Description:** Give owner/authorized HR a lifecycle action to suspend an account, revoke sessions, remove mailbox access, and record the offboarding reason/time. Separate alias release from historical mailbox transfer; default to no history transfer.

**Acceptance criteria:**
- [ ] Suspended employees cannot use an existing session to read mail, drafts, admin pages, or send mail.
- [ ] Offboarding immediately revokes or invalidates existing sessions and pending requests.
- [ ] Reassigned aliases route new mail to the new owner while historical mail stays with the original owner/authorized admin.
- [ ] Re-enable and alias-transfer actions are audited and reversible by authorized staff.

**Verification:** Test current session after suspension, pending request during offboarding, alias reuse, and failed/partial offboarding steps.

**Dependencies:** Task 4.  
**Files likely touched:** `convex/schema.ts`, `convex/profiles.ts`, auth session management, `components/AdminPanel.tsx`, audit history.  
**Estimated scope:** Large.

### Checkpoint: Mailbox authorization

- [ ] Mailbox membership no longer depends on email text.
- [ ] Alias edits do not transfer history implicitly.
- [ ] Suspension blocks existing sessions, not only new sign-ins.

### Phase 3: Make setup recoverable and operationally truthful

#### Task 6 — Add owner settings and domain-change recovery

**Description:** Replace the one-shot setup-only domain save with a protected owner settings workflow. Support correction of an unverified typo and a deliberate verified-domain change with preview of affected aliases, migration rules, validation, confirmation, and rollback.

**Acceptance criteria:**
- [ ] The owner can correct an unverified setup without direct database access.
- [ ] A verified domain change explains impact on every assigned alias and blocks unsafe partial changes.
- [ ] Domain and sender normalization reject invalid local parts (leading/trailing/repeated dots, unsupported characters, overlong full address) before persistence.
- [ ] Non-owners cannot change domain or owner identity.

**Verification:** Test typo correction, invalid local parts, long domain/local part, domain change with assigned employees, and failure midway through a migration.

**Dependencies:** Task 1.  
**Files likely touched:** `convex/profiles.ts`, `convex/schema.ts`, setup/settings UI, migration code.  
**Estimated scope:** Medium to large.

#### Task 7 — Verify all Resend capabilities, not just the Next.js key

**Description:** Make setup diagnostics distinguish company-domain sending, Next.js sending credentials, Convex password-reset credentials, and the fixed service sender domain. Keep all API keys server-side and return only status/reason codes. Query the target domain safely even when the Resend account has more than 100 domains.

**Acceptance criteria:**
- [ ] A green “ready” state means outbound sending and password recovery both work with their actual runtime credentials and sender domains.
- [ ] A Next.js key cannot mask a missing/invalid Convex key.
- [ ] The result identifies missing key, invalid key, wrong domain, sending-disabled, service sender failure, and provider timeout distinctly without exposing secrets.
- [ ] Domain lookup is not limited to the first 100 records.

**Verification:** Inject dummy status responses for missing/invalid keys, target domain beyond the first page, pending DNS, verified sending, and service sender failure. Verify secrets do not appear in UI/errors/logs.

**Dependencies:** Task 6; no need to block setup completion while DNS propagates.  
**Files likely touched:** `app/api/setup/resend-status/route.ts`, `convex/auth.ts`, a Convex internal action, `components/SetupWizard.tsx`, `components/AdminPanel.tsx`.  
**Estimated scope:** Medium.

#### Task 8 — Make address requests complete and observable

**Description:** Paginate pending requests and profile lookup, show age/status/history, support cancellation before review, notify authorized staff, and communicate outcomes to employees. Add explicit request throttles/quotas for public or pending accounts.

**Acceptance criteria:**
- [ ] No request disappears at item 100; every record has a resolvable requester or an explicit orphan state.
- [ ] Owner/HR receive a notification with a link; duplicate notifications are idempotent.
- [ ] Employee sees pending, approved, rejected, cancelled, and retry states with history.
- [ ] Request and account-creation limits prevent routine queue flooding without blocking legitimate hires.

**Verification:** Test 0/1/100/101 pending rows, more than 1,000 profiles, missing profile, duplicate alias requests, cancellation/review race, and notification retries.

**Dependencies:** Task 2 for membership admission; Task 4 for identity-safe alias ownership.  
**Files likely touched:** `convex/profiles.ts`, `convex/schema.ts`, `components/AdminPanel.tsx`, `components/MailApp.tsx`, notification service.  
**Estimated scope:** Medium.

### Phase 4: Make core email behavior dependable

#### Task 9 — Make draft state truthful and race-safe

**Description:** Track draft save state from mutation completion, include Cc/Bcc in the dirty/content predicate, cap and validate fields server-side, and serialize save/discard/send operations with a revision or tombstone so an in-flight save cannot resurrect a discarded draft.

**Acceptance criteria:**
- [ ] The UI distinguishes Saving, Saved, and Save failed; it never displays “Auto-saved” before success.
- [ ] A draft with only Cc/Bcc content saves and reopens correctly.
- [ ] Discard and send cannot be overwritten by a late autosave.
- [ ] Draft list limits are paginated or explicitly enforced with an understandable limit; invalid/oversized drafts fail with a visible reason.

**Verification:** Test slow/failing mutation, close/discard during save, only-Cc/Bcc draft, account switch, 100+ drafts, and oversized input.

**Dependencies:** None for UI/state correctness; Task 2 for admission enforcement.  
**Files likely touched:** `components/MailApp.tsx`, `components/ComposeModal.tsx`, `convex/mail.ts`, `convex/schema.ts`.  
**Estimated scope:** Medium.

#### Task 10 — Make send idempotency and quota behavior reflect actual delivery

**Description:** Replace the external-send-then-persist sequence with a durable outbox state machine. Bind idempotency to an immutable request payload; distinguish queued, sent, provider-rejected, uncertain, and stored states. Define whether failed provider attempts consume quota.

**Acceptance criteria:**
- [ ] A retry cannot send changed content under an old idempotency key.
- [ ] A provider success followed by local persistence failure is shown as uncertain/reconciling, not simply “failed.”
- [ ] Quota is atomic and its behavior for definite and ambiguous failures is documented.
- [ ] Users can safely retry or reconcile without creating a duplicate send or losing the sent message record.

**Verification:** Simulate provider rejection, timeout before response, provider success plus persistence failure, edited retry, duplicate concurrent click, and quota boundary 29/30/31.

**Dependencies:** Task 7 for truthful provider readiness.  
**Files likely touched:** `app/api/send/route.ts`, `convex/mail.ts`, `convex/schema.ts`, `components/MailApp.tsx`, send status UI.  
**Estimated scope:** Large; define outbox contract first.

#### Task 11 — Separate Archive, Trash, restore, and deletion

**Description:** Decide retention semantics and give Archive and Delete distinct storage states/actions. If permanent delete is not supported, label Trash as recoverable and state the retention policy.

**Acceptance criteria:**
- [ ] Archive removes a message from Inbox without placing it in Trash.
- [ ] Delete moves a message to Trash; restore returns it to the correct source folder.
- [ ] Bulk actions and per-user mailbox state follow the same transitions.
- [ ] Permanent deletion, if offered, has clear scope and cannot delete a message from other recipients' mailboxes unintentionally.

**Verification:** Test inbox/sent/starred/trash transitions, multiple recipients with independent state, sent/deleted drafts, and refresh/account switch.

**Dependencies:** Task 4 mailbox identity.  
**Files likely touched:** `convex/schema.ts`, `convex/mail.ts`, `lib/types.ts`, `components/EmailView.tsx`, `components/EmailList.tsx`, `components/MailApp.tsx`, `components/Sidebar.tsx`.  
**Estimated scope:** Medium.

#### Task 12 — Add server-side mailbox search and authoritative counts

**Description:** Search the full authorized mailbox, not only loaded pages, and return aggregate counts from Convex. Preserve recipient-level visibility and pagination in the search index/query.

**Acceptance criteria:**
- [ ] Search finds a known message outside the first 25 records and never returns another user's message.
- [ ] Search across Inbox/Sent/Trash follows explicit folder policy and does not reveal BCC data to unauthorized users.
- [ ] Sidebar labels distinguish unread count from total count and do not change merely because another page loaded.
- [ ] Empty, no-result, loading, and query-error states are clear.

**Verification:** Test multi-page data, two dummy users, assigned/account address overlap, BCC, trash state, and large-result pagination.

**Dependencies:** Task 4's identity-bound query/migration.  
**Files likely touched:** `convex/schema.ts`, `convex/mail.ts`, `components/MailApp.tsx`, `components/Sidebar.tsx`, search UI.  
**Estimated scope:** Large.

### Phase 5: Close product and edge-case gaps

#### Task 13 — Make workspace limits explicit and complete

**Description:** Paginate department and employee lookups, eliminate the request list's hard 1,000-profile join cap, and give oversized workspaces a visible loading/overflow path. Replace the fake Refresh behavior with a real refresh/retry or remove it.

**Acceptance criteria:**
- [ ] Every department, profile, pending request, and draft can be reached or is blocked by a documented enforced limit.
- [ ] Refresh re-runs the relevant query or the control is removed.
- [ ] Loading and error states do not masquerade as empty states.

**Verification:** Test 0/1/200/201 departments, 1,000+ profiles, paginated lists, stale query error, and refresh.

**Dependencies:** Task 8 for request pagination; Task 9 for draft pagination.  
**Files likely touched:** `convex/profiles.ts`, `convex/mail.ts`, `components/AdminPanel.tsx`, `components/MailApp.tsx`, `components/TopBar.tsx`.  
**Estimated scope:** Medium.

#### Task 14 — Harden inbound parsing and resource limits

**Description:** Parse Resend payloads according to supported provider shapes, cap request and fetched-content bytes before buffering, set a timeout for provider retrieval, cap recipient counts across all fields, and preserve idempotent webhook handling. Keep signature verification and internal persistence guards as mandatory.

**Acceptance criteria:**
- [ ] Oversized webhook bodies and provider responses are rejected before full buffering.
- [ ] Provider retrieval times out and webhook retry behavior is documented/idempotent.
- [ ] Supported To/Cc/Bcc/received-for shapes, display names, duplicate addresses, and absent optional fields normalize consistently.
- [ ] Invalid signatures and missing secrets fail closed.

**Verification:** Use signed dummy fixtures only in the required isolated local environment; cover payload shape variants, malformed recipient, duplicates, missing IDs, timeout, and oversized streams.

**Dependencies:** None.  
**Files likely touched:** `app/api/receive/route.ts`, `convex/http.ts`, `convex/mail.ts`.  
**Estimated scope:** Medium.

#### Task 15 — Fix post-reset navigation and status continuity

**Description:** Send users to `/login` after successful reset, preserve the success confirmation through navigation, and surface password-reset delivery health from Task 7.

**Acceptance criteria:**
- [ ] Reset link opens `/reset-password/[token]` and successful reset lands directly on sign-in.
- [ ] Expired/used token gives recovery guidance and a way to request a new link.
- [ ] Reset mail failure does not reveal account existence and is diagnosable to the owner without exposing secrets.

**Verification:** Test valid, expired, reused token, unknown email, and missing Convex service-mail configuration.

**Dependencies:** Task 7.  
**Files likely touched:** `app/login/page.tsx`, `app/reset-password/[token]/page.tsx`, `convex/auth.ts`.  
**Estimated scope:** Small.

#### Task 16 — Define attachment scope before enabling the control

**Description:** Keep the control visibly unavailable until a complete attachment design exists. Before implementation, define file type/size rules, malware scanning, private object access, retention, deletion, quotas, and inbound provider attachment handling.

**Acceptance criteria:**
- [ ] No enabled attach action implies support that does not exist.
- [ ] Any future attachment has owner-bound storage authorization, size/type validation, scanning, retention, and cleanup requirements.
- [ ] Inbound attachments are either explicitly rejected/omitted with a visible notice or safely available according to the same policy.

**Verification:** Product/security design review before implementation; later test owner/non-owner access, bad type/size, scan failure, delete, and retention.

**Dependencies:** Tasks 4 and 5 for object/mailbox ownership and lifecycle.  
**Files likely touched:** compose UI and future storage schema only after design.  
**Estimated scope:** Design first; implementation large.

#### Task 17 — State one-company deployment scope in product surfaces

**Description:** Make the single-company deployment model explicit in README, setup, manual, and deployment instructions. Add a deployment checklist that identifies a configured primary company and owner; do not market or label the current data model as multi-tenant.

**Acceptance criteria:**
- [ ] Onboarding/docs say one company per deployment.
- [ ] A second company cannot be silently added to the same global settings record.
- [ ] Any future SaaS/multi-tenant work starts with an explicit tenant-isolation design and tests rather than reusing this plan.

**Verification:** Review onboarding and docs against the actual `companySettings` global row and owner-wide mail policy.

**Dependencies:** None.  
**Files likely touched:** `README.md`, `project.md`, `app/manual/page.tsx`, setup copy.  
**Estimated scope:** Small.

#### Task 18 — Run realistic UI edge-case coverage

**Description:** After behavior stabilizes, review admin, request, mailbox, and compose components with realistic long names/emails, missing optional fields, 0/1/many rows, 1,000+ records, non-Latin names, emoji, failed avatar URLs, 320px width, 200% zoom, and RTL where supported. Do not use absurd random data.

**Acceptance criteria:**
- [ ] Long names/emails keep required actions reachable and expose full values somewhere.
- [ ] Empty/one/many/loading/error states have deliberate copy and correct counts/pluralization.
- [ ] Avatar fallback handles missing/broken images and grapheme clusters.
- [ ] Keyboard and screen-reader users can operate compose/admin flows; modal focus and dialog semantics are correct.

**Verification:** Run the dev-only worst-case fixture/browser review after the required execution environment is available; retain the fixture as a regression tool only if approved.

**Dependencies:** Tasks 8–13.  
**Files likely touched:** `components/AdminPanel.tsx`, `components/EmailList.tsx`, `components/EmailView.tsx`, `components/ComposeModal.tsx`, avatar components/styles.  
**Estimated scope:** Medium.

### Checkpoint: First safe pilot

- [ ] Tasks 1–8 complete and verified with dummy accounts and mailboxes.
- [ ] Owner can recover a bad domain and confirm both sending and password recovery.
- [ ] Employee admission, address approval, offboarding, and alias transfer have explicit states.
- [ ] No unresolved high-impact security boundary blocks a real employee pilot.

### Checkpoint: Dependable mail workflow

- [ ] Tasks 9–15 complete and verified with provider failure, retry, pagination, and lifecycle cases.
- [ ] Search, counts, drafts, send status, archive, and trash match their UI labels.
- [ ] Inbound webhook stays signature-verified and resource-bounded.

### Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing mailbox entries are keyed by addresses and may map to multiple profiles | Migration can expose or hide historical messages | Quarantine ambiguous records and default access to owner/admin until manually resolved |
| Better Auth/Convex session revoke semantics may require framework-specific API review | Suspension may appear to work while existing sessions remain valid | Confirm official installed-version APIs before coding and add a current-session regression check |
| Resend credentials live in separate runtimes | Setup may report false readiness | Implement an internal diagnostic in each runtime and return only status codes |
| Domain change affects every assigned address and fixed mail configuration | Broken send/reset after migration | Preview, stage, verify new domain/sender, migrate atomically, keep rollback path |
| Scope can drift toward a full email client | Delays safety and core reliability | Keep attachments, threading, shared inboxes, and tenant SaaS out of the first safe-pilot checkpoint |

## Open product questions

- Should any verified person self-register and then wait for membership approval, or must every employee arrive through an owner/HR invitation?
- Should the owner have universal access to all mail, and should that be auditable per access?
- What is the retention rule for trashed mail, offboarded users, and released aliases?
- Should account email receive inbound mail in the product, or should only assigned company aliases do so?

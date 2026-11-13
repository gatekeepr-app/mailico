# Mailico remediation checklist

This checklist tracks the plan in `tasks/plan.md`. Tasks are ordered by dependency; do not start later mailbox features before the identity and ownership policy is settled.

## Phase 1 — Onboarding and identity

- [ ] Task 1: Protect first-owner bootstrap *(server-mediated code slice implemented; verification pending)*
- [ ] Task 2: Make signup untrusted until verified and admitted
- [ ] Task 3: Remove hard-coded legacy administrator grant *(implemented with Task 1; verification pending)*

### Checkpoint

- [ ] Random public account cannot become owner or staff
- [ ] Unverified/pending account has no mailbox or send access
- [ ] Existing user migration is reviewed

## Phase 2 — Mailbox ownership and offboarding

- [ ] Task 4: Move mailbox authorization from email strings to profile identity
- [ ] Task 5: Add suspension, offboarding, and safe alias transfer

### Checkpoint

- [ ] Email alias collision cannot grant access
- [ ] Alias reuse cannot reveal history
- [ ] Existing sessions stop working after suspension

## Phase 3 — Recoverable setup and address workflow

- [ ] Task 6: Add owner settings and domain-change recovery *(owner-only correction for unverified setup typos implemented; verified-domain migration remains open)*
- [ ] Task 7: Verify all Resend capabilities *(bounded paginated company-domain lookup implemented; Convex auth-mail readiness remains unverified)*
- [ ] Task 8: Complete and observe address requests

### Checkpoint

- [ ] Owner can recover setup without database intervention
- [ ] Business send and account recovery readiness are checked separately
- [ ] Request list is complete and staff are notified

## Phase 4 — Dependable mail behavior

- [ ] Task 9: Make draft state truthful and race-safe *(save-status and discard-race slice implemented; remaining limits/verification pending)*
- [ ] Task 10: Make send idempotency and quota behavior reflect delivery *(payload-bound Resend idempotency and persisted-result lookup implemented; durable send attempts and delivery-aware quota remain open)*
- [ ] Task 11: Separate Archive, Trash, restore, and deletion
- [ ] Task 12: Add server-side search and authoritative counts

### Checkpoint

- [ ] Failed/uncertain sends are recoverable without duplicates
- [ ] Draft save/discard behavior is observable and race-safe
- [ ] Search and counts cover the authorized mailbox, not just loaded pages

## Phase 5 — Product and edge-case coverage

- [ ] Task 13: Make workspace limits explicit and complete
- [ ] Task 14: Harden inbound parsing and resource limits *(inbound stream/provider caps and send-request stream cap implemented; verification pending)*
- [ ] Task 15: Fix post-reset navigation and status continuity
- [ ] Task 16: Define attachment scope before enabling the control
- [ ] Task 17: State one-company deployment scope in product surfaces
- [ ] Task 18: Run realistic UI edge-case coverage

### Final checkpoint

- [ ] First safe-pilot criteria in `tasks/plan.md` pass
- [ ] Dependable-mail criteria pass
- [ ] High-impact unresolved security findings are resolved or explicitly accepted by the owner


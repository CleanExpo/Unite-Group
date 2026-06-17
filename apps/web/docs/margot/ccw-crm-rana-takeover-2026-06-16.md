# CCW-CRM / Unite-Group CRM — Rana Takeover Packet

Date: 2026-06-16
Owner: Rana Muzamil
Repo: `CleanExpo/Unite-Group`
App root: `apps/web`
Current production branch: `main`

## Executive Summary

CCW-CRM is no longer a standalone sprint in the old `CleanExpo/CCW-CRM` shape. The active product has been consolidated into `CleanExpo/Unite-Group`, with the product app under `apps/web`.

Current state is **contacts MVP live + tested**, not full CRM complete.

Rana's next job is to take the existing contacts foundation and finish the CRM spine in this order:

1. Verify the CRM schema on a Supabase database branch, then promote to prod only via a merged, approved branch.
2. Unify the current `contacts` MVP with the richer `crm_contacts` model, or explicitly bridge them.
3. Build opportunities/pipeline + forecast.
4. Build approval execution so risky CRM writes are not convention-only.
5. Wire activity/timeline + Gmail/contact import into the CRM record view.
6. Add the missing command-centre navigation and smoke tests.

## Verified Current State

### Working Now

- `/founder/contacts` renders a contact list with search, status filter, create/edit/delete flow.
- `/founder/contacts/[id]` renders a contact detail page with edit/delete.
- `/api/contacts` supports founder-scoped `GET` and `POST`.
- `/api/contacts/[id]` supports founder-scoped `GET`, `PATCH`, and `DELETE`.
- `/api/contacts/[id]/score` persists deterministic lead qualification into `contacts.metadata.leadQualification`.
- `/api/email/contacts/import` can create or return a contact from Gmail sender data.
- Current contact tests pass:
  - `src/app/api/contacts/__tests__/route.test.ts`
  - `src/app/api/email/contacts/import/__tests__/route.test.ts`
  - `src/components/founder/contacts/__tests__/ContactsTable.test.tsx`
  - `src/components/founder/contacts/__tests__/ContactDetailClient.test.tsx`
  - `src/components/founder/contacts/__tests__/ContactFormModal.test.tsx`

### Not Yet Complete

- Rich CRM tables are present as migrations but are still marked pending validation on a Supabase database branch:
  - `supabase/migrations/20260612020000_crm_leads.sql`
  - `supabase/migrations/20260612021000_crm_contacts_opportunities.sql`
- No production-confirmed `crm_leads`, `crm_contacts`, or `crm_opportunities` usage path is wired into the UI.
- Contacts MVP currently uses `contacts`, not `crm_contacts`.
- No opportunities/pipeline UI exists.
- No forecast rollup exists.
- No CRM approval request/execute endpoint exists.
- No full CRM nav cluster exists.
- No lead-to-contact materialisation RPC exists.

## Guardrails

- Do not touch secrets or `.env*` files.
- Do not apply production DB changes directly.
- Use branch-first migration verification: write migrations in `apps/web/supabase/migrations/`, validate on a Supabase database branch (never against prod), and promote to prod (`lksfwktwtmyznckodsau`) only by merging an approved branch.
- Use founder-scoped reads/writes only.
- Keep Scientific Luxury UI (`#050505`, `#00F5FF`, `rounded-sm`) unless a design decision says otherwise.
- Avoid speculative new tables when existing tables can be safely bridged.
- No public signup or public CRM access.

## Phase 0 — Repo Orientation

Run from repo root:

```bash
git checkout main
git pull --ff-only origin main
cd apps/web
corepack enable
corepack pnpm@9.15.0 install --frozen-lockfile
pnpm test -- src/app/api/contacts/__tests__/route.test.ts src/app/api/email/contacts/import/__tests__/route.test.ts src/components/founder/contacts/__tests__/ContactsTable.test.tsx src/components/founder/contacts/__tests__/ContactDetailClient.test.tsx src/components/founder/contacts/__tests__/ContactFormModal.test.tsx
pnpm type-check
pnpm lint
```

Expected:

- All listed contact tests pass.
- `pnpm type-check` passes.
- `pnpm lint` passes.

## Phase 1 — Schema Verification And Decision

Goal: decide whether the current `contacts` table remains the live MVP table with a bridge, or whether the app migrates fully to `crm_contacts`.

Required checks:

1. Confirm current production table presence for:
   - `contacts`
   - `crm_leads`
   - `crm_contacts`
   - `crm_opportunities`
   - `agent_actions`
2. Confirm whether `20260612020000_crm_leads.sql` and `20260612021000_crm_contacts_opportunities.sql` have been applied anywhere.
3. Regenerate Supabase types after schema decision.
4. Document the decision in this packet or a follow-up decision note.

Acceptance:

- Rana can state one canonical record model:
  - Option A: `contacts` remains V1 and `crm_contacts` is deferred/removed.
  - Option B: migrate UI/API from `contacts` to `crm_contacts`.
  - Option C: bridge `contacts` -> `crm_contacts` with explicit sync contract.
- No code proceeds until the canonical model is chosen.

Recommended decision:

Use **Option C short-term** if production already contains contact data in `contacts`; build a compatibility bridge, then migrate once pipeline/opportunity work is stable. Use **Option B** if `contacts` is disposable/test-only.

## Phase 2 — Contact Data Hardening

Files to inspect first:

- `src/app/api/contacts/route.ts`
- `src/app/api/contacts/[id]/route.ts`
- `src/app/api/email/contacts/import/route.ts`
- `src/components/founder/contacts/ContactsPageClient.tsx`
- `src/components/founder/contacts/ContactDetailClient.tsx`
- `src/types/database.ts`

Build:

1. Add server-side validation for create/update payloads.
2. Add duplicate detection on email per founder.
3. Add explicit error envelope for contact API failures.
4. Add contact source/provenance in metadata for manual/Gmail/imported records.
5. Add optimistic update protection or `updated_at` check for edits.

Acceptance:

- Duplicate email create returns `409`.
- Invalid status returns `400`.
- Contact update cannot write unknown fields.
- Gmail import remains idempotent.
- Existing 25 contact tests still pass, plus new duplicate/provenance tests.

## Phase 3 — Opportunities And Pipeline

Goal: turn the CRM from a contact list into an operating pipeline.

Build:

1. Confirm `crm_opportunities`, or add it via a migration validated on a Supabase database branch and promoted to prod only by merging an approved branch.
2. Add route:
   - `GET /api/crm/opportunities`
   - `POST /api/crm/opportunities`
   - `PATCH /api/crm/opportunities/[id]`
3. Add forecast route:
   - `GET /api/crm/opportunities/forecast`
4. Add UI:
   - `/founder/crm/pipeline` or `/founder/opportunities`
   - stage columns
   - opportunity cards
   - forecast strip

Acceptance:

- Pipeline loads founder-scoped opportunities.
- Forecast is single-currency AUD.
- Stage changes that move to won/converted require approval flow, not free mutation.
- Tests cover list/create/update/forecast.

## Phase 4 — CRM Approval Execution

Current state:

- `src/lib/crm/approval-lifecycle.ts` exists as logic.
- It is not yet the single runtime authority for CRM writes.

Build:

1. Add `POST /api/crm/approvals`.
2. Add `POST /api/crm/approvals/[id]/execute`.
3. Record approval lifecycle events in `agent_actions` or the chosen audit table.
4. Enforce approval before:
   - opportunity won/converted transitions
   - merge/delete bulk operations
   - contact status moves that imply client conversion

Acceptance:

- Requested approval cannot execute until approved.
- Double execute returns `409`.
- Rejected/expired approval returns `403`.
- Audit event is written on request and execute.

## Phase 5 — Timeline And Gmail Activity

Build:

1. Add per-contact activity timeline on `/founder/contacts/[id]`.
2. Surface Gmail import provenance and lead score history.
3. Add timeline filters:
   - notes
   - Gmail/import
   - score
   - approval
   - opportunity
4. Keep payloads PII-safe; do not display tokens, raw auth responses, or secret-bearing metadata.

Acceptance:

- Contact detail shows recent activity.
- Gmail import writes or exposes a timeline event.
- Lead scoring appears as a timeline row.
- Tests assert no raw sensitive values are rendered.

## Phase 6 — Navigation And Operator UX

Build:

1. Add CRM navigation cluster in founder sidebar/topbar:
   - Contacts
   - Pipeline
   - Approvals
   - Import
2. Add empty states and degraded states.
3. Add one command-centre tile summarising:
   - total contacts
   - open opportunities
   - approvals waiting
   - last Gmail import

Acceptance:

- Founder can reach CRM from navigation without knowing URLs.
- Contact -> opportunity -> approval paths are visually obvious.
- Loading/error states do not collapse into blank pages.

## Phase 7 — Verification Gate

Before PR:

```bash
cd apps/web
pnpm test -- src/app/api/contacts/__tests__/route.test.ts src/app/api/email/contacts/import/__tests__/route.test.ts src/components/founder/contacts/__tests__/ContactsTable.test.tsx src/components/founder/contacts/__tests__/ContactDetailClient.test.tsx src/components/founder/contacts/__tests__/ContactFormModal.test.tsx
pnpm test -- src/lib/crm/__tests__/qualify-lead.test.ts src/lib/crm/__tests__/approval-lifecycle.test.ts src/lib/crm/__tests__/activity-timeline.test.ts
pnpm type-check
pnpm lint
```

Before merge:

```bash
cd apps/web
pnpm test
pnpm type-check
pnpm lint
```

Build check:

`pnpm build` requires real environment variables because `scripts/validate-env.mjs --ci` blocks placeholder builds. If real env is unavailable locally, run `pnpm exec next build` only with approved non-secret placeholder env and record that the runtime Supabase guard cannot be browser-smoked with placeholders.

## Suggested Linear Packets

Create these as separate tickets for Rana:

1. `CRM-001 — Verify canonical CRM schema and decide contacts vs crm_contacts`
2. `CRM-002 — Harden contact API validation, duplicate detection, and provenance`
3. `CRM-003 — Build opportunities API + AUD forecast rollup`
4. `CRM-004 — Build founder pipeline board and forecast strip`
5. `CRM-005 — Wire CRM approval request/execute endpoints`
6. `CRM-006 — Add contact activity timeline and Gmail import events`
7. `CRM-007 — Add CRM navigation cluster and command-centre summary tile`
8. `CRM-008 — Full CRM smoke tests and deployment evidence`

Labels:

- `rana:build`
- `crm`
- `apps-web`
- `founder-os`

## Definition Of Done

Rana is done when:

- The canonical CRM data model is documented.
- Contacts remain green and tested.
- Pipeline/opportunities are usable from founder UI.
- Forecast is live and AUD-only.
- Approval execution is enforced in code.
- Timeline shows contact activity.
- CRM nav is visible.
- CI is green.
- Production deploy is ready or deployed.

## Do Not Do Yet

- Do not build public SaaS signup.
- Do not add Stripe billing to CRM.
- Do not add products/line-items until pipeline V1 is green.
- Do not build drag-and-drop stage changes until approval-gated action changes work.
- Do not apply migrations to prod directly or autonomously; promote only by merging a branch validated on a Supabase database branch and approved.

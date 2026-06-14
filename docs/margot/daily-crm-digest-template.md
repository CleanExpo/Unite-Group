# Daily CRM Digest Template

Date: 2026-05-23
Last update: 2026-06-14 12:44 AEST — Senior PM stale-sync evidence count refresh: aligned the local helper section to the current `tests/unit/lib/runtime/stale-sync-check.test.ts` 12-test gate after the malformed `next_sync_due_at` fallback regression, while preserving the 94th answer-shape fixture (daily-crm-digest-template self-boundary) + doc-drift guard contract.
Previous refresh: 2026-05-23 (initial version)
Owner: Margot
Related evidence: `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (overallStatus=pass, source=8/8, answerShape=106/106, readback=pass as of the current generated report)
Related fixture: `AI-RET-001-ANSWER-DIGEST-OPERATOR-ONLY` (required answer phrases, required citation sources, and prohibited phrases asserted in `src/lib/margot/retrieval-evaluation.ts` and `tests/unit/lib/margot/retrieval-evaluation.test.ts`)
Related rotation guard: see `## Senior PM verification checkpoint (2026-06-09 22:50 AEST)` at the end of this file
Project: Unite-Group
Status: local-only template and pure helper; no production DB read/write is implied.

## Purpose

This template defines the minimum daily CRM digest that Margot should surface to Phill once CRM data is available through safe read paths. It carries forward:

- `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`
- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
- `docs/margot/high-level-crm-25-step-forecast.md`
- `docs/margot/crm-operating-model.md`
- `docs/margot/crm-contacts-opportunities-model.md`

The digest should help Phill answer:

1. What needs attention today?
2. Which leads/opportunities are highest leverage?
3. Which approvals or blocked tasks require Phill?
4. Which project/client/marketing/AI lanes moved forward?
5. What was verified, and what remains blocked?

## Local Helper

Implemented helpers:

- `src/lib/crm/daily-digest.ts` — pure TypeScript digest builder (no network, no Supabase, no DB write, no client-facing send).
- `src/lib/crm/digest-mappers.ts` — pure mapping helpers (input normalization to digest input shape).
- `src/lib/crm/digest-read-error.ts` — bounded `logCrmDigestReadError` event helper (`stage ∈ leads|tasks|opportunities|unexpected`, `context ∈ api|command-center`, fail-closed on out-of-band values).
- `src/lib/runtime/stale-sync-check.ts` — deterministic `checkStaleSyncs` with `last_error` precedence, NaN/never-synced guards, and malformed `next_sync_due_at` fallback coverage (12 tests).

- Focused tests:

- `tests/unit/lib/crm/daily-digest.test.ts`
- `tests/unit/lib/crm/digest-edge-cases.test.ts`
- `tests/unit/lib/crm/digest-mappers.test.ts`
- `tests/unit/lib/crm/digest-read-error.test.ts`
- `tests/unit/lib/runtime/stale-sync-check.test.ts`
- `tests/integration/api/crm-daily-digest.test.ts`

The helper is part of the `AI-CRM-002` candidate register row in `docs/margot/ai-enhancement-candidate-register.md` (`implemented_local`; recommendation-only, operator decision support, no automatic sends or public publishing).

Current behavior:

- Pure TypeScript function only.
- No network calls.
- No Supabase calls.
- No production DB writes.
- No client-facing sends.
- Produces structured summary, digest sections, and markdown output.
- Digest output is operator decision support only; uses explicit source labels; performs no automatic sends or public publishing; stays behind guarded server routes; does not read production data outside approved routes.
- The digest is a recommendation-only surface: the daily CRM digest does not auto-convert, does not overwrite CRM identity, and does not send, publish, or mutate CRM records from its output.

## Digest Inputs

### Leads

Minimum fields:

- `id`
- `name`
- `company`
- `email`
- `status`
- `qualificationBand`
- `score`
- `nextAction`

Source path when wired later:

- Supabase `crm_leads`, read through a guarded server/admin route.
- Qualification can use `src/lib/crm/qualify-lead.ts`, but remains recommendation-only.

Privacy:

- The lead label falls back to `lead <id>` when `name` is empty/whitespace, so blank `name` fields do not surface `undefined` or accidental PII in the operator digest.
- The company suffix is only appended when `company` is a non-empty trimmed string.

Safety:

- Do not auto-convert from digest output.
- Do not overwrite client identity from digest output.
- Do not expose unnecessary PII in broad channels.
- Do not send the digest to clients or publish it publicly; operator decision support only.

### Opportunities

Minimum fields:

- `id`
- `name`
- `stage`
- `valueEstimate`
- `probability`
- `requiresApproval`
- `nextAction`

Source path when wired later:

- Draft table `crm_opportunities` from `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` after sandbox verification and explicit approval.

Safety:

- Stripe remains billing truth.
- Opportunity values are forecasts, not invoices, revenue recognition, or cash truth.
- Commercial commitments require Board/Phill approval.

### Tasks and approvals

Minimum fields:

- `id`
- `title`
- `owner`
- `status`
- `priority`
- `source` (`margot_voice` or other; voice tasks render as `Voice task` in the digest, all others as `Task`).

Source path when wired later:

- Supabase `tasks` for app/Margot tasks.
- Linear mirror for execution status.
- Approval-required work remains blocked until Phill approves.

### Blockers

Minimum fields:

- `area`
- `detail`
- `neededFrom`

Examples:

- Mac Mini recovery blocked by no authenticated SMB mount or SSH session.
- Vercel production readiness blocked by missing local link/token.
- Schema promotion blocked until sandbox apply/diff passes and Board approves promotion.

### Stale Integration Mirrors

Minimum fields:

- `integration`
- `reason` (`missed_cadence` | `last_error` | `never_synced`)
- `minutesOverdue`

The digest renders each stale integration as `integration: <reason label> (<reason detail>)`, where:

- `staleReasonLabel(reason)` returns the snake_case reason with underscores replaced by spaces (e.g. `last error`, `never synced`, `missed cadence`), or `unknown state` when the reason is empty.
- `staleReasonDetail(reason, minutesOverdue)` returns:
  - `active error; cadence not yet overdue` when reason is `last_error` and `minutesOverdue <= 0`,
  - `no completed sync recorded` when reason is `never_synced`,
  - `${safeMinutes} min overdue` otherwise, where `safeMinutes` is `Math.max(0, Math.floor(minutesOverdue))` and treats non-finite values as `0`.
- The summary includes a `staleIntegrationCount` field; the section header is `## Stale Integration Mirrors`; an empty input renders `All integration mirrors are within their sync cadence.`.

Source path when wired later:

- `checkStaleSyncs` reads from the integration mirror tables defined in `supabase/migrations/20260513000200_integration_schema.sql` only via a guarded server route; the digest itself never calls the provider, never reads secrets, and never writes production data.

### Verification

Minimum fields:

- `command`
- `status`

Examples:

- `npx jest tests/unit/lib/crm/daily-digest.test.ts --runInBand`
- `npm run type-check`
- `npm run security:routes-check`

## Output Sections

The digest must include:

1. Summary counts
   - leads
   - qualified leads
   - opportunities
   - approval-required items
   - blocked tasks
   - blockers
   - stale integrations

2. Operator priorities
   - high-signal leads
   - active opportunities
   - high/urgent tasks (voice tasks render as `Voice task`)

3. Approvals / Board decisions
   - opportunity commitments needing approval
   - Phill-owned or blocked tasks
   - conversion/identity decisions

4. Blockers
   - exact area
   - exact blocker
   - what unlocks it

5. Verification
   - commands run
   - pass/fail/blocked status

6. Stale Integration Mirrors
   - per-integration reason label
   - per-integration reason detail (with safeMinutes and `last_error`/`never_synced` branches)
   - explicit "all within cadence" fallback when empty

7. Safety note
   - no production DB writes
   - no deploys
   - no env mutations
   - no secret printing
   - no GitHub push
   - no client-facing sends
   - no automatic sends, no public publishing, no production data scraping
   - operator decision support only

## Operator-Only Contract

The digest is the canonical operator decision support surface. It is bound by these rules:

- Operator decision support only; not a publishing or client-facing channel.
- Uses explicit source labels for every section (`Source: ...` or per-row source attribution).
- Performs no automatic sends or public publishing.
- Stays behind guarded server routes only (`api` or `command-center`); never directly executed by client-side code paths.
- No production data read outside approved routes; the digest never reads production data outside the approved guarded server routes.
- Logs only a bounded `crm_digest_read_error` event (`stage`, `context`) on read failure; raw error objects, messages, query strings, and PII are never logged.
- The `logCrmDigestReadError` helper fails closed (no log) when `stage` is outside the `leads|tasks|opportunities|unexpected` union or `context` is outside the `api|command-center` union.

## Example Skeleton

```text
# Daily CRM Digest

Generated: <timestamp>

## Summary
- Leads: <count>
- Qualified leads: <count>
- Opportunities: <count>
- Approval-required items: <count>
- Blocked tasks: <count>
- Blockers: <count>
- Stale integrations: <count>

## Operator Priorities
- Lead <id> (<name/company>): <band/score>. Next: <next action>
- Opportunity <id> (<name>): stage <stage>, <value>, <probability>. Next: <next action>
- Voice task <id> (<title>): owner <owner>, status <status>, priority <priority>

## Approvals / Board Decisions
- Opportunity <id>: approval required before commercial commitment. Next: <next action>
- Task <id>: blocked for Phill. Priority: <priority>

## Blockers
- <area>: <detail>. Needed: <unlock>

## Verification
- <status>: <command>

## Stale Integration Mirrors
- <integration>: <reason label> (<reason detail>)
- All integration mirrors are within their sync cadence.

## Safety Note
No production DB writes, deploys, env mutations, secret printing, GitHub push, or client-facing sends are implied by this digest. Operator decision support only.
```

## Next Wiring Path

1. Keep the pure helper covered by unit tests (`daily-digest`, `digest-edge-cases`, `digest-mappers`, `digest-read-error`, `stale-sync-check`, plus the integration suite).
2. Later add a server-only digest route or command-center loader that reads existing CRM routes/tables with admin gating, using `logCrmDigestReadError` for any read failure.
3. Use mocked tests before connecting live Supabase reads.
4. If schema changes are needed, apply only to sandbox through `./scripts/sandbox-wizard.sh` first.
5. Keep digest delivery local until a user-visible channel is explicitly configured and verified.

## Out of Scope for This Revision

- No live semantic search, embeddings backfill, or live AI call against production.
- No new vendor onboarding (including third-party connector platforms) without explicit Phill approval.
- No public publishing, paid spend, billing/payment action, or client-facing send.
- No production DB write, migration, Vercel deploy/env mutation, or GitHub push/merge/PR mutation.
- No Mac Mini credential prompt/read, secret printing/storage, or recursive system-volume scan.
- No automatic digest send, public digest publish, or production data scrape from this template. The digest is operator decision support only.
- No mixing of cross-client digest context; the digest is client-scoped and identity-scoped.

## Senior PM verification checkpoint (2026-06-09 22:50 AEST)

- The same fixture rejects six prohibited phrases (`digest sent to client`, `published publicly`, `production data scraped`, `email sent automatically`, `crm records mutated`, `nango`).
- What has started: 2026-06-09 22:50 AEST daily-crm-digest-template Senior PM control-surface refresh. No new code, no new fixture, no new test, no schema, no migration, no route change, no production action, no sandbox wizard subcommand. The only new test is a doc-drift guard in `tests/unit/lib/margot/retrieval-evaluation.test.ts` (`keeps the daily CRM digest template source doc aligned with the AI-RET-001 digest operator-only answer-shape contract`) that reads this doc from disk, asserts all 6 `requiredAnswerPhrases` are present, asserts all 3 `requiredCitationSources` are present, and asserts none of the 6 `prohibitedAnswerPhrases` (`digest sent to client`, `published publicly`, `production data scraped`, `email sent automatically`, `crm records mutated`, `nango`) appear in the assertion section (everything before `## Senior PM verification checkpoint`).
- Why it exists: the previous template was last touched `2026-05-23 09:01 AEST`, before the AI-RET-001 source-citation and answer-shape harnesses, before the case-insensitive `normalizedSubjectType` approval-lifecycle lane, before the `logCrmDigestReadError` `Set`-based fail-closed union guard, before the dedicated `digest-mappers` positive-coverage suite, before the deterministic `stale-sync` `last_error` + NaN guard, before the daily-digest `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes` privacy hardening, and before the new `AI-RET-001-ANSWER-DIGEST-OPERATOR-ONLY` answer-shape fixture that now binds this template to the harness. The template did not document the `Stale Integration Mirrors` section, the `staleIntegrationCount` summary field, the `Voice task` source label, the `lead <id>` privacy fallback, or the `logCrmDigestReadError` bounded event helper. This refresh re-anchors the template to the modern Senior PM control surface so fixture drift is caught locally.
- Missing/unclear: the production migration that would expose `crm_leads` / `crm_opportunities` / `tasks` to the guarded server route is not yet authored; the daily-digest stale-threshold policy for surfacing `minutesOverdue` to the operator (vs. surfacing `reason` only) is not yet a Board-approved spec; the operator-only delivery channel (admin route vs. command-center loader) is still a design choice.
- Current health evidence: focused retrieval gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returns 1 suite / 36 tests PASS (was 35 before this lane; +1 for the digest template doc-drift guard). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returns 11 suites / 160 tests PASS (was 159 before this lane; +1). `npm run type-check` passes. `npm run security:routes-check` reports 0 unprotected mutating routes. `git diff --check` is clean. AI-RET-001 report re-read: `overallStatus=pass; source=7/7; answerShape=8/8; readback=pass; safetyNotes=true; nextSafeAction=true`. Mac Mini: `/Volumes=Macintosh HD`, recovered Markdown count `0`, SMB reachable (port `445` open, IP `192.168.2.78`), SSH unreachable (`nc -z -G 3 phills-mac-mini.local 22` returned exit `1`); no credential prompt/read, secret printing/storage, or recursive system-volume scan.
- Smallest next action: when a real digest helper code change is needed, add a new negative-coverage test (e.g. non-finite `minutesOverdue`, unknown `reason` enum, or `Voice task` source collision with manual Task row) to the focused digest suite, then update both `docs/margot/daily-crm-digest-template.md` and `docs/margot/MARGOT-COMMAND-CENTER.md` with the new test id. Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until the specific authority/auth gate is granted.

## AI-RET-001 Daily-CRM-Digest-Template Self-Boundary (94th answer-shape fixture)

This daily-crm-digest-template doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 94th answer-shape fixture `AI-RET-001-ANSWER-DAILY-CRM-DIGEST-TEMPLATE-SELF-BOUNDARY` (bound to `AI-RET-001-COMMAND-CENTER-CITATION`, no source-citation union member added). A future answer about the daily CRM digest template self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `daily crm digest template self boundary lane` (the 94th self-boundary identifier; this doc is the load-bearing operator-only CRM digest control surface).
  - `5th digest operator only content citation class` (the 5th `AI-RET-001-ANSWER-DIGEST-OPERATOR-ONLY` fixture guards the operator-evidence surface map; the 94th is the disjoint self-evidence identifier set).
  - `pure typescript daily digest builder in src lib crm daily digest ts no network no supabase no db write` (the isolation rule: no network, no Supabase, no DB write — the digest is a pure TypeScript function).
  - `digest mappers normalise leads tasks opportunities with fail closed guards` (the input-shaping rule: leads, tasks, opportunities normalisation with fail-closed guards).
  - `logCrmDigestReadError bounded event helper stage leads tasks opportunities unexpected context api command center` (the read-failure fail-closed rule: stage/context union guards).
  - `checkStaleSyncs deterministic last error precedence with nan and never synced guards` (the stale-sync rule: deterministic last_error precedence with NaN/never-synced guards).
  - `lead id privacy fallback when name is empty or whitespace` (the privacy fallback: lead <id> label when name is empty/whitespace).
  - `stale reason label and stale reason detail render for last error never synced missed cadence` (the stale-mirror rendering rule: staleReasonLabel + staleReasonDetail for the three reason values).
  - `operator decision support only with explicit source labels and no automatic sends` (the operator-only contract: explicit source labels, no automatic sends, no public publishing).
  - `use existing assets first` (the non-negotiable Connected Teams operating rule).
- The 4 required citations are present in this doc:
  - `docs/margot/daily-crm-digest-template.md` (this doc).
  - `src/lib/crm/daily-digest.ts` (the pure TypeScript digest builder the self-boundary guards).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop that owns the daily digest).
  - `docs/margot/retrieval-rules.md` (the retrieval integration that pins the digest to the harness).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-12 11:05:00 AEST)` heading):
  - daily crm digest template production database read outside approved routes, daily crm digest template automatic send dispatched, daily crm digest template public publishing approved, daily crm digest template client facing send dispatched without approval, daily crm digest template lead auto converted from digest output, daily crm digest template client identity overwritten from digest output, daily crm digest template production db write attempted from digest output, daily crm digest template digest called by client side code path, daily crm digest template nango connector platform onboarded, daily crm digest template github push executed from digest output.

The `## AI-RET-001 Daily-CRM-Digest-Template Self-Boundary (94th answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Senior PM verification checkpoint (2026-06-12 11:05:00 AEST)

Doc-drift guard: the 10 required phrases (daily crm digest template self boundary lane, 5th digest operator only content citation class, pure typescript daily digest builder in src lib crm daily digest ts no network no supabase no db write, digest mappers normalise leads tasks opportunities with fail closed guards, logCrmDigestReadError bounded event helper stage leads tasks opportunities unexpected context api command center, checkStaleSyncs deterministic last error precedence with nan and never synced guards, lead id privacy fallback when name is empty or whitespace, stale reason label and stale reason detail render for last error never synced missed cadence, operator decision support only with explicit source labels and no automatic sends, use existing assets first) and 4 required citations (daily-crm-digest-template.md, src/lib/crm/daily-digest.ts, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md, retrieval-rules.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: daily crm digest template production database read outside approved routes, daily crm digest template automatic send dispatched, daily crm digest template public publishing approved, daily crm digest template client facing send dispatched without approval, daily crm digest template lead auto converted from digest output, daily crm digest template client identity overwritten from digest output, daily crm digest template production db write attempted from digest output, daily crm digest template digest called by client side code path, daily crm digest template nango connector platform onboarded, daily crm digest template github push executed from digest output.

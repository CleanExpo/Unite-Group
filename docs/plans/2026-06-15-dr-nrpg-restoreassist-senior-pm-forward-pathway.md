# DR / NRPG / RestoreAssist — Senior PM Forward Pathway

**Date:** 2026-06-15  
**Mode:** deep read-only specialist audit + one safe local execution task  
**Scope:** `~/DR-NRPG`, `~/RestoreAssist`, `~/CARSI`, `~/Unite-Group` planning layer  
**Authority boundary:** no prod DB writes, no deploys, no email sends, no secrets/vault changes.

## 1. Executive summary

The AU restoration stack is real but not finished. The fastest path is not “more features”; it is closing the proof gaps that block revenue and safe launch.

- **DR-NRPG** has working build/type-check and strong pricing/SEO/funnel scaffolding, but the public “production ready” story is ahead of evidence. Recruitment copy violated the project’s own no-phone rule, and the Stage-6 launch checklist is still mostly unchecked.
- **RestoreAssist** is live with real users/orgs, but the master plan still flags P0/P1 gates: RLS coverage verification/remediation, `NODE_TLS_REJECT_UNAUTHORIZED`, RA-4956, Xero EOFY sprint, broken deploy workflow, and pilot cutover.
- **CARSI** is the top-of-funnel product, but foundational planning docs referenced by enhancement plans are missing or stale.
- **Unite-Group/Synthex** has the right cross-product strategy in `UNI-2062`, but it is still DRAFT and not yet execution authority.

## 2. Current-state snapshot

| Project | Status | Evidence | Primary risk |
|---|---|---|---|
| DR-NRPG | Build/type-check pass; launch evidence inconsistent | `AGENTS.md`, `.claude/STAGE-6-*`, `UNI-2066` | “Complete” claims do not map cleanly to proof artifacts |
| RestoreAssist | Prod live but P0/P1 gates remain | `.claude/aggregation/MASTER_PLAN.md:11-35,68-82,123-140` | RLS/env/deploy/Xero/pilot gates not fully closed |
| CARSI | Live product surface, missing base plan artifacts | `docs/plans/*` audit | Feature planning exists without complete foundation plan |
| Unite-Group strategy | Cross-product funnel drafted | `docs/decisions/UNI-2062-*` | DRAFT; requires Phill/Board sign-off before CRM/prod promotion |

## 3. Top weaknesses / missing or unfinalised work

### P0 / launch-blocking

1. **RestoreAssist RLS gap needs live verification and/or remediation.**  
   Master plan says RLS disabled on 119/~180 prod tables and calls it the single biggest production-readiness gap. Migration presence is not proof of prod application.

2. **RestoreAssist production env/deploy hygiene is not closed.**  
   `NODE_TLS_REJECT_UNAUTHORIZED` is flagged in prod; `deploy-production.yml` has been broken since 2026-04-25; two Supabase projects exist and the canonical prod ref must be verified before any cutover.

3. **RA-4956 go-live gate is not complete.**  
   Sub-issues include CI Prisma env, middleware regressions, handover route, Google Drive smoke, route validator drift, and dependency vulnerabilities.

4. **DR-NRPG recruitment material violated the no-phone-contact rule.**  
   `AGENTS.md` says never add phone numbers and all CTAs must direct to online forms/email. Stage-6 docs contained phone-number collection and call/text prompts. This was selected as the first safe local fix.

5. **DR-NRPG Stage-6 deployment checklist is not execution evidence.**  
   Backup, staging restore, migrations, tests, approvals, rollback, and coverage fields are still placeholders/check boxes.

### P1 / revenue-blocking

6. **DR-NRPG campaign is beta-testing positioned, not production contractor acquisition.**  
   The current 20-recipient email targets testing sessions and feedback. Revenue requires a separate production path: lead → enrolled → verified → active → matched → billed.

7. **RestoreAssist Xero EOFY sprint is a hard deadline risk.**  
   Master plan shows Xero sprint at 0% progress with EOFY pressure. After deadline, failures become compliance events.

8. **Cross-product AU restoration stack is still DRAFT.**  
   `UNI-2062` defines the right CARSI → RestoreAssist → DR-NRPG funnel, but it is pending sign-off and cannot be treated as promoted execution authority.

9. **Planning artifacts are missing/stale.**  
   CARSI base rebuild plan and design companion were not found; DR-NRPG canonical `.planning/ROADMAP.md` was absent despite references; RestoreAssist master plan lives under `.claude/aggregation/` rather than a discoverable root plan.

10. **Branch/workstream hygiene is slowing execution.**  
   DR-NRPG and RestoreAssist have active non-main branches; Unite-Group is far ahead/dirty. PM needs a proof ledger and ticket queue before agents keep adding branches.

## 4. 30-day execution pathway

### Week 1 — Make truth executable

- DR-NRPG: sanitize all outbound recruitment copy against `AGENTS.md` rules. **Started today.**
- DR-NRPG: build/update a proof ledger mapping every “complete/production-ready” claim to artifact, test, CI run, or `UNVERIFIED`.
- RestoreAssist: verify live RLS coverage and prod ref; do not rely on migration files as proof.
- RestoreAssist: audit/remove `NODE_TLS_REJECT_UNAUTHORIZED` if still present.
- Unite-Group: Phill signs/rejects `UNI-2062` and `UNI-2058`.

### Week 2 — Close launch gates

- RestoreAssist: close RA-4956 sub-issues or mark exact blockers with owners.
- RestoreAssist: decide RA-1723 pilot cutover path for Beyond Clean.
- DR-NRPG: split beta-testing materials from production contractor acquisition materials.
- CARSI: reconstruct or supersede missing base planning docs.

### Week 3 — Convert funnel to revenue operations

- DR-NRPG: production contractor flow: signup → verification → active service area → matching → billing.
- RestoreAssist: Xero stability sprint or formal de-scope with owner sign-off.
- Synthex/Unite-Group: approved cross-product campaign calendar, KPI tree, and ownership model.

### Week 4 — Ship a controlled first-dollar path

- NRPG: dry-run 20-recipient contractor list; Phill approves actual send; live send remains owner-gated.
- RestoreAssist: pilot cutover if RLS/env/RA-4956 gates are green.
- CARSI: first renewal-cockpit/CTA work package if foundation plan is restored.

## 5. Immediate next actions

### Agent-safe now

1. Remove phone/call/text prompts from DR-NRPG Stage-6 recruitment docs.  
2. Create a DR-NRPG proof ledger update from the specialist audit.  
3. Draft production contractor onboarding copy separate from beta-testing copy.  
4. Build RestoreAssist RLS/env verification checklist without touching prod.  
5. Reconcile missing CARSI planning docs and create a “superseded/missing/current” index.

### Phill / Board gated

1. Approve/reject `UNI-2062` AU restoration stack strategy.
2. Approve RestoreAssist RLS remediation if live verification confirms the gap.
3. Approve RestoreAssist RA-1723 pilot cutover.
4. Approve NRPG live recruitment send after dry-run output is reviewed.
5. Approve any prod env changes / deploys / DB writes.

## 6. First execution step selected

**Selected safe task:** sanitize DR-NRPG Stage-6 recruitment docs to comply with `AGENTS.md` “no phone contact” rule.

**Completed local change:** removed phone-number collection, call/text prompts, placeholder phone numbers, and recipient-list phone columns from the Stage-6 recruitment package:
- `~/DR-NRPG/.claude/STAGE-6-CONTRACTOR-RECRUITMENT.md`
- `~/DR-NRPG/.claude/STAGE-6-RECRUITMENT-EMAIL-BATCH.md`
- `~/DR-NRPG/.claude/STAGE-6-RECRUITMENT-EXECUTION-REPORT.md`
- `~/DR-NRPG/.claude/STAGE-6-EXECUTION-PLAN.md`

**Verification:** targeted Stage-6 recruitment search for `0412|PHONE_NUMBER|\[PHONE\]|\[phone\]|call/text|call \[|Call \[|text \[` returned 0 hits; `git diff --check` passed; `pnpm build:web` and `pnpm type-check` passed before the final markdown-only cleanup.

Reason: it is local-only, immediately reduces launch/compliance risk, and directly unblocks a cleaner dry-run review without requiring prod access or external sends.

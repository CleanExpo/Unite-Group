# ShipIt Local System Discovery

Generated: 2026-06-06T06:31:37Z

## Target identity
- Local repo: /Users/phillmcgurk/Unite-Group
- GitHub remote: CleanExpo/Unite-Group (verified by `git remote -v`)
- Workspace identity: Authority-Site / Pi-CEO / Empire Command Center per CLAUDE.md
- Sibling CRM note: Unite-Hub is separate; this ShipIt run targets Pi-Dev-Ops / 2nd Brain / Margot / Agentic Nexus / Authority-Site.
- Live URL: https://www.unite-group.in
- 2nd Brain vault: /Users/phillmcgurk/2nd-brain
- Agentic Nexus vault path: /Users/phillmcgurk/2nd-brain/.agentic_nexus

## Git evidence

### `git remote -v`
exit_code: 0
duration_s: 0.05
```
origin	https://github.com/CleanExpo/Unite-Group.git (fetch)
origin	https://github.com/CleanExpo/Unite-Group.git (push)
```

### `git status --short --branch`
exit_code: 0
duration_s: 0.06
```
## main...origin/main
```

### `git branch --show-current`
exit_code: 0
duration_s: 0.04
```
main
```

### `git rev-parse HEAD`
exit_code: 0
duration_s: 0.04
```
d1e26757f6563ffcfcbfeafe1e949bb506fc83be
```

### `git log --oneline -10`
exit_code: 0
duration_s: 0.04
```
d1e2675 docs: add tasks voice sandbox migration proposal (#214)
59a711d fix(cleanup): address post-merge CodeRabbit review debt (#215) (#216)
53e56d6 feat: React 19 / Next.js 16 migration + SaaS productization
c23b670 docs(nexus): add ecosystem link
38f3b8f test: add business 360 activity regressions
33c4608 docs: add CRM client regression gate
8993ea1 feat: link voice tasks in CRM digest
98336a8 Merge pull request #210 from CleanExpo/feat/UNI-2060-layered-ui-primitives
eef5329 test(crm): add staleIntegrationCount to digest edge-case expected output
b319276 feat(UNI-2060): CRM composite cards + Synthex content packet
```

### `git diff --stat`
exit_code: 0
duration_s: 0.04
```

```

### `git diff --name-only`
exit_code: 0
duration_s: 0.04
```

```

### `git ls-files --others --exclude-standard`
exit_code: 0
duration_s: 0.05
```

```


## Package/dependency state
- package_name: unite-group
- package_version: 1.0.0
- package_manager_inferred: npm (package-lock present: True)
- lockfiles: package-lock.json
- scripts: brand:lint, brand:lint:csv, build, check:schema-drift, dev, gen:types, lint, prepare, security:routes-check, start, test, test:all, type-check, validate:jsonld

## Required local env names by name only
No values read into this report. Names discovered from `.env*` files only:
```json
{
  ".env.local": [
    "ADMIN_EMAIL",
    "ADMIN_JWT_SECRET",
    "ANTHROPIC_API_KEY",
    "APIFY_API_KEY",
    "APPROVAL_SIGNING_SECRET",
    "ASSEMBLYAI_API_KEY",
    "COMPOSIO_API_KEY",
    "CRON_SECRET",
    "DATABASE_URL",
    "DEFAULT_FROM",
    "FOUNDER_USER_ID",
    "GEMINI_API_KEY",
    "GITHUB_OWNER",
    "GITHUB_TOKEN",
    "HEYGEN_API_KEY",
    "INTERNAL_API_SECRET",
    "LINEAR_API_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "OPENAI_API_KEY",
    "PAPERCLIP_API_KEY",
    "PAPERCLIP_API_URL",
    "PI_CEO_API_KEY",
    "SEMRUSH_API_KEY",
    "SUPABASE_MANAGEMENT_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "UNITE_CRM_WORKSPACE_ID",
    "UNITE_GROUP_CONNECTION",
    "VAULT_ENCRYPTION_KEY",
    "VERCEL_OIDC_TOKEN"
  ],
  ".env.vercel": [
    "ADMIN_EMAIL",
    "ADMIN_JWT_SECRET",
    "ANTHROPIC_API_KEY",
    "APIFY_API_KEY",
    "APPROVAL_SIGNING_SECRET",
    "ASSEMBLYAI_API_KEY",
    "COMPOSIO_API_KEY",
    "CRON_SECRET",
    "DATABASE_URL",
    "DEFAULT_FROM",
    "FOUNDER_USER_ID",
    "GEMINI_API_KEY",
    "GITHUB_OWNER",
    "GITHUB_TOKEN",
    "HEYGEN_API_KEY",
    "INTERNAL_API_SECRET",
    "LINEAR_API_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "OPENAI_API_KEY",
    "PAPERCLIP_API_KEY",
    "PAPERCLIP_API_URL",
    "PI_CEO_API_KEY",
    "SEMRUSH_API_KEY",
    "SUPABASE_MANAGEMENT_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "UNITE_CRM_WORKSPACE_ID",
    "UNITE_GROUP_CONNECTION",
    "VAULT_ENCRYPTION_KEY",
    "VERCEL_OIDC_TOKEN"
  ],
  ".env.example": [
    "NEXT_PUBLIC_SENTRY_DSN",
    "PI_CEO_API_URL",
    "SENTRY_AUTH_TOKEN"
  ]
}
```

## Key local files inspected/discovered
- CLAUDE.md
- ROADMAP.md
- Design.md
- next.config.js
- tsconfig.json
- jest.config.js
- eslint.config.mjs
- vercel.json
- docs/margot/morning-report.md
- docs/margot/overnight-progress-log.md
- docs/runbooks/environment-inventory.md
- docs/runbooks/infrastructure-inventory.md
- docs/runbooks/supabase-master-registry.md

## Agentic Nexus files discovered (first 250 names only)
- PHASE7_36_JSONL_REPAIR_VERIFICATION.md
- PHASE7_51_SOURCE_CHANGE_REVIEW.md
- SESSION_APPROVAL_LINKAGE_RESULTS.md
- PHASE7_39_FIXABLE_WARNING_BOUNDARY.md
- PHASE7_41_BUILD_PATH_RISK_MAP.md
- PHASE7_23_RESULTS.md
- AGENTIC_NEXUS_BYPASS_REVIEW.md
- GATED_ACTION_EXECUTOR_DRY_RUN_RESULTS.md
- PHASE7_37_PROHIBITED_COMMAND_LIST.md
- allowed_action_registry.jsonl
- PHASE7_41_RESULTS.md
- PHASE7_36_BUILD_TEST_EXECUTION_PRECHECK.md
- PHASE7_40_RESTOREASSIST_BUILD_RESULTS.md
- diagnostic_task.schema.json
- PHASE6_R2_PRODUCTION_CLAIM_PATH_RESULTS.md
- PHASE7_44_ROLLBACK_PLAN.md
- PHASE7_29_READ_ONLY_INSPECTION_COMMAND_PLAN.md
- diagnostic_gate.schema.json
- PHASE7_PR_1232_REVIEW_PACKET.md
- PHASE7_59_PUSH_DECISION_TEMPLATE.md
- PHASE7_45_IMPLEMENTATION_PREFLIGHT.md
- PHASE7_6_RESULTS.md
- intake_obsidian_diagnostic.py
- PHASE7_41_DATABASE_FREE_BUILD_OPTIONS.md
- PHASE6_R4_LIVE_QUEUE_CLEANUP_RESULTS.md
- PHASE7_30_SOURCE_INSPECTION_PREFLIGHT_RESULT.md
- PHASE7_35_BOARD_DECISION.md
- VALIDATOR_RESULTS.md
- dashboard_status_feed.jsonl
- RUN_FIXTURE_ARCHIVE.md
- R0_GATE_INTEGRITY_REPAIR_RESULTS.md
- PHASE7_19_RESULTS.md
- PHASE7_21_NEXT_OPERATING_DECISION.md
- PHASE7_61_PRE_PUSH_VERIFICATION.md
- RUN_TASK_CLAIM_EXAMPLES.md
- SHIPIT_READINESS_MAP.md
- FIXTURE_WORKSPACE_SPEC.md
- PHASE7_43_IMPLEMENTATION_BOUNDARY.md
- PHASE7_PR_CREATION_RESULTS.md
- TASK_COMPLETION_RESULTS.md
- PHASE7_32_RESULTS.md
- PHASE7_57_POST_PUSH_VERIFICATION_PLAN.md
- PHASE7_61_65_GIT_PUSH_RUNWAY_RESULTS.md
- CONTROL_PLANE_PHASE_6_RESULTS.md
- PHASE7_63_POST_PUSH_VERIFICATION.md
- INTAKE_DEDUPE_RESULTS.md
- PHASE7_20_RESTOREASSIST_INACTIVE_SKILL_REGISTRATION_RESULTS.md
- resolve_approval_request.py
- PHASE7_52_COMMIT_DIFF_REVIEW.md
- approval_gate.schema.json
- ATOMIC_CLAIM_CONCURRENCY_RESULTS.md
- PHASE7_62_GIT_PUSH_RESULT.md
- PHASE7_9_NEXT_SKILL_CANDIDATE_RECOMMENDATION.md
- PHASE7_PR_1232_MERGE_DEPLOY_BOUNDARY.md
- PHASE7_4_PHILL_REVIEW_SUPPORT.md
- atomic_claim_task.py
- PHASE7_42_REFUSAL_RULES.md
- PHASE7_6_VERIFIER_REVIEW_TEMPLATE.md
- PHASE7_16_RESTOREASSIST_GATE_REVIEW_SKILL_CANDIDATE_RESULTS.md
- CONTROL_PLANE_PHASE_3_RESULTS.md
- IDEMPOTENCY_RESULTS.md
- dashboard_status_feed_extra.json
- PHASE7_28_RESTOREASSIST_SOURCE_INSPECTION_APPROVAL_PACKET.md
- PHASE7_51_DATABASE_FREE_VALIDATION_ACCEPTANCE.md
- PHASE6_R3_CLEAN_BASELINE_RERUN_RESULTS.md
- PHASE7_37_RESULTS.md
- PHASE7_26_RESULTS.md
- register_worker.py
- PHASE7_POST_MERGE_DEPLOYMENT_VISIBILITY_REVIEW.md
- PHASE7_11_RESULTS.md
- evidence_record.schema.json
- PHASE7_44_RESULTS.md
- plan_gated_action.py
- FIXTURE_WORKSPACE_IMPLEMENTATION_RESULTS.md
- worker_registry.jsonl
- PHASE7_48_DATABASE_FREE_VALIDATION_RUN_REPORT.md
- PHASE7_32_LIMITED_FILE_CONTENT_REVIEW_PACKET.md
- PHASE7_25_RESTOREASSIST_NEXT_EVIDENCE_DECISION_TEMPLATE.md
- PHASE7_5_1_REFINEMENT_RESULTS.md
- agent_scope_matrix.json
- PHASE7_3_RESULTS.md
- SHIPIT_RESULTS.md
- PHASE7_66_NEXT_BOARD_DECISION_TEMPLATE.md
- PHASE7_35_RISK_REGISTER.md
- PHASE7_POST_MERGE_PRODUCTION_READINESS_DECISION_TEMPLATE.md
- CONTROL_PLANE_PHASE_6_CLOSEOUT_RESULTS.md
- test_atomic_claim_concurrency.py
- review_worker.py
- CONTROL_PLANE_STATUS.md
- SHIPIT_AUTHORITY_MODEL.md
- WORKER_LIFECYCLE_RESULTS.md
- worker_complete_task.py
- PHASE7_17_RESTOREASSIST_VERIFIER_REVIEW_TEMPLATE.md
- PHASE7_21_SKILL_FACTORY_CLOSEOUT.md
- PHASE6_FINAL_CANONICAL_SYNC_RESULTS.md
- GATED_ACTION_EXECUTOR_SPEC.md
- PHASE7_35_EVIDENCE_REQUIREMENTS.md
- PHASE7_13_CARSI_DOMAIN_REVIEW_PACK.md
- PHASE7_29_SOURCE_INSPECTION_EVIDENCE_SCHEMA.json
- mark_task_failed.py
- PHASE7_41_BOARD_DECISION_TEMPLATE.md
- PHASE7_39_NEXT_VALIDATION_RECOMMENDATION.md
- PHASE7_24_EVIDENCE_REQUEST_LIST.md
- SHIPIT_NEXT_10_BATCHES.md
- worker_claim_task.py
- PHASE7_21_RESULTS.md
- PHASE7_43_RESULTS.md
- PHASE7_32_BOARD_DECISION_TEMPLATE.md
- PHASE7_52_RESULTS.md
- RUN_APPROVAL_RESOLUTION_EXAMPLES.md
- test_production_claim_path.py
- PHASE7_29_RESTOREASSIST_READ_ONLY_SOURCE_INSPECTION_RUNBOOK.md
- PHASE7_POST_MERGE_PRODUCTION_READINESS_RESULTS.md
- CONTROL_PLANE_PHASE_4_RESULTS.md
- PHASE7_35_BUILD_TEST_SCOPE.md
- evacuate_fixture_tasks.py
- PHASE7_29_SOURCE_INSPECTION_REFUSAL_RULES.md
- RUN_EVIDENCE_QUERY.md
- PHASE7_23_RESTOREASSIST_DRY_RUN_BOARD_REVIEW.md
- PHASE7_44_NEXT_BOARD_DECISION_TEMPLATE.md
- PHASE7_18_RESTOREASSIST_VERIFIER_REVIEW_COMPLETED.md
- PHASE7_35_AUDIT_RECORD.md
- WORKER_HEARTBEAT_FRESHNESS_RESULTS.md
- PHASE7_28_RESTOREASSIST_SOURCE_INSPECTION_REFUSAL_RULES.md
- PHASE7_POST_MERGE_HUMAN_ACKNOWLEDGEMENT.md
- LEASE_RENEWAL_RESULTS.md
- PHASE7_28_BOARD_DECISION_TEMPLATE.md
- PHASE7_34_RESTOREASSIST_CONTENT_REVIEW_RISK_REGISTER.md
- PHASE7_44_IMPLEMENTATION_REFUSAL_RULES.md
- PHASE7_35_DASHBOARD_STATUS_UPDATE.md
- PHASE7_2_ITR_BUTTON_SKILL_CANDIDATE_RESULTS.md
- renew_task_lease.py
- PHASE7_54_60_PRE_PUSH_RUNWAY_RESULTS.md
- reap_expired_leases.py
- PHASE7_24_BOARD_NEXT_DECISION_TEMPLATE.md
- LEASE_EXPIRY_RESULTS.md
- SHIPIT_GATE_MATRIX.md
- .live_claim.lock
- PHASE7_7_DOMAIN_REVIEW_DECISION_TEMPLATE.md
- PHASE7_26_SOURCE_INSPECTION_BOUNDARY.md
- PHASE7_52_COMMIT_PACKET.md
- PHASE7_POST_MERGE_RISK_REGISTER.md
- PHASE7_32_LIMITED_FILE_CONTENT_SCOPE.md
- PHASE7_35_NEXT_DECISION_TEMPLATE.md
- PHASE7_23_BOARD_DECISION_TEMPLATE.md
- PHASE7_43_REFUSAL_RULES.md
- PHASE7_35_RESULTS.md
- PHASE7_11_CARSI_VERIFIER_REVIEW_HANDOFF.md
- project_registry.jsonl
- CONTROLLED_DIAGNOSTIC_MENU.md
- tool_capability_registry.schema.json
- execute_gated_action_dry_run.py
- PHASE7_24_RESTOREASSIST_LOCAL_EVIDENCE_REVIEW.md
- forbidden_actions.json
- claim_lock.py
- PHASE7_39_BOARD_DECISION_TEMPLATE.md
- PHASE7_29_RESULTS.md
- .live_state_snapshot_frozen.json
- PHASE7_5_REFINEMENT_BRIEF.md
- PHASE7_38_RESULTS.md
- R2_PASS_RULE_CORRECTION_RESULTS.md
- capability_fit_record.schema.json
- PHASE7_13_RESULTS.md
- PHASE7_24_RESULTS.md
- PHASE7_27_HUMAN_DECISION_BOARD.md
- orphan_task_review.py
- gated_action_plan.schema.json
- PHASE7_44_IMPLEMENTATION_EVIDENCE_REQUIREMENTS.md
- PHASE7_10_CARSI_COURSE_OUTLINE_SKILL_CANDIDATE_RESULTS.md
- PHASE7_PR_1232_REVIEW_RESULTS.md
- validate_agent_session.py
- init_fixture_workspace.py
- DEAD_LETTER_RESULTS.md
- CAPABILITY_FIT_LOW_CONFIDENCE_RESULTS.md
- PHASE7_43_BOARD_DECISION_TEMPLATE.md
- PHASE7_57_OPERATING_CONTRACT_AUTHORITY_GRANT_UPDATE_RESULTS.md
- CAPABILITY_FIT_PROTOCOL.md
- README.md
- PHASE7_55_PUSH_APPROVAL_PACKET.md
- PHASE7_42_SCRIPT_CHANGE_REQUIREMENTS.md
- AUTONOMOUS_LOOP_CONTRACT.md
- PHASE7_54_LOCAL_COMMIT_VERIFICATION.md
- PHASE7_33_LIMITED_FILE_CONTENT_PREFLIGHT.md
- RUN_WORKER_REGISTRY.md
- PHASE7_36_RESULTS.md
- tool_capability_registry.jsonl
- worker_role_matrix.py
- PHASE7_66_POST_PUSH_RISK_REGISTER.md
- PHASE7_PR_1232_NEXT_DECISION_TEMPLATE.md
- CONTROL_PLANE_PHASE_2_RESULTS.md
- seal_audit_state.py
- archive_fixtures.py
- dashboard_status_feed.jsonl.phase7_35_pre_repair_backup
- PHASE7_66_POST_PUSH_REVIEW_PACKET.md
- PHASE6_CLOSEOUT_VERIFIER_HANDOFF.md
- PHASE7_14_CARSI_INACTIVE_SKILL_REGISTRATION_RESULTS.md
- PHASE7_35_REFUSAL_RULES.md
- PHASE7_27_RESULTS.md
- update_worker_heartbeat.py
- resume_worker.py
- PHASE7_37_DASHBOARD_STATUS_UPDATE.md
- PHASE7_40_BUILD_BLOCKED_REPORT.md
- PHASE7_46_SOURCE_CHANGE_APPLIED.md
- PHASE7_7_DOMAIN_REVIEW_PACK.md
- PHASE7_1_ITR_BUTTON_DRY_RUN_RESULTS.md
- PHASE7_32_LIMITED_FILE_CONTENT_REFUSAL_RULES.md
- PHASE7_58_ROLLBACK_PACKET.md
- PHASE7_34_NEXT_DECISION_TEMPLATE.md
- PHASE7_1_CAPABILITY_CORRECTION_RESULTS.md
- PHASE7_6_VERIFIER_REVIEW_HANDOFF.md
- PHASE7_37_BATCH_PLAN.md
- PHASE7_44_PROPOSED_DIFF_PREVIEW.md
- PHASE7_25_DASHBOARD_INTERPRETATION_RULES.md
- PROJECT_POLICY_ENFORCEMENT_RESULTS.md
- DASHBOARD_FEED_RESULTS.md
- WORKER_CLAIM_REGISTRY_RESULTS.md
- check_live_state_unchanged.py
- PHASE7_15_RESULTS.md
- PHASE7_43_SOURCE_CHANGE_APPROVAL_PACKET.md
- worker_events.jsonl
- PHASE7_43_EVIDENCE_REQUIREMENTS.md
- PHASE7_17_RESTOREASSIST_VERIFIER_REVIEW_HANDOFF.md
- auth.md
- PHASE6_CLOSEOUT_SIGNOFF_RECORD.md
- PHASE7_37_BOARD_DECISION_TEMPLATE.md
- PHASE7_11_CARSI_VERIFIER_REVIEW_TEMPLATE.md
- PHASE7_8_INACTIVE_SKILL_REGISTRATION_RESULTS.md
- claim_state_machine.py
- APPROVAL_RESOLUTION_RESULTS.md
- PHASE7_7_RESULTS.md
- RUNTIME_APPROVAL_LINKAGE_RESULTS.md
- ORPHAN_TASK_REVIEW_RESULTS.md
- PHASE7_44_BOARD_DECISION.md
- R0_REFERENCE_HASH_INSTRUCTIONS.md
- PHASE7_38_RESTOREASSIST_TYPECHECK_LINT_RUN_REPORT.md
- auth.schema.json
- PHASE7_40_BUILD_PREFLIGHT.md
- PHASE7_37_COMMAND_EVIDENCE_EXTRACTION_REPORT.md
- PHASE7_9_INACTIVE_SKILL_REGISTRY_STATUS.md
- PHASE7_52_COMMIT_MESSAGE_PROPOSAL.md
- inactive_skill_registry.jsonl
- PHASE7_37_EXACT_CANDIDATE_COMMAND_LIST.md
- PHASE6_R1_WINDOWS_ATOMIC_CLAIM_RESULTS.md
- CONTROL_PLANE_PHASE_7_RESULTS.md
- PROJECT_REGISTRY_RESULTS.md
- PHASE7_51_NEXT_DECISION_TEMPLATE.md
- PHASE7_51_RESULTS.md
- PLAN.md
- PHASE7_POST_MERGE_PRODUCTION_READINESS_PACKET.md
- PHASE7_66_RESULTS.md

## Context excerpts (secret-redacted by source choice; env values excluded)

### docs/margot/morning-report.md
```
# Margot Morning Report

Date: 2026-06-01
Project: Unite-Group

## Honest status

Current as of `2026-06-02 09:12 AEST`: PR #214 (`https://github.com/CleanExpo/Unite-Group/pull/214`) remains the active lane on branch `margot/tasks-voice-schema-proposal`. The local checkout is `margot/tasks-voice-schema-proposal-sync` at `23115e8`, tracking `origin/margot/tasks-voice-schema-proposal`; GitHub auth was available for `CleanExpo` via read-only API probe without token values printed. The PR is still green/mergeable but branch-policy blocked: `gh pr view 214` reports remote head `23115e8ad86b2b15427f96348b5d540bb5363b23`, `state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=BLOCKED`, and `reviewDecision=REVIEW_REQUIRED`. It was not merged because required non-author review/branch-policy clearance is still missing.

Current queue/status notes: Source implementation stayed frozen. This refresh re-ran/read back `gh pr checks 214 --watch=false` (all observed contexts passed, including `CI Gate (type-check, lint, test, build)`, `Validate .claude/DESIGN.md`, Review Board specialist checks and Chief Reviewer final verdict, CodeRabbit, `Vercel – unite-group`, and `Vercel – unite-group-sandbox`), `npx jest --runTestsByPath tests/unit/margot-tasks-voice-migration-proposal.test.ts --runInBand` (1 suite / 17 tests), `npm run type-check`, `npm run security:routes-check` (0 unprotected mutating routes), `npm test -- --testPathPattern=tests/pipelines --runInBand` (3 suites / 23 tests), and `git diff --check` after this report/progress-log update. Local-only dirty path groups are evidence/statu
```

### docs/margot/overnight-progress-log.md
```
# Margot Overnight Progress Log

## 2026-06-02 09:12 AEST

### PR #214 frozen-lane health refresh

Current checkpoint:

- Preflight kept PR #214 (`https://github.com/CleanExpo/Unite-Group/pull/214`) as the active lane. The checkout is on local sync branch `margot/tasks-voice-schema-proposal-sync` at `23115e8`, tracking `origin/margot/tasks-voice-schema-proposal`; GitHub auth worked for `CleanExpo` via read-only API probe without token values printed.
- Source implementation stayed frozen because PR #214 is already green/mergeable but branch-policy blocked: `gh pr view 214` reports remote PR head `23115e8ad86b2b15427f96348b5d540bb5363b23`, `state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=BLOCKED`, and `reviewDecision=REVIEW_REQUIRED`.
- `gh pr checks 214 --watch=false` re-confirmed all observed contexts passing, including `CI Gate (type-check, lint, test, build)`, `Validate .claude/DESIGN.md`, Review Board specialist checks and Chief Reviewer final verdict, CodeRabbit, `Vercel – unite-group`, and `Vercel – unite-group-sandbox`. Vercel evidence is GitHub status-check observation only, not a manual deploy or env mutation.
- Local-only dirty path groups after this refresh are evidence/status docs plus concurrent untracked assessment/plan/runbook drafts: `docs/margot/morning-report.md`, `docs/margot/overnight-progress-log.md`, untracked `docs/margot/hermes-v15-capability-assessment.md`, untracked `docs/plans/2026-06-02-au-nz-market-dominance-architecture.md`, and untracked `docs/runbooks/resource-optimization-assessment.md`. No source/test/migration files changed in this t
```

### docs/runbooks/environment-inventory.md
```
# Environment Variable Inventory

**Project:** Unite-Group
**Last Updated:** 2026-05-31 (Enhanced)
**Source of Truth:** 1Password vault "Unite-Group-Infrastructure"
**Local File:** .env.local (gitignored — NEVER COMMIT)

> **Cross-references:** [Master DR Runbook](disaster-recovery.md) | [API Key Inventory](api-key-inventory.md) | [Infrastructure Inventory](infrastructure-inventory.md)

---

## Required Variables

### Supabase (Database + Auth + Storage)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL | Supabase Dashboard | Never (URL) | N/A |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side | Supabase Dashboard | On compromise | Unknown |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for server-side ops (admin auth, RBAC, CRM) | Supabase Dashboard | On compromise | Unknown |
| `SUPABASE_MANAGEMENT_TOKEN` | Management API access | Supabase Dashboard | Quarterly | Unknown |
| `SUPABASE_ACCESS_TOKEN` | Supabase management API (fallback for MANAGEMENT_TOKEN) | Supabase Dashboard > Account > Tokens | Quarterly | Unknown |
| `DATABASE_URL` | Direct Postgres connection | Supabase Dashboard (Connection String) | On compromise | Unknown |

### Vercel (Hosting + Deployment)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `VERCEL_OIDC_TOKEN` | OIDC authentication for Vercel | Vercel Dashboard | On compromise | Unknown |
| `CRON_SECRE
```

### docs/runbooks/infrastructure-inventory.md
```
# Infrastructure Inventory

**Project:** Unite-Group
**Last Updated:** 2026-05-31
**Owner:** Nexus Security & DR Lead

> **Cross-references:** [Master DR Runbook](disaster-recovery.md) | [Environment Inventory](environment-inventory.md) | [API Key Inventory](api-key-inventory.md)

---

## System Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │         Cloudflare DNS           │
                    │   unite-group.vercel.app         │
                    └───────────────┬─────────────────┘
                                    │ CNAME → cname.vercel-dns.com
                    ┌───────────────▼─────────────────┐
                    │      Vercel (syd1 region)        │
                    │  Next.js 15 App + 11 Cron Jobs   │
                    │  70+ API Routes                  │
                    └───┬──────────┬──────────┬───────┘
                        │          │          │
              ┌─────────▼──┐  ┌───▼────┐  ┌──▼──────────┐
              │  Supabase   │  │Railway │  │ ElevenLabs  │
              │  (prod DB)  │  │(Pi-CEO)│  │ (Voice/Margot)│
              │  + 3 Edge   │  │        │  │             │
              │  Functions  │  └────────┘  └─────────────┘
              └─────────────┘
```

---

## Tier 1: CRITICAL (Business-Down Without These)

### Vercel — Primary Hosting Platform

| Attribute | Value |
|-----------|-------|
| **Provider** | Vercel (AWS-backed) |
| **Region** | `syd1` (Sydney, Australia) — SINGLE REGION, NO FAILOVER |
| **Framework** | Next.js 15 (v15.5.15) |
| **Project Name** | unite-g
```

### docs/runbooks/supabase-master-registry.md
```
# Supabase Master Registry — Unite-Group Ecosystem

**Date:** 2026-06-02  
**Purpose:** Single source of truth for ALL Supabase projects  
**Status:** CLEANUP IN PROGRESS — PATH B SELECTED (Pre-Sale Clean Architecture)  
**Owner:** Phill McGurk / Nexus Security & DR Lead

> **Hierarchy:** Unite-Group CRM (Layer 1) → Your Products (Layer 2) → Client Tenants (Layer 3, NOT separate projects)

---

## ⚠️ CRITICAL QUESTIONS FOR PATH B DESIGN

The schema audit discovered **new projects not previously documented**.
I need answers to these before designing the consolidation:

1. **restoreassist-prod-2026** (`udooysjajglluvuxkijp`, Sydney): Is this the replacement for the original RestoreAssist project? Or a separate production instance?

2. **ATO** (`xwqymjisxmtcmaebcehw`, Sydney): Is this a new product? A government client (Australian Tax Office)? When did this start?

3. **unite-group-ops** (`vgxidmwjdbgybjmjvwbb`, Seoul): Is this a staging/ops environment? Why is it in Seoul instead of Sydney?

4. **Pi-CEO** (`zbryrmxmgfmslqzizsto`, Singapore): Is this purely an internal DevOps tool, or does it have client data? Should it remain separate or merge into CRM?

5. **DR+NRPG** (`zwzbglqzmpyfzdkblxyf`, Canada): Is this actively receiving data? Is the data already duplicated in Unite-Group CRM? **Can we delete this after migration?**

---

## ACTIVE PRODUCTION PROJECTS

### Layer 1: Unite-Group CRM (The Company Platform)

| Field | Value |
|-------|-------|
| **Project Ref** | `lksfwktwtmyznckodsau` |
| **Name** | Unite-Group |
| **Region** | ap-southeast-2 (Sydney) |
| **Purpose** | C
```

### .agentic_nexus/evidence/evidence_ledger.jsonl
```
{"evidence_id": "ANX-EVIDENCE-task-allowed-001-completion", "task_id": "task_allowed_001", "agent_id": "dashboard-reporter-001", "worker_id": "local-build-worker-01", "project": "Agentic Nexus", "evidence_type": "dashboard", "source_path": "/Users/phillmcgurk/2nd-brain/.agentic_nexus/task_queue.jsonl", "source_url": "", "source_date": "2026-06-04T07:13:11Z", "date_gathered": "2026-06-04T07:20:00Z", "claim_supported": "task_allowed_001 was claimed by local-build-worker-01 after worker_preflight.py returned worker_can_start and validator decision allowed.", "confidence_score": 0.98, "freshness_rating": "fresh", "contradiction_status": "none_found", "business_relevance": "high", "linked_decision": "Allow completion only when a claimed task supplies required dashboard evidence.", "linked_gap": "No completion evidence enforcement existed before worker_complete_task.py.", "linked_output": "/Users/phillmcgurk/2nd-brain/.agentic_nexus/TASK_CLAIM_RESULTS.md", "recommended_next_action": "Generate a local dashboard status feed from queue, evidence ledger, and audits."}
{"evidence_id": "ANX-EVIDENCE-task-requires-approval-001-completion", "task_id": "task_requires_approval_001", "agent_id": "principal-engineer-001", "worker_id": "local-build-worker-01", "project": "Agentic Nexus", "evidence_type": "shipit_readiness", "source_path": "/Users/phillmcgurk/2nd-brain/.agentic_nexus/SESSION_APPROVAL_LINKAGE_RESULTS.md", "source_url": "", "source_date": "2026-06-04T08:02:02Z", "date_gathered": "2026-06-04T08:02:02Z", "claim_supported": "task_requires_approval_001 was claimed by local-build-wor
```

### .agentic_nexus/audit/task_completion_audit.jsonl
```
{"timestamp": "2026-06-04T07:22:33Z", "task_id": "task_allowed_001", "task_title": "Update local Agentic Nexus dashboard status draft from verified evidence", "worker_id": "local-build-worker-01", "task_status_before": "claimed", "task_status_after": "completed", "completion_status": "task_completed", "evidence_file": "/Users/phillmcgurk/2nd-brain/.agentic_nexus/examples/evidence_allowed_completion.json", "evidence_id": "ANX-EVIDENCE-task-allowed-001-completion", "required_evidence_satisfied": true, "reasons": ["claimed task completed with valid required evidence"], "next_action": "Generate a local dashboard status feed from queue, evidence ledger, and audits."}
{"timestamp": "2026-06-04T07:22:33Z", "task_id": "task_allowed_001", "task_title": "Update local Agentic Nexus dashboard status draft from verified evidence", "worker_id": "wrong-worker-01", "task_status_before": "claimed", "task_status_after": "claimed", "completion_status": "worker_mismatch", "evidence_file": "examples/evidence_allowed_completion.json", "evidence_id": null, "required_evidence_satisfied": false, "reasons": ["worker mismatch: task assigned_worker_id is local-build-worker-01, supplied worker_id is wrong-worker-01"], "next_action": "do not complete task; use the assigned worker or reassign through the claim flow"}
{"timestamp": "2026-06-04T07:22:33Z", "task_id": "task_diagnostic_required_001", "task_title": "Complete diagnostic discovery before research worker starts", "worker_id": "local-research-worker-01", "task_status_before": "blocked_diagnostic_required", "task_status_after": "blocked_diagnostic
```

### .agentic_nexus/task_queue.jsonl
```
{"task_id": "task_allowed_001", "title": "Update local Agentic Nexus dashboard status draft from verified evidence", "project": "Agentic Nexus", "source": "local_example_queue", "intent": "Exercise the safe documentation/dashboard worker claim path.", "friction": "Workers need a controlled queue and preflight gate before accepting local tasks.", "gap": "No task queue claim flow exists yet.", "business_value": "Creates the first governed path from queued task to worker claim.", "priority": "high", "risk_level": "low", "status": "completed", "required_agent_type": "Dashboard Reporter Agent", "assigned_agent_id": "dashboard-reporter-001", "assigned_worker_id": "local-build-worker-01", "session_file": "examples/session_allowed.json", "required_scopes": ["read:project_registry", "read:task_queue", "read:evidence_ledger", "read:dashboard_status", "write:dashboard_status", "write:evidence_record"], "evidence_required": ["dashboard"], "approval_required": false, "diagnostic_required": false, "created_at": "2026-06-04T07:10:00Z", "updated_at": "2026-06-04T07:22:33Z", "next_action": "Run worker_claim_task.py and allow claim only if worker_preflight.py returns worker_can_start."}
{"task_id": "task_diagnostic_required_001", "title": "Complete diagnostic discovery before research worker starts", "project": "Agentic Nexus", "source": "local_example_queue", "intent": "Exercise diagnostic-required task blocking.", "friction": "Workers could otherwise start before purpose/friction/gap/value scoring is complete.", "gap": "Diagnostic gate is incomplete for this example session.", "business_va
```

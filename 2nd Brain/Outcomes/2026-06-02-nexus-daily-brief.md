# Nexus Daily Operating Brief — 2026-06-02

Generated: 2026-06-02 06:06 AEST  
Mode: read-only operator brief across Pi-Dev-Ops, Unite-Hub, Unite-Group, Synthex, RestoreAssist.  
Report path: `/Users/phillmcgurk/2nd-brain/Outcomes/2026-06-02-nexus-daily-brief.md`

## Top 5 actions ranked by ROI × urgency

1. **RestoreAssist: operator-authorize a focused production-readiness/security gate.** ROI: highest; urgency: highest. Evidence shows production is live but the master plan still lists P0/P1 go-live work, RLS disabled on 119 prod tables, `NODE_TLS_REJECT_UNAUTHORIZED` in production env, broken deploy workflow history, and eight open Dependabot PRs all blocked by failing gates. Operator action: decide/approve the production security/readiness triage lane and confirm whether env/security changes are allowed through the normal approval path.
2. **RestoreAssist: clear the dependency-PR quality-gate blocker as one batch decision, not eight separate reviews.** ROI: high; urgency: high. PRs #1214–#1221 are mergeable but non-green because `Validate .claude/DESIGN.md` and `Quality Checks` fail across the set; #1217 also has `dry-run` failure and #1214 has both Vercel contexts failing. Operator action: choose whether to batch-fix the shared quality gate first, then re-run/merge dependency PRs after checks are green.
3. **Unite-Group: resolve post-merge checkout hygiene before new source work.** ROI: high; urgency: medium-high. PR #215 is already merged into `origin/main`, but the local checkout remains on `margot/react-19-next-16-migration` at `cd47956` with local-only evidence/Linear commits and dirty Margot docs. Open PR #214 is green on checks but now `mergeable=CONFLICTING` and `reviewDecision=REVIEW_REQUIRED`. Operator action: decide whether to preserve/discard local-only evidence commits and whether PR #214 should be rebased/recreated/closed.
4. **Synthex: keep marketing-intelligence in prepare-only mode until human approval gates are explicitly satisfied.** ROI: medium-high; urgency: medium. Risk register blocks high-risk SEO/AEO/GEO tactics from autonomous execution; human-approval gates require approval before live publish, YMYL claims, schema tests, bulk page generation, link acquisition, or scoring-weight changes. Operator action: approve only specific publish/test packets with validation + rollback notes.
5. **Unite-Hub / Pi-Dev-Ops: treat as stable today; only handle account/env readiness if needed for active lanes.** ROI: medium; urgency: lower today. Both have zero open PRs and no last-24h `origin/main` commits. Pi-Dev-Ops has one untracked script and explicit security/triage docs around credentials/Linear/autonomous approvals; Unite-Hub has critical Vercel env/integration keys documented. Operator action: avoid starting broad cleanup unless one of these becomes a dependency for the RestoreAssist or Unite-Group lane.

## Blockers requiring operator action

- **RestoreAssist production security/readiness:** Master plan flags RLS disabled on 119 prod tables, `NODE_TLS_REJECT_UNAUTHORIZED` in production env, old Supabase project decommission decision, and production go-live gate RA-4956 not complete. These require explicit operator/account/env/security decisions before any production mutation.
- **RestoreAssist dependency PR batch:** Eight open Dependabot PRs are mergeable but non-green. Shared blockers are `Validate .claude/DESIGN.md` and `Quality Checks`; #1217 additionally has `dry-run=FAILURE`; #1214 additionally has `Vercel – restoreassist=FAILURE` and `Vercel – restoreassist-sandbox=FAILURE`.
- **Unite-Group PR #214:** Open, non-draft, all observed checks green, but `mergeable=CONFLICTING` and `reviewDecision=REVIEW_REQUIRED`; it needs review and conflict disposition, not autonomous merge.
- **Unite-Group local state:** Checkout is not on fresh `origin/main`; dirty docs and local-only commits must be preserved or discarded before new source work.
- **Unite-Group approval/out-of-scope items:** CCW UNI-2053 remains blocked on Toby/Phill category approval; Dimitri ITR tasks belong to separate `dimitri-itr-sandbox` / Unite-Hub scope, not the Unite-Group checkout.
- **Synthex live-marketing gates:** Live publish, YMYL claims, schema tests, bulk pages, link campaigns, scoring weights, and any `DATA_REQUIRED` justification need human approval or are blocked.
- **Telegram delivery:** This cron toolset did not expose a `send_message` tool, so the requested Telegram summary could not be sent from this run. No credential configuration was attempted.

## What to ignore today

- Do not chase Pi-Dev-Ops or Unite-Hub code changes unless they unblock the RestoreAssist/Unite-Group lanes; both have no open PRs today.
- Do not treat old Unite-Group PR #215 branch status as active; `origin/main` already has merge commit `53e56d6` from PR #215.
- Do not manually deploy or mutate Vercel/Supabase/DB/env from this brief; all Vercel evidence here is status-check observation only.
- Do not publish Synthex/marketing content, schema tests, or YMYL claims without logged human approval.
- Do not clean or reset dirty worktrees from this report; dirty-state preservation is part of the handoff.

## If done today, biggest leverage

**Approve and run a dedicated RestoreAssist production-readiness/security gate** that first resolves the shared CI/design/quality failure pattern blocking PRs #1214–#1221, then separately audits the production RLS/TLS/env blockers under explicit operator approval. This unblocks the most already-built work and reduces the highest production risk.

## Evidence by project

### Pi-Dev-Ops

- Path: `/Users/phillmcgurk/Pi-CEO`
- Remote: `https://github.com/CleanExpo/Pi-Dev-Ops.git` / GitHub `CleanExpo/Pi-Dev-Ops`
- Branch/head: `main` @ `f8f7fac0abd9ca8ab40e4d70c2c4e94e734a1ae4`
- Dirty status: 1 item; sample: `?? scripts/plaud_ingest_to_itr.py`
- Last 24h `origin/main` commits: none observed.
- Open PRs: 0.
- Risk/blocker/approval signals: `triage-rules.md` says agent PRs require human approval before merge and deployment-health drops can queue Linear tickets; `SECURITY.md` references Linear/Supabase/credential handling and n8n embedded credential risk.

### Unite-Hub

- Path: `/Users/phillmcgurk/Unite-Hub`
- Remote: `https://github.com/CleanExpo/Unite-Hub.git` / GitHub `CleanExpo/Unite-Hub`
- Branch/head: `main` @ `b423b602292eab4ff964027d513a292644d396c7`
- Dirty status: 0 items.
- Last 24h `origin/main` commits: none observed.
- Open PRs: 0.
- Risk/blocker/approval signals: `CLAUDE.md` identifies this as the private founder CRM and documents critical Vercel env/integration keys (`ANTHROPIC_API_KEY`, vault encryption, Supabase service role, cron secret, Google/Xero/Linear/social OAuth). No active PR blocker observed.

### Unite-Group

- Path: `/Users/phillmcgurk/Unite-Group`
- Remote: `https://github.com/CleanExpo/Unite-Group.git` / GitHub `CleanExpo/Unite-Group`
- Branch/head: `margot/react-19-next-16-migration` @ `cd4795682383c1f4a61ef3d6648b572abbc647a7`
- Dirty status: 2 items; sample: `M docs/margot/morning-report.md`, ` M docs/margot/overnight-progress-log.md`
- Last 24h `origin/main` commits: `53e56d6 2026-06-02 05:58:36 +1000 feat: React 19 / Next.js 16 migration + SaaS productization`
- Open PRs: PR #214 `docs: add tasks voice sandbox migration proposal`, non-draft, `mergeable=CONFLICTING`, `reviewDecision=REVIEW_REQUIRED`, checks success=30/fail=0/pending=0, URL `https://github.com/CleanExpo/Unite-Group/pull/214`.
- Risk/blocker/approval signals: Margot morning report states PR #215 is merged and post-merge CI/Vercel status checks succeeded; local checkout still has local-only evidence/Linear commits and dirty Margot docs; CCW UNI-2053 blocked on Toby/Phill category approval; Dimitri ITR tasks are out-of-scope for this repo.

### Synthex

- Path: `/Users/phillmcgurk/Synthex`
- Remote: `https://github.com/CleanExpo/Synthex.git` / GitHub `CleanExpo/Synthex`
- Branch/head: `main` @ `32ba2674122e792740866f51da6b4301409ca725`
- Dirty status: 0 items.
- Last 24h `origin/main` commits: none observed.
- Open PRs: 0.
- Risk/blocker/approval signals: `docs/marketing-intelligence/risk-register-seo-aeo-geo.md` blocks autonomous execution for tactics with `risk_score >= 0.7`; hard no-gos include link schemes, invented metrics, unapproved YMYL claims, cloaking/doorways/hidden text. `human-approval-gates.md` says no live website change publishes without human approval logged in the approvals queue.

### RestoreAssist

- Path: `/Users/phillmcgurk/RestoreAssist`
- Remote: `https://github.com/CleanExpo/RestoreAssist.git` / GitHub `CleanExpo/RestoreAssist`
- Branch/head: `codex/ship-gate-recovery` @ `484ef1562d792ac65cbf9fadf040ddd7c4287307`
- Dirty status: 423 items; sample includes `.agents/skills/design-audit/SKILL.md`, `.claude/ARCHITECTURE.md`, `.claude/DESIGN.md`, `.claude/aggregation/MASTER_PLAN.md`, `.claude/aggregation/github/state.md`.
- Last 24h `origin/main` commits: `c29b5c3f 2026-06-01 12:44:11 +1000 feat(synthex-proxy): proxy avatar/voice generation through Synthex API`
- Open PRs: 8 open Dependabot PRs (#1214–#1221), all non-draft and `mergeable=MERGEABLE`. Common blockers: `Validate .claude/DESIGN.md=FAILURE`, `Quality Checks=FAILURE`; #1217 also `dry-run=FAILURE`; #1214 also Vercel production and sandbox status failures.
- Risk/blocker/approval signals: `.claude/aggregation/MASTER_PLAN.md` says production is live but unverified, RA-4956 go-live gate has P0/P1 sub-issues open, pilot cutover is owner-action gated, RLS disabled on 119 prod tables, `NODE_TLS_REJECT_UNAUTHORIZED` exists in production env, two RA Supabase projects need confirmation/decommission decision, and multiple security issues remain in progress.

## Verification read-back

- Read-only collection used `git fetch origin main --prune`, `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git log origin/main --since=24 hours ago`, and `gh pr list --json ...` for each specified lane.
- Local doc signals were collected with read-only content/file searches and targeted reads of current status/risk docs.
- No repo checkout was edited by this report run. The only local write was this report file.

## Safety record

Forbidden actions not taken: no branch changes, branch creation, staging, commits, pushes, PR edits, PR comments, PR reviews, merges, deploys, database writes, external service mutations, repo cleanup, credential configuration, secret printing/storage, cron scheduling/modification, or manual delivery configuration. `git fetch origin main --prune` was used only to refresh remote refs for read-only reporting. Telegram send was not attempted because the `send_message` tool is unavailable in this cron context.

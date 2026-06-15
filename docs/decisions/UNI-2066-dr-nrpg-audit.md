# DR-NRPG — Senior PM Deep-Dive Audit (UNI-2066)

**Date:** 2026-06-15
**Verdict:** The "98% complete / Production Ready" claim in BACKLOG.md is **not supported by current repo state**. The platform has real engineering assets, but launch readiness is **NOT** evidenced end-to-end.
**Owner:** Phill McGurk
**Subagents:** 3 parallel (PM audit, real verify, marketing/SEO)
**Read-only:** Yes. No commits, no Supabase writes, no vendor signups, no destructive actions.

---

## TL;DR (5 lines)

- The codebase is **structurally real** (monorepo works, type-check green, lint green with warnings, 5 pricing tiers wired, SEO scaffold for 5,000+ pages) but **not** in the state BACKLOG.md claims.
- **`pnpm test` fails** (6/6 suites blocked on a missing `canvas.node`); **`pnpm test:smoke` fails** (11/12 tests `fetch failed`); the "✅ Build passing" line is marketing copy.
- 11 unpushed feature branches, **0 open Beads tickets**, the issue tracker is essentially empty — engineering work is invisible to PM/scope.
- BACKLOG claims several "✅ COMPLETE" items (QA, DR, legal, monitoring, secret rotation) but **none of the cited proof artifacts are in the repo** — the names are referenced, the files don't exist.
- Highest-ROI next move: build a 1-page **PROOF LEDGER** that maps every claim to a real artifact, before any new work. The current state is "we shipped" without "we shipped this, here's where."

---

## 1. What's actually verified true (PM + verify subagents agree)

| Item | Evidence | Source |
|---|---|---|
| Monorepo scripts work (dev/build/test/type-check/lint) | `package.json:6-35` | PM-audit §2 |
| Type-check green end-to-end | `pnpm type-check` exit 0, 3/3 turbo tasks successful in 37.5s | verify-audit §1 |
| Lint green (with warnings) | `pnpm lint` exit 0, 2/2 tasks, lint-warnings remain in 5 dashboard files | verify-audit §1, §3 |
| 5 pricing tiers wired + 10% buffer enforced in code | `lib/geo/types.ts:152-226` + `lib/geo/radius-calculator.ts:35-184` | marketing-audit §2 |
| SEO system scaled for thousands of pages (ISR + Sanity + sitemap) | `app/sitemap.ts:4-10, 121-364` + `lib/seo/internal-linking.ts:247-313` | marketing-audit §3 |
| Related subprojects exist on disk | `RestoreAssist-overnight/lib/dr-nrpg/`, `Synthex/lib/nrpg-pipeline/`, `NRPG-Onboarding-Framework/` | PM-audit §2 |
| CI workflows exist + are gated properly | `.github/workflows/{ci,test-all,security,deploy-production}.yml` | PM-audit §2, verify-audit §4 |
| The `fix/nrpg-recruitment-dry-run-import` branch is real | `git log -1` shows `e9be3c93` with clean tracked diff | PM-audit §2 |

---

## 2. What's claimed done but isn't (the dangerous gap)

| BACKLOG claim | Cited file | Reality | Source |
|---|---|---|---|
| "98% Complete, 🟢 PRODUCTION READY" | `BACKLOG.md:1-4` | 0/3 verification checks fully green; 6/6 unit suites + 11/12 smoke tests failing | verify-audit §2a |
| "Build Status: ✅ Passing (all warnings resolved)" | `BACKLOG.md:5` | lint emits warnings in 5 dashboard pages (client/track, contractor/analytics × 3, contractor/available-requests, contractor/compliance) | verify-audit §2c, §3 |
| "BACKLOG-001 Manual QA — documentation complete" | `BACKLOG.md:32-83` | `QA_TEST_PLAN.md` and `BACKLOG-001_QA_TESTING_SUMMARY.md` **not in repo** | PM-audit §3 |
| "BACKLOG-004 Database Backup & DR Testing ✅ COMPLETE" | `BACKLOG.md:85-115` | `SUPABASE_BACKUP_AND_DR_TESTING_REPORT.md` **referenced but not found** in repo | PM-audit §3 |
| "BACKLOG-005 Secret rotation ✅ COMPLETE" | `BACKLOG.md:117-143` | `SECRET-ROTATION-STATUS.md` exists (28KB) — the only claim with real evidence; the rotation itself needs vault verification, not done | PM-audit §3 (partial) |
| "BACKLOG-006 Legal/compliance documentation complete" | `BACKLOG.md:145-194` | `LEGAL_COMPLIANCE_CHECKLIST.md` (64KB) exists but no linked delivery artifacts | PM-audit §3 |
| "BACKLOG-007 Monitoring setup complete" | `BACKLOG.md:196-261` | `BACKLOG-007_MONITORING_SETUP.md` (24KB) exists; no implementation evidence | PM-audit §3 |
| "BACKLOG-037 Email notification bug fixed" | `BACKLOG.md:24-28` | `sendClaimContractorAssignedEmail` function not found in codebase | PM-audit §3 |
| "151/151 tests passing" | (no exact line in BACKLOG; session memory) | `pnpm test` reports `0 total` (suites fail before running); `pnpm test:smoke` reports `1 passed, 11 failed` | verify-audit §2b |

**Pattern:** BACKLOG.md is a **claim ledger** written in 2026-02-04, not a **proof ledger** verified today. ~4 months stale. Several "complete" items have no on-disk artifact backing them.

---

## 3. What's missing entirely

| Gap | Why it matters | Source |
|---|---|---|
| `pnpm test` blocked by missing `canvas.node` native module | Unit suite cannot start; 0 tests run | verify-audit §3.1 |
| `pnpm test:smoke` blocked by `fetch failed` | Smoke suite cannot reach its target; 11/12 fail | verify-audit §3.2 |
| Beads has **0 open tickets** despite 11 unpushed feature branches | Issue tracking is invisible to PM; can't triage | PM-audit §8 |
| `.claude/CLAUDE.md` missing at DR-NRPG root (referenced by root CLAUDE.md) | Instruction ambiguity for any future agent | PM-audit §4 |
| No live evidence for "✅ SECURE" claim beyond BACKLOG-005's own narrative | The marketing copy is the only evidence | PM-audit §3 |
| No `.github/workflows` job history stored in-repo (no recent-failure visibility) | Can't audit CI health from repo state alone | PM-audit §4 |
| Public contractor acquisition landing page does not exist; recruitment is script+email only | "Marketing agency model" needs a public acquisition surface, not just a script | marketing-audit §4, §5.3 |
| Contractor portrait photos are placeholder SVGs (per `CONTRACTOR_PORTRAIT_STATUS.md`) | Trust proof is weak on the contractor side | marketing-audit §5.2 |
| Tier calculator + buffer rationale not exposed on public pricing page | Commercial prospects can't see why the buffer exists | marketing-audit §5.1 |
| No lint rule for "no phone numbers" / "AU English"; policy is in `AGENTS.md` only | `tel:` links and AU phone numbers already in code (5+ files) | marketing-audit §6 |
| The Supabase project is on **Canada** (`zwzbglqzmpyfzdkblxyf`) per `phase2-regional-migration.md` | "Production Ready" but data residency wrong for AU customers (Phill decided to move to Sydney) | (this session's earlier UNI-2063 audit) |

---

## 4. Branch landscape (PM-audit §7)

| Branch | State | Disposition |
|---|---|---|
| `fix/nrpg-recruitment-dry-run-import` (active) | 1 uncommitted file (CLAUDE.md +239/-10), tracks `origin/...` | Keep, but commit the CLAUDE.md before next work |
| `main` | Local is **2 behind** `origin/main` | Fast-forward needed |
| `pidev/fix-health-url-*` (×2) | Tracks `origin/*` marked `gone` | Kill |
| `pidev/geo-rollout-dr-nrpg-2026-05-25` | `gone` upstream | Kill or rebase + push |
| `pidev/quick-wins-2026-05-24` | `gone` upstream | Kill or rebase + push |
| `pidev/silence-empty-failing-workflows-2026-05-25` | `gone` upstream | Kill or rebase + push |
| `pidev/fix-pnpm-dup-deploy-2026-05-24` | `gone` upstream | Kill or rebase + push |
| `origin/feat/DR-34-partner-dashboard`, `origin/tmp-ci2-feat/DR-34-partner-dashboard`, `origin/fix/backup-use-direct-url`, etc. | Heavy feature/fix/tmp sprawl | Audit + archive (likely dead) |

**Net:** 6+ dangling local branches + heavy remote sprawl. Repo is in a "lots started, nothing finished" state. **The 5 PRs merged in May 2026 (#108-115) were all CI/workflow fixes — not features.** That cluster is the strongest single signal that the actual feature work is not shipping.

---

## 5. The 3 highest-ROI next moves

### Move 1 — Build the Proof Ledger (THE unblocker)

**What:** A single 1-page `DR-NRPG-PROOF-LEDGER.md` with one row per BACKLOG claim, mapping each to: (a) the file:line that proves it, (b) the test name that proves it, (c) the CI run that proves it, or (d) "UNVERIFIED" in red.

**Why high-ROI:** Removes false confidence. Until you can prove each claim, you can't tell what's actually shipping from what's marketing. Without this, every other decision is built on a lie.

**Cost:** 2-4 hours of focused grep+test work.

**Gate:** Phill reviews the ledger, decides which UNVERIFIED items to fix vs accept-as-marketing.

### Move 2 — Open 8 Beads tickets for the 8 unpushed branches + 1 for the proof ledger + 1 for the broken test env

**What:** Seed `.beads/issues.jsonl` with one ticket per active branch, one for the proof ledger, one for the canvas.node/test fix. Assign owners (Phill, or named agents). Triage within 24h.

**Why high-ROI:** Makes invisible work visible. Without tickets, you can't tell if a branch is dead or in-progress.

**Cost:** 1-2 hours to seed; ongoing triage.

**Gate:** Phill approves the seed list.

### Move 3 — Fix the test env (canvas.node + smoke fetch) and re-run

**What:** Two low-cost fixes — (a) install or stub the `canvas` npm package for jsdom tests, (b) point smoke tests at a running target (or run them in CI only). Re-run, capture the green output, paste it into the proof ledger.

**Why high-ROI:** The "151/151 tests passing" claim is the single most-checked metric. If the env is broken, nothing in BACKLOG.md can be verified.

**Cost:** 1-2 hours if `pnpm install canvas` works; longer if a real backend target is needed for smoke.

**Gate:** Engineering (Phill or the senior-pm agent).

---

## 6. What's risky and what to do about it

| Risk | Severity | Action |
|---|---|---|
| False completion confidence | **HIGH** | Build the proof ledger (Move 1) |
| Test env broken | **HIGH** | Move 3 |
| 0 open Beads tickets | **MEDIUM** | Move 2 |
| 8+ stale branches | **MEDIUM** | Phill decides per-branch (kill / rebase / merge) |
| Supabase on Canada, not Sydney | **MEDIUM** (data residency) | Already decided in UNI-2063 — move to Sydney, scheduled |
| Public contractor acquisition surface missing | **MEDIUM** (revenue blocker) | Marketing-audit Move #1 (write a "Why join NRPG" landing page) |
| Sanity CMS fields richer than published pages render | **LOW** | Marketing-audit Move #3 (publish a QA checklist) |
| No lint rule for "no phone" / "AU English" | **LOW** | Add a simple regex check; or accept policy-only |
| `.claude/CLAUDE.md` missing | **LOW** | Create one; 1 file |
| Cross-repo coupling (RestoreAssist-overnight, Synthex, NRPG-Framework) | **LOW–MEDIUM** | Document the data flow; do not re-architect |

---

## 7. The 5 immediate "fix in 5 minutes each" wins

These are NOT the high-ROI moves (those are above). These are the cheap cleanups that improve the repo's appearance and close small claim-vs-reality gaps.

1. **Commit the modified `CLAUDE.md`** on the active branch (`git add CLAUDE.md && git commit -m "chore: update agent instructions"`). Unblocks the next work.
2. **Fast-forward local `main` to `origin/main`** (`git checkout main && git pull --ff-only`). The 2 commits behind are a real local drift.
3. **Add a no-phone-number grep to CI** (1 workflow step, ~10 lines, checks for `tel:` / `\b0[2-9]\d{8}\b` / `\+61`). Enforces the AGENTS.md rule mechanically.
4. **Remove the 5 unused-import warnings** in `apps/web/app/dashboard/{client/track,contractor/analytics/performance,contractor/available-requests,contractor/compliance}/page.tsx`. Closes "all warnings resolved" claim.
5. **Add 1 Beads ticket for the broken test env** (`bd create "Fix canvas.node / smoke fetch failures blocking pnpm test"`). First ticket in months.

---

## 8. The 3 things I'm NOT recommending

- **Don't move the Supabase project yet.** Phill's UNI-2063 audit (earlier this session) flagged the Canada→Sydney move as a decision, not an action. Wait for the proof ledger so you can verify BACKLOG-004's "DR complete" claim doesn't depend on Canada being the current region.
- **Don't merge the 6 stale `pidev/*` branches.** They're a sign the May CI-fix work was emergency response, not new feature work. Each needs an owner decision (kill / rebase / merge) — not a blanket PR.
- **Don't bulk-update BACKLOG.md.** Until the proof ledger exists, you can't tell which "complete" claims are real. Updating now would just rename marketing copy.

---

## 9. What this batch DID NOT do (boundaries preserved)

- No commits, no pushes, no branch creation
- No Supabase connection, no Vercel deploy, no 1Password edits, no email sends
- No vendor signups (Resend, Stripe webhooks unchanged)
- No destructive git operations (no `git rebase --abort`, no `git reset --hard`, no force-push)
- The 3 subagents were `leaf` mode (no nesting) and could not impersonate Phill
- Only writes: the 3 audit files in `~/.scratch/` (out-of-repo, isolated)

---

## 10. Status for the gate

**Subagent reports:** all 3 returned VERIFIED, 0 BLOCKED.
**Total wall time:** ~11 min (parallel)
**Tokens spent:** ~1.9M input + ~21K output across the 3 subagents
**Files written:** 3 (dr-nrpg-audit-{pm,verify,marketing}.md), this synthesis (uni-2066-dr-nrpg-audit.md), and the evidence-ledger entry.
**Verifiable artifacts:** all 3 subagent reports + this synthesis + the tail outputs captured in verify-audit.

**Standing by for your call on Moves 1/2/3 + the 5 quick wins.** No autonomous execution — these are decisions, not work to start.

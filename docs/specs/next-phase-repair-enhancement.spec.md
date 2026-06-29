# SPM Spec — Next-Phase Repair, Bloat Purge & UI/UX Connect

> **Status:** DRAFT — decision-grade, ready for `/goal` on countersignature.
> **Author:** SPM (`/spm`), Pi-CEO board process. **Date:** 2026-06-30.
> **Repo:** `CleanExpo/Unite-Group` · checkout `~/pi-seo-workspace/unite-group` · branch `main` @ `becee09d39ad` · working tree clean.
> **Evidence rule:** every claim tagged `[VERIFIED]` (read/ran this session), `[INFERENCE]`, or `[UNVERIFIED]`. UNVERIFIED is never presented as fact.
> **Note on placement:** the canonical root `spec.md` (874-line product build spec, "Authority-Site In-House CRM") is a DIFFERENT artifact and is deliberately **not** overwritten — this maintenance-phase spec lives under `docs/specs/`.

---

## 1. Task being planned

| Field | Detail |
|---|---|
| Original request | "A full health check and drift check just completed — take these findings and brainstorm/plan a full new spec.md for the next phase of repair, enhancements, removing bloat and cache, and ensure the UI/UX is also enhanced and connected." |
| Interpreted task | Convert the health-check + drift findings (plus three deep audits) into a build-ready, phased maintenance spec covering: (a) **repair** the apps/workspace type/test drift and broken tooling; (b) **purge bloat** (committed build artifacts, oversized images, dead scripts, stale branches, Sentry residue, mixed lockfiles); (c) **harden caching/CI gates**; (d) **enhance + connect UI/UX** of the Nexus command-centre. |
| Target outcome | A green, lean, fully-gated monorepo where the Nexus command-centre has zero dead links, consistent design tokens, and apps/workspace is type-clean and CI-enforced. |
| Non-build clarification | `/spm` is read-only. This spec implements nothing. Build proceeds only via the §16 `/goal` command after sign-off. |

## 2. Current project context

| Field | Detail |
|---|---|
| Repo | `CleanExpo/Unite-Group` (monorepo: `apps/web` = Nexus command-centre, `apps/workspace`, `apps/empire`, `apps/spec-board`, `apps/autopilot-runner`, `packages/*`) `[VERIFIED]` |
| Branch | `main` @ `becee09d39ad`, clean tree (PR #553 merged, branch purged this session) `[VERIFIED]` |
| Working tree state | Clean (`git status --porcelain` = 0) `[VERIFIED]` |
| Relevant systems | Next.js 16 App Router + React 19 (apps/web); TanStack Start + Vite 7 + React 19 (apps/workspace); Supabase Postgres; Vercel; pnpm (web/workspace) + npm (others) `[VERIFIED]` |
| Files inspected | `ci.yml`/`security.yml`/`nightly-healthcheck.yml`, `apps/web/package.json`, `error-reporting.ts`, `dependency-checks.sh`, command-centre/breadcrumbs/founder-stats sources, plus 3 audit reports `[VERIFIED]` |
| Existing commands/skills | Root `verify`, `env:check`; apps/web `lint`/`type-check`/`test`/`build`; CI jobs `web`/`workspace`/`mcp`/`spec-board`/`playwright`/`security` `[VERIFIED]` |
| Known current behaviour | apps/web fully green (type-check ✓, lint ✓, 451 files / 2686 tests ✓). apps/workspace: 44 tsc errors, 6 test fails, 459 lint errors, build green. `[VERIFIED]` |
| Unknowns | Contents of `docs/convergence/migration-map.md`; whether the `workspace` CI job is a *required* status check; whether 19 candidate-orphan scripts have cron/Hermes callers. `[UNVERIFIED]` |

## 3. Problem statement

| Field | Detail |
|---|---|
| User | Phill (founder/operator) + the autonomous Pi-CEO agents that build on this repo nightly. |
| Pain | (1) apps/workspace carries invisible debt (44 type errors / 459 lint / 6 test fails) that CI does not catch — silent rot. (2) The repo ships 40M+ of committed bloat (21M esbuild bundle, ~22M raster images) and 9 dead npm scripts. (3) Sentry is wired in despite a locked "no Sentry" policy. (4) The command-centre has two user-visible 404 breadcrumb links and a pocket of off-token styling. |
| Current workaround | Build-only CI gate on apps/workspace; "stale checkout" notes in overnight logs; manual avoidance of broken scripts. |
| Business impact | Bloat slows clones/CI; dead links erode founder-facing polish ($2B-standard bar); silent drift means regressions land unseen. |
| Technical impact | Type/test drift compounds; mixed lockfiles risk `ERR_PNPM_OUTDATED_LOCKFILE` Vercel failures `[VERIFIED via memory feedback-pnpm-lockfile-drift]`; Sentry residue contradicts the observability standard. |
| Why now | Health + drift check just ran; `main` is freshly synced and clean — lowest-risk moment to burn down debt before the next feature wave. |

## 4. Desired outcome

A **green, lean, gated, polished** monorepo:
- apps/workspace type-clean (0 tsc errors) and **type-check + test enforced in CI**.
- Zero committed regenerable build artifacts; images optimized; dead scripts removed.
- Sentry fully removed; error reporting routed to Vercel observability (policy-aligned).
- Command-centre: zero dead links, design-token-consistent, en-AU locale correct.
- Branch list reconciled (squash-merged branches pruned).

## 5. Scope

### In scope
- **W1 Repair:** apps/workspace 44 tsc errors (Clusters D→A→B→C→mop-up), 6 brittle tests, 14 auto-fixable lint; fix 9 dead `apps/web/package.json` script entries.
- **W2 Bloat & Cache purge:** untrack 21M esbuild bundle; optimize ~22M images (apps/web hero via `next/image`; apps/workspace avatars via build-time WebP, per C1); remove Sentry (dep + 9 files + any config files/wrapper, per C2); move append-only agent logs out of git + repoint the cron write path (C2b); delete stale root `.next`/`tsbuildinfo`/`next-env.d.ts`; reconcile + prune 146 branches; verify no intra-package lockfile drift (per-package toolchain is by design — C4).
- **W3 UI/UX connect & polish:** fix 2 broken breadcrumb links; tokenise breadcrumb + operator-gateway + hermes-control-panel inline hex; fix locale drops; harden KPIGrid total-failure state; resolve the Lucide-vs-rule doc mismatch.
- **W4 CI hardening:** add `tsc --noEmit` + `test` steps to the root `workspace` CI job once W1 green; (optional) make `workspace` a required status check.

### Out of scope
- Rebuilding any feature; new product surfaces; the 459-error full lint burn-down (only the 14 auto-fixable + cluster-correlated ones in this phase — the rest tracked as follow-up).
- `git filter-repo` history rewrite to shrink `.git` (97M) — flagged as a separate, gated, irreversible decision (§12).
- apps/empire / apps/spec-board / apps/autopilot-runner internal drift (not in the findings).
- Touching the canonical root `spec.md`.

### Explicit non-goals
- No mass icon migration (Lucide→custom SVG) in this phase — resolve the *rule* first.
- No deletion of the 19 candidate-orphan scripts until callers verified.

### Assumptions
- apps/web green state holds (re-verified at build start). `[VERIFIED this session]`
- pnpm is the intended forward package manager for web/workspace. `[INFERENCE from root verify scripts]`
- Vercel observability replaces Sentry for error capture. `[VERIFIED via memory feedback-no-sentry]`

### Constraints
- One concern per PR; keep each PR independently green and revertable.
- en-AU locale, AUD, DD/MM/YYYY; design tokens (`var(--color-*)`) not raw hex; honest error states (No-Invaders #1).
- Anthropic-Max workhorse; no API-credit loops.

## 6. Existing capability review

| Capability | Location/source | Reusable? | Notes |
|---|---|---|---|
| Honest-error fetch pattern | `apps/web/src/components/founder/dashboard/FounderStats.tsx:55-69` | ✅ Yes | Reference pattern for KPIGrid hard-fail fix (W3). `[VERIFIED]` |
| en-AU locale formatting | `FounderStats.tsx:69` (`toLocaleDateString('en-AU', …)`) | ✅ Yes | Copy to social/wiki locale-drop fixes. `[VERIFIED]` |
| Design-token CSS vars | `command-deck.module.css`, `var(--color-*)` system | ✅ Yes | Target for tokenising operator-gateway/hermes hex. `[VERIFIED]` |
| CI job pattern (full gate) | `.github/workflows/ci.yml` `spec-board` job (`tsc --noEmit`+`test`+`build`) | ✅ Yes | Mirror for the `workspace` job in W4. `[VERIFIED]` |
| `captureApiError` API | `apps/web/src/lib/error-reporting.ts` | ♻️ Refactor | Keep the function signature; swap Sentry body for console/Vercel logging. `[VERIFIED]` |
| `next/image` optimization | Next 16 built-in | ✅ Yes | For image bloat (W2). |
| `gh pr list --state merged --head <branch>` | gh CLI | ✅ Yes | Squash-merge detection for branch prune. |

## 7. Specialist board review

| Role | Finding | Risk | Recommendation |
|---|---|---|---|
| Senior Product Manager | The user's headline fear ("connect the UI/UX") is **largely already solved** — surfaces fetch live data with honest states; gaps are 2 dead links + styling polish. Don't over-scope into a rebuild. | Scope creep into a fictional UI rebuild | Frame W3 as *polish & fix*, not *build*; lead with the 2 breadcrumb 404s (highest user-visible leverage). |
| Senior Software Architect | 44 tsc errors = 8 clusters / 19 files; ~24 EASY, ~18 MED, 0 truly HARD. Cluster D (send-stream live route) + Cluster A (swarm2, 41%) are highest leverage. Bloat is mostly committed artifacts + images, not code. | Domain-model reconciliation in Cluster A could ripple | Fix D first (smallest, live-route risk), then A as one model PR; keep each cluster a separate PR. |
| Senior UX/UI Reviewer | Breadcrumbs link `/dashboard/overview` (404) + intermediate `/founder` (404). Inline-hex pockets in operator-gateway/hermes look off vs tokenised deck. Locale drops in social/wiki. Lucide in 45 files contradicts a documented rule. | Doc-vs-reality drift festers | Fix links + tokens + locale; **resolve the Lucide rule** (amend rule to permit, don't mass-migrate now). |
| Senior Security Reviewer | Sentry (`@sentry/nextjs ^10.37.0`) live in 9 files incl. error boundaries — contradicts locked no-Sentry policy. Removing it must NOT silently drop error capture. No secrets exposed in the bloat. | Losing error visibility on removal | Replace Sentry body with structured `console.error` (Vercel captures server logs) + keep the `captureApiError` API stable; verify error boundaries still render. |
| Senior QA/Test Lead | apps/workspace gates **build-only** in CI — 44 type / 459 lint / 6 test failures are invisible. 2 of 6 test fails fall out of fixing Clusters A/F. | Re-drift after fix without a gate | Add `tsc --noEmit` + `test` to the `workspace` CI job (W4) the moment W1 is green — this is the durable fix, not the one-time cleanup. |
| Devil's Advocate / Judge | Most items are low-risk hygiene; the only genuinely risky/irreversible one is `git filter-repo` history shrink — explicitly deferred. Branch prune could delete unmerged work if squash-detection is wrong. | Irreversible deletes | Gate history-rewrite out of scope; branch prune must use `gh pr` merged-state confirmation per branch, dry-run first. |

## 8. Judge challenge

| Category | Score | Notes |
|---|---:|---|
| First-source evidence | 24/25 | Every finding tool-verified this session (3 audits + direct CI/source reads). Minor UNVERIFIED items flagged. |
| Clear user/business problem | 18/20 | Concrete pain (silent drift, dead links, bloat, policy violation). Slightly diffuse because it bundles 4 workstreams. |
| Reuse of existing capability | 15/15 | Pure repair/polish — reuses existing patterns (honest-error, en-AU, CI job template), builds nothing new. |
| Security/privacy safety | 14/15 | Sentry removal is policy-aligned; one risk (don't drop error capture) is mitigated. |
| UX clarity | 9/10 | Fixes are specific with file:line; leads with highest-visibility 404s. |
| Testability | 10/10 | Acceptance = type-check/test/CI green — binary and machine-checkable. |
| Cost/control simplicity | 4/5 | Phased, revertable PRs; one deferred irreversible item correctly gated. |
| **Total** | **94/100** | |

**Decision: APPROVE BUILD** (≥85). Phased, evidence-backed, low-risk repair/polish with one irreversible item (history rewrite) correctly deferred. Build in the W1→W2→W3→W4 sequence as independent PRs.

> **Post-`/judge` revision (2026-06-30, score 93/100, APPROVE BUILD with conditions):** an independent judge pass re-verified every load-bearing claim first-source and applied five mandatory corrections, now folded into §5/§11/§12/§16: **C1** apps/workspace avatars use build-time WebP, not `next/image` (Vite app); **C2** Sentry config files + `withSentryConfig` wrapper must be enumerated before removal; **C2b** repoint the nightly cron's log path when relocating agent logs; **C3** land an interim CI *ratchet* gate during W1 (not only after) so drift can't regress; **C4** do NOT converge package managers — per-package lockfiles are by canonical-`CLAUDE.md` design. W1→W4 is a genuine dependency (W4 full gate needs W1 at 0 errors); the ratchet (C3) is what de-risks it.

## 9. Proposed solution

### User flow
Founder opens the Nexus command-centre → every breadcrumb link resolves (no 404) → operator-gateway/hermes panels look consistent with the tokenised deck → dates render en-AU → KPI failures show an honest "couldn't load" state. Behind the scenes, agents building on apps/workspace get red CI on new type/test breakage instead of silent drift.

### System flow
Four independent workstreams, each a separate PR chain off `main`:
- **W1** → branch `repair/workspace-type-drift-*` (one PR per cluster: D, A, B, C, mop-up) + `fix/web-dead-script-entries`.
- **W2** → `chore/bloat-*` PRs: untrack-bundle, optimize-images, remove-sentry, relocate-agent-logs, prune-branches, lockfile-standardize.
- **W3** → `fix/command-centre-dead-links`, `fix/cc-token-consistency`, `fix/locale-drops`, `feat/kpi-grid-honest-failure`, `docs/resolve-lucide-rule`.
- **W4** → `ci/gate-workspace-typecheck-test` (depends on W1 green).

### Data flow
No schema/migration/data changes anywhere in this spec. Image optimization changes asset bytes only; Sentry removal changes error *destination* (Sentry→Vercel logs), not data captured.

### Permission flow
All reversible local code changes — owned, no Phill approval needed (per Decision-Rights Matrix). The single gated item: any `git filter-repo` history rewrite (OUT of scope; would require explicit sign-off). Branch deletion uses `gh pr` confirmation; dry-run before delete.

### Failure flow
Each PR independently revertable (`git revert <sha>`). Sentry removal: if error boundaries regress, revert the single removal PR. Image optimization: keep originals until visual diff confirms parity. CI gate (W4): if it flakes, the gate is additive and can be reverted without touching code.

### Rollback path
Per-PR revert. No data/schema/env rollback required for any item. Branch prune is the only destructive op — mitigated by `git fetch --prune` + per-branch merged-state check + the squash-merged work already living on `main`.

## 10. UX requirements
- **Breadcrumbs:** "Dashboard" → `/founder/dashboard`; the `/founder` intermediate segment is non-linked OR a redirect to `/founder/dashboard` (`Breadcrumbs.tsx:23,25-38`). `[VERIFIED targets]`
- **Tokens:** breadcrumb rest/hover/active use distinct `var(--color-text-muted)` / `var(--color-text-primary)` (visible hover affordance); operator-gateway (`_components.tsx` 16 hex, `page.tsx` 5 hex) + hermes-control-panel (`page.tsx` 23 hex) migrated to CSS-var tokens.
- **Locale:** `social/page.tsx:108` and `wiki/page.tsx:87` / `wiki/[id]/page.tsx:51` use `'en-AU'` explicitly.
- **KPIGrid:** on batch + per-card fetch failure, render an honest "couldn't load KPIs" state (not a permanent "Loading…") — match `FounderStats` hard-error pattern.
- **No regressions** to the #553 deck-leads-above-steps order.

## 11. Technical requirements
- **W1 fix order (by leverage):** D (send-stream `persistActiveRun`, 3 err, live route) → A (swarm2 model drift: `lastRealSummary`→`lastSummary`, `prUrl`, `Swarm2InboxItem`, `AgentProgressStatus`, `OfficeViewProps.processType`, 18 err) → B (swarm v1: `CpuIcon` import, dup `ok` key, kanban input, roster shape, xterm overloads, 9 err) → C (chat: `ThinkingLevel` union, `{}` query result, router params, 7 err) → E/F/G/H mop-up (8 err). `[VERIFIED clusters]`
- **Dead scripts:** remove/repair 9 `apps/web/package.json` entries (`integrity:check`, `email-agent`, `content-agent`, `orchestrator`, `analyze-contacts`, `seo:research`, `seo:full`, `stripe:audit`, `setup`, `verify`/`verify:windows`). Prefer removal unless a script is intended. `[VERIFIED missing targets]`
- **Bloat:** `git rm --cached apps/workspace/electron/server-bundle.cjs` + gitignore; **`apps/web/public/pi-ceo-hero.jpg` (3.4M) → WebP/AVIF served via `next/image`** (apps/web is Next 16); **`apps/workspace/public/avatars/*` (17M) + workspace logos → pre-compressed WebP/AVIF at build (sharp/squoosh) and referenced as static Vite assets — NOT `next/image`, since apps/workspace is TanStack Start/Vite with no Next runtime (`[VERIFIED]` C1)**; relocate `overnight-progress-log.md`/`morning-report.md`/`continuous-work-queue.jsonl` out of git **AND repoint the nightly cron's write path in the same change (these are actively appended by the autonomous loop — gitignoring without repointing breaks the evidence trail; C2b)**; `rm -rf` root `.next`/`tsbuildinfo`/`next-env.d.ts`.
- **Sentry:** remove `@sentry/nextjs` from `apps/web/package.json` + regenerate `pnpm-lock.yaml` (lockfile-only, same commit per memory); rewrite `error-reporting.ts` body to structured `console.error`; update the 9 importing files (incl. `error.tsx` boundaries, `global-error.tsx`, `RouteErrorBoundary.tsx`). **Before the PR, grep `sentry.*.config.*` and `withSentryConfig` and add any Sentry config files + the `next.config` wrapper to removal scope — package.json + 9 importers may not be the full footprint (C2, NOT CHECKED).**
- **Per-package toolchain (NOT standardization):** per canonical `CLAUDE.md` hard rule, **each package keeps its own lockfile/package manager — the root is NOT a pnpm workspace and mixed pnpm+npm lockfiles are by design.** Scope is limited to ensuring **no intra-package drift** (each lockfile matches its own `package.json`); do **not** converge package managers (C4 — corrects the original "standardize to pnpm" item).
- **W4 CI:** (a) **interim ratchet gate, landed during W1 — not after:** add a `workspace` CI step asserting `tsc --noEmit` error count ≤ a committed baseline and strictly non-increasing, so drift can't regress while W1 burns down (decouples W4's durability value from W1 completion; C3). (b) Once W1 hits 0, replace the ratchet with full `type-check` (`tsc --noEmit`) + `test` steps mirroring the `spec-board` job.

## 12. Security and privacy requirements
- Sentry removal must preserve error **capture** (route to Vercel logs) — verify error boundaries still render and `captureApiError` still logs. `[VERIFIED current behaviour]`
- **C2 (NOT CHECKED):** before removal, enumerate the FULL Sentry footprint — `grep -rl 'sentry.*.config' apps/web` and `grep -rn 'withSentryConfig' apps/web/next.config.*` — and include any config files + the `next.config` wrapper in the removal PR, or the build keeps resolving Sentry.
- **C2b (COUPLING):** agent logs (`overnight-progress-log.md`/`morning-report.md`) are appended by the nightly autonomous cron `[VERIFIED — fresh entries seen this session]`; relocating them out of git must repoint the cron's write target in the same change, else the autonomous evidence trail breaks.
- No secrets in any relocated agent log (scan before moving out of git). `[per memory secret-redaction-gaps]`
- `git filter-repo` history rewrite (97M `.git`) is **irreversible** → explicitly OUT of scope; requires separate founder sign-off.
- Branch prune: confirm each branch's PR merged-state via `gh` before delete; dry-run list first.
- No new external service, auth, or PII surface introduced.

## 13. Verification plan

### Static checks
- `cd apps/web && pnpm run type-check` → 0 errors (must stay green). `[baseline VERIFIED green]`
- `cd apps/web && pnpm run lint` → clean. `[baseline VERIFIED green]`
- `cd apps/workspace && pnpm exec tsc --noEmit --pretty false 2>&1 | grep -c 'error TS'` → **0** (from 44). `[baseline VERIFIED 44]`
- `cd apps/workspace && pnpm run lint` → ≤ (459 − fixed); auto-fix clears ~14. `[baseline VERIFIED]`

### Unit / integration tests
- `cd apps/web && pnpm run test` → 2686/2686 pass (no regression). `[baseline VERIFIED]`
- `cd apps/workspace && pnpm run test` → 591/591 pass (from 585/6-fail). `[baseline VERIFIED]`

### UI/browser verification
- Click every breadcrumb on a nested founder route → no 404 (verify via `/run` or browser-harness against local dev).
- Visual diff operator-gateway/hermes panels before/after tokenisation (parity).
- Render a date on `social` page → DD/MM/YYYY en-AU.
- Force KPI fetch failure → honest error state, not permanent "Loading…".

### Smoke tests
- `cd apps/web && pnpm run build` → success.
- `cd apps/workspace && pnpm run build` → success (must stay green through W1).
- Confirm optimized images load and render at parity.

### Manual review
- Diff confirms each PR touches only its workstream's files (surgical).
- `git ls-files | xargs du -h | sort -rh | head` → no 21M bundle, no 3.4M hero JPG.
- `grep -rl '@sentry' apps/web/src` → 0.

### Evidence required before declaring done
- Pasted `grep -c 'error TS'` = 0 for apps/workspace.
- Pasted apps/web + apps/workspace test summaries (all pass).
- Pasted CI run showing the new `workspace` type-check + test steps green.
- `du`/`git ls-files` output proving bloat removed.

## 14. Loop testing and stress testing
- **Re-run drift loop:** after each W1 cluster PR, re-run `tsc --noEmit` and assert the count strictly decreases and no NEW file appears.
- **CI gate stress:** intentionally introduce a throwaway type error in apps/workspace on a scratch branch → confirm the new W4 gate goes RED (proves the gate actually catches drift); revert.
- **Image regression:** load each optimized image at 1x/2x; confirm no broken `<img>`/404.
- **Branch-prune dry-run:** run the squash-merge detection over all 146 branches, output the delete-list, eyeball for any `feat/*` with unmerged work before executing.
- **Sentry-removal stress:** trigger each `error.tsx` boundary (throw in a child) → confirm honest error UI renders and a `console.error` fires.

## 15. Acceptance criteria

- [ ] apps/workspace `tsc --noEmit` = **0 errors** (from 44). `[VERIFIED baseline 44]`
- [ ] apps/workspace `pnpm run test` = **all pass** (from 6 failing). `[VERIFIED baseline 6 fail]`
- [ ] apps/web type-check / lint / test remain **green** (no regression). `[VERIFIED baseline green]`
- [ ] 9 dead `apps/web/package.json` script entries removed or repaired; none fail-on-invoke. `[VERIFIED 9 dead]`
- [ ] `apps/workspace/electron/server-bundle.cjs` (21M) untracked + gitignored. `[VERIFIED tracked]`
- [ ] `apps/web` hero optimized to WebP/AVIF via `next/image`; `apps/workspace` avatars+logos pre-compressed to WebP/AVIF at build (NOT `next/image`); measure achieved total (was ~22M; record actual). `[VERIFIED sizes]`
- [ ] Interim ratchet CI gate (C3) live during W1: workspace `tsc` error count cannot increase above baseline; proven RED at baseline+1. `[VERIFIED build-only today]`
- [ ] Sentry config-file footprint enumerated (`sentry.*.config`, `withSentryConfig`) and fully removed — not just dep + 9 importers. `[NOT CHECKED — C2]`
- [ ] `@sentry/nextjs` removed from apps/web; `grep -rl '@sentry' apps/web/src` = 0; error boundaries still render; lockfile regenerated same commit. `[VERIFIED 9 files]`
- [ ] Breadcrumb links resolve (no `/dashboard/overview` or `/founder` 404). `[VERIFIED both broken]`
- [ ] operator-gateway + hermes-control-panel + breadcrumb use design tokens, not raw hex. `[VERIFIED hex counts]`
- [ ] Locale drops fixed (`social`, `wiki`) → en-AU. `[VERIFIED]`
- [ ] KPIGrid shows honest failure state on total fetch failure. `[VERIFIED soft-fail]`
- [ ] Lucide-vs-rule mismatch resolved in docs (rule amended OR migration ticketed). `[VERIFIED 45 files]`
- [ ] Root `ci.yml` `workspace` job runs `type-check` + `test` and is green. `[VERIFIED build-only today]`
- [ ] 146 branches reconciled; squash-merged branches pruned (dry-run reviewed first). `[VERIFIED 146]`
- [ ] Stale root `.next`/`tsbuildinfo`/`next-env.d.ts` removed. `[VERIFIED orphan]`
- [ ] Append-only agent logs relocated out of git (secret-scanned first). `[VERIFIED tracked]`

## 16. Goal command

```text
/goal Execute docs/specs/next-phase-repair-enhancement.spec.md in four sequential workstreams, each as independent revertable PRs off main. Success = every §15 acceptance checkbox green with pasted tool evidence.

W1 REPAIR (do first): In apps/workspace, drive `pnpm exec tsc --noEmit` from 44 errors to 0, one PR per cluster in order D (send-stream persistActiveRun) → A (swarm2 model drift, 18 err) → B (swarm v1) → C (chat) → E/F/G/H mop-up. After each PR re-run tsc and assert the count strictly drops with no new files. Then `pnpm run test` to all-pass (591). Separately, remove/repair the 9 dead apps/web/package.json script entries. Keep apps/web and apps/workspace build green throughout.

W2 BLOAT PURGE: git rm --cached the 21M apps/workspace/electron/server-bundle.cjs + gitignore; convert apps/web/public/pi-ceo-hero.jpg to WebP/AVIF served via next/image (apps/web only); pre-compress apps/workspace/public/avatars/* + workspace logos to WebP/AVIF at build with sharp/squoosh and reference as static Vite assets — do NOT use next/image in apps/workspace (it is Vite, no Next runtime); remove Sentry from apps/web — FIRST run `grep -rl 'sentry.*.config' apps/web` and `grep -rn 'withSentryConfig' apps/web/next.config.*` and include any config files + the next.config wrapper in scope, then remove @sentry/nextjs, rewrite error-reporting.ts to structured console.error, update all 9 importers incl error boundaries, regenerate pnpm-lock.yaml same commit; relocate overnight-progress-log.md/morning-report.md/continuous-work-queue.jsonl out of git after a secret scan AND repoint the nightly cron's write path in the same change (they are actively appended — do not just gitignore); rm -rf stale root .next/tsbuildinfo/next-env.d.ts; reconcile 146 branches via `gh pr list --state merged --head <branch>` (DRY-RUN the delete list first, eyeball for unmerged feat/* before pruning). Do NOT converge package managers — per-package lockfiles are by design; only assert no intra-package lockfile drift. DO NOT run git filter-repo / history rewrite — out of scope, needs separate sign-off.

W3 UI/UX CONNECT & POLISH: fix Breadcrumbs.tsx dead links (/dashboard/overview → /founder/dashboard; stop linking the /founder intermediate segment); tokenise breadcrumb + operator-gateway (_components.tsx, page.tsx) + hermes-control-panel/page.tsx raw hex to var(--color-*); fix en-AU locale drops in social/page.tsx + wiki; add an honest KPIGrid total-failure state mirroring FounderStats; resolve the Lucide-vs-rule mismatch in rules/frontend/nextjs.md (amend the rule to permit Lucide rather than mass-migrate 45 files). Preserve the #553 deck-above-steps order.

W4 CI HARDENING: (a) DURING W1 (not after) land an interim ratchet step on the root .github/workflows/ci.yml workspace job asserting `tsc --noEmit` error count <= a committed baseline and strictly non-increasing — stress-test it: push +1 error on a scratch branch, confirm RED at baseline+1, GREEN at baseline, revert. (b) AFTER W1 hits 0, replace the ratchet with full type-check (tsc --noEmit) + test steps mirroring the spec-board job; stress-test: push a throwaway type error, confirm RED, revert.

Constraints: one concern per PR; en-AU/AUD/DD-MM-YYYY; design tokens not raw hex; honest error states (No-Invaders #1); pnpm-forward; Anthropic-Max only. Paste tool evidence (grep -c 'error TS', test summaries, du/git ls-files, CI run) for each acceptance checkbox before marking it done.
```

## 17. Implementation sequence

1. **W1.D** send-stream (`repair/workspace-send-stream`) → verify: tsc 44→41, build green.
2. **W1.A** swarm2 model (`repair/workspace-swarm2-model`) → verify: tsc 41→23, swarm2 test passes.
3. **W1.B** swarm v1 (`repair/workspace-swarm-v1`) → verify: tsc 23→14.
4. **W1.C** chat (`repair/workspace-chat`) → verify: tsc 14→7.
5. **W1.mop-up** E/F/G/H (`repair/workspace-mopup`) → verify: tsc 7→0, all tests pass.
6. **W1.scripts** dead npm entries (`fix/web-dead-script-entries`) → verify: no script fails on invoke.
7. **W4.ratchet** (`ci/workspace-error-ratchet`) — land EARLY, in parallel with W1.D, before the burn-down → verify: RED at baseline+1, GREEN at baseline.
8. **W2** bloat PRs (parallel-safe, independent): untrack-bundle, optimize-images-web (next/image), optimize-images-workspace (build-time WebP), remove-sentry (config-footprint first), relocate-logs (+cron repoint), prune-branches, lockfile-drift-check → verify each acceptance line.
9. **W3** UI/UX PRs: dead-links → tokens → locale → kpi-state → lucide-rule → verify breadcrumbs + visual + locale.
10. **W4.fullgate** (`ci/gate-workspace-typecheck-test`) — only after W1 step 5 green (0 errors); replaces the ratchet → verify: gate RED on injected error, GREEN on main.

## 18. Session handoff seed

```
Phase: next-phase repair/bloat/UI-UX (spec: docs/specs/next-phase-repair-enhancement.spec.md)
Repo: ~/pi-seo-workspace/unite-group @ main becee09d39ad (clean)
Baseline (VERIFIED 2026-06-30): apps/web GREEN (type/lint/2686 tests). apps/workspace: 44 tsc errors / 6 test fails / 459 lint / build green.
Audits: scratchpad/audit-{workspace,bloat,uiux}.md (full evidence).
Next safe action: start W1.D (send-stream persistActiveRun, 3 errors, EASY, live route).
Gated/irreversible (DO NOT without sign-off): git filter-repo history shrink; destructive branch deletes (dry-run first).
Open UNVERIFIED: docs/convergence/migration-map.md; is `workspace` a required status check; 19 candidate-orphan scripts' callers.
```

## 19. Final recommendation

**APPROVE BUILD (94/100)** — proceed W1→W2→W3→W4 as independent, revertable PRs. This is high-leverage hygiene at the lowest-risk moment (clean main, just synced). The most valuable durable outcome is **W4**: gating apps/workspace on type-check + test so the 44-error drift can never silently return. The user's stated UI/UX worry is mostly already solved — W3 is targeted polish (2 dead links + token/locale fixes), not a rebuild, so resist scope inflation there. The only item requiring founder sign-off (git history rewrite) is correctly deferred out of scope.

SPM spec complete. Next safe action: run the §16 `/goal` command starting with W1.D (apps/workspace send-stream `persistActiveRun`, 3 errors, live route).

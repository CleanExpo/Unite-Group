---
name: northstar-navigator
category: governance
version: 1.0.0
priority: P1
auto_load: true
license: internal
triggers:
  - deciding what to build, skip, finish, or defer toward production
  - any "is this done / is this real / can we ship" judgement
  - tempted to add a dependency, mock, duplicate system, repo, or speculative cron/skill
description: |
  The compass for Unite-Hub's road to /shipit. Defines the single NorthStar (a real, comprehensive,
  working founder CRM in production, every section GREEN), the binding definition of GREEN, and the
  No-Invaders Manifest that keeps the build honest and surgical. Consult BEFORE deciding what to
  build/skip/finish — it resolves "200 ≠ real" temptations and scope-creep pressure. P1, auto-loaded.
metadata:
  locale: en-AU
  owner: phill
  tenant: founder_id
context: fork
---

# NorthStar Navigator

> The map, not the diary. Read before you decide what to build, skip, or call done.

## The NorthStar

**A real, comprehensive, working founder CRM — live in production — where every section is GREEN.**

Not a demo. Not a green CI tick. Not a page that returns HTTP 200. A CRM Phill can run his
businesses from, where every screen shows his real data, scoped to him, behind real auth, with
honest loading/error states, proven by a passing verify loop. **200 ≠ real.** A rendered page is
not evidence; real founder-scoped data behind auth is.

## Definition of GREEN (all five, with proof)

A section is GREEN only when ALL of the following are demonstrably true:

1. **Real data** — reads/writes live Supabase (or a genuinely-connected integration), never mock-as-real.
2. **Auth** — `getUser()` server-side (Supabase PKCE); unauthenticated → 401.
3. **Founder-scope** — every query `.eq('founder_id', founderId)`; never `workspace_id`.
4. **Loading + error** — `loading.tsx` and `error.tsx` (or inline boundaries) exist and render.
5. **Verify-pass** — `pnpm run type-check && pnpm run lint && pnpm run test && pnpm build` passes.

Missing any one → AMBER. Fabricated-as-real → RED. Mark the ledger honestly; never round up.

## The No-Invaders Manifest

Invaders are the seven ways a build drifts away from the NorthStar. Reject each on sight.

| # | Invader | The rule |
|---|---------|----------|
| 1 | Fake-as-real | No mock/hardcoded data presented as live. Surface `source`; prefer honest "not_connected" empty-state. Mocks only in tests/dev. |
| 2 | Scope-creep | Build only what the task asks. No "while I'm here" features, refactors, or polish. |
| 3 | New dependencies | Use what's already in the repo. No new packages without Board sign-off. |
| 4 | Duplicate systems | Search before creating. No second auth/client/util/table doing an existing job. |
| 5 | New repos / clones | One canonical repo per product. Never clone to a `do_not_clone_to[]` path. |
| 6 | Shortcut hacks | No `|| true`, no `--no-verify`, no swallowed errors, no bypassed gates to force a green. |
| 7 | Speculative crons/skills | Don't scaffold no-op crons or skills for sources/providers that aren't connected yet. |

## Where the variables live (the substrate map)

| Source | Holds | How to read |
|--------|-------|-------------|
| Vercel prod `unite-hub` (`prj_y8hsRwhZHe6ewe6wCbwMbBYx20yp`) | Production/Preview/Dev env (7 required + Google OAuth) | `vercel env ls` / REST `/v10/projects/{id}/env` |
| Vercel sandbox `unite-hub-sandbox` (`prj_tNqIsHGY3kvw7zdO2bXVxFWTPIk0`) | Sandbox-first env, source of truth for replication | `vercel env pull` |
| Railway | Pi-CEO / external service vars (if consumed) | Railway project variables |
| Linear | Goals, issues, current-state tracking | Linear MCP |
| `.md` SSOTs | `CONSTITUTION.md`, `PRODUCTION-LEDGER.md`, `PORTFOLIO.yaml`, this skill | Read before deciding |

## The Navigation Loop (run before deciding what to do next)

1. **Locate** — which section/task, and which NorthStar gap does it close?
2. **Consult SSOTs** — read the ledger + relevant `.md`; is this already done or already decided?
3. **Invader check** — would doing this trip any of the 7 invaders? If yes, stop and choose the honest path.
4. **Verify reality** — is the dependency (data/provider/env) actually connected? If not, it's blocked, not buildable.
5. **Build the minimum** — surgical change, existing systems only, real data + auth + scope + boundaries.
6. **Prove** — run the verify loop AND confirm the page serves real founder-scoped data. No proof → not done.
7. **Record honestly** — update the ledger GREEN/AMBER/RED with evidence; log the decision.

## Integration with existing guardrails

| Guardrail | NorthStar relationship |
|-----------|------------------------|
| `execution-guardian` | Blocks destructive/shortcut defaults — enforces Invader #6. |
| `system-supervisor` | Duplicate/drift detection — enforces Invaders #4, #5. |
| `mock-vs-real-detector` | Proves a 200 serves real data — enforces Invader #1 / GREEN #1. |
| `section-finaliser` | Per-section done-gate — implements Definition of GREEN. |
| `verification-first` | No task complete without proof — implements GREEN #5 + step 6. |
| `council-of-logic` | Overrides first-answer bias when choosing build/skip/defer. |

## Anti-Patterns

- Calling a section GREEN because the build passed — build-green is one of five gates, not the gate.
- Manufacturing scaffolding (crons/skills/tables) for a provider that isn't connected.
- Adding a dependency to save five lines — three similar lines beat a new package.
- "Improving" adjacent code during a fix — that's Invader #2 wearing a helpful mask.
- Bypassing a failing gate instead of fixing the root cause.

## Checklist (before declaring any step done)

- [ ] Closes a real NorthStar gap (not busywork).
- [ ] No invader tripped (all 7 cleared).
- [ ] Dependency genuinely connected (not blocked-but-pretending).
- [ ] Real data + auth + founder-scope + loading/error present.
- [ ] Verify loop passes with proof.
- [ ] Ledger updated honestly (GREEN/AMBER/RED + evidence).

## en-AU localisation

All output: Australian spelling (colour, behaviour, optimisation, licence n.), dates DD/MM/YYYY,
currency AUD, timezone AEST/AEDT. Direct, no superlatives.

---
type: spec
product: stage3-autopilot-runner
status: draft
locale: en-AU
created: 2026-06-21
sources:
  - apps/web/src/app/api/cron/linear-claim/route.ts
  - apps/web/src/app/api/cron/linear-handoff/route.ts
  - apps/web/src/lib/command-centre/linear-claim.ts
  - apps/web/src/lib/command-centre/linear-execution-packet.ts
  - apps/web/src/lib/integrations/linear.ts
  - apps/web/vercel.json (crons)
  - apps/workspace/src/server/swarm-memory.ts
  - apps/workspace/src/server/swarm-lifecycle.ts
  - apps/workspace/soul.md
  - docs/spec/go-live-readiness-2026-06-21.md (Stage 3 pieces 1-8)
---

# Stage-3 Autopilot Runner — build-ready spec

> The autonomy enabler. Today the deployed app can **pick** work from Linear but cannot
> **do** it — a Claude worker on Phill's Mac (tmux) consumes the packet. This spec hosts that
> executor so the loop runs **unattended, off the Mac**. It is auto-push infrastructure, so
> the security model is the centre of gravity, not a footnote.

## 1. Finish line

**Done when** the deployed system can, with no human at the keyboard, **claim** an eligible issue
from the Linear SSOT → run a **Claude worker in hosted isolation** to satisfy its Definition-of-Done
→ run the **gauntlet** (build + type-check + test) → open a **PR** → **auto-merge on green** → and
**report back to Linear** — behind a **kill switch**, with a full **audit trail**, and with **zero
capability** to touch prod DB, secrets, deletions, access-control, or prod deploys. `[VERIFIED — locked]`

## 2. Decision up front

Build a **Railway-hosted runner service** that consumes the **existing** `LinearExecutionPacket`
(the read/claim side already ships in `apps/web` — `linear-claim.ts` + `linear-execution-packet.ts`,
gated by `CC_LINEAR_LIVE`, `[VERIFIED]`). The runner clones the repo into an **ephemeral worktree**,
injects **tiered context** (`soul.md` + memory + last handoff), runs **`claude` headless** against the
packet prompt, runs the gauntlet, opens a PR via a **least-privilege GitHub credential**, **auto-merges
only on green CI** for issues carrying the `mesh:auto`/`pi-dev:autonomous` label, writes a **handoff + audit row**, and
comments the PR link back to Linear. We reuse the deployed read-side wholesale and build only the
hosted executor + the safety control plane. Railway is the host (Pi-CEO already runs there). **Stop at
Phill's design sign-off** before any runner code; provisioning + secrets are Phill-only.

## 3. Goals & non-goals

**Goals**
- Hosted, unattended, **isolated** worker execution → PR → auto-merge-on-green → audit, with a kill switch.
- Reuse the deployed `LinearExecutionPacket` + claim logic; no parallel queue.
- Least-privilege by construction: the runner **cannot** do anything on the prohibited list even if it tries.

**Non-goals (REQUIRED)**
- **No prod DB writes / DDL.** The runner never holds the Supabase service-role/admin key; branch-first DB stays human-promoted. `[VERIFIED — CLAUDE.md]`
- **No prod deploys.** It merges PRs; deployment stays the normal Vercel flow. It cannot promote to prod.
- **No deletions / access-control / secret handling.** Outside its capability set entirely.
- **Does not run the regulated Duncan legal phases.** The ITR Phase-0 legal gate + any human-gated issue is **never** `mesh:auto`/`pi-dev:autonomous`-labelled, so the runner can't claim it. The human gate stands.
- **Not a replacement for review on risky changes** — auto-merge applies only to green-CI, `mesh:auto`/`pi-dev:autonomous`-labelled, base=`main`, linear-history PRs.

## 4. Approach — plain language

The deployed cron already claims an issue and produces a packet (branch name + prompt + steps).
Instead of that packet waiting for the Mac, a **dispatcher** hands it to the **hosted runner**. The
runner: (a) checks out a clean worktree of `main`; (b) loads `soul.md` + the worker's tiered memory +
the latest handoff; (c) runs `claude` against the packet prompt to implement the DoD on a feature
branch; (d) **re-runs the gauntlet itself** (a worker's "green" is `[UNCONFIRMED]` until the runner
re-runs it); (e) opens a PR; (f) if CI is green **and** the issue is `mesh:auto`/`pi-dev:autonomous`-labelled, squash-merges;
(g) writes a handoff + an audit row and comments the result on the Linear issue. `CC_LINEAR_LIVE=0`
drains the loop instantly. **Branch protection on `main` makes PR-only structural** — even a misbehaving
runner cannot push to `main` or bypass CI.

## 5. Phased plan — smallest first (each phase = one PR, auto-merged on green once the loop is live; until then, normal PR)

**Phase 0 — Design gate (THIS doc) + Phill-only setup.**
**DoD:** Phill signs the architecture + security model; Phill (a) provisions the Railway service shell,
(b) creates **two least-privilege GitHub Apps** — a *runner* App (author: contents + PR) and a *reviewer*
App (approver: PR reviews) — installed on `CleanExpo/Unite-Group`, (c) sets the runner secrets (Anthropic,
Linear, both GitHub App keys, `CRON_SECRET`), (d) confirms `main` branch protection stays as-is (1 required
review — the reviewer App satisfies it; no direct push). *No runner code before this.* `main` protection
verified 2026-06-21 via `gh api`: `required_approving_review_count: 1`, repo auto-merge disabled.

**Phase 1 — Extract `@unite/autopilot-core` (pure, in-repo, safe).**
Move the pure claim/packet/Linear logic out of `apps/web/src/lib/command-centre` + `integrations/linear.ts`
into a shared package both the Vercel cron and the runner import (no behaviour change).
**DoD:** `apps/web` still builds/type-checks/tests green importing from the package; unit tests cover claim eligibility + packet shape. Pure refactor — zero infra/secret dependency, so this can start the moment Phase 0 is signed.

**Phase 2 — Runner skeleton + hosted pipe (no Claude yet).**
New `apps/autopilot-runner` (Node + Dockerfile). It pulls a packet from `/api/cron/linear-handoff`
(read-only), clones the repo to an ephemeral worktree, creates the branch, runs the gauntlet on a
**no-op/trivial** change, opens a **draft PR**, and comments the PR link to the Linear issue. Proves the
whole hosted pipe + auth round-trip **without** autonomous authoring. Deployed to Railway by Phill.
**DoD:** a draft PR appears, authored by the hosted runner, with a Linear comment carrying the PR link + gauntlet output.

**Phase 3 — Claude authoring + tiered context (the real worker).**
Wire `claude` headless (Claude Agent SDK / CLI) against the packet prompt inside the runner; port the
tiered-context loader (`soul.md` + memory + handoff) to runner storage (volume / object store).
**DoD:** for a seeded `mesh:auto`/`pi-dev:autonomous` test issue with a clear DoD, the runner produces a real, correct PR that passes the gauntlet; handoff is written and reloadable.

**Phase 4 — Auto-merge-on-green + adversarial gate + audit + kill switch.**
Squash-merge only when CI is green **and** `mesh:auto`/`pi-dev:autonomous`-labelled **and** base=`main`; add the optional
**adversarial re-run** (a second independent gauntlet, the `adversarial-evaluator`) before merge; write an
`autopilot_runs` audit row; honour `CC_LINEAR_LIVE=0` as an instant drain.
**DoD:** a green PR auto-merges; a red PR does **not**; an unlabelled issue is never claimed; `CC_LINEAR_LIVE=0` claims nothing; every action has an audit row + Linear comment.

**Phase 5 — Push dispatch + point at a live project + safety control plane.**
Flip the cron from "leave packet" to **POST packet → runner**; point the live gate at a chosen project;
add the structural guardrails (rate limit, max-concurrent, repo-scope check, an explicit deny-list that
makes prod-DB/secret/delete/deploy operations impossible in the runner image).
**DoD:** end-to-end unattended run on a real `mesh:auto`/`pi-dev:autonomous` issue, merged on green, fully audited, with the guardrail tests green.

## 6. Data / infra model

- **Host:** Railway service (Phill provisions). Ephemeral worktree per run; **persistent volume or object
  storage** for handoffs/memory. `[INFERENCE — Railway chosen; OQ1]`
- **Queue:** Linear remains the SSOT/queue; no Redis/BullMQ introduced. `[VERIFIED]`
- **Audit:** an `autopilot_runs` table (run id, issue, branch, PR url, gauntlet result, merged bool, actor,
  ts) — **branch-first, additive, founder-scoped** in `apps/web` prod, or Linear-comments-only for v1 (OQ5).
  No autonomous DDL to prod. `[VERIFIED — CLAUDE.md DB rule]`

## 7. Security & cost guardrails (the heart of this spec)

- **Branch protection on `main` = PR-only is structural.** The runner cannot push to `main` or bypass CI.
- **Merge predicate (all required):** CI green ∧ **adversarial-evaluator approving review posted** ∧ `mesh:auto`/`pi-dev:autonomous` label ∧ base=`main` ∧ linear history. The approving review comes from a **distinct reviewer-bot identity** (separate GitHub App), never the runner's author identity — GitHub disallows self-approval. **`main` branch protection (1 required review) is KEPT, not relaxed**; the bot satisfies it. Anything else → leave the PR for a human.
- **Least-privilege credential:** GitHub access scoped to the one repo, contents+PR only, **no admin/settings**; prefer a **GitHub App** (short-lived tokens) over a long-lived PAT (OQ2).
- **Capability floor:** the runner image holds Anthropic + the scoped GitHub creds + Linear + `CRON_SECRET` **only**. It does **not** hold Supabase service-role/admin, prod DB creds, or any deploy/delete/access-control capability — the prohibited set is absent from its environment, not merely "not called".
- **Kill switch:** `CC_LINEAR_LIVE=0` drains immediately; a max-concurrent + per-hour rate cap prevents runaway.
- **Audit everything:** every claim/PR/merge → Linear comment + `autopilot_runs` row.
- **Cost:** metered Anthropic per run + one small Railway service; no standing queue infra.

## 8. Risk & assumption register

| # | Item | Tag | Mitigation |
|---|---|---|---|
| 1 | Autonomous code reaching `main` | [VERIFIED risk] | Branch protection + green-CI-only + label-gated + linear-history; structural, not advisory. |
| 2 | Runner credential compromise | [VERIFIED risk] | Least-privilege GitHub App, repo-scoped, no admin; no prod/admin secrets in image; rotate. |
| 3 | Runaway loop / cost | [VERIFIED risk] | Kill switch + max-concurrent + rate cap + per-run token budget. |
| 4 | A regulated/gated issue gets auto-claimed | [VERIFIED risk] | Only `mesh:auto`/`pi-dev:autonomous`-labelled issues are claimable; Duncan legal phases + human-gate issues are never labelled. |
| 5 | Subagent "green" trusted without re-run | [INFERENCE] | Runner re-runs the gauntlet itself; optional adversarial second pass before merge (Phase 4). |
| 6 | Railway as host unconfirmed | [UNCONFIRMED] | OQ1 — confirm Railway vs Actions-self-hosted vs VM. |
| 7 | Memory/handoff portability to hosted storage | [UNCONFIRMED] | Phase 3 ports `swarm-memory.ts` paths to a runner volume/object store; prove reload. |

## 9. Decisions (locked 2026-06-21) + remaining questions

**Locked by Phill 2026-06-21:**
1. **Host: Railway** (alongside Pi-CEO). `[VERIFIED — Phill]`
2. **GitHub auth: GitHub Apps** — short-lived, repo-scoped, revocable installation tokens. **Two identities**: a *runner* App (author) + a *reviewer* App (approver). `[VERIFIED — Phill]`
3. **Auto-merge: requires the adversarial-evaluator second pass** — a second independent gauntlet must re-verify green, on top of CI, before any merge. `[VERIFIED — Phill]`
4. **Merge policy: reviewer-bot approval; branch protection KEPT.** `main` requires 1 approving review (verified via `gh api`; repo auto-merge disabled) — **not relaxed**. The adversarial-evaluator runs as the **reviewer App** and posts the approving review **only** when its independent gauntlet re-passes. The runner (author) and reviewer (approver) are distinct Apps — GitHub disallows self-approval. The human review gate becomes an auditable second-bot gate; kill switch + full audit retained. `[VERIFIED — Phill]`

**Defaults assumed unless Phill says otherwise:**
5. **Repo scope (v1):** runner acts only on `CleanExpo/Unite-Group`, only on `mesh:auto`/`pi-dev:autonomous`-labelled issues.
6. **Audit store:** a branch-first, founder-scoped `autopilot_runs` table in `apps/web` prod (additive; promoted via approved branch).

## 10. Verification plan

- Each phase PR proves itself: `pnpm build` + `pnpm type-check` + `pnpm test` green (quoted output, re-run by the orchestrator — Evidence Standard).
- **Phase 2 DoD:** a draft PR authored by the hosted runner appears with a Linear comment (tool output, not assertion).
- **Phase 4 DoD:** a green seeded PR **auto-merges**; a deliberately-red one does **not**; an unlabelled issue is never claimed; `CC_LINEAR_LIVE=0` claims nothing.
- **Phase 5 DoD:** one full unattended run on a real `mesh:auto`/`pi-dev:autonomous` issue, merged on green, with `autopilot_runs` + Linear audit, and the guardrail tests (no prod-DB/secret/delete capability) green.

[STATUS] gate: awaiting approval

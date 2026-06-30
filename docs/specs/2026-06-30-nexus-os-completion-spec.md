---
type: spec
status: draft — Board go/no-go pending
created: 2026-06-30
author: SPM (/spm) + Pi-CEO board process
scope: unite-group monorepo (apps/web + apps/workspace + apps/autopilot-runner)
evidence_standard: fabel — every claim tagged [VERIFIED]/[INFERENCE]/[UNCONFIRMED]
supersedes: none — this is the umbrella completion spec for the four 2026-06-28 Nexus specs
---

# SPM Spec — Complete the Nexus Agentic OS within the Unite-Group CRM

## 1. Task being planned

| Field | Detail |
|---|---|
| Original request | "Use /spm and the Board to complete the Nexus OS within the Unite-Group CRM." |
| Interpreted task | Take the Nexus Agentic OS from "Phases A–D shipped, levels wired locally" to **operationally complete**: the four remaining items across the 2026-06-28 spec set — bridge prod turn-on, CRM duplicate-model unification, persistent off-Vercel host, and L4 distribution — sequenced so every agent-actionable slice ships now and every founder-gated slice is teed up with an explicit gate. |
| Deliverable boundary | `/spm` is read-only. This spec implements nothing. Build proceeds only via the §16 `/goal` after Board go + founder sign-off on the gated items. |

## 2. Project context (what exists) `[VERIFIED this session]`

The Nexus OS is built on four merged spec tracks; current `main` @ `a4637ff`:

- **L3 Mission Control (Phases A–D)** — DELIVERED + live-verified (#589): `/api/knowledge/list` serves the real `2nd Brain/2nd Brain` vault; telemetry reports live `gatewayState: running`; `/api/skills` serves 30 skills as buttons; `/api/quick-run` runs headless on the plan-backed gateway and files an OKF output to the vault.
- **L2 OKF knowledge layer** — vault index+nav (#587) + `okf-index.py --bundle`/`--check` tooling (#589).
- **Operator console Phase 1** — commissioned at runtime (gateway `:8642` up, workspace serving `:3000`, lanes dir present); **R9 lane preflight** fixed (#589); lane CLI availability falls back to the shared Max token (#590).
- **Web CC↔gateway bridge** — code-complete + tested (web presence 17/17, autopilot-runner presence 13/13), **turn-on founder-gated** (#589).

## 3. Problem

The OS runs locally and the levels are wired, but it is not *operationally complete*: the deployed web CC doesn't yet reflect the live gateway (bridge not turned on), prod carries a duplicated CRM data model that violates the No-Invaders rule, there is no durable host so nothing survives a laptop reboot (and true lane isolation is impossible on macOS), and the floor-raising team/client distribution (L4) is unbuilt. Each remaining item is either a founder gate (secret/deploy/spend) or depends on one.

## 4. Desired outcome

Nexus OS is "done" when: (a) unite-group.in's Command Centre shows the live local gateway via the presence bridge; (b) prod has a single canonical CRM model family with split routes reconciled; (c) the operator console + Stage-3 runner + true 3-plan lanes run on one durable host; (d) a non-technical identity can drive button-only Nexus on the web variant, terminal-free. All external side-effects stay approval-gated; plans-over-keys honoured.

## 5. Scope

**In:** sequence + spec the four completion items (bridge turn-on, CRM unify, persistent host, L4) into agent-actionable vs founder-gated phases, with verifications. Land all reversible prep now (migration authored sandbox-first, distribution packaging behind auth, host provisioning scripts).
**Out:** new vendors; rebuilding working CRM features; Stage-4 legal/Duncan sign-off; the lane adapter re-architecture for per-account tokens (only if the host path is rejected).

## 6. Existing capability (do not rebuild)

Mission Control shell + 4 levels; plan-backed gateway; OKF vault + generator/bundle/check; lane orchestrator + R9 preflight + shared-token availability; the presence bridge (read + write sides) staged; the `~/.hermes/provision-lanes.sh` helper; the CRM (contacts/opportunities/campaigns/… all founder-scoped, 16 connectors).

## 7. Specialist board (15+ yr) `[INFERENCE from this session's evidence]`

- **Product Manager:** the highest user-visible win is the **bridge turn-on** — it makes the deployed cockpit tell the truth about the live operator with zero new build. Do it first; it's the cheapest "feels complete" moment. L4 distribution is the strategic payoff but depends on the host.
- **Software Architect:** the **persistent host is the keystone** (operator-spec 9D): it is simultaneously the Stage-3 autonomy runner, the true-3-plan lane host, and the durable home for the gateway + presence writer. Solve it once and three problems collapse. Recommend a Linux container (Docker/Tailscale) over a VPS to keep plans-over-keys local.
- **UX/UI Reviewer:** L4 must be button-only with honest state (reuse the `source: shared|dedicated` labels from #590 and the Inspector approval gates). No terminal, no raw errors.
- **Security Reviewer:** three hard gates — prod `SUPABASE_SERVICE_ROLE_KEY` is a secret (founder-entered, never via assistant); non-loopback host needs `HERMES_PASSWORD`; MFA (B7) before any multi-user L4 with real PII. CRM migration sandbox-first, never `db push` to prod (see [[nexus-prod-migration-drift]]).
- **QA/Test Lead:** the CRM unify is the riskiest (live prod data, dual model). Gate it behind a Supabase branch + route tests + a reversible cutover; verify a single model family in `information_schema` before retiring the other.
- **Devil's Advocate:** "complete" risks gold-plating. Chase's own thesis: L1/L2 are 90% of value and they're done. Resist building L4 polish before the host exists and the bridge is on. The minimum honest "complete" is bridge-on + CRM-decided + host-provisioned; L4 can be a fast-follow.

## 8. Judge challenge — score 82/100 → APPROVE BUILD (phased, founder-gated slices held)

Strong: builds entirely on merged, verified infrastructure; each item is independently shippable; the host insight collapses three problems into one. Held below 85 by: (a) three irreducible founder gates (secret, prod deploy, spend) that the agent cannot clear; (b) the CRM unify touches live prod data (real blast radius); (c) L4 multi-user auth/MFA is genuinely unfinished. Verdict: **build the agent-actionable prep now** (CRM migration authored sandbox-first; L4 packaged behind auth; host provisioning scripted), **hold the three gates for founder action**, and **escalate the host spend to the Board**.

## 9. Proposed solution — four phases, gate-explicit

### Phase 1 — Bridge turn-on (founder-gated; agent-prepped) `[code-complete #589]`
Agent: nothing left to build — verified 30/30 tests. Founder: set prod `SUPABASE_SERVICE_ROLE_KEY` + `FOUNDER_USER_ID` in `~/.hermes/.env`; bootstrap `ai.hermes.presence.plist`; deploy `apps/web` via the named-grant gate. Verify: unite-group.in rail shows Hermes connected + `capabilities.gateway.state = running`.

### Phase 2 — CRM model unification (agent-prepped sandbox-first; founder decides family)
Founder decision: canonical family = **`crm_*`** (recommended — it is the spec'd CRM spine in root `spec.md`; `contacts`/`leads` are the legacy shape). Agent (reversible): author the migration on a **Supabase branch**, add the missing `contacts GET`, approval request/execute, and pipeline-forecast READ routes against `crm_*`, repoint the split routes, add route tests. Hold prod promotion for founder approval. Verify: `information_schema` shows one family; route tests green; no `db push` to prod.

### Phase 3 — Persistent host (Board spend decision; agent-scripts the provision)
Board: approve the host (Docker container on the Mac now → Tailscale-reachable; VPS later if spend justified). Agent: write the container/compose + LaunchAgent/systemd scaffolding that runs gateway + workspace + presence writer durably, and (on Linux) provisions **true per-account lane tokens** (resolves the macOS Keychain limit, [[macos-claude-cli-keychain-lanes]]). Verify: reboot-survival; `provision-lanes.sh status` shows 3 dedicated logins on the Linux host.

### Phase 4 — L4 distribution (fast-follow; founder-gated deploy)
Agent: package the web variant as button-only (reuse `source` labels + Inspector gates), behind auth; add TOTP MFA (B7) before multi-user. Founder: enable the named-grant + first non-founder identity. Verify: a non-founder presses a button on unite-group.in and gets output, terminal-free.

## 10. UX

Founder opens unite-group.in → connection rail green (bridge live) → presses "Daily priority brief" → streams → output lands in the 2nd Brain. A teammate does the same, terminal-free, on their own MFA'd login. The operator console + lanes keep running after a reboot.

## 11. Technical plan (phased, each verifiable)

A (bridge turn-on, founder) → B (CRM migration authored on Supabase branch + routes + tests, agent) → C (host provisioning scripted + Board spend, agent/Board) → D (L4 packaging behind auth+MFA, agent) → prod cutovers for B/C/D held behind founder/Board sign-off. Gate every code change: `pnpm -C apps/web run type-check && lint && vitest run`; workspace via vitest; no prod writes without sign-off.

## 12. Security

Secrets founder-entered only (never via assistant). Non-loopback host ⇒ `HERMES_PASSWORD`. CRM migration sandbox/branch-first; never `db push` to prod. MFA before multi-user L4. Lane + button side-effects approval-gated. Plans-over-keys.

## 13. Verification

- P1: unite-group.in rail = Hermes connected, `capabilities.gateway.state running`.
- P2: `information_schema` → single CRM family; `contacts GET` + approval + forecast routes green; Supabase branch diff reviewed before promote.
- P3: gateway+workspace+presence survive reboot; 3 dedicated lane logins on Linux host.
- P4: non-founder identity drives a button terminal-free; MFA enforced.

## 14. Loop + stress testing

Fire 5 Quick Commands concurrently across lanes; confirm queue/stream/file with no cross-contamination. Kill the gateway mid-run; tile shows honest error (not hang). Run the CRM cutover on the branch twice; confirm idempotent + reversible. Reboot the host; confirm all three services return.

## 15. Acceptance criteria

- [ ] Bridge live on unite-group.in (founder turn-on).
- [ ] Single CRM model family in prod; split routes reconciled; missing routes added.
- [ ] Durable host runs gateway+workspace+presence; survives reboot; 3 dedicated lanes (Linux).
- [ ] L4: a non-technical identity uses button-only Nexus, terminal-free, MFA'd.
- [ ] All external side-effects approval-gated; no prod write occurred without sign-off.

## 16. /goal command

```
/goal Execute the agent-actionable slices of docs/specs/2026-06-30-nexus-os-completion-spec.md,
holding every founder/Board gate. DoD: (P2) on a Supabase BRANCH (never prod), author the
contacts/leads/pipeline_stages -> crm_* unification migration, add contacts GET + approval
request/execute + pipeline-forecast READ routes against crm_*, repoint split routes, add route
tests; surface the branch diff for founder promote. (P3) write the Docker/compose + service
scaffolding to run gateway+workspace+presence durably and provision true per-account lane tokens
on Linux; do not incur spend. (P4) package the web variant button-only behind auth + add TOTP MFA
scaffolding. Verify each per spec §13 with type-check+lint+vitest green. Do NOT: enter secrets,
deploy apps/web, db push to prod, or turn on the presence writer — those are founder/Board gates.
```

## 17. Implementation sequence

P1 (bridge — founder flips; agent already done) → P2 (CRM migration authored, branch-only) → P3 (host scripts + Board spend) → P4 (L4 behind auth/MFA). P1 is the cheapest visible win; P3 is the keystone that unblocks autonomy + true lanes; B/C/D prod cutovers gated.

## 18. Session-handoff seed

- All four 2026-06-28 sub-specs + delivery records on `main` @ `a4637ff`; this umbrella spec on branch `docs/spec-nexus-os-completion`.
- Founder gates (unchanged): bridge secret+deploy; CRM family decision (recommend `crm_*`); host spend; L4 multi-user.
- Do-not-redo: the four sub-spec builds (#587/#589/#590); the macOS lane finding ([[macos-claude-cli-keychain-lanes]]).

## 19. Final recommendation

**APPROVE BUILD (phased).** Agent ships P2/P3/P4 prep now — all reversible, no prod writes. Founder clears the three gates (bridge secret+deploy, CRM family pick, host spend) when ready; the Board takes the host spend as a go/no-go. The single highest-leverage move is the **persistent Linux host** — it completes the operator console, the Stage-3 runner, and true 3-plan lanes in one decision.

SPM spec complete. Next safe action: convene the Board (/ceo-board) for go/no-go on this spec, foregrounding the persistent-host spend decision.

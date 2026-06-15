# RestoreAssist — Production-Readiness Loop (operationalized)

> **Source spec:** "Unite Group — Completion & Production-Readiness Specification" (Phill McGurk, Senior PM draft v1).
> **Scope:** narrowed to **RestoreAssist (P1)** per the spec's own scope note; re-run per product later.
> **What this is:** the spec's prose gates turned into a **runnable loop-until-done harness**. Brainstorming finds the work; the spec defines done; **this loop drives to done and verifies it** — mechanically, so it can't run on optimism (spec §3).
>
> **Cross-repo note:** RestoreAssist's code lives in `CleanExpo/Unite-Hub` (the OpenClaw agent OS). This artifact is authored at the **Empire/portfolio level in this repo** (Authority-Site), and its automated checks execute against the RestoreAssist codebase via `TARGET_REPO`. Authoring here, executing there.

## The three files

| File | Role |
|---|---|
| [`readiness-gates.json`](./readiness-gates.json) | **Authoritative gate registry** — every §4/§5 gate as a machine record (id, phase, type, severity, owner, check). Edit gates here. |
| [`readiness-state.json`](./readiness-state.json) | **Human attestations + run history.** Reviewers sign soft/judgment gates here; the runner appends each pass. |
| [`scripts/readiness-loop.mjs`](../../../scripts/readiness-loop.mjs) | **The runner.** Evaluates every gate, prints a ticket-ready gap report, exits `0` only when zero blockers + zero majors remain. |

## How to run

```bash
# Evaluate from this repo (attestations + any local checks). Command checks show "open" until a target is set.
node scripts/readiness-loop.mjs

# Run the real command/gap-scan checks against the RestoreAssist codebase:
TARGET_REPO=/path/to/Unite-Hub node scripts/readiness-loop.mjs

# Machine output for CI / the loop:
node scripts/readiness-loop.mjs --json
```

**Loop-until-done.** The runner's exit code *is* the loop contract: `0` = done, `1` = gaps remain. Drive it with the `/loop` skill or a cron until it exits `0`:

```
/loop 30m node scripts/readiness-loop.mjs        # re-check every 30 min; stop when green
```

This realizes spec §5 ("loop-until-done = all gates in §5 pass") and §7 (the sign-off checklist) as one command. The §3 gap-discovery pass *is* the runner's open-gap list — feed it straight to Linear team UNI.

## Check kinds (how a gate is verified)

- **`command`** — a shell command run in `$TARGET_REPO`; exit `0` = pass. Used for the hard, code-checkable test gates (suite green, schema validates, dispatch-gate test, rollback works…).
- **`gap-scan`** — same mechanism, used for the §3 enumeration / traceability scans.
- **`attestation`** — a named human/reviewer sign-off recorded in `readiness-state.json`. Used for the soft judgment gates (Nova/Lens/Atlas reviews) **and** for the hard human gates that can't be a command (compliance regime named, a non-builder ran from docs alone).

> **Honest by construction:** with no `TARGET_REPO` and no signatures, *every* gate starts **open** — the runner reports "not done," which is correct. Nothing is green until it's evidenced. This is the §6 hard-vs-soft discipline: a phase passes only when its **hard** check is green **and** no **soft** reviewer objects.

To sign an attestation, edit `readiness-state.json`:
```json
"p58_compliance_regime": { "signed": true, "by": "Lens", "date": "2026-06-20", "evidence": "docs/compliance/regime.md" }
```

## Gate registry (overview)

Full detail (commands, done-definitions) is in `readiness-gates.json`. **43 gates** across the spec's §4 and §5 (25 blocker, 18 major at the current all-open baseline).

### §4 — Consequential-action gates (the heart; all hard, mostly blocker)
| id | gate | check | severity |
|---|---|---|---|
| `G4-DISPATCH` | Dispatch cannot fire on an unverified match | command | blocker |
| `G4-PAYMENT` | Payment cannot exceed threshold without human approval | command | blocker |
| `G4-INSURANCE` | Insurance claim submit/alter requires Lens + human | command | blocker |
| `G4-COMMS` | Crisis comms template-bound + human escalation | command | major |
| `G4-ONBOARD` | Contractor onboarding verifies credentials + insurance | command | blocker |
| `G4-SURGE-FALLBACK` | **Surge fallback + 24/7 escalation SLA (no-human-available rule)** | attestation | blocker |

### §5 — Phase gates (each: hard test gate + soft review gate)
`P5.1-*` Discovery · `P5.2-*` UX/UI · `P5.3-*` Architecture (schema, API spec, matching) · `P5.4-*` Operational loop (E2E + §4 enforcement, caps) · `P5.5-*` Integrations & AI · `P5.6-*` Deploy + rollback · `P5.7-*` QA + **surge/load (with a target number)** · `P5.8-*` Security + **named compliance regime (phase-0 blocker)** · `P5.9-*` Data (restore, integrity, migrations) · `P5.10-*` Launch (runbook, go/no-go) · `P5.11-*` Handover (**non-builder runs from docs *without* the agent stack**, ownership). Plus `GAP-SCAN` for the §3 verdict.

The runner renders the live status of all 43 each pass.

## Gaps I baked in from the review (beyond the source spec)

These were missing or under-specified in draft v1 and are now gates, so the loop forces them closed:

1. **`G4-SURGE-FALLBACK`** — resolves the human-gate-vs-~60-min-promise tension: a tested rule for when no human is available during a 3am surge (auto-approve within tight bounds **or** queue-and-degrade — never silent auto-fire) plus a named pager/escalation SLA.
2. **`P5.8-REGIME`** — compliance was an "open item" but it gates §5.8/§5.9, so it's elevated to a **phase-0 blocker** with an AU-specific regime list (PCI-DSS, Privacy Act 1988 + APPs, insurance claims-handling/ASIC, state contractor licensing e.g. QBCC).
3. **`P5.7-LOAD-TARGET`** — the surge/load gate now requires a written target number + degradation policy, or it isn't falsifiable.
4. **`P5.3-MATCH`** — the matching gate now also asserts **fairness + vetting-freshness** (insurance/licence not lapsed since vetting), since this dispatches a stranger to a vulnerable home.
5. **`P5.11-DOCS-RUN`** — the "non-builder runs from docs" ownership test must run **without** the OpenClaw agent stack, otherwise "100% owned" is contradicted by the AI-OS dependency.

## §8 open items — proposed defaults (confirm or override)

| # | Open item | Proposed default |
|---|---|---|
| 1 | Platform-level vs RestoreAssist-first | **RestoreAssist-first** (this artifact); generalize to the platform once validated on P1. |
| 2 | Which §5 phases define "complete" | Must-pass for first real job: **5.3, 5.4, 5.5, 5.8, 5.9, 5.10, 5.11**; 5.2/5.7 may be "partial-with-named-gaps." |
| 3 | §4 thresholds | `PAYMENT_AUTO_APPROVE_MAX` (human approves above it); contractor vetting = licence + current insurance + ID + reference; **insurance action always human + Lens**. *Set the $ figure.* |
| 4 | Compliance regime | PCI-DSS (payments), Privacy Act 1988 + APPs (vulnerable-person data), insurance claims-handling (ASIC/AFCA), state contractor licensing (QBCC/equiv). *Lens / a lawyer confirms.* |
| 5 | Who holds the 5%-oversight pager | A named on-call owner + the `G4-SURGE-FALLBACK` degrade-safe rule for 3am surges. *Name the human(s).* |
| 6 | Pitch figures (86%/95%) | **Retired** from all gates until §7's checklist defines "complete" — then a % is just `passing/total` from the runner. |

## What the runner does NOT replace

The soft reviewers (Nova/Lens/Forge/Grid) are real and recorded as attestations — but they're LLM/human judgment and can vary run to run (§6). The **hard** command gates are the non-negotiable floor; the attestations are accountable sign-offs with `by`/`date`/`evidence`, not vibes. A green run means *both* held.

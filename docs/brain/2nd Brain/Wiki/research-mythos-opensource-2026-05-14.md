---
type: wiki
updated: 2026-05-14
researcher: Mythos
source: "[[Sources/Mythos unleashed on Opensource]]"
tags: [research, model-routing, security, anthropic]
---

# Mythos research — 2026-05-14

## Brief contains a factual error — flagging before anything else

The task brief states "Mythos is a Nous Research family model — current Pi-CEO config may already reference it via `provider: nous_portal`". **This is wrong.** The Primeagen source (and the underlying Daniel Stenberg article + JustSecurity coverage) is unambiguous: **Mythos is an Anthropic model**, released under "Project Glasswing" — a security-focused trickle-out program to selected partners (curl/Daniel Stenberg was one). The video title "Mythos unleashed on Opensource" refers to Mythos being *unleashed against* open-source codebases for vulnerability discovery, NOT to Mythos being an open-source weights release.

There is no `provider: nous_portal` Mythos. Any swap proposal premised on "cheap open-weight Mythos" collapses immediately. The remainder of this memo proceeds on the corrected premise.

## What the source actually establishes

- **Model name:** Mythos (Anthropic, Project Glasswing program).
- **Size / training method / licence:** Not disclosed in source. Closed weights, gated access — Anthropic has not released Mythos publicly because of stated dual-use security concerns.
- **Claimed strength:** Vulnerability discovery in large C/C++ codebases.
- **Real-world ground-truth (Daniel Stenberg, curl, 6 May 2026):** Mythos scanned ~178k LOC of curl. Reported 5 "confirmed" vulnerabilities → 3 false positives, 1 reclassified as a non-security bug, **1 actual low-severity CVE** (ships in curl 8.21.0 late June). Also surfaced ~20 well-described low-FP-rate non-security bugs. Stenberg's conclusion: "primarily marketing… maybe a little bit better… not a significant dent."

## Scoring against Pi-CEO swap candidates

| Target swap | Verdict | Reasoning |
|---|---|---|
| Replace claude-sonnet-4-6 as computer-use brain in `swarm/screen/hermes_dispatch.py` | 🔴 SKIP | Mythos is not generally available; even if it were, there is zero published evidence of tool-call JSON reliability. Per `[[incident-botfather-rate-limit]]`, the swarm has already been burned by JSON-as-code hallucination on llama-3.3-70b. Computer-use brain must stay on sonnet-4-6. |
| Replace qwen3.6-plus as Hermes default | 🔴 SKIP | Mythos isn't a general chat model — it's pitched as a security analysis specialist. Wrong shape for Hermes default routing. |
| Non-grounded LLM for `preamble_trainer.py` | 🔴 SKIP | Same — wrong shape, no public access, gemini-3.1-pro stays correct here. |
| Cheap fallback for Anthropic rate-limit events | 🔴 SKIP | Mythos *is* Anthropic. It does not diversify rate-limit risk. For genuine fallback see `[[gemma4-cost-strategy]]` and qwen path. |

Net: **no Pi-CEO swap is justified by this source.** The `[[quality-over-quantity]]` rule binds — Mythos is not demonstrably competitive with sonnet-4-6 on the swarm's actual reliability axis (tool-call JSON), and its claimed axis (security audit) isn't a swarm hot path.

## Architectural ideas worth absorbing (separate from the model itself)

1. **"Confidence ≠ correctness" telemetry on agent outputs.** Stenberg's 5→1 confirmed-vuln collapse rate is the exact failure mode that already bit Phill (`[[feedback-audit-verification]]`). Action: every audit-style agent output should carry a confidence score *and* a separate ground-truth verification gate before any downstream action. This belongs in `[[autonomous-sdlc.md]]` and `[[brand-guardian.md]]` as a pattern, not just a one-off.
2. **"Denial of attention" attack vector.** Stenberg's framing — slop PRs draining maintainer attention — applies directly to Pi-CEO inbox/intake. Volume of low-FP-rate findings is worse than no findings. Worth adding to `[[no-repeating-alerts]]` as a sibling principle: agents must self-suppress low-signal output.
3. **Glasswing-style staged rollout** for any future internal model swap. Phill currently swaps model pins in one shot. A "trickle to one shadow agent, observe N runs, then promote" pattern would catch JSON-reliability regressions before they hit production. Candidate page: `[[model-routing-rollout-protocol]]` (new).
4. **Pre-existing-tooling effect.** Mythos found little on curl *because curl was already well-audited.* Implication for Pi-CEO: agent-found "wins" are inflated on green-field repos and deflated on hardened ones — calibrate evaluation accordingly.

## Proposed wiki updates (do not write yet)

- **`hermes-agent.md`** — add a "Model swap discipline" subsection citing Glasswing-style staged rollout; explicit "computer-use brain stays sonnet-4-6 until tool-call-JSON benchmark passes" rule.
- **`gemma4-cost-strategy.md`** — add Mythos to the "not a fallback option" list with one-line reason (closed Anthropic model, no diversification).
- **`autonomous-sdlc.md`** — insert "confidence-vs-ground-truth gate" pattern with curl 5→1 example.
- **`no-repeating-alerts.md`** — cross-link denial-of-attention framing.
- **NEW `model-routing-rollout-protocol.md`** — staged-rollout pattern for any future swarm model pin change.
- **`index.md`** — register the new page and this research note.

## Recommendation

Do not swap any Pi-CEO model on the back of this source. Use the source as evidence to harden the *process* by which model swaps are evaluated. Action requested: approve the staged-rollout protocol page (item 5 above) so the next swap candidate (real or imagined) goes through it.

— Researcher: Mythos

# SPM Spec — Pilot Agentic Harness (Dockerized agent on the Tier-0 model lane)

> Produced by `/spm` (read-only). No code written. Scoped to the smallest end-to-end
> vertical slice that proves the blueprint's core thesis on tools we already own,
> with zero founder-blocking dependency and zero alpha-software dependency.
> Source artifacts: `docs/research/openshell-agentic-blueprint.md`,
> `tier0-model-routing-openrouter.md`, `local-agentic-harness-ornith-lmstudio.md`;
> Linear UNI-2207 (epic) / 2211 / 2212 / 2213.

## 1. Task being planned

| Field | Detail |
|---|---|
| Original request | "/plan lets now build the new spec.md I guess?" |
| Interpreted task | Produce a build-ready spec for the FIRST buildable slice of the Nexus→agentic-company initiative |
| Target outcome | One autonomous agent running in Docker isolation, completing a real "gathering" task end-to-end with inference on the Tier-0 lane (free OpenRouter → Kimi credits → local Ornith-9B), at $0 Claude-Max consumption, with a working privacy gate |
| Non-build clarification | `/spm` is read-only; this spec is the deliverable. Implementation happens only via the `/goal` command in §16 after acceptance |

## 2. Current project context

| Field | Detail |
|---|---|
| Repo | `CleanExpo/Unite-Group` (Nexus) |
| Branch | `research/openshell-agentic-blueprint` (isolated worktree) |
| Working tree state | Clean; 4 research docs committed (b1e7786); other agents merged swarm2 work into this branch cleanly (66de833) |
| Relevant systems | OpenRouter (2 keys: Hermes local + Margot prod), local M4 Mac mini (24 GB), Docker Desktop, LM Studio, Linear (work queue), `~/.hermes/.env` |
| Relevant files inspected | root `spec.md` (#554 repair spec — DO NOT clobber), `apps/empire/spec.md`, `.harness/`, `docs/research/*` |
| Existing commands/skills found | `pm-core`, `qa-lead`, `production-gate`, `opus-adversary` (skills, reusable as agent role bundles) |
| Known current behaviour | No agent fleet exists; `improve_system`/`data_ingestion` run twice-weekly, human-gated; `CLAUDE_CODE_OAUTH_TOKEN` now present in `~/.hermes/.env` (validity unconfirmed) |
| Unknowns | `provider_router.py` is NOT in this repo — `find` returned nothing → the tiered router lives in Pi-Dev-Ops (cross-repo). Tool/JSON reliability of specific `:free` slugs (must smoke-test). Whether Docker Model Runner (Desktop 4.62+) is the installed version on this machine |

## 3. Problem statement

| Field | Detail |
|---|---|
| User | Phill (founder) — wants a self-running engineering company, cost-controlled |
| Pain | Every agent turn today either burns Claude-Max rate budget or doesn't run autonomously at all; no isolated, cheap execution substrate exists |
| Current workaround | Manual Claude Code sessions on Max; no offload lane; no isolation for unattended runs |
| Business impact | Max rate ceiling is the binding constraint on fleet size (adversary: ~4–5× shortfall at 100 agents). Without a cheap Tier-0 lane, a larger fleet is unaffordable |
| Technical impact | No proven pattern for (a) isolating an unattended agent, (b) routing its inference to cheap/free/local models, (c) gating client data away from training endpoints |
| Why now | The blueprint is approved-direction; the cheapest proof-of-thesis is unblocked TODAY (no Max token, no alpha OpenShell needed) and de-risks every later phase |

## 4. Desired outcome

A single command spins up one agent inside a Docker container that: claims a defined "gathering" task, performs it using a Tier-0 model (free OpenRouter primary, Kimi-on-credits for hard cases, local Ornith-9B for overflow/confidential), writes a uniquely-named output artifact, and exits — consuming **zero** Claude-Max budget. A confidential-tagged task is correctly refused the free lane and routed local. This is the reusable unit the fleet later multiplies.

## 5. Scope

### In scope
- A minimal **agent-runner** that executes ONE agent loop inside a plain Docker container (filesystem + network isolation; deny-by-default egress except the model endpoint + the task's allowed sources).
- A minimal **tiered-router shim** (self-contained in the pilot — NOT a dependency on Pi-Dev-Ops `provider_router.py`): free OpenRouter slug → Kimi K2.6 (credits) → local Ornith-9B, with a hard **data-class privacy gate**.
- Local inference via **Docker Model Runner OR LM Studio** serving Ornith-1.0-9B (MLX/GGUF Q4), OpenAI-compatible endpoint.
- One concrete gathering task as the proof workload (e.g. "summarise N public URLs into a structured JSON brief").
- Verification harness: smoke tests proving $0 Max consumption + privacy-gate refusal.

### Out of scope
- OpenShell (UNI-2209/2210) — deferred until its credential spike passes; this pilot deliberately proves the substrate WITHOUT it.
- Multi-agent orchestration / scheduler — one agent only here; the fleet/queue comes next.
- The self-improvement loop repair (UNI-2211) — parallel independent track.
- Vercel prod deployment — local-only pilot.
- The Claude-Max lane itself — Tier-0 by definition does not touch Max.

### Explicit non-goals
- Not 100 agents. Not even 5 yet. ONE agent, proving the vertical slice.
- Not a production multi-tenant control plane.
- No client/production data in the pilot — public sources only.

### Assumptions
- Docker Desktop is installed and on a version with Model Runner (4.62+) OR LM Studio is installed. [VERIFY at build start]
- At least one OpenRouter key in `~/.hermes/.env` is live. [VERIFY]
- Ornith-1.0-9B Q4 (MLX or GGUF) can be pulled locally (~6 GB).

### Constraints
- Anthropic-first mandate: open models for low-stakes only — honoured (Tier-0 is low-stakes by definition).
- Free-tier + Kimi = PUBLIC data only (providers may train on inputs).
- OpenRouter free: ~1,000 RPD (with $10 credit) / 20 RPM, per-account global (no multi-key stacking).
- Pilot must not write to or depend on the root `spec.md` or swarm2 files (other agents' territory).

## 6. Existing capability review

| Capability | Location/source | Reusable? | Notes |
|---|---|---:|---|
| Tiered model router | Pi-Dev-Ops `provider_router.py` (cross-repo; NOT in this repo) | Partial | Eventual consolidation target; pilot builds a self-contained shim to avoid cross-repo coupling in slice 1 |
| Agent role skills | `skills/` (pm-core, qa-lead, etc.) | Yes | Become the agent's loaded skill bundle |
| Local model fit data | `docs/research/local-agentic-harness-ornith-lmstudio.md` | Yes | Ornith-9B Q4 MLX is the verified local pick |
| Model routing table | `docs/research/tier0-model-routing-openrouter.md` | Yes | Directly defines the shim's routing logic |
| Docker as isolation+runtime | UNI-2213 research (Docker Model Runner, Desktop 4.62+) | Yes | The substrate; verified to run on M4 mini |
| Linear as work queue | live (UNI team) | Yes | Source of the task unit |

## 7. Specialist board review

| Role | Finding | Risk | Recommendation |
|---|---|---|---|
| Senior Product Manager | Smallest slice that proves the cost thesis; high signal per build-hour | Low | Build — it unblocks the funding case for the fleet |
| Senior Software Architect | Self-contained shim avoids premature cross-repo coupling with Pi-Dev-Ops router; Docker isolation is mature, not alpha | Med | Keep the shim's interface compatible with the eventual `provider_router.py` contract to ease later consolidation |
| Senior UX/UI Reviewer | CLI-only; "UX" = clear logs + the output artifact + a one-line cost report | Low | Emit a per-run summary: model used, tokens, Max-consumption=0 assertion |
| Senior Security Reviewer | The privacy gate is the load-bearing control; free providers may train on inputs | **High** | Data-class gate must be fail-closed: unknown/confidential class → local-only, never free. Deny-by-default container egress |
| Senior QA/Test Lead | Must prove a NEGATIVE ($0 Max) and a refusal (confidential→local) | Med | Assert Max-endpoint received zero calls; assert confidential task never hit an OpenRouter URL |
| Devil's Advocate / Judge | Risk of gold-plating the shim into a full router | Med | Hard-cap the shim at 3 tiers + gate; defer everything else to UNI-2212 proper |

## 8. Judge challenge

| Category | Score | Notes |
|---|---:|---|
| First-source evidence | 23/25 | Routing table + local-fit + Docker capability all live-verified with citations; one unknown (installed Docker version) flagged |
| Clear user/business problem | 19/20 | Max ceiling is the proven binding constraint; this is the direct relief valve |
| Reuse of existing capability | 13/15 | Reuses skills, research, Docker, Linear; builds only the thin shim + runner |
| Security/privacy safety | 13/15 | Fail-closed data-class gate specified; residual risk = correct task-tagging discipline |
| UX clarity | 8/10 | CLI + per-run cost report; no GUI |
| Testability | 9/10 | Negative-assertion ($0 Max) + refusal test are concrete |
| Cost/control simplicity | 5/5 | Cheapest possible proof; no Max, no alpha, no cloud |

**Total: 90/100. Decision: APPROVE BUILD.** (≥85; scoped tightly, evidence-backed, de-risks the initiative.)

## 9. Proposed solution

### User flow
`<runner> run --task tasks/summarise-urls.json` → container starts → agent works → writes `out/<task-id>.json` + prints a cost report (`model=…, tokens=…, max_calls=0`) → container exits.

### System flow
1. Runner reads the task descriptor (incl. `data_class: public|confidential`).
2. Router shim selects a model by (work-type × data-class): public→free slug (fallback Kimi→local); confidential→local Ornith-9B ONLY.
3. Agent loop (skill bundle loaded) executes the task against the selected OpenAI-compatible endpoint.
4. Output written to a uniquely-named artifact (unique-artifact discipline — no shared-file collision).

### Data flow
Task descriptor → router (data-class check) → model endpoint (OpenRouter `https://openrouter.ai/api/v1` OR local `http://host.docker.internal:1234/v1`) → response → artifact. **No client data in the pilot.**

### Permission flow
Container runs unprivileged; egress deny-by-default allowing only the chosen model endpoint host + the task's declared source hosts. OpenRouter key injected as env var (never written to image/disk layer).

### Failure flow
Free slug 429/unavailable → fallback to next tier (Kimi, then local). Local model down → task fails loud (no silent Max fallback — Max is not in the allowlist). Confidential task with no local model available → REFUSE, exit non-zero.

### Rollback path
Pilot is additive and self-contained in a new directory; `git revert` the commit / `docker rmi` the image. Zero impact on existing Nexus or other agents' branches.

## 10. UX requirements
- Single CLI entrypoint with `run --task <file>`.
- Per-run report: selected model, tier, token counts, explicit `claude_max_calls=0` assertion, artifact path.
- Logs name the data-class decision ("public→openrouter:gpt-oss-120b:free" / "confidential→local:ornith-9b").

## 11. Technical requirements
- Plain Docker container (Linux); unprivileged user; deny-by-default egress (allowlist host).
- Router shim: 3 tiers + fail-closed data-class gate; interface kept compatible with the future Pi-Dev-Ops `provider_router.py` contract.
- OpenAI-compatible client; configurable `base_url` (OpenRouter / local).
- Local model: Ornith-1.0-9B Q4 via Docker Model Runner or LM Studio; context capped ≤32K.
- Secrets via env injection only; `.env` not baked into the image.
- New code under a dedicated dir (e.g. `apps/harness-pilot/` or `tools/harness-pilot/` — builder picks, must not touch root `spec.md`/swarm2).

## 12. Security and privacy requirements
- **Fail-closed data-class gate**: any task not explicitly `data_class: public` is treated as confidential → local-only. Unknown class never reaches a free/Kimi endpoint.
- Container egress allowlist; no wildcard outbound.
- OpenRouter account configured with "allow providers that may train" OFF for free models; ZDR filter on for any non-public path (documented even though pilot is public-only).
- No client/proprietary data in the pilot corpus — enforced by task descriptors using public URLs only.
- Secrets never in image layers, logs, or the output artifact.

## 13. Verification plan

### Static checks
- Lint/typecheck the runner + shim. Confirm no Anthropic/Max endpoint in the egress allowlist.

### Unit tests
- Router shim: `public` → free slug; `confidential`/`unknown` → local only; free-tier 429 → Kimi → local fallback order; **assert no branch ever returns a Claude-Max endpoint.**

### Integration tests
- Run the summarise-URLs task end-to-end against a free slug; assert structured JSON output.
- Run a `confidential`-tagged task; assert it routes to local and never emits an OpenRouter request (capture egress).

### UI/browser verification
- N/A (CLI). Cost-report output inspected instead.

### Smoke tests
- Real run on the M4 mini: free-slug path produces an artifact; local Ornith-9B path produces an artifact; both report `claude_max_calls=0`.

### Manual review
- Inspect container egress logs to confirm deny-by-default held.

### Evidence required before declaring done
- Captured logs showing model selection per data-class.
- Egress capture proving zero Max calls and confidential→local containment.
- The two output artifacts.

## 14. Loop testing and stress testing
- Run the gathering task 30× in a loop; confirm free-tier RPM/RPD handling (graceful fallback at the 20 RPM ceiling, no crash).
- Inject a forced free-tier outage; confirm Kimi→local fallback chain holds.
- Inject a malformed/oversized source; confirm the agent fails loud, not silent, and never escalates to Max.

## 15. Acceptance criteria
- [ ] One Docker-isolated agent completes the summarise-URLs task end-to-end, producing valid structured JSON.
- [ ] Run report asserts `claude_max_calls=0`, verified by egress capture.
- [ ] A `confidential`-tagged task routes to local Ornith-9B and provably never contacts OpenRouter.
- [ ] Fallback chain (free → Kimi → local) demonstrably triggers under a forced free-tier failure.
- [ ] Container runs unprivileged with deny-by-default egress; Max endpoint not in allowlist.
- [ ] All new code is self-contained in its own dir; root `spec.md` and swarm2 files untouched; branch isolated.
- [ ] Router shim interface documented as compatible with the future `provider_router.py` contract.

## 16. Goal command

```text
/goal Build the Pilot Agentic Harness per docs/research/spec-agentic-harness-pilot.md.
Deliver, in a new self-contained dir (do NOT touch root spec.md or swarm2 files), on branch
research/openshell-agentic-blueprint:
1) a Docker-isolated agent-runner (unprivileged, deny-by-default egress allowlisting only the
   chosen model endpoint + declared task sources; Max endpoint MUST NOT be allowlisted);
2) a 3-tier router shim with a FAIL-CLOSED data-class gate (public→OpenRouter free slug, fallback
   Kimi K2.6→local Ornith-9B; confidential/unknown→local Ornith-9B ONLY), interface kept
   compatible with the future Pi-Dev-Ops provider_router.py contract;
3) local inference via Docker Model Runner or LM Studio serving Ornith-1.0-9B Q4 (context ≤32K);
4) one proof task (summarise N public URLs → structured JSON).
Success = all §15 acceptance criteria pass, with captured evidence: model-selection logs, egress
capture proving claude_max_calls=0 and confidential→local containment, and the output artifacts.
Loop the summarise task 30× and force a free-tier outage to prove the fallback chain. Secrets via
env only; no secrets in image layers/logs/artifacts. Stop and report if Docker Model Runner/LM
Studio or a live OpenRouter key is unavailable (verify these FIRST).
```

## 17. Implementation sequence
1. **Verify prerequisites** (FIRST, fail fast): Docker Model Runner version OR LM Studio present; ≥1 live OpenRouter key; Ornith-9B Q4 pullable.
2. Scaffold the runner + router shim (unit-test the shim's routing/gate before any container work).
3. Build the Docker image (unprivileged, egress allowlist).
4. Wire local inference (Model Runner/LM Studio) + OpenRouter free slug.
5. Implement the proof task + artifact writer (unique-named).
6. Integration + smoke + loop/stress tests; capture evidence.
7. Document the shim↔provider_router.py contract; update UNI-2212/2213 with results.

## 18. Session handoff seed
- **Branch:** `research/openshell-agentic-blueprint` (worktree `.claude/worktrees/isolated-task`).
- **Spec:** `docs/research/spec-agentic-harness-pilot.md` (this file).
- **Tickets:** UNI-2207 epic; this spec implements the buildable intersection of UNI-2212 (router/Tier-0) + UNI-2213 (Docker substrate). UNI-2208 (Max token) and UNI-2209/2210 (OpenShell) are NOT prerequisites for this pilot.
- **Key facts:** OpenRouter free = ~1000 RPD/$10-credit, 20 RPM, no multi-key stacking; Ornith-9B Q4 MLX is the local pick; `provider_router.py` is cross-repo (Pi-Dev-Ops), so slice 1 uses a self-contained shim.
- **Do-not-touch:** root `spec.md`, `apps/workspace/**/swarm2*` (other agents).
- **Next safe action after build:** wire a second agent + the durable queue (fleet slice).

## 19. Final recommendation
**APPROVE BUILD (90/100).** This is the cheapest, fastest, lowest-risk proof of the entire blueprint thesis: it runs on tools we already own (Docker, OpenRouter, local Ornith-9B), needs neither the Max service token nor the alpha OpenShell runtime, and produces hard evidence that an isolated agent can do real work at $0 Max cost with client-data safety. It directly de-risks the two biggest unknowns (cost inversion + isolation) before any larger commitment. Build it as a self-contained pilot, keep the router-shim interface forward-compatible with `provider_router.py`, and let the fleet/queue and OpenShell layers bolt on once the slice is proven.

---

SPM spec complete. Next safe action: run the §16 `/goal` command on this branch to build the pilot (after verifying Docker Model Runner/LM Studio + a live OpenRouter key).

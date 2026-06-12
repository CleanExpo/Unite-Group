# Hermes v0.15.x Capability Assessment for Unite-Group

**Date:** 2026-06-02  
**Assessor:** Hermes Sub-Agent (Pi-Dev-Ops delegation)  
**Hermes Version:** v0.15.1 (2026.5.29) on macOS arm64  
**Scope:** DR readiness, productivity, AU/NZ market strategy alignment  
**Sources:** RELEASE_v0.15.0.md (1,302 commits), RELEASE_v0.15.1.md (hotfix), pi-dev-ops profile config, cron/jobs.py, kanban-orchestrator skill

---

## EXECUTIVE SUMMARY

| # | Capability | Verdict | Effort | Priority |
|---|-----------|---------|--------|----------|
| 1 | Kanban multi-agent platform | **ADOPT** | 12-16h | HIGH |
| 2 | Bitwarden Secrets Manager | **INVESTIGATE** | 6-8h | MEDIUM |
| 3 | Session search (free, instant) | **ADOPT** | 1-2h | HIGH |
| 4 | Cron improvements (context_from, no_agent, workdir) | **ADOPT** | 4-6h | HIGH |
| 5 | ntfy messaging | **DEFER** | 3-4h | LOW |
| 6 | Promptware/Brainworm defense | **ADOPT** (built-in) | 0h | CRITICAL |
| 7 | Skill bundles | **ADOPT** | 8-12h | MEDIUM |
| 8 | Cold-start performance | **ADOPT** (built-in) | 0h | HIGH |

---

## 1. KANBAN MULTI-AGENT PLATFORM

### Capabilities Found (v0.15.0 — 104 PRs)

- **Auto-decomposition on triage:** Orchestrator splits one task into a tree of sub-tasks automatically
- **Swarm topology helper:** `hermes kanban swarm` creates a full Swarm v1 graph (root + parallel workers + gated verifier + gated synthesizer + shared blackboard) in one command
- **Per-task model override:** Use cheap models for boilerplate, expensive ones for hard sub-tasks
- **Board-level default workdir:** All tasks default to a workspace path (e.g., `~/Unite-Group`)
- **Per-task worktree paths and branches:** Each task can operate in its own git branch
- **Scheduled task start times:** Delay task startup to a specific time
- **Configurable claim TTL:** Worker can't hold a task forever
- **Retry fingerprinting + stale-task detection + respawn guards:** Workers that crash don't cause infinite retry storms
- **Worker visibility endpoints:** `/workers/active`, `/runs/{id}`, `/inspect`
- **`max_in_progress` cap:** Limit concurrent running tasks
- **Goal-mode workers:** Multi-turn Ralph-style loops for tasks that need iteration
- **Recovery actions:** Reclaim, Reassign, Change model for stuck workers

### Applicability to Unite-Group

| Use Case | Fit | Notes |
|----------|-----|-------|
| **DR Monitoring Swarm** | HIGH | `hermes kanban swarm` could orchestrate: root (DR coordinator) → parallel health-check workers (Supabase, Vercel, Stripe, Railway) → gated verifier → synthesizer reporting to Telegram. The gated verifier pattern prevents false alarms. |
| **Content Pipeline Workers** (Synthex) | HIGH | Fan-out: topic-research → content-draft → compliance-review → publish. Per-task model overrides let drafting use gpt-5.5 while compliance uses a cheaper model. |
| **NRPG Contractor Coordination** | MEDIUM | Goal-mode workers could handle multi-step contractor onboarding flows. But: board constraints say "no new vendors without approval" — this is internal orchestration, not vendor introduction, so it's allowed. |
| **47 DR Gap Remediation** | HIGH | The 47 findings from dr-validation-gap-analysis.md can be decomposed into parallel remediation tracks: factual-error fixes, risk-scenario additions, compliance gap closures. Fan-out for speed. |

### Swarm Topology Features Useful for Unite-Group

1. **Parallel health-check workers** — Each service (Supabase, Vercel, GitHub, Stripe) gets its own worker running a `no_agent` health probe. The verifier aggregates results.
2. **Blackboard pattern** — Shared state across workers (e.g., current status of all monitored services) avoids redundant checks.
3. **Gated synthesizer** — Final report only generated after all workers report, preventing partial DR status messages.

### Pi-Dev-Ops Profile — Already Configured

The profile already has kanban configured:
```yaml
kanban:
  dispatch_in_gateway: true
  dispatch_interval_seconds: 60
  failure_limit: 2
  auto_decompose: true
  auto_decompose_per_tick: 3
  default_assignee: pi-dev-ops
  orchestrator_profile: default
```

### Implementation Effort: 12-16 hours

- 2h: Design DR monitoring swarm topology (root + 5 service workers + verifier + synthesizer)
- 4h: Build NRPG onboarding task templates
- 4h: Wire Synthex content pipeline into kanban tasks
- 2h: Test swarm failure/stale-detection scenarios
- 2h: Dashboard configuration and cross-profile notification delivery

### Recommendation: **ADOPT** — HIGH PRIORITY

The kanban platform is production-grade (104 PRs, 28K+ lines changed). The swarm topology directly maps to Unite-Group's DR monitoring and content pipeline needs. The pi-dev-ops profile already has kanban config — this is an unlock, not a new install.

---

## 2. BITWARDEN SECRETS MANAGER

### Capabilities Found (v0.15.0)

- **One bootstrap token (`BWS_ACCESS_TOKEN`) replaces all per-provider API keys** in `~/.hermes/.env`
- **Lazy `bws` install:** `bws` CLI auto-installs on first use
- **Source-of-truth semantics:** Bitwarden values overwrite matching env vars on startup (configurable via `secrets.bitwarden.override_existing: false`)
- **Credential source labeling:** Detected keys are tagged with their source (Bitwarden vs local env)
- **EU Cloud + self-hosted Bitwarden:** Supports any Bitwarden server URL
- **Hot rotation:** Rotate a key in Bitwarden web app → Hermes picks it up on next startup

### Current State at Unite-Group

Pi-Dev-Ops config has Bitwarden **disabled**:
```yaml
secrets:
  bitwarden:
    enabled: false
    access_token_env: BWS_ACCESS_TOKEN
```

Current key sprawl (from context): ~12 API keys split across `.env.local` + 1Password + Vercel envs.

### Applicability to Unite-Group

| Concern | Assessment |
|---------|------------|
| **Consolidation benefit** | HIGH — Single source of truth for all 12+ keys eliminates drift between .env.local, 1Password vault, and Vercel env vars |
| **Board constraints** | CAUTION — Bitwarden is a NEW vendor. Board rule: "no new vendors without approval." Must get explicit board sign-off before migrating. |
| **1Password overlap** | 1Password is already a sanctioned vendor for Unite-Group-Infrastructure vault. Bitwarden SM is a different product. |
| **AU/NZ hosting** | Bitwarden EU Cloud is available; no AU-specific region. Self-hosted option exists if data sovereignty matters. |

### Migration Path (if approved)

1. Create Bitwarden Secrets Manager organization (or use self-hosted)
2. Migrate all 12 API keys into Bitwarden vault organized by environment
3. Set `BWS_ACCESS_TOKEN` in pi-dev-ops `.env` (single bootstrap token)
4. Enable `secrets.bitwarden.enabled: true` in config.yaml
5. Verify all keys resolve with correct source labels
6. Decommission plaintext keys from `.env.local` (keep 1Password as emergency backup vault)
7. Vercel envs stay separate (Vercel manages its own deployment secrets)

### Implementation Effort: 6-8 hours

- 2h: Board approval process and vendor risk assessment
- 2h: Bitwarden organization setup + key migration
- 1h: Hermes config changes + testing
- 1h: Documentation of new secret retrieval flow
- 1h: Emergency access planning (what if Bitwarden goes down?)

### Recommendation: **INVESTIGATE** — MEDIUM PRIORITY

The consolidation benefit is real, but this introduces a new vendor that conflicts with board constraints. Recommend: (a) present the business case to the board, (b) if approved, migrate. If not approved, the existing 1Password + .env.local + Vercel pattern is manageable but requires discipline.

---

## 3. SESSION SEARCH (Free, Instant)

### Capabilities Found (v0.15.0)

- **Completely rebuilt** — no LLM, no cost, 4,500× faster
- **Three modes auto-inferred:** discovery (~20ms), scroll (~1ms), browse
- **No aux-LLM call:** Old version cost ~$0.30/query and took ~30s; new version is free
- **FTS5-backed:** Full-text search on the SQLite state.db
- **No confabulation:** Old version hallucinated when the right session wasn't in FTS5 results

### Current State

- **Default profile state.db:** 2,819 sessions (confirmed via `sqlite3`)
- **Pi-Dev-Ops state.db:** 1 session (minimal history)
- DR investigations involve searching past sessions for precedent/patterns

### Applicability to Unite-Group

| Use Case | Fit | Notes |
|----------|-----|-------|
| **DR investigation context** | HIGH | During incident response, search 2,819 past sessions for "supabase backup", "vercel deploy failure", "credential rotation" — instant recall of prior resolutions |
| **Manual compaction replacement** | PARTIAL | Session search finds relevant past sessions but doesn't compact/compress. For long-running DR sessions, still need the built-in compressor (already enabled in pi-dev-ops config at 0.5 threshold) |
| **Cross-session knowledge** | HIGH | Synthex content patterns, NRPG contractor decisions, past board discussions — all become searchable context |

### Limitations vs. Manual Context Compaction

Session search **complements but does not replace** manual compaction:
- It finds related past sessions but doesn't reduce context window pressure
- The pi-dev-ops profile already has `compression.enabled: true` with `threshold: 0.5`
- For DR investigations spanning multiple active incidents, session search retrieves prior context while compaction manages current session length

### Implementation Effort: 1-2 hours

- Already available and active (zero config needed for the default profile)
- 1h: Train on the three-mode interface (discovery/scroll/browse)
- 1h: Document common DR query patterns as reference

### Recommendation: **ADOPT** — HIGH PRIORITY

Zero effort, zero cost, immediate benefit. The 2,819-session history from the default profile becomes instantly searchable for DR investigations. No manual context compaction is needed to retrieve prior incident context.

---

## 4. CRON JOB IMPROVEMENTS

### Capabilities Found (v0.15.0)

From `cron/jobs.py` `create_job()` signature:

```python
create_job(
    prompt, schedule, name, repeat, skills, model, provider, base_url,
    script,              # shell/Python script path for no_agent mode
    context_from,        # inject output from other cron jobs as context
    enabled_toolsets,    # restrict tool capabilities
    workdir,             # absolute path CWD for the job
    profile,             # per-job profile selection
    no_agent,            # script-only execution, no LLM
)
```

**Key new capabilities:**

1. **`context_from`** — Chain job outputs: Job B receives Job A's latest output as its prompt context. Enables multi-step pipelines.
2. **`no_agent`** — Run a shell/Python script on a timer with stdout sent to Telegram. No LLM cost. Classic watchdog pattern.
3. **`workdir`** — Absolute path working directory for the job (cron jobs are detached, no shell cwd).
4. **`profile`** — Per-job profile support: route different cron jobs to different Hermes profiles.
5. **`script`** — Shell or Python script execution (not just LLM prompts).

### Applicability to Unite-Group

| Cron Job | Implementation | Config |
|----------|---------------|--------|
| **DR Health Check (every 5min)** | `no_agent=True` + `script: ~/Unite-Group/scripts/dr-health-probe.sh` | Shell script pings Supabase, Vercel, Stripe status endpoints. Non-zero exit → Telegram alert. Zero LLM cost. |
| **Weekly Backup Validation (Sunday 2AM)** | `context_from` chain: Job 1 (no_agent) runs `supabase-backup-verify.sh`, Job 2 (agent) reads Job 1's output and writes a structured report | `schedule: "0 2 * * 0"`, `workdir: ~/Unite-Group` |
| **NRPG Status Report (Friday 4PM)** | Agent job with skills, reads Linear/GitHub for contractor activity, generates weekly summary | `schedule: "0 16 * * 5"`, `profile: "pi-dev-ops"`, `workdir: ~/Unite-Group` |
| **Synthex Content Audit (daily)** | `context_from` from overnight generation job → morning review job → Telegram digest | Pipeline of 3 chained jobs |

### Example: DR Health Check Chain

```
Job 1: dr-probe (no_agent, every 5m)
  script: ~/Unite-Group/scripts/dr-health-probe.sh
  workdir: ~/Unite-Group
  
Job 2: dr-reporter (agent, triggers on Job 1 failure)
  prompt: "Analyze the health probe output and classify severity..."
  context_from: [job1_id]
  profile: pi-dev-ops
  → Telegram alert on P0/P1 only
```

### Current Pi-Dev-Ops Cron Config

```yaml
cron:
  wrap_response: true
  max_parallel_jobs: null
```

Approval mode is `cron_mode: deny` — cron jobs cannot auto-approve destructive operations. This is correct for DR.

### Implementation Effort: 4-6 hours

- 2h: Write `dr-health-probe.sh` script (ping all services, structured JSON output)
- 1h: Set up the no_agent + context_from chain for DR monitoring
- 1h: Create weekly backup validation cron job
- 1h: Create NRPG status report cron job
- 1h: Test alert delivery via Telegram

### Recommendation: **ADOPT** — HIGH PRIORITY

The `no_agent` mode is a killer feature for DR health checks — zero LLM cost for continuous monitoring, with agent analysis only on failures. The `context_from` chaining enables proper pipeline patterns without manual plumbing. The `workdir` support means jobs operate in the correct repo context.

---

## 5. NTFY MESSAGING

### Capabilities Found (v0.15.0)

- **23rd messaging platform** — Hermes gateway plugin
- **Self-hostable** with no signup, no API key, just a topic URL
- **Push notifications** to phone, watch, desktop, homelab
- **Zero core edits** — clean plugin shape
- **Use from any context:** cron jobs, kanban task completion, chat `send_message`

### Applicability to Unite-Group

| Concern | Assessment |
|---------|------------|
| **Cost vs Telegram** | Telegram is already free. ntfy self-hosted is also free. No cost difference. |
| **Reliability for DR alerts** | ntfy is simpler (no bot API, no webhook chains) but Telegram has better SLA guarantees for delivery. |
| **Board constraints** | "Use existing GitHub/Linear/Supabase/Railway/Vercel/Telegram/Google integrations only." ntfy is a NEW integration. |
| **Self-hosting burden** | Running another service is operational overhead. Telegram is hosted. |
| **Multi-platform reach** | ntfy can push to Android/iOS/Desktop simultaneously. Telegram already covers mobile+desktop. |

### When ntfy Would Make Sense

- If Unite-Group wants a **backup notification channel** independent of Telegram (Telegram outage → no DR alerts)
- If self-hosting is a compliance requirement for AU data sovereignty
- If non-Telegram stakeholders need alerts without Telegram accounts

### Implementation Effort: 3-4 hours

- 1h: Deploy ntfy server (Docker) or use ntfy.sh public instance
- 1h: Configure Hermes gateway plugin
- 1h: Test delivery and routing
- 1h: Document dual-channel alert strategy

### Recommendation: **DEFER** — LOW PRIORITY

Telegram already satisfies the notification requirement and is a board-approved integration. ntfy adds redundancy but introduces a new service to manage. Defer until: (a) board explicitly requests multi-channel DR alerts, or (b) Telegram reliability becomes a concern.

---

## 6. PROMPTWARE/BRAINWORM DEFENSE

### Capabilities Found (v0.15.0)

Three-layer defense inspired by Brainworm/Promptware Kill Chain research:

1. **Shared threat patterns** (`tools/threat_patterns.py`) — ~15 Brainworm/C2 injection patterns detected
2. **Memory scan at load time** — Recalled memories are scanned for injection attempts before entering context
3. **Tool-result delimiter markers** — Malicious files or remote services can't impersonate Hermes' own system content
4. **`security-guidance` bundled plugin** — Pattern-matches dangerous code writes
5. **Skills Guard** — Multi-word prompt pattern detection in skill content
6. **Control-plane file protection** — `auth.json`, `config.yaml`, `webhook_subscriptions.json` protected from prompt injection writes
7. **Credential safety** — Runtime env-sourced keys don't leak into `auth.json`

### Applicability to Unite-Group

| Surface | Risk | Defense Coverage |
|---------|------|------------------|
| **Synthex content pipeline** | HIGH — Generates content from external sources (client briefs, competitor analysis, web scraping). Malicious input could inject instructions into the generation prompt. | Memory scan + tool-result delimiters protect against recall-based injection. |
| **Public-facing AI tools** (future) | HIGH — If Synthex exposes any customer-facing AI (e.g., chatbot on CCW website), user input is an injection vector. | Brainworm patterns catch common C2/exfiltration attempts. |
| **Kanban worker tasks** | MEDIUM — Workers reading from blackboards or external task bodies could receive injected content. | Tool-result delimiters isolate external content. |
| **Cron job `context_from`** | LOW — Only reads past job output (trusted internal data). | Still protected by threat pattern scanning. |

### Zero-Configuration Protection

All of this is **built-in and active by default** in v0.15.1. The pi-dev-ops profile already has:
```yaml
security:
  tirith_enabled: true        # supply-chain audit
  redact_secrets: true         # output redaction
  allow_private_urls: false    # SSRF prevention
```

### Implementation Effort: 0 hours (built-in)

Already active. No configuration changes needed. To verify:
- The `security-guidance` plugin is bundled and auto-loaded
- `tirith_enabled: true` is already set
- The threat patterns file ships with the install

### Recommendation: **ADOPT** (built-in) — CRITICAL PRIORITY

This is already protecting Unite-Group's Hermes sessions. No action needed beyond awareness. For Synthex specifically, when building customer-facing AI interfaces, the tool-result delimiters and memory scanning provide defense-in-depth. Recommend adding a Synthex-specific prompt injection test suite referencing the Brainworm patterns.

---

## 7. SKILL BUNDLES

### Capabilities Found (v0.15.0)

- **Skill bundles:** Named groups of skills loaded together with one slash command
- **Example:** `/writing-day` activates humanizer + ideation + obsidian + youtube-content together
- **Skills Hub:** Health checks, freshness badge, watchdog cron
- **Full catalog:** 19,932 entries (v0.15.1 expanded from 858)

### Available Skills on Pi-Dev-Ops Profile

Current installed skills include:
- `software-development/` — test-driven-development, systematic-debugging, subagent-driven-development, plan, spike, writing-plans, hermes-agent-skill-authoring
- `devops/` — kanban-orchestrator, kanban-worker, hermes-s6-container-supervision
- `productivity/` — google-workspace, maps
- `email/` — himalaya
- `social-media/` — xurl
- `autonomous-ai-agents/` — hermes-agent
- `apple/` — apple-reminders

### Recommended Skill Bundles for Unite-Group

#### Bundle 1: "DR Response" (`/dr-response`)
Skills: `systematic-debugging` + `kanban-orchestrator` + `kanban-worker` + `plan`

**Purpose:** When a P0/P1 incident fires, load this bundle for structured incident response:
1. `systematic-debugging` guides root-cause analysis
2. `plan` structures the response into phases
3. `kanban-orchestrator` fans out parallel workers for service health checks
4. `kanban-worker` handles individual remediation tasks

#### Bundle 2: "Content Pipeline" (`/content-pipeline`)
Skills: `writing-plans` + `hermes-agent-skill-authoring` (for custom Synthex skills) + new `web-pentest` (to validate scraped content)

**Purpose:** Synthex content generation sessions — structured writing plans, custom skill creation for content-specific workflows, security scanning of external content.

#### Bundle 3: "NRPG Ops" (`/nrpg-ops`)
Skills: `kanban-orchestrator` + `plan` + `google-workspace` + `apple-reminders`

**Purpose:** NRPG contractor coordination — decomposing onboarding tasks, scheduling via Google Calendar, tracking follow-ups via Apple Reminders.

#### Bundle 4: "Board Prep" (`/board-prep`)
Skills: `research-paper-writing` + `plan` + `writing-plans` + `xurl` (social listening)

**Purpose:** Structured board document preparation — research, planning, writing, and social media intelligence gathering.

### Implementation Effort: 8-12 hours

- 2h: Define skill bundle YAML configs in pi-dev-ops skills directory
- 3h: Create custom Synthex-specific skills (content pipeline workflows)
- 3h: Create DR-specific custom skills (incident response templates, runbook cross-references)
- 2h: Test bundle loading and verify skill interactions
- 2h: Document bundle usage and train users

### Recommendation: **ADOPT** — MEDIUM PRIORITY

Skill bundles reduce context-switching overhead and standardize workflows. The "DR Response" bundle directly addresses the 47 gaps identified in the gap analysis by structuring the response process. Medium priority because the skills are additive — they enhance existing workflows rather than enabling new capabilities.

---

## 8. COLD-START PERFORMANCE

### Capabilities Found (v0.15.0)

Cumulative cold-start improvements:
- **`openai._base_client` import deferred:** -240ms / -17MB per CLI invocation
- **Compression-feasibility check deferred:** -170 to -290ms per agent construction
- **Adaptive subprocess polling:** -195ms per tool call, 1+ second per turn
- **Preload `jiter` native parser:** Faster JSON parsing
- **`hermes --version` cold start:** 63% faster (701ms → 258ms)
- **Termux cold start:** 2.9s → 0.8s (72% faster)

### Applicability to Pi-Dev-Ops Agent

The Pi-Dev-Ops profile uses `openai-codex` provider (gpt-5.5). Cold-start improvements directly affect:

| Scenario | Before v0.15 | After v0.15 | Impact |
|----------|--------------|-------------|--------|
| **DR incident response** | ~2.5s to first tool call | ~1.5s to first tool call | 1 second faster in P0 response |
| **Cron job startup** | Each scheduled job pays the full import cost | Deferred imports halve the latency | More responsive monitoring |
| **Kanban worker spawn** | Each worker inherits cold-start penalty | Faster worker dispatch | Swarms start faster |
| **Per-turn latency** | 195ms polling overhead per tool call | Eliminated | Smoother interactive sessions |

### Implementation Effort: 0 hours (built-in)

Already active in v0.15.1. No configuration needed.

### Recommendation: **ADOPT** (built-in) — HIGH PRIORITY

The performance improvements are already realized. The Pi-Dev-Ops agent (gpt-5.5 via Codex) benefits significantly from the deferred import strategy — particularly for cron jobs and kanban workers that spawn frequently.

---

## CROSS-CUTTING: AU/NZ MARKET STRATEGY ALIGNMENT

| Capability | AU/NZ Relevance |
|-----------|-----------------|
| **Bitwarden** | EU Cloud available, no AU-specific region. Self-hosted option for AU data sovereignty. |
| **ntfy** | Self-hostable on AU infrastructure for data residency compliance. |
| **Kanban** | Timezone-aware scheduling for AU business hours. Scheduled task start times support AU-only operating windows. |
| **Cron** | `workdir` enables AU-local repo operations without path ambiguity. |
| **Security** | Promptware defense + control-plane protection align with Australian Privacy Principles (APPs) for handling AI-generated content containing PII. |

---

## IMPLEMENTATION ROADMAP (Recommended Order)

### Phase 1: Immediate (Week 1) — 5-8h
1. ✅ **Session search** — Start using discovery/scroll/browse modes for DR context retrieval (1h)
2. ✅ **Promptware defense awareness** — Confirm protections are active for Synthex (0h)
3. ✅ **Cold-start perf** — Already realized, no action (0h)
4. 📝 **DR Health Check cron** — Write `dr-health-probe.sh` + `no_agent` cron job (4h)

### Phase 2: Short-term (Weeks 2-3) — 16-22h
5. 🔧 **Kanban DR monitoring swarm** — Design and deploy the multi-agent health monitoring topology (12h)
6. 🔧 **Weekly backup validation cron** — `context_from` chain for Supabase backup integrity checks (4h)
7. 🔧 **NRPG status report cron** — Weekly automated contractor activity summary (2h)

### Phase 3: Medium-term (Weeks 4-6) — 14-20h
8. 🎯 **Skill bundles** — Define and create the 4 recommended bundles (8h)
9. 🎯 **Synthex content pipeline kanban** — Wire content generation into kanban task flow (6h)
10. 🎯 **Board approval for Bitwarden** — Present business case (2h prep + TBD for approval cycle)

### Phase 4: Deferred
11. ⏸ **ntfy backup channel** — Only if board requests multi-channel DR alerts (4h)
12. ⏸ **Bitwarden migration** — Only after board approval (6h)

---

## RISK REGISTER

| Risk | Mitigation |
|------|------------|
| Kanban swarm workers consuming too many concurrent sessions | `max_in_progress` cap already available (currently unconfigured) |
| `no_agent` cron script failures going undetected | Chain to agent-based reporter job via `context_from` |
| Bitwarden vendor lock-in | Keep 1Password as emergency fallback vault |
| Skill bundle conflicts | Test bundles in isolation before combining |
| `hermes kanban swarm` complexity for non-technical staff | Document simple task creation patterns; keep swarms for orchestrator profile only |

---

## APPENDIX: Key Config Changes Needed

```yaml
# pi-dev-ops/config.yaml additions

# Phase 1: Enable session search (already active, no change needed)

# Phase 2: Kanban tuning (already partially configured)
kanban:
  max_in_progress: 5  # Add this - cap concurrent workers

# Phase 3: If Bitwarden approved
secrets:
  bitwarden:
    enabled: true
    access_token_env: BWS_ACCESS_TOKEN
    override_existing: true
```

---

*Report generated by Hermes sub-agent via Pi-Dev-Ops delegation (qwen3.7-max on OpenRouter)*  
*Hermes v0.15.1 installed at ~/.hermes/hermes-agent/ on macOS arm64*  
*Context: 2,819 default-profile sessions | 1 pi-dev-ops session | 803-line DR runbook | 47 gap findings*

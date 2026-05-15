---
type: wiki
updated: 2026-05-11
---

# Hermes Cron Agent-Sprinkle Audit (2026-05-11)

Audit-only pass against `Pi-CEO/Pi-Dev-Ops/.harness/cron-triggers.json` looking for Cal Rueb / Applied AI-style "sprinkle in agent" embedding points — small scoped Claude calls placed inside an existing automation script. Pattern reference: [[claude-code-guide]] § Anthropic-Internal Patterns. No implementation in this pass.

## 1. Actual cron count

**27 entries** in `cron-triggers.json` (memory `project_hermes_mcp_state.md` said 19 — stale by 8 entries). Of those: 26 enabled, 1 disabled (`discovery-restoreassist`, gated pending 48h proof). Five entries share the `scan` type, four share `monitor`, two share `scout`, two share `meta_curator`, two share `feedback_loop`, two share `portfolio_pulse` — so only **13 distinct handler functions** dispatch off `_fire_trigger` in `app/server/cron_triggers.py:366`.

## 2. Top-5 ranked embedding points

Leverage rank uses: (a) signal density of raw output, (b) human attention currently spent reading it, (c) marginal token cost.

### 1. `scan-high-*` (4 × daily) → Triage commentary on critical findings

- **Current behavior:** `_fire_scan_trigger` (`app/server/cron_triggers.py:160`) runs `ProjectScanner.scan_all()`, then `TriageEngine.triage_all()` creates Linear tickets one-per-finding. Today: 27,000+ scan rows/quarter; ticket titles are templated and frequently noisy.
- **Embedding point:** `app/server/triage.py` immediately AFTER `_severity == "critical"` is set, BEFORE `LinearClient.create_issue()`. Pass the finding + the 5 surrounding lines of the scanner's raw output; ask Claude for a 1-line operator-friendly title + a "real or false-positive" verdict. Suppress ticket if verdict=false_positive AND confidence>=0.9.
- **Prompt shape (3 lines):**
  ```
  You are triaging a Pi-SEO scanner finding for {project}. Raw rule: {rule_id}.
  Snippet: {code_excerpt}. Output JSON: {title, real|false_positive, confidence, one_line_rationale}.
  Be ruthless — Linear is already over-quota. False positives cost us more than missed criticals.
  ```
- **Cost:** ~400 in / 80 out tokens × ~30 criticals/run × 4 runs/day = 48 calls/day ≈ $0.04/day on Haiku. Trivial.
- **Failure mode:** If Claude rate-limited or returns garbage JSON, fall through to the existing template path (current behavior). No new failure surface.

### 2. `feedback-loop-daily-1200` & `feedback-loop-monthly` → Pattern-naming on shipped features

- **Current behavior:** `feedback_loop.py` (`app/server/agents/feedback_loop.py:36`) uses a frozen keyword set (`_POSITIVE_KEYWORDS` / `_NEGATIVE_KEYWORDS`) to score Linear comments on shipped features. Pure string matching — misses everything indirect ("client called Toby furious", "had to refactor twice").
- **Embedding point:** Inside `_classify_outcome()` (the keyword-match function in `feedback_loop.py`), after the keyword vote, escalate `outcome_signal == "neutral"` cases to Claude with the full comment thread. Returns positive | negative | neutral + a 1-sentence pattern label.
- **Prompt shape:**
  ```
  This feature shipped {N} days ago. Read the Linear thread below and classify the outcome:
  positive | negative | neutral. If positive or negative, name the pattern in <=8 words
  (e.g. "client used it immediately", "regressed two releases later").
  ```
- **Cost:** ~1500 in / 50 out × ~20 neutral cases/run × 1 run/day ≈ $0.10/day on Sonnet 4.7. The monthly run dominates: ~200 features at ~$1.
- **Failure mode:** Fall back to current keyword classification; flag as `confidence=low` for the operator.

### 3. `portfolio-pulse-daily` (and Fri weekly recap) → BOARD-TRIGGER detection sharpened

- **Current behavior:** `swarm/portfolio_pulse_synthesis.py:36` already calls a top-tier LLM for the 200-400 word executive summary AND emits `[BOARD-TRIGGER score=N topic="..."]` sentinels via prompt. **Partially using Claude already.** Issue: the sentinel emission is brittle (model decides whether to emit). Misses many real board-worthy findings (only ~1 per week vs reality of ~3-4).
- **Embedding point:** Add a SECOND, deterministic Claude pass AFTER the synthesis at `portfolio_pulse_synthesis.py:_call_llm()` returns. Tight extractive prompt: "Given this synthesis and the per-project digests, list 0-N board-trigger candidates with scores. Output JSON only." This separates synthesis (creative) from extraction (structured), which the model handles much better as two passes.
- **Prompt shape:**
  ```
  Read the daily portfolio synthesis and per-project digests. List every cross-cutting
  risk or strategic decision that scores >=6/10 on board-worthiness. Output JSON array:
  [{score, topic, one_line_rationale, primary_project}]. Return [] if none.
  ```
- **Cost:** ~3000 in / 300 out × 1/day = $0.05/day on Sonnet.
- **Failure mode:** Fall back to current single-pass sentinel parser. Empty array on JSON failure (board sees nothing extra — that's the existing baseline).

### 4. `board-meeting-daily` → Pre-meeting issue clustering

- **Current behavior:** `run_full_board_meeting()` runs the full 6-phase board cycle (already heavy Claude usage — see `agents/board_meeting.py`). **Job is already Claude-native.** Embedding opportunity is upstream, not inside.
- **Embedding point:** Add a NEW Claude call in `_fire_board_meeting_trigger` at `cron_fire_agents.py:120`, BEFORE `run_full_board_meeting()` is invoked. Read the last 24h of `.harness/lessons.jsonl` + `session-outcomes.jsonl` + open Linear Urgent/High tickets. Produce a 5-bullet "what the board should care about today" pre-brief that gets prepended to the board's Phase 1 input.
- **Prompt shape:**
  ```
  You are the board's chief-of-staff. Read the last 24h of lessons, session outcomes,
  and Urgent/High Linear tickets attached. Produce a 5-bullet pre-brief: "Today the
  board should care about ___ because ___". No filler. Direct.
  ```
- **Cost:** ~4000 in / 500 out × 1/day = $0.08/day on Sonnet.
- **Failure mode:** Skip pre-brief, board runs as today. Strictly additive.

### 5. `analyse-lessons-weekly` → Cross-category cluster naming

- **Current behavior:** `scripts/analyse_lessons.py` (already Claude-free; deterministic clustering by category) groups lesson rows by category, creates a Linear ticket per category with >=2 entries. Titles are template-generated ("Pattern detected in `security`: 3 entries").
- **Embedding point:** `scripts/analyse_lessons.py` inside the per-cluster loop, AFTER the deterministic group is formed, BEFORE the Linear ticket is created. Pass the N lesson snippets to Claude; ask for a single-sentence root-cause name and a single-sentence "what would prevent recurrence" suggestion. Feed both into the Linear ticket body.
- **Prompt shape:**
  ```
  Below are {N} lesson entries clustered by category={cat}. Name the underlying pattern
  in <=12 words. Then write one sentence: "what would prevent this recurring?". No more.
  ```
- **Cost:** ~2000 in / 100 out × ~5 clusters/week = $0.02/week on Haiku. Negligible.
- **Failure mode:** Use existing template title. Pattern detection still fires.

## 3. Jobs already using Claude well — NO change needed

- **`board-meeting-daily`** — `agents/board_meeting.py` runs 6 Claude phases. Heavy already; (#4 above is upstream addition, not inside).
- **`scout-daily-0430` / `scout-daily-1630`** — ZTE keyword scoring is deterministic but the `enhancement_scout.py` flow (referenced by orchestrator) already uses Claude. Confirm before adding more.
- **`intel-refresh-daily-0200`** — `agents/anthropic_intel_refresh.py` already imports Anthropic SDK; consolidation script is dumb but harmless.
- **`meta-curator-weekly-sun-0200` / `meta-curator-daily-0300`** — `swarm/meta_curator.py` is the skill-self-authoring proposer; uses Claude SDK throughout. Already the textbook example of this pattern.
- **`portfolio-pulse-daily` synthesis** — already has a top-tier LLM call (see #3 — the embedding is an *additional* pass, not the first).

## 4. Jobs where embedded Claude would be HARMFUL — do not add

- **`fallback-dryrun-quarterly`** — This job's entire purpose is to verify the direct Anthropic SDK path works when Claude Max is down (`scripts/fallback_dryrun.py`). Adding *another* Claude call to it would defeat the test (the test passing because Claude routed it around, not because the fallback worked). Keep this rigidly deterministic.
- **`zte-v2-score-daily`** — Pure mechanical math over Supabase rows + lesson counts. Adding an LLM would introduce non-determinism into a score the board explicitly trusts as audit-grade. Hard no.
- **`discovery-archive-stale-daily`** — Auto-closes sev 4-5 tickets >7 days old to Cancelled. Has explicit "never auto-close priority 1-2" guard (`discovery_archive.py:224`). Adding Claude here risks the model second-guessing the deterministic priority filter and triggering a high-severity auto-close. The hard rule is safer than an LLM verdict.

## 5. Jobs that could be REPLACED entirely by a Claude agent — none

No candidates. Every cron job here has at least one deterministic step (Supabase write, Linear API mutation, scanner file I/O, subprocess exec) that should stay rule-based. The right pattern is **embedded sprinkle inside a deterministic pipeline**, not replacement. This matches Cal Rueb's framing.

## Other findings worth noting

- **`monitor-*` (4 × daily)** all set `use_agent: false` in `cron-triggers.json:103-141` despite `pi_seo_monitor.py:530` already wiring an Anthropic SDK agent path. Flipping `use_agent: true` on one of the four would A/B-test the agent monitor vs the deterministic monitor with zero new code. Lower leverage than the top-5 (the agent path exists, just unused) but a 5-minute win.
- **`plan-discovery-daily-0300`** has `last_fired_at: null` — never successfully fired. Audit didn't dig into why; flag for separate investigation.
- **`discovery-restoreassist`** is disabled. Skip.

## plan-discovery-daily-0300 bug investigation 2026-05-11

Root cause for `last_fired_at: null` since registration: **the dispatcher has no `plan_discovery` branch + no `_fire_plan_discovery_trigger` handler exists.**

### Trace

1. `.harness/cron-triggers.json:242` registers `plan-discovery-daily-0300` with `"type": "plan_discovery"` and `"hour": 3, "minute": 0`. Schedule string parses fine — `_matches()` at `app/server/cron_triggers.py:27` accepts it.
2. At 03:00 UTC, `cron_loop` fires `_fire_trigger(trigger, ...)` at `app/server/cron_scheduler.py:99`.
3. `_fire_trigger` at `app/server/cron_triggers.py:374` dispatches by type. The dispatch chain covers `scan`, `monitor`, `intel_refresh`, `analyse_lessons`/`fallback_dryrun`/`zte_v2_score`, `board_meeting`, `scout`, `feedback_loop`, `meta_curator`, `portfolio_pulse`, `discovery`, `discovery_archive`. **`plan_discovery` is missing.**
4. Unknown types fall into the `else` branch at line 402, which calls `create_session(repo_url=trigger["repo_url"], ...)`. The trigger has no `repo_url` field → `KeyError: 'repo_url'`.
5. `cron_scheduler.py:105` catches the exception, logs `"Trigger failed id=plan-discovery-daily-0300 type=plan_discovery: 'repo_url'"`, and **intentionally does NOT update `last_fired_at`** (line 111 comment: stale timestamp is operator-visible signal). Hence `last_fired_at` stays `null` forever.

### Why this is NOT a 1-line fix

The trigger note says:
> "Perplexity + web search for every Urgent/High ticket; output feeds planner context"

That handler does not exist. `app/server/agents/plan_discovery.py:discover_best_plan()` is a per-session enrichment function (RA-679) that takes `(brief, original_spec, session_id)` and prepends a winning plan to the spec inside an active build session. It is NOT a daily backlog sweep over Urgent/High Linear tickets. A new `_fire_plan_discovery_trigger` would need: Linear query for Urgent/High tickets, Perplexity wiring (or equivalent web-search agent), output destination for planner context (filesystem? supabase? injected into next session?). That is ~half a day of design + implementation, not a surgical fix.

### Recommended fix

Two options, in order of safety:

**(a) Disable the trigger entry** in `.harness/cron-triggers.json` (`enabled: false`) until a handler is implemented. Stops the silent daily KeyError; restores the integration-health watchdog signal for everything else. This is the right immediate action — but the `.harness/` directory is hybrid tracked-but-runtime-mutated state and the user's directive on the cron-fixes branch was NOT to touch `.harness/` in git operations. This needs to happen on `main` directly, ideally via a `cron_store.update_trigger()` call (which doesn't exist yet — `cron_store` only has `create_trigger`/`delete_trigger`).

**(b) Add a `_fire_plan_discovery_trigger` stub** in `app/server/cron_triggers.py` that logs `"plan_discovery handler not yet implemented — skipping"` and returns successfully. Updates `last_fired_at`, silences the watchdog alert, makes the gap visible only in logs. This is code-only (no `.harness/` touch) but adds dead-stub code that may be forgotten — anti-pattern.

**Recommendation:** path (a). Disable via the Pi-CEO admin UI or by a separate `chore(harness)` commit on `main` that touches only the one `enabled` field. Then create a Linear ticket "implement plan-discovery daily backlog sweep handler" referencing this investigation. Do NOT add a stub — that's gold-plating.

### Other surprising findings

- **`.harness/cron-triggers.json` is git-tracked** (per `cron_store.py:5` docstring: "the canonical schedule") but is also continuously runtime-mutated by `last_fired_at` updates from `_save_triggers`. This means every Railway redeploy has a tracked-file diff. RA-1439 added Supabase `cron_state` overlay specifically because the git-stored `last_fired_at` is meaningless on redeploy. The file is *de facto* split-brain: the static fields (`hour`/`minute`/`enabled`/`type`/etc.) are config, but `last_fired_at` is runtime. There's no separation in the file format.
- The audit assumed `pi_seo_monitor.py:530` lived at `app/server/pi_seo_monitor.py`. Actual location is `app/server/agents/pi_seo_monitor.py:530`. Same line number, different module path. Spec verification command `python -c "from app.server import pi_seo_monitor"` fails for the same reason.

## Cross-refs

[[hermes-agent]] · [[claude-code-guide]] · [[pi-ceo-architecture]] · [[agency-blueprint]]

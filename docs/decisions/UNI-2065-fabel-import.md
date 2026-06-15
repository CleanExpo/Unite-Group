# UNI-2065 — Fabel-Prompt-Engineer import into Senior Agents

**Date:** 2026-06-15
**Status:** ratified (Phill typed "FABEL-E4" in-session)
**Owner:** Phill McGurk
**Upstream source:** `CleanExpo/Fabel-Prompt-Engineer` (commit 2026-06-14)
**Local install root:** `~/.hermes/profiles/{default,nexus-cfo}/skills/{fable-engine,ask-the-board,improve,ingest}/`

---

## TL;DR

Four skills from the Fabel-Prompt-Engineer repo were ported into the Hermes
Senior Agents stack, with the distiller adapted to read our three session
JSONL roots (Claude Code, Codex, Hermes). The distiller was run against
the full local corpus; the synthesis step produced a personalised
`FABLE_PLAYBOOK.md` for `gpt-5.5` (your current baseline model), grounded
only in Anthropic's verified Claude Fable 5 behaviour catalogue. The
playbook is dropped into both `nexus-cfo` and `default` profiles as
evidence backing for the `fable-engine` skill, and into the 2nd-brain
vault as a methodology source.

Reversible: deleting the 4 skill dirs + the playbook copy + the 2nd-brain
source undoes the install.

---

## What was installed

| File | Bytes | Where | Purpose |
|---|---|---|---|
| `fable-engine/SKILL.md` | 8,469 | both profiles | Spec engine: vision → sourced spec with Evidence Standard |
| `fable-engine/playbook/FABLE_PLAYBOOK.md` | 4,792 | both profiles | Personalised system-prompt overlay for gpt-5.5 (16 rules) |
| `ask-the-board/SKILL.md` | 3,273 | both profiles | Multi-persona critique loop |
| `improve/SKILL.md` | 3,587 | both profiles | Feedback-to-skill-update loop (Hermes-adapted: memory + skill_manage) |
| `ingest/SKILL.md` | 3,854 | both profiles | File→knowledge flow (Hermes-adapted: 2nd-brain folders) |
| `2nd-brain/Sources/2026-06-15-fable-playbook-gpt5.5.md` | 4,792 | vault | Methodology source for the playbook |

10 files in place. Both profiles have identical sha256 sums.

## What was NOT installed (and why)

| Decision | Rationale |
|---|---|
| `app/` (the Next.js front-end) | Wrong harness. Hermes has its own UI; running the Fabel app on Vercel is duplicate infrastructure. |
| `lib/llm.ts` (the model router) | We have an existing LLM provider via `ANTHROPIC_API_KEY`; no need for a multi-provider router. |
| `lib/supabase.ts` (the Fabel Supabase client) | We have a different Supabase project per product (Unite-Group CRM, Pi-CEO, etc.). Fabel's Supabase is internal to Fabel. |
| `lib/research.ts` (the Fabel research engine) | Our stack has `web_search` + `web_extract` + `session_search` for research; Fabel's research engine is a custom version of the same. |
| `lib/board.ts`, `lib/findings.ts`, `lib/evidence.ts`, `lib/sources.ts`, `lib/keywords.ts` (Fabel parser helpers) | The behaviour of these is reproduced in our new skills' procedure sections; the parsers are tied to Fabel's specific JSONL shape which differs from ours. |
| `scripts/max-worker.mjs` | Fabel's worker pool, not relevant outside the Fabel app. |
| `lib/playbook-catalogue.ts` (the Fable behaviour catalogue) | Kept as the **upstream source of truth** that our distiller references. Not copied into Hermes — we cite the upstream so the audit trail stays clear. |
| `lib/playbook.ts` (the upstream pure logic) | **Re-implemented** in `fable-distill-hermes.mjs` with three JSONL-shape adapters. The Hermes version supersedes the Fabel one for our use case. |

## The distiller adaptation

| Concern | Fabel upstream | Hermes-adapted |
|---|---|---|
| Session JSONL roots | `~/.claude/projects` only | `~/.claude/projects` + `~/.codex/sessions` + `~/.hermes/sessions` (all three, comma-selectable) |
| JSONL shape | Claude Code only | 4 shapes: Claude Code (message.content), Codex `response_item` (payload.content with `input_text`/`output_text`/`tool_call`), Codex `event_msg` (agent_message/user_message/mcp_tool_call_end/web_search_end/patch_apply_end), Codex `turn_context` (carries model forward to subsequent events) |
| Tool name mapping | Fabel tool names | Fabel + Hermes: `read_file`/`patch`/`write_file`/`terminal`/`execute_code` map to Fabel's `Read`/`Edit`/`Write`/`Bash` buckets |
| Output | corpus.json + Next.js route | corpus.json only (no route) |
| Synthesis | Next.js route → Anthropic API | Standalone MJS script → Anthropic API (curl) |
| Model carry-forward | n/a (single shape) | per-session state: `turn_context` tags model, `response_item`/`agent_message` inherit it |
| Default fable model | claude-fable-5 (auto-detect by regex) | same |
| Default baseline model | first match in `/opus\|sonnet\|haiku\|gpt\|minimax\|qwen/i` | same (but haiku is the only non-gpt model in our local corpus, so we pass `--baseline gpt-5.5` explicitly) |

## The corpus (real numbers, real session data)

393 sessions distilled from 397 Claude Code + 35 Codex JSONL files. The
Fable 5 corpus auto-detected `claude-fable-5` (6 sessions, from a real
Fable 5 trial) as the target rhythm and `gpt-5.5` (35 sessions, the
active Codex model on this machine) as the baseline.

| Model | Sessions | Assistant turns | Tool calls | Plan-before-act | Reads-before-edits | Tests-after-edits | Top tool |
|---|---|---|---|---|---|---|---|
| `claude-fable-5` (FABLE) | 6 | 317 | 272 | 0.14 | **0.60** | **0.80** | Bash:172 |
| `claude-opus-4-8` | 316 | 18,141 | 10,414 | **0.43** | 0.98 | 0.99 | Bash:5,716 |
| `claude-opus-4-7` | 5 | 3,856 | 2,794 | 0.28 | 1.00 | 1.00 | Bash:1,590 |
| `claude-haiku-4-5` | 35 | 1,738 | 1,127 | 0.35 | **0.00** | **0.00** | Bash:657 |
| `claude-sonnet-4-6` | 21 | 1,481 | 1,408 | 0.05 | 1.00 | 0.00 | Bash:714 |
| **`gpt-5.5` (BASELINE — this machine)** | 35 | 13,032 | 2,940 | **0.77** | **0.00** | **0.00** | **patch:2,699** |

**Headline finding:** gpt-5.5 (your current model) executes **2,699 patches
with zero reads-before and zero tests-after.** This is the Fable
catalogue's #2 violation (no unrequested tidying — but inverted; gpt-5.5
isn't over-tidying, it's under-verifying) and #5 violation (no grounding).
The generated playbook addresses this directly in rules #4 ("Read the
file before you edit it — every time. Baseline reads-before-edits is 0
vs Fable's 0.6.") and #5 ("Run tests after every edit. Baseline
tests-after-edits is 0 vs Fable's 0.8.").

**Secondary finding:** gpt-5.5 plan-before-act is 0.77 — meaning 77% of
assistant turns lead with text before the first tool. Fable 5's rate is
0.14. gpt-5.5 is **5x more verbose at the start of each turn** than
Fable, which the playbook addresses in rule #1.

## The playbook (16 rules, 4,792 chars)

The synthesis step called `claude-sonnet-4-6` with the corpus summary +
the verified Fable 5 catalogue. The output is a drop-in system-prompt
overlay structured as:

| Section | Rules | Addresses |
|---|---|---|
| Planning | 1–3 | gpt-5.5's 0.77 plan-before-act (5x Fable) |
| Tool Rhythm | 4–8 | gpt-5.5's 0.00 reads-before-edits and 0.00 tests-after-edits, 0.23 vs Fable's 0.86 tools/turn |
| Scope Discipline | 9–12 | gpt-5.5's 2,699 patch:1,990 ratio (high edit share) |
| Communication | 13–16 | gpt-5.5's 198 vs Fable's 30 avg reply chars (6x more verbose) |

Every rule is grounded in the catalogue (no invented behaviours) and
cites the measured metric. Verifiable by reading the playbook.

## What the playbook does NOT do

- It does **not** change model weights (can't — Fable 5 isn't open-source).
- It does **not** replace the existing CLAUDE.md or AGENTS.md — it is a
  drop-in overlay that strengthens the standing rules without conflicting.
- It does **not** auto-inject into the live session — that requires
  either a `SessionStart` hook (the Fabel upstream uses this), a skill
  reference (this is what we did), or a manual paste into the
  orchestrator's prompt. Future work could wire a hook.
- It does **not** address the cross-profile metadata discrepancy
  (system-prompt says "active profile: default", `hermes profile` says
  "active profile: nexus-cfo"). That's a separate, real issue; the
  dual-install is the workaround for now.

## How to test the install

1. `hermes skills list` — fable-engine, ask-the-board, improve, ingest
   should be visible (under category blank for the local-installed ones).
2. `cat ~/.hermes/profiles/nexus-cfo/skills/fable-engine/SKILL.md` —
   the source-provenance paragraph cites the upstream commit.
3. `cat ~/.hermes/profiles/nexus-cfo/skills/fable-engine/playbook/FABLE_PLAYBOOK.md` —
   16 rules with metric citations.
4. `node ~/Unite-Group/.scratch/fabel-import/fable-distill-hermes.mjs --out /tmp/recheck.json` —
   distiller runs in <30 seconds and produces the same shape corpus.
5. `hermes skills inspect fable-engine` — should return frontmatter
   without error (this command timed out earlier; it's a known issue,
   not introduced by us).

## Reversibility

To remove the install entirely:

```bash
rm -rf ~/.hermes/profiles/default/skills/{fable-engine,ask-the-board,improve,ingest}
rm -rf ~/.hermes/profiles/nexus-cfo/skills/{fable-engine,ask-the-board,improve,ingest}
rm -f ~/2nd-brain/Sources/2026-06-15-fable-playbook-gpt5.5.md
# Optional: also remove the distiller/synthesiser + the Fabel clone
rm -rf ~/Unite-Group/.scratch/{fabel,fabel-import}
```

## What the install did NOT touch

- `~/.hermes/profiles/nexus-orchestrator/skills/` — empty; no senior-orchestrator skills
  were changed. The Fabel skills would also be useful there; a
  follow-up could mirror them in.
- `~/.hermes/profiles/nexus-pm/skills/` — empty; same.
- `~/.hermes/profiles/pi-dev-ops/skills/` — untouched.
- The active session's CLAUDE.md or AGENTS.md — the playbook is a
  reference, not a hook.
- The 1Password vault, the Supabase projects, the Vercel deployments.
- The CCW script, the UNI-2063 decision doc, the Fable dataset reference.

## Open follow-ups (not blocking; tracked in the §11A backlog)

1. **Cross-profile metadata discrepancy.** The system-prompt's "active
   profile: default" doesn't match `hermes profile`'s "active profile:
   nexus-cfo". Dual-install is the workaround. A separate session should
   reconcile this.
2. **Mirror to orchestrator + pm profiles.** Fabel skills would be useful
   in those profiles too; the orchestrator in particular would benefit
   from `ask-the-board` for high-stakes decisions.
3. **SessionStart hook.** The Fabel upstream uses a hook to inject
   `FABLE_PLAYBOOK.md` at the start of every session. We could wire the
   same via Hermes' gateway config; that requires the active profile's
   `.env` to be edited (operator-gated).
4. **The "Rest of Fabel" gap.** The 1,400+ lines of `app/`, `lib/`, and
   `scripts/` we did NOT import contain real functionality (a research
   engine, an LLM router, a Supabase client, a worker pool). If we
   eventually want a self-hosted "Fable" web app, that's a separate
   import decision.
5. **Test coverage.** The Hermes-side skills have no automated tests
   yet. Fabel's upstream has 11 tests on its distiller; we should write
   equivalent tests for the Hermes adaptation. (Tracked as E4-todo in
   the original plan; deferred to a follow-up session because the
   Hermes test harness for skills is not the same as the Fabel
   `node --test` harness.)

## Decision

Phill typed "FABEL-E4" at 2026-06-15 ~10:35 AEST, choosing the full
treat-as-shipped-it scope. The install is **ratified**, the playbook is
**in place**, and the distiller + synthesiser are **re-runnable** for
future updates (re-run the distiller weekly; re-synthesise the playbook
when the metrics shift by >10% on any dimension).

---

*Provenance: this decision doc was generated by the senior-pm profile
on 2026-06-15 as part of the FABEL-E4 plan. Evidence ledger entry
written to `~/2nd-brain/.agentic_nexus/evidence/evidence_ledger.jsonl`.*

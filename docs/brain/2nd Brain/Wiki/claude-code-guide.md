---
type: wiki
updated: 2026-05-11
---

# Claude Code Guide

Operating model and concept map for using Claude Code as the empire's primary engineering surface. Pairs with [[hermes-agent]] (cron + MCP) and [[pi-ceo-architecture]] (Layer 1 orchestration).

## Mental Model: 7 Continents

Claude is not a chatbot; it is a workspace you move into. Beginners visit two cities (web + one project) and quit. The full surface is 28 places across 7 continents (Source: `Sources/You're Learning Claude The Wrong Way…`):

1. **Surfaces** — where Claude lives. Day-one move: install Desktop app, open Co-work. Web (claude.ai), Chrome extension, mobile, and Claude Code CLI are the other cities.
2. **Memory** — Folders (real disk) vs Projects (workspace with brain). Map: one cloud-synced `Cloud Workspace` folder → one subfolder per area → one Project per subfolder. Knowledge base and conversation history compound.
3. **Identity** — System instructions per project + **global instructions** in Co-work (read once, every new project inherits). Two-email rule: give Claude its own Gmail / Chrome profile, share resources read-only into it. Guard-rails before power.
4. **Skills** — Skills + slash commands (`/skill-name`) are the cheat code. Plugins bundle multiple skills. Sub-agents are specialist Claudes you delegate to. MCP is the protocol underneath connectors.
5. **Automation** — Scheduled tasks (clock) vs Routines (event trigger). Triggers fire routines. Chained skills + routines = workflows. Mirrors [[hermes-agent]] cron + Telegram routing.
6. **Access** — Connectors (Slack, Gmail, Notion, etc.), voice, API, and "hands" — the Chrome extension lets Claude browse, click, fill forms on sites with no API. Hands = the agentic difference.
7. **Creations** — Artifacts (runnable HTML, dashboards, prototypes) and Design (diagrams, infographics, slides). Output stops being text and becomes a deliverable.

## The Day-Shift / Night-Shift Workflow

Pattern from Matt Pocock (`Sources/Building a REAL feature with Claude Code…`). Phill's portfolio operates on this rhythm — see [[autonomous-sdlc]].

1. **Grill Me** — dictate rough idea into Claude, let it sub-agent explore the codebase, then question your framing. Spend the human time on intent + ubiquitous language, not implementation.
2. **Ubiquitous language doc** — every project maintains a glossary (e.g. ghost vs real entities, materialize, materialization cascade). LLM and human share the same vocabulary; future sessions stay precise.
3. **PRD skill** — turn the grilling conversation into a PRD (co-locates question with answer — strong attention hot-spot for the LLM).
4. **PRD → issues** — break the PRD into ~6 GitHub issues sized for a Ralph loop. Merge tiny issues; isolate the gnarly ones.
5. **AFK / Ralph loop** — Docker-sandboxed Claude Code runs `max-iterations=100`, picks an unblocked issue, implements, runs tests + types on every commit, closes the issue, repeats. Patches stream back as commits.
6. **QA back-loop** — human runs the build, finds bugs, files them via a feedback button → new GitHub issues. Mark any human-only ticket so the Ralph loop skips it.
7. **Parallelise** — while QA runs, kick a second grilling session. Day shift (think) || night shift (build).

Counter-intuitive lesson: most of the value is in front-loaded grilling. The implementation phase is on rails once intent is sharp.

## Tool Substrates: CLI > API > MCP

Source: `Sources/This is The Most Powerful Tool to Give to Claude Code`. Reorder reflex from MCP-first to CLI-first.

| Substrate | Built for | Token cost | When |
|---|---|---|---|
| CLI | Agents (lazy discovery, short pre-formatted output, local SQLite, no round-trip) | Lowest | First choice — even for sites with no public API |
| API | Code (raw JSON, possibly huge) | Medium | Second choice if CLI not viable |
| MCP | Tool discovery (loads all tool defs into context every call) | Highest — benchmarked 35× CLI on same task; reliability 100%→72% as tasks get harder | Last resort |

Implication for [[pi-ceo-architecture]]: every new external integration evaluates a CLI wrapper (or `printing-press`-style factory) before reaching for an MCP server. MCP servers in [[hermes-agent]] should be audited for whether a CLI would beat them on tokens.

## Hidden Cities (high-leverage settings beginners miss)

1. **Profile + two-email rule** — separate Claude identity, never give it your primary Gmail.
2. **Global instructions** — Co-work setting; one-time write inherited by every project.
3. **Slash commands** — `/<skill>` is faster and cheaper than describing what skill to run.
4. **Routines vs scheduled tasks** — pick the right trigger or get stale reports.
5. **Hands (Chrome extension)** — agentic browsing for sites with no API.

## Anthropic-Internal Patterns (Cal Rueb, Applied AI team)

Source: `Sources/This Anthropic Engineer Uses Claude Code Differently Than Everyone Else.md`. Cal is a core Claude Code contributor — what Anthropic actually does internally.

1. **Escape × 2** — single Esc interrupts the agent; double-Esc jumps back in the conversation to reset state without losing the session. Use this instead of `/clear` when you only want to roll one decision back.
2. **Auto-accept mode** (`Shift+Tab`) — Claude stops asking permission per action; combine with per-command allowlists in settings (e.g. always-allow `npm run test`) for true loop-mode work.
3. **`@filename` references inside `claude.md`** — pull other files into context on demand instead of bloating the root claude.md.
4. **Think between tool calls** — Claude 4+ models think between every tool call (not only between turns). Add "think hard" to the prompt explicitly before debug passes; the lighter-grey reasoning trace is now visible.
5. **Multi-Claude orchestration via shared markdown** — Anthropic engineers run 2–4 Claudes simultaneously. Pattern: one Claude writes `ticket.md` as if leaving a note for another developer; second Claude reads it. Beats native multi-agent today; aligns with [[agency-blueprint]] handoff pattern.
6. **Permission management = velocity** — out-of-box, reads are free, writes/bash prompt. Tune the always-allow list per project; it's the single biggest workflow unlock for AFK loops.
7. **CLI tools beat MCP when both exist** — re-stated by Cal: install `gh`, `docker`, `bq` etc. as CLIs and let Claude run them directly. Matches our CLI > API > MCP doctrine above. Only reach for MCP when no CLI exists.
8. **Subdirectory claude.md auto-discovery** — top-level claude.md is auto-loaded; sub-directory ones are *not* (would blow context in a mono-repo) — Claude reads them lazily when it discovers them during search. Place project-specific instructions deeper.

## Cross-refs

[[hermes-agent]] · [[pi-ceo-architecture]] · [[autonomous-sdlc]] · [[tech-drops-q2-2026]] · [[agent-memory-patterns]] · [[marketing-brain-system]] · [[system-opportunities-2026-05-11]]

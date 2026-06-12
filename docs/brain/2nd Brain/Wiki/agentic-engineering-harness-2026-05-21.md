---
type: wiki
updated: 2026-05-21
---

# Agentic Engineering Harness

Purpose: turn the latest Source notes on large-codebase agent work into a durable operating standard for Unite-Group, Synthex, Pi-CEO, RestoreAssist, DR/NRPG, CARSI, and client builds.

## Core Thesis

The model is not the whole advantage. The durable advantage is the harness around the model: lean rules, scoped skills, repo-specific context, symbol-aware navigation, MCP tools, subagents, hooks, evidence logs, and completion goals.

For Unite-Group work this means every serious repo needs an explicit AI layer beside code and tests:

- Root instructions: short, current, and architectural.
- Path-level instructions: only where local conventions differ.
- Skills: repeatable workflows with one clear trigger and bounded output.
- MCP/tools: only where they expose a real capability such as Linear, GitHub, Supabase, browser control, code symbol search, or data retrieval.
- Subagents: exploration and bounded sidecar implementation, not hidden decision makers.
- Hooks/checks: start-session orientation, stop-session learning proposal, design lint, secret lint, tests, and close-loop evidence.
- Goal loop: a completion condition that keeps the agent working until the artifact is actually verified.

## Operating Rules

1. Keep global rules lean; put project-specific detail in the current folder or wiki page.
2. Give agents code maps before asking them to infer a large repo from scratch.
3. Prefer scoped verification commands over broad, slow checks when the change surface is narrow.
4. Add new skills only when a workflow repeats or removes meaningful founder re-input.
5. Use symbol/search tools for large codebases; string search is the baseline, not the ceiling.
6. Use subagents for parallel discovery or bounded files, then integrate in the main session.
7. Every completed loop updates Wiki, Linear/CRM where relevant, and the health surface.

## Source-Derived Decisions

- The "AI Layer" pattern maps directly to [[service-layer-architecture-2026-05-18]] and [[mandatory-close-the-loop-protocol]].
- The `/goal` pattern maps to Health Loop and Close Loop: define the finished condition, then keep working until checks are green.
- Hook-driven self-improvement should produce proposed instruction updates, not silently mutate governance files.
- Codebase harness ownership sits with [[pi-ceo-architecture]] and [[senior-engineering-team]] style execution, not with each random feature branch.

## Portfolio Application

- [[synthex]]: keep marketing-agent logic in service modules, expose cockpit/health state through thin routes and cards.
- [[unite-crm]]: use the harness to route Plaud, Telegram, Linear, and meeting notes into one visible operating board.
- [[restore-assist]]: use scoped instructions around field reporting, audio evidence, safety/compliance, and App Store release gates.
- [[dr-nrpg]]: use agent workflows to transform contractor/member input into value assets, search pages, and onboarding tasks.
- [[carsi]]: use path-scoped QA around LMS, certificates, subscriptions, and WooCommerce migration surfaces.

## Evidence Inputs

- Source: `Sources/Anthropic Just Dropped a Masterclass on Building Agent Harnesses (for Large Codebases).md`
- Source: `Sources/Claude Code Has a Huge Problem.md`
- Related: [[agent-cockpit-current-research-2026-05-17]]
- Related: [[unite-group-portfolio-ops-board-v1]]
- Related: [[mandatory-close-the-loop-protocol]]

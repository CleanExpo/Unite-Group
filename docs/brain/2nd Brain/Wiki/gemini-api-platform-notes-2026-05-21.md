---
type: wiki
updated: 2026-05-21
---

# Gemini API Platform Notes

Purpose: capture the new Google Gemini API Source notes for future Synthex, Unite-Group, and Pi-CEO model-routing work.

## Current API Shape

Google's stable path remains `generateContent` for production workloads. The current examples use `gemini-3.5-flash` through the Google GenAI SDKs or the `generativelanguage.googleapis.com` REST endpoint.

The newer Interactions API is the strategic agentic direction. It is designed for server-side state, typed execution steps, multi-turn workflows, tool use, background work, and Deep Research style tasks.

## Decision For Unite-Group

- Use `generateContent` for stable production integrations until Interactions exits beta/preview or the target feature requires it.
- Use Interactions API only for sandboxed research, agent observability, background Deep Research experiments, or model-routing prototypes.
- Treat `store=true` as a data-retention decision, not a default to accept silently.
- Use `store=false` where client/private data should not be retained, unless background mode or continuation is required and approved.
- Do not use Gemini Interactions remote MCP as a production assumption yet; the Source states Gemini 3 remote MCP support is not available and is coming later.

## Useful Platform Details

- `previous_interaction_id` can continue a conversation without resending full history.
- Interaction-scoped parameters such as tools, system instruction, and generation config must be resent each turn.
- Paid-tier interaction retention is listed as 55 days; free tier is listed as 1 day.
- `background=true` supports long-running tasks but is incompatible with `store=false`.
- Google GenAI SDK support for Interactions starts at Python `google-genai` 1.55.0 and JavaScript `@google/genai` 1.33.0.
- Google publishes a Gemini Docs MCP at `https://gemini-api-docs-mcp.dev`; use it as a docs-grounding source before building Gemini integrations.
- Google publishes Gemini API skills for general API development, Live API work, and Interactions API work. Treat these as project-local tools only after compatibility and repo policy are checked.
- Gemini managed agents can mount `AGENTS.md`, skills, and workspace files into an Antigravity runtime; this is useful research signal but not yet a replacement for the existing Codex/Hermes/Synthex runtime.
- Model notes captured on 2026-05-21 list Gemini 3.5 Flash as stable and Gemini 3.1 Pro / Gemini 3 Flash / Nano Banana variants as preview surfaces. Preview models require explicit sandbox gating.

## Fit

- [[synthex]]: candidate for sandboxed Deep Research and multimodal asset understanding, not public publishing automation without approval gates.
- [[unite-crm]]: candidate for typed execution-step observability in future command center experiments.
- [[pi-ceo-architecture]]: candidate model lane for low-risk research or visual/document understanding once cost and retention controls are proven.
- [[mandatory-close-the-loop-protocol]]: any Gemini-backed output still needs source grounding, verification, and Wiki/Linear closure.

## Setup Rule

Before any Gemini implementation work:

1. Search current official docs through Gemini Docs MCP or the captured Source notes.
2. Select stable `generateContent` unless the task explicitly requires Interactions, Live, Deep Research, or managed-agent behavior.
3. Record storage mode, retention, and data class before sending client or portfolio data.
4. Keep API keys in the existing secrets path only; never paste Gemini keys into Wiki, logs, screenshots, or prompts.
5. Close through [[mandatory-close-the-loop-protocol]].

## Evidence Inputs

- Source: `Sources/Gemini generateContent API.md`
- Source: `Sources/Gemini generateContent API 1.md`
- Source: `Sources/Gemini API    Google AI for Developers.md`
- Source: `Sources/Gemini API    Google AI for Developers 1.md`
- Source: `Sources/Gemini Interactions API    Google AI for Developers.md`
- Source: `Sources/Set up your coding assistant with Gemini MCP and Skills    Gemini API    Google AI for Developers.md`
- Related: [[agentic-engineering-harness-2026-05-21]]

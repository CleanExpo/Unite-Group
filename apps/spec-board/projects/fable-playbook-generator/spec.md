# Spec — Fable Playbook Generator

Build-ready spec produced from the investigation in
`2nd Brain/Sources/Fable-Playbook-Technique-Research-Dossier.md`. Evidence-tagged
per the repo's Evidence Standard.

## Finish line

One local command + one paste yields a `FABLE_PLAYBOOK.md` that is grounded in
(a) the user's measured baseline-vs-Fable model gap and (b) Anthropic's verified
behaviour catalogue. [VERIFIED — implemented and tested in this repo]

## Why this belongs here

The Fable System already *injects* engine prompts; it had no way to *generate* an
injectable behaviour overlay from a user's own history. This is the missing
generator. [INFERENCE — from reading the repo's Phase 0–3 design]

## Architecture (smallest-first)

1. **Pure distiller — `lib/playbook.ts`** [VERIFIED]
   - `parseEvent` → normalise one JSONL object to a `Turn` (model, text, tool
     names in order); drop thinking and tool_result echoes as bloat.
   - `distillSession` → one session file → `Session`.
   - `computeMetrics` → per-model working rhythm: assistant turns, tool calls,
     tool histogram, read/edit share, and the session-scoped ratios
     **reads-before-edits**, **tests-after-edits**, **plan-before-act**.
   - `buildCorpus` / `summarizeCorpus` → assemble + render a model-readable brief.
   - Pure (no fs/env) so it runs in both the CLI and the serverless route and is
     unit-tested under `node --test`.
   - [UNCONFIRMED] The ratios are heuristics keyed on tool *names* only (no
     command text); absolute values are noisy across harnesses — they are a
     directional signal, not ground truth. Listed here as an assumption.

2. **Verified catalogue — `lib/playbook-catalogue.ts` + `knowledge/playbook/`** [VERIFIED]
   - `FABLE_BEHAVIOURS`: the 10 official Fable-5 behaviours, authoritative copy.
   - `buildPlaybookPrompt`: turns catalogue + measured gap into a synthesis prompt
     that forbids inventing behaviours Anthropic didn't document.
   - Markdown mirror for the Cowork/OS layer.

3. **Local CLI — `scripts/fable-distill.mjs`** [VERIFIED — smoke-tested on 203
   real JSONL files, 145 sessions, isolated `claude-fable-5`]
   - Walks `~/.claude/projects/**/*.jsonl` (or `--dir` for downloaded HF traces),
     emits `corpus.json`. Requires Node ≥ 22.18 (native TS strip for the import).

4. **Serverless route — `app/api/playbook/route.ts`** [VERIFIED]
   - `POST { corpus?, targetModel? }` → `runPersona` synthesis → `{ playbook }`.
   - No corpus → generic playbook from the catalogue alone.
   - 503 if no LLM provider configured.

5. **UI — `app/playbook/page.tsx`** [VERIFIED]
   - Paste `corpus.json` (or generate generic) → view, copy, download
     `FABLE_PLAYBOOK.md`. Linked from the home cockpit.

## Guardrails (structural)

- No filesystem access from the serverless route — the user's JSONL never leaves
  their machine; only the distilled, text-capped corpus is sent. [VERIFIED]
- Reuses the existing env-routed provider + spend posture (password-gated Vercel
  URL, Anthropic spend cap). No new secrets. [VERIFIED]
- The catalogue is the single source of behavioural truth; synthesis cannot
  invent behaviours. [VERIFIED — enforced in the system prompt]

## Tests

`tests/playbook.test.ts` — parseEvent, distillSession, per-model metrics, the
no-cross-session-leak invariant, and corpus assembly. All green (14/14 with the
existing suite). [VERIFIED]

## Risk / assumption register

- [UNCONFIRMED] Metric ratios are tool-name heuristics; treat as directional.
- [UNCONFIRMED] `message.model` tagging is stable across Claude Code versions;
  `<synthetic>` pseudo-models are filtered, but a future schema change could need
  a parser update.

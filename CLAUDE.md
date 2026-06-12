# The Fable System — Brain File

This repository is **The Fable System**: an internal tool that turns a vague,
plain-English idea into a verified, build-ready spec. It has two layers:

1. **OS Layer** (this folder structure + the skills) — runs inside Cowork /
   Claude Code with no app code at all.
2. **App Layer** (`app/`, `lib/`) — a thin private web front-end that runs the
   same engine via the Anthropic API and stores results in Supabase.

## How to use the folders

| Folder | What lives here | How you use it |
|---|---|---|
| `knowledge/` | What the system should know: advisor/board content, the user's notes, frameworks, ingested articles and transcripts. | Read from here when running `fable-engine` or `ask-the-board`. Write to here only via the `ingest` skill. |
| `skills/` | Repeatable routines. Each subfolder has a `SKILL.md` describing the routine. | When the user invokes a skill by name (or describes a task that matches one), read its `SKILL.md` and follow it. |
| `projects/` | Active builds. One subfolder per project, containing its visions and generated specs. | When a spec is produced for a project, save it under `projects/<project-name>/`. |

## Installed skills

- **`fable-engine`** — the core engine. Takes a plain-English vision, locks the
  finish line, researches across channels, and produces a sourced, build-ready
  spec. Enforces the Evidence Standard.
- **`ask-the-board`** — loops through advisor profiles in `knowledge/board/`
  and returns a combined multi-persona critique of a spec or decision.
- **`improve`** — captures the user's feedback about an output and updates the
  relevant skill or knowledge files so future outputs get sharper.
- **`ingest`** — files new articles, transcripts, and notes into `knowledge/`
  in the right place with the right metadata.

## The Evidence Standard (non-negotiable)

Every factual claim in any output carries exactly one tag:

- `[VERIFIED]` — backed by a checkable source (URL, file in `knowledge/`, or
  direct observation of this repo). Only `[VERIFIED]` material may be treated
  as fact.
- `[INFERENCE]` — a reasonable conclusion from verified material. Must say
  what it was inferred from.
- `[UNCONFIRMED]` — an assumption or unsourced claim. Must be listed in the
  output's risk/assumption register.

## Standing rules

- **Human in the loop, always.** The system proposes; the user decides.
  Nothing is finalised without explicit approval. Never take autonomous
  external action.
- **Single user, private, low-cost.** No multi-user features, no account
  system, no polish before function.
- **Ask only what you can't infer.** When information is missing, present a
  short list of concrete, answerable questions rather than stalling or
  guessing silently.
- **Phase discipline.** Do not build later-phase features (cockpit, board
  ingestion) before the earlier phase's definition-of-done is met.

# knowledge/

What the system should know. Populated by the `ingest` skill — don't drop raw
files in the root of this folder.

## Layout

- `board/` — one folder per advisor (e.g. `board/indydevdan/`), each with a
  `profile.md` (who they are, their lens, source links) and any ingested
  source material. Used by `ask-the-board`.
- `notes/` — the user's own notes, Obsidian exports, and transcripts.
- `frameworks/` — reusable thinking frameworks and reference material.

Every ingested file starts with a small metadata header (added by `ingest`):
source URL or origin, date ingested, and an evidence tag for its reliability.

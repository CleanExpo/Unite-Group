---
name: ingest
description: File new articles, transcripts, and notes into knowledge/ in the right place with source metadata and an evidence tag.
---

# Ingest

Input: a new resource — article, transcript, note, Obsidian export, or a URL.

## Procedure

1. **Classify** the resource:
   - About/by a board advisor → `knowledge/board/<advisor>/` (create the
     advisor folder + `profile.md` stub if new).
   - The user's own notes or transcripts → `knowledge/notes/`.
   - Reusable framework or reference → `knowledge/frameworks/`.
2. **File it** as Markdown with a metadata header:

   ```markdown
   ---
   source: <URL, "user", or original filename>
   ingested: <YYYY-MM-DD>
   evidence: <verified | unconfirmed>   # verified only if the source is checkable
   topic: <few words>
   ---
   ```

3. **Don't silently rewrite.** Preserve the original content; add structure
   (headings, speaker labels for transcripts) only where it aids retrieval.
4. **Report back**: where it was filed, under what evidence tag, and which
   skills will now pick it up (e.g. a new advisor becomes visible to
   `ask-the-board`).

## Bulk ingestion (Phase 3 — the vault)

When given a zipped Obsidian vault or a batch of transcripts: propose a filing
plan first (counts per destination folder), get approval, then ingest. Flag
anything that looks like a secret or personal credential instead of filing it.

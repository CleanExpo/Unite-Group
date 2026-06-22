# Solutions knowledge base

Compounding knowledge store (Compound Engineering method). Each file documents
**one solved, non-trivial problem** so the next occurrence is a quick lookup
rather than a fresh investigation — *each unit of engineering work makes the
next one easier.*

Created/updated via the `/ce:compound` workflow (or by hand following the same
shape). Searchable by the YAML frontmatter (`title`, `category`, `tags`).

## Categories

`build-errors/` · `test-failures/` · `runtime-errors/` · `performance-issues/` ·
`database-issues/` · `security-issues/` · `ui-bugs/` · `integration-issues/` ·
`logic-errors/`

## Index

| Date | Category | Solution |
|---|---|---|
| 2026-06-22 | integration-issues | [Autonomous PR merge loop deadlocks on required reviews](integration-issues/pr-merge-loop-deadlock-on-required-reviews.md) |

## When to add an entry

After verifying a fix for a non-trivial problem (not a typo / obvious error),
while the context is still fresh. Capture: symptom, root cause, the working fix
(with commands/code), and how to prevent it. Link related entries with relative
markdown links.

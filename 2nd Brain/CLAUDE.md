# Brain-1 Wiki — Schema Layer

Personal/strategic brain for Phill McGurk. Read by Margot before any research session.
Portfolio operations brain is at `~/Synthex-Brain-2/` (Brain-2).

## Three wiki operations

### INGEST
Trigger: a source document arrives in `Sources/`, or a valuable Margot/Board session ends.

1. Read the source.
2. Identify which wiki pages it updates (check `Wiki/index.md`).
3. Edit those pages in place — update facts, add cross-refs, note the date.
4. If no existing page fits, create one and add it to `Wiki/index.md`.
5. Append a line to `Wiki/log.md`: `YYYY-MM-DD | ingest | pages affected | one-line summary`

Cap: touch 10–15 pages max per ingest. Don't rewrite pages that don't need it.

### QUERY
Trigger: Margot needs context about the founder, businesses, or system before doing external research.

1. Read `Wiki/index.md` to locate relevant pages.
2. Read those pages (max 5).
3. Answer from wiki first. Only go external if the wiki has no answer or the answer is stale.
4. If the query produces a valuable synthesis not in the wiki, run INGEST afterward.

### LINT
Trigger: weekly cron (Saturdays). Run manually with: "lint the wiki".

Check for:
- Contradictions: two pages asserting different facts about the same thing
- Stale claims: dates older than decay threshold (market data >90 days, regulatory >12 months, competitor positioning >30 days)
- Orphan pages: pages in `Wiki/` not listed in `Wiki/index.md`
- Missing cross-refs: pages that mention a topic that has a wiki page but don't link to it

Output: a short report. Fix contradictions and orphans immediately. Flag stale claims for founder review.
Append to `Wiki/log.md`: `YYYY-MM-DD | lint | issues found | summary`

## Conventions

- All pages in `Wiki/` use Obsidian `[[double-bracket]]` links
- Frontmatter: `type: wiki`, `updated: YYYY-MM-DD`
- No commentary, no filler — every sentence carries information
- `Sources/` files are immutable — never edit them, only ingest from them

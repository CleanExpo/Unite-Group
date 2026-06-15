# Fabel-Prompt-Engineer — fix-queue handover

- **Repo:** `CleanExpo/Fabel-Prompt-Engineer` (private, TypeScript, created 12/06/2026)
- **Live Supabase project:** `Fabel-Prompt-Engineer` (ref `yhteftfnoegmdkimzzjd`)
- **How to run this:** start a Claude Code session ON that repo and feed the six
  prompts below IN ORDER, in one session so context carries. Each ends with a
  "done when" — do not declare a prompt complete until its "done when" is
  demonstrated with evidence.
- **Head start:** `0001_init_from_live_schema.sql` (this folder) is the live
  schema already reconstructed — Prompt 1 is mostly "verify, dump RLS policies,
  commit, prove on a fresh DB".

## Verified audit (12/06/2026, against the live DB)

| Claim | Verdict |
|---|---|
| Data write-only (specs/critiques/board responses unviewable after save) | Data confirmed trapped: 4 visions, 4 specs (critique + critic_model populated columns), 3 board_responses live in the DB |
| findings table dead | CONFIRMED — 0 rows ever; Evidence Standard check constraint (`verified/inference/unconfirmed`) exists unused |
| No refinement lineage | CONFIRMED — `specs` has only `vision_id`; no `parent_spec_id`/version column anywhere |
| No SQL schema in repo | CONFIRMED — schema exists only in the live project (hence the file beside this doc) |
| No unit tests / CI typecheck+build only | Not yet verified in-repo (session scope); treat as true per Phill |
| No export | Not yet verified in-repo; treat as true per Phill |

Also live in the same project: `knowledge_docs` — 1,193 rows (brain-1 vault sync target; healthy).

## The six prompts (feed in order, verbatim)

### 1 (P0) — Schema into the repo
> My database schema only exists in the live Supabase project — there are no migration files in the repo. Export the current schema into SQL migration files committed to the repo, so the whole database can be recreated from scratch. Done when running the migrations on a fresh, empty database reproduces every table, column and relationship the app uses today — and you've shown me the files.

### 2 (P0) — Build the read path
> The app saves specs, critiques and board responses to Supabase but has no way to read any of them back — refresh and they vanish from view. Build the read path: a way to list and reopen previously saved items from the database. Done when I can save something, refresh the page, and reopen it from a list.

### 3 — Wire up the Evidence Standard
> The findings table exists but nothing ever writes to it, and the Evidence Standard (extracting tagged claims and the assumption register) never runs. Wire it up: when a spec is generated, extract the tagged claims/assumptions, store them in findings, and surface them back to me in the UI. Done when generating a spec produces findings I can actually see and read.

### 4 — Refinement lineage
> When I re-run a refinement, it creates a disconnected vision/spec pair with no link to the version it came from. Add lineage: each refinement records its parent so there's a version chain. Done when I can re-run a spec and see which version each one descended from.

### 5 — Export
> A finished spec can only be copied, not downloaded. Add an export button so I can save a finished spec as a file (Markdown or PDF). Done when I click a button and get a file on my computer.

### 6 — Tests
> CI only typechecks and builds — there are no unit tests. Add unit tests for the parsers, and run them in CI. Done when the parsers have meaningful coverage and CI fails if a parser breaks.

## Implementation notes for the executing session

- Prompt 4 schema suggestion: `alter table specs add column parent_spec_id uuid references specs(id)` (+ same-pattern column on visions if re-runs create new visions); backfill nothing — lineage starts now.
- Prompt 3: the check constraint defines the tag vocabulary — the extractor must emit only `verified | inference | unconfirmed`.
- The 4 existing visions/specs and 3 board_responses are real founder data — never truncate or reseed over them.
- After all six are done: fold the app into the monorepo (suggested home `apps/spec-board/`) per `SOURCE-OF-TRUTH.md` one-repo policy and the convergence playbook.

## Fold-in completed — 15/06/2026

All six fix-prompts verified done in `CleanExpo/Fabel-Prompt-Engineer` before fold-in:

| # | Prompt | Evidence |
|---|---|---|
| 1 | Schema into repo | `supabase/migrations/0001_init…0005_enable_rls.sql` |
| 2 | Read path | `app/api/specs` GET → `listSpecs`; `page.tsx` Spec Library reopen |
| 3 | Evidence Standard → findings | `lib/findings.ts` parser + `lib/supabase.ts` `from("findings").insert(...)` + read |
| 4 | Refinement lineage | `supabase/migrations/0004_spec_lineage.sql` |
| 5 | Export | `page.tsx` `download()` → "Download .md" |
| 6 | Tests + CI | `tests/parsers.test.ts`, `tests/playbook.test.ts`; `ci.yml` (tsc + test + build) |

**Mechanic:** history-preserving `git subtree add --prefix=apps/spec-board` from
the local Fabel clone (branch `claude/great-brown-up2zvp`, HEAD `ca17bb7`).
Not a flat copy; not a root merge.

**Toolchain:** stays npm + Next.js 15, own `package-lock.json`. Root verify wired
as `npm run verify:spec-board` (`npm ci && npx tsc --noEmit && npm test && npm run build`).

**Untouched / deferred:** the live Fabel Supabase project (`yhteftfnoegmdkimzzjd`)
and its real founder data (visions/specs/board_responses, `knowledge_docs`) — the
fold-in is code-only. Env wiring stays separate; any database consolidation is a
later, gated decision. **No repo deletion** — `CleanExpo/Fabel-Prompt-Engineer`
stays live behind the cutover runbook's typed-approval hard-delete gate.

---
type: wiki
updated: 2026-05-15
---

# Spec — Brain-2 Sync Infrastructure (2026-05-15)

Brain-2 (`~/Synthex-Brain-2/`) has no Margot sync code. The `margot-align` skill description claims Margot reads BOTH brains, but only Brain-1 (`~/2nd Brain/2nd Brain/Wiki/`) has a sync script. Gap surfaced by Brain-2 audit agent 2026-05-15.

## Why this matters

- Margot is supposed to read portfolio-ops context (Brain-2) AND personal/strategic context (Brain-1) before research
- Today she only reads Brain-1 — Brain-2 content is **invisible** to every research session
- 25 md files in Brain-2 (PARA-style: `02-Projects/`, `04-Decisions/`, `05-Agents/`, `06-Brands/` etc) are orphaned from the Pi-CEO corpus
- Compounds every week Brain-2 grows; future research drifts from current portfolio-ops reality

## Three locked decisions

| # | Decision | Board-locked recommendation | Why |
|---|---|---|---|
| **D1** | Index shape — flat `index.md` overlay, per-folder `index.md`, or README + folders as-is? | **README + folders as-is** | Brain-2's PARA structure is deliberate per its `_meta/` setup. Forcing a flat Brain-1-style index breaks Obsidian graph view + Synthex Vision Board symlink. Sync script walks the folder tree; no overlay needed. |
| **D2** | Supabase target — extend `wiki_pages` with a `brain` column, or new `portfolio_ops_pages` table in a separate project? | **Extend `wiki_pages` with `brain` text column** | Lower friction. Adds 1 column + 1 migration. Margot's existing read path stays single-table. ID collisions resolved by composite `(brain, relative_path)` unique constraint. New separate project means another auth surface + another sync job + another row count to track. |
| **D3** | Sync script shape — copy Brain-1's flat `glob("*.md")` walker, or recursive walker keyed by relative path? | **Recursive walker, keyed by `(brain, relative_path)`** | Brain-2 has 4+ levels of nesting (`02-Projects/RA-2026-05-AppStore-Launch/runbook.md`). Flat glob misses everything. Relative path is the natural unique key — survives moves better than filename + parent. |

## Implementation plan (tight)

**One PR, ≤150 lines diff. 3 files touched.**

1. **Supabase migration** — `migrations/2026-05-15-add-brain-column-to-wiki-pages.sql`:
   ```sql
   ALTER TABLE wiki_pages ADD COLUMN brain TEXT NOT NULL DEFAULT 'brain-1';
   ALTER TABLE wiki_pages DROP CONSTRAINT IF EXISTS wiki_pages_pkey;
   ALTER TABLE wiki_pages ADD CONSTRAINT wiki_pages_pkey PRIMARY KEY (brain, slug);
   CREATE INDEX wiki_pages_brain_idx ON wiki_pages(brain);
   ```
   Default `'brain-1'` backfills the existing 137 rows. Brain-2 rows get `'brain-2'` on insert.

2. **New `sync_brain2_to_supabase.py`** at `~/Pi-CEO/Pi-Dev-Ops/scripts/` — recursive walker, ≤80 lines, mirrors `sync_wiki_to_supabase.py` shape but:
   - Walks `~/Synthex-Brain-2/**/*.md` (recursive)
   - Skips: `_meta/`, `Templates/`, `Archive/` (per `.brain-2-syncignore` convention)
   - Slug = `relative_path` (e.g. `02-Projects/RA-2026-05-AppStore-Launch/runbook.md`)
   - Upserts to `wiki_pages` with `brain='brain-2'`

3. **`margot-align` skill update** — extend to call BOTH syncs sequentially:
   ```python
   # ~/.claude/skills/margot-align/SKILL.md (existing) — append a step:
   # Step 4: sync Brain-2
   SUPABASE_SERVICE_ROLE_KEY=$(...) python3 ~/Pi-CEO/Pi-Dev-Ops/scripts/sync_brain2_to_supabase.py
   ```

## Test plan
- [ ] Migration applies cleanly on Supabase `lksfwktwtmyznckodsau` (Brain-1's project)
- [ ] Existing 137 Brain-1 rows backfilled with `brain='brain-1'`
- [ ] Brain-2 first sync upserts ~25 rows with `brain='brain-2'`
- [ ] Margot can query `SELECT * FROM wiki_pages WHERE brain='brain-2'` cleanly
- [ ] `margot-align` skill runs both syncs without error

## Sequencing

**NOT urgent.** Sequence AFTER:
- Mon 18 May 10:00 AEST CCW demo (sprint-window discipline per `[[feedback-substrate-change-discipline]]` #5)
- W1B cutover Tue 19 May 18:00 AEST
- Skills cleanup Phase 2 (Tue 19 May 18:00 AEST gate)

Earliest reasonable fire: **Wed 20 May 2026.** Effort: ~2h Phill-attention or ~1h agent. Reversible (drop the column + delete the script).

## Open question (out of scope)

Brain-2's `06-Brands/` folder likely overlaps with `Synthex/packages/brand-config/src/brands/*.ts` (the canonical BrandConfig). Single-source-of-truth question — should Brain-2 reference the TypeScript canonical or maintain its own brand notes? Defer to a separate spec.

## Cross-refs

`[[margot-align]]` (skill that's supposed to read both brains) · `[[feedback-substrate-change-discipline]]` (Discipline 5 = sprint-window lock) · `[[feedback-quality-over-quantity]]` (verify counts post-sync) · `[[supabase-postgres-best-practices]]` (RLS + column add safety) · `[[feedback-tight-code]]` (≤150 line diff bar) · the Brain-1 sync agent's output 2026-05-15 (137 rows synced) · the Brain-2 audit agent's blocked report 2026-05-15

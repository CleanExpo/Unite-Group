# Scoped Pi-CEO reference workspace

> `apps/empire` is retained inside the canonical Unite-Group monorepo for
> historical Pi-CEO/Margot reference. New product work belongs in `apps/web`.
> The canonical portfolio registry is `../../.portfolio/PORTFOLIO.yaml`.

## Identity (SSOT)
**Historical name:** Authority-Site
**Aliases this project answers to:** "Empire Command Center", "CEO Dashboard", "Synthex Authority Hub", "Unite-Group Dashboard", "Empire", "Authority Site"
**Canonical local path:** `apps/empire/` within the current Unite-Group checkout
**GitHub:** `CleanExpo/Unite-Group`

> Unite-Hub is deleted; `apps/web` is the CRM and command-centre authority. Only
> operate in this retained reference app when the task explicitly names Empire,
> legacy Pi-CEO material, or a porting comparison.

---

This is a scoped historical workspace. Only edit it when a task explicitly
targets retained Empire/Pi-CEO reference material; new CRM/product work belongs
in `apps/web`. Follow the monorepo root instructions and do not infer authority
from the former standalone layout.

## Database changes — Supabase branching (load-bearing)

Every Unite-Group schema change, migration, or DB-writing experiment is
validated on a **Supabase database branch** before it reaches prod. There is
**no standing sandbox project** — the old mirror sandbox (`xgqwfwqumliuguzhshwv`)
was deleted ~15/06/2026 and **will not be replaced**. The `sandbox-wizard.sh`
toolchain that mirrored it has been removed.

### The workflow

1. Write the migration in `apps/web/supabase/migrations/` — one PR, based on
   the latest `main`.
2. **Validate on a Supabase database branch.** The ephemeral per-branch DB
   replays the migrations from `supabase/migrations/`. Create it via the
   Supabase GitHub integration or `create_branch` (Supabase CLI / MCP). Verify
   the schema + any data behaviour there. **Never validate against prod.**
3. **Promote to prod** (`lksfwktwtmyznckodsau`) only by merging the branch, and
   only with Phill's explicit typed approval. **No agent writes to prod
   autonomously — ever.**

### Hard lines

- Never run `psql`, `supabase db push`, or the Supabase MCP `apply_migration`
  against **prod** directly. Prod schema moves only via a merged, approved branch.
- If a database branch fails to provision (prod's migration history has not
  always been fully reproducible from `supabase/migrations/`), **fix the
  migration baseline** — do NOT fall back to applying on prod as a workaround.
- A schema / DB-writing claim is `[UNCONFIRMED]` until a branch run proves it.
- The 1Password `UNITE_GROUP_SANDBOX_DB_PASSWORD` item is now orphaned and can
  be removed; `SUPABASE_ACCESS_TOKEN` + `UNITE_GROUP_DB_PASSWORD` remain in use.

## Continual Learning

This repo emits signal to `.harness/learning/*.jsonl` for the weekly
distillation routine (RA-1745). If you notice something the system should
learn from, append a structured entry — do not stop work to reason about
meta-rules. Schema and consumer per RA-1745. See
`.harness/learning/README.md` for the five log files and entry shape.

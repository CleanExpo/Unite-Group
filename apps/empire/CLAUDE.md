# Scoped Pi-CEO workspace

@../Unite-Hub/.portfolio/PORTFOLIO.yaml

## Identity (SSOT)
**Canonical name:** Authority-Site
**Aliases this project answers to:** "Empire Command Center", "CEO Dashboard", "Synthex Authority Hub", "Unite-Group Dashboard", "Empire", "Authority Site"
**Canonical local path:** `D:\Authority-Site`
**Access via:** `D:\Unite-Group\Authority-Site` (junction)
**GitHub:** `CleanExpo/Unite-Group`

> **Sibling product:** Unite-Hub (the CRM at `D:\Unite-Hub`) is a SEPARATE product.
> If the user says "Unite-Group" or "Unite Group" generically, they MOST LIKELY mean Unite-Hub (the CRM).
> Only operate in THIS project if the user references Empire, CEO dashboard, Pi-CEO, or portfolio metrics.
>
> Registry: see `D:\Unite-Hub\.portfolio\PORTFOLIO.yaml` (the single source of truth for both products).

---

This is an isolated autonomous workspace. Only read and edit files
inside this directory. Do not walk upward into parent directories.

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

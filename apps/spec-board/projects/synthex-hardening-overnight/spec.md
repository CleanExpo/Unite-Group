# Spec — Overnight hardening of the 4 open items (Synthex + Unite-Group deploy)

> Produced by the `fable-engine` skill. Evidence Standard tags: `[VERIFIED]`
> (checkable source/observation), `[INFERENCE]` (named derivation),
> `[UNCONFIRMED]` (in the risk register). Framing: **authorised defensive
> security + reliability hardening of the founder's own systems.** The system
> proposes; the founder approves. Nothing external is switched without a gate.

## 1. Finish line

**Done when:** (a) the two reversible Synthex database hardening migrations are
applied and re-verified by the security advisor; (b) the `anon`-executable
arbitrary-SQL functions can no longer be called by `anon`/`authenticated`;
(c) Synthex has a single baseline migration that rebuilds the live schema on a
fresh database; and (d) the Unite-Group production deploy is green — with every
step that needs a human (Vercel dashboard, 5 table-access decisions) reduced to
a one-click checklist.

## 2. Decision up front

Run this as **one overnight agent batch for the reversible, pre-validated DB
work** (the SECURITY DEFINER lockdown + the migration baseline), using the same
**dry-run-on-prod → apply → re-verify** pattern we already used twice tonight.
**Hold two items for a human**: the Vercel Root Directory change (no API access
from the agent; 30-second dashboard action) and the 5 undecided tables (need
your access intent). The agent prepares everything for both so they're one click
each in the morning.

## 3. Goals & non-goals

**Goals**
- Remove the unauthenticated arbitrary-SQL execution path. `[VERIFIED]`
- Close the remaining decided RLS gaps; leave only what truly needs your call.
- Make Synthex's schema reproducible from migrations (DR). `[VERIFIED]` it isn't today.
- Get Unite-Group production deploying again.

**Non-goals**
- No app/code changes in the Synthex product repo (not in this workspace). `[VERIFIED]`
- No data migration, no truncation, no reseed. Policies/grants/DDL only.
- No repo/Vercel/Supabase deletion. No secret or env edits.
- Not redesigning Synthex's (inconsistent) tenancy model — only applying its existing conventions.

## 4. Approach

Four workstreams, ordered by severity. Each DB change is validated by a
transaction dry-run on prod (BEGIN…RAISE…ROLLBACK — commits nothing) before a
real `apply_migration`, then re-verified by querying `pg_policies` /
`has_function_privilege` / the security advisor. All reversible.

## 5. Phased plan (smallest/highest-severity first)

### Phase 0 — P0 SECURITY: revoke arbitrary-SQL functions from anon  `[AGENT, overnight]`
- **Evidence:** `exec_migration_sql`, `exec_migration_batch`, `exec_migration_stmts`
  are `SECURITY DEFINER`, owner `postgres`, and `has_function_privilege('anon', …,'EXECUTE')='true'`. `[VERIFIED]`
- **Build:** `REVOKE EXECUTE ON FUNCTION public.exec_migration_sql(...), ... FROM anon, authenticated, public;`
  Then sweep the remaining ~179 `SECURITY DEFINER` public functions and revoke
  `anon`/`authenticated` EXECUTE from any that are not deliberately RPC-exposed.
  `[INFERENCE]` (from advisor: 182 anon + 182 authenticated findings, 179 distinct).
- **Guardrail:** allow-list functions the app legitimately calls from the client
  before revoking, so we don't break a real RPC. Dry-run lists every function
  whose grant would change → review that list before the apply.
- **DoD:** `has_function_privilege('anon', f,'EXECUTE')=false` for the exec_* family
  and every non-RPC definer function; advisor `*_security_definer_function_executable` count drops.

### Phase 1 — pin function search_path  `[AGENT, overnight]`
- **Evidence:** 390 `function_search_path_mutable` advisor findings. `[VERIFIED]`
- **Build:** `ALTER FUNCTION … SET search_path = public, pg_temp;` across flagged functions (idempotent loop).
- **DoD:** `function_search_path_mutable` advisor count → 0 (or only intentional exceptions).

### Phase 2 — Synthex migration baseline / DR  `[AGENT, overnight]`
- **Evidence:** branch rebuild = `MIGRATIONS_FAILED`, 0/280 tables reproduced. `[VERIFIED]`
- **Build:** generate `00000000000000_baseline_from_live_schema.sql` by dumping
  the live `public` schema (tables, columns, constraints, RLS, policies,
  functions), commit it as the first migration so a fresh DB reproduces today's
  schema. (Same move as Fable's own P0 "schema into the repo".) `[INFERENCE]`
- **Guardrail:** baseline is **additive bookkeeping** — it does not run against
  prod; it is verified by creating a throwaway branch from it and confirming table parity.
- **DoD:** a fresh branch built from the baseline reports the full public table set (not 0).

### Phase 3 — finish the decided RLS gaps  `[AGENT, overnight]`
- The 9 service-role-only tables stay deny-all (correct). `[VERIFIED]`
- No new owner-scoped tables remain after tonight's two migrations (52→14). `[VERIFIED]`
- This phase only re-runs the advisor to confirm `rls_enabled_no_policy` is the expected 14.

### Phase 4 — Unite-Group production deploy  `[HUMAN, 30s]`
- **Evidence:** root has no buildable Next app; Vercel Root Directory must be
  `apps/web` (cutover runbook Step 1). `apps/web` builds clean. `[VERIFIED]`
- **Human action:** Vercel → `unite-group` + `unite-group-sandbox` → Settings →
  Build & Deployment → **Root Directory = `apps/web`** → redeploy. No agent path (no Vercel API access). `[VERIFIED]`
- **DoD:** both Vercel deployments green; `unite-group.in` serves the merged app.

## 6. Data model
No schema *shape* changes except Phase 2's baseline capture. Phases 0–1 change
privileges; Phase 3 is read-only verification. No tables/columns added or dropped. `[VERIFIED]`

## 7. Security & cost guardrails
- Every DB mutation: prod dry-run (rollback) → apply → re-verify. Already proven twice tonight. `[VERIFIED]`
- REVOKE phase is **allow-list gated** — the agent pauses and surfaces the
  changed-grant list if any function is ambiguous (could be a real RPC). `[structural]`
- No secrets, env vars, or Vercel settings touched by the agent. `[VERIFIED]`
- Branch for Phase 2 verification ≈ US$0.013/hr, deleted immediately after. `[VERIFIED]`
- Everything reversible: `GRANT` back, `drop policy`, baseline is a file.

## 8. Risk & assumption register
| # | Risk / assumption | Tag | Mitigation |
|---|---|---|---|
| R1 | Some `SECURITY DEFINER` funcs are legitimate client RPCs; revoking breaks them | `[UNCONFIRMED]` | Allow-list + dry-run diff reviewed before apply; revoke only confirmed-non-RPC |
| R2 | `pg_dump`-style baseline may miss objects (extensions, triggers, grants) | `[UNCONFIRMED]` | Verify by building a throwaway branch from the baseline and diffing table/policy counts |
| R3 | Overnight unattended apply of P0 revoke could block a cron that calls a definer func as anon | `[UNCONFIRMED]` | Prefer authenticated/service_role paths; stage Phase 0 behind the allow-list review |
| R4 | "Overnight autonomous" partially conflicts with human-in-the-loop on external action | `[VERIFIED]` (CLAUDE.md) | Only reversible DB work runs unattended *after* your pre-approval; Vercel + table decisions stay human |

## 9. Open questions (answerable in one click each)
1. **Pre-authorise the overnight agent batch** (Phases 0–3, reversible, dry-run-gated) to run unattended? Yes / No.
2. **Phase 0 revoke scope:** revoke from `anon` only, or `anon`+`authenticated`? (Recommend both; service_role unaffected.)
3. **`waitlist_entries`** (3 cols, collects sign-ups `[INFERENCE]`): public can INSERT, admin-only read? Or fully service-role?
4. **`blog_posts`** (24 cols): public read of *published* rows, author-only write? Or service-role only?
5. **`hashtag_performance` / `report_deliveries` / `story_quality_reviews`:** global-reference read, per-user, or service-role-only?

## 10. Sources `[VERIFIED]`
- Supabase security advisor, project `znyjoyjsvjotlzjppzal` (812 findings).
- `pg_proc` / `has_function_privilege` query: exec_migration_* are SECURITY DEFINER, anon-executable.
- `pg_policies` verification: `rls_enabled_no_policy` 52→14 after tonight's two migrations.
- `list_branches`: main + test branch `MIGRATIONS_FAILED`; branch had 0 public tables.
- `docs/convergence/cutover-and-deletion-runbook.md` Step 1 (Vercel Root Directory).
- `apps/spec-board/CLAUDE.md` standing rule: human-in-the-loop, no autonomous external action.

`[STATUS] gate: approved 15/06/2026 — overnight batch authorised (anon+authenticated revoke; 5 tables service-role-only)`

---

## Execution log — 15/06/2026 (applied to Synthex `znyjoyjsvjotlzjppzal`)

| Phase | Action | Migration / state | Verified |
|---|---|---|---|
| 0 (P0) | Revoke EXECUTE on `exec_migration_sql(text)`, `exec_migration_batch(text)`, `exec_migration_stmts(jsonb)` from `public, anon, authenticated` | `revoke_anon_exec_arbitrary_sql_functions` | `has_function_privilege('anon'/'authenticated', …)=false`; `service_role=true` ✅ |
| 0 (excluded) | `is_workspace_admin(uuid)` left intact — it's an RLS permission-check helper (revoking would break policies) | — | reasoning recorded ✅ |
| 1 | Pin `search_path = public, extensions, pg_temp` on app-owned public functions lacking it | `pin_function_search_path_390` (390 pinned, 0 skipped; extension-owned excluded) | `app_funcs_still_mutable=0`; `funcs_now_pinned=395` ✅ |
| 3 | 5 undecided tables → service-role-only | no change (RLS-on + no-policy = deny-all already) | `rls_enabled_no_policy=14` ✅ |

### Still open after the batch
- **Phase 2 — DR baseline (NOT done from sandbox).** Run where the DB URL + Supabase CLI exist:
  ```bash
  supabase db dump --db-url "$SYNTHEX_DB_URL" --schema-only \
    -f supabase/migrations/00000000000000_baseline_from_live_schema.sql
  # verify: create a throwaway branch from it and confirm public table parity (≈280)
  ```
- **178 other `anon`-executable SECURITY DEFINER functions** — need the Synthex app's RPC allow-list (app code not in this workspace) before safe revocation. Do NOT blanket-revoke (would break legit RPCs/RLS helpers like `is_workspace_admin`).
- **Dashboard/config-only items** (no SQL path): enable leaked-password protection; make `avatars` bucket non-listing; upgrade Postgres (`17.4.1.064` → patched); Vercel Root Directory = `apps/web`.
- **5 tables' real access model** — revisit when you have the product intent.

# Synthex RLS Leak Fixes — Proposal — 2026-05-16

**Phase**: 1g of Synthex Finalisation Arc
**Status**: PROPOSAL — research only. No DDL executed against prod. No code committed. No PR opened.
**Parent**: [[synthex-rls-baseline-2026-05-16]]
**Project**: Supabase `znyjoyjsvjotlzjppzal` (Synthex, ap-southeast-1)
**Decision gate**: Phill approves shape → separate phase implements the migration.

---

## Scope clarification (brief said "4 leaks")

The Phase 1a baseline classifies the leaks in two buckets:

- **4 OPEN-TRUE leaks** (`permissive_open`): `agent_task_queue`, `client_videos`, `edge_function_logs`, `seasonal_signals` — all have a literal `USING (true)` policy.
- **1 content-predicate leak** (`exposed_unscoped_uncertain`): `clients` — `USING (active = true)`, only safe today because no rows have `active=true`.

The Phase 1g brief named **agent_task_queue, edge_function_logs, clients** explicitly and asked me to identify "the 4th". Reading the baseline literally, the 4th of the OPEN-TRUE leaks is either `client_videos` or `seasonal_signals`. To avoid guessing, **I cover all 5 in this proposal** — Phill picks which subset lands in the single migration.

---

## House RLS pattern (canonical, verified from prod)

Reference: `supabase/migrations/20260319000001_rls_comprehensive_all_tables.sql` (50+ org-scoped tables use this exact shape).

```sql
CREATE POLICY "<name>" ON public.<table>
  FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()::text
  ));
```

Key facts (verified by live pg_proc / pg_policy queries):

- `auth.uid()` is cast to `text` (not uuid) because Synthex `public.users.id` is `text`.
- A `SECURITY DEFINER STABLE` helper exists in prod: `public.is_team_member(row_org_id text) RETURNS boolean` — checks `team_members.user_id = auth.uid()::text AND team_members.organization_id = row_org_id`. Safe to use in policies.
- `clients` and `client_videos` are **not in `prisma/schema.prisma`** — Supabase-only tables created via raw SQL migration. Patches must therefore live in `supabase/migrations/`, not `prisma/migrations/`.

---

## The 5 tables — current policy → recommended replacement

### 1. `agent_task_queue` — replace `USING (true)` with `created_by` ownership

**Tenant column**: `created_by` (uuid, nullable, FK → `auth.users.id`). There is **no `organization_id` column** on this table (the baseline mis-stated this — verified via `information_schema.columns`).

**Current SELECT policy (verbatim from prod `pg_policy`):**
```sql
-- polname: "Public can view agent tasks"
-- roles: -- (PUBLIC — anon + authenticated + everyone)
-- cmd: SELECT
CREATE POLICY "Public can view agent tasks"
  ON public.agent_task_queue
  FOR SELECT
  USING (true);
```

**Recommended replacement:**
```sql
DROP POLICY "Public can view agent tasks" ON public.agent_task_queue;

-- Authenticated users see only tasks they created.
-- created_by aligns with the existing INSERT policy (auth.uid() = created_by).
CREATE POLICY "users_select_own_agent_tasks"
  ON public.agent_task_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Service role keeps full access (queue worker, admin dashboards) via existing service_role grant + service_role bypass.
```

**Behaviour change**: Anonymous SELECT goes from "all rows" → "0 rows". Authenticated SELECT scopes to tasks the caller created. **No admin dashboard exists today** that depends on cross-user visibility (table is empty in prod). If one is built later, it must use the service role.

---

### 2. `edge_function_logs` — restrict to service_role only (deny_by_default for authenticated)

**Tenant column**: none. `client_id` is nullable and most rows are aggregate (per `EdgeFunctionLog` Prisma docstring: *"Null for aggregate rows (current pattern)"*).

**Current policies (verbatim):**
```sql
-- polname: "authenticated_select"
-- roles: {authenticated}
-- cmd: SELECT
CREATE POLICY "authenticated_select"
  ON public.edge_function_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- polname: "service_role_all"  (kept)
-- roles: {service_role}
-- cmd: ALL
```

**Recommended replacement:**
```sql
DROP POLICY "authenticated_select" ON public.edge_function_logs;
-- No replacement SELECT policy for authenticated.
-- Service role retains full access via existing service_role_all policy.
-- Result: authenticated users get zero rows (deny-by-default).
```

**Behaviour change**: Authenticated SELECT goes from "all rows" → "0 rows". The intended consumer (`/api/health/pipelines`) is server-only and runs as service role — confirmed by the table's `function_name + created_at DESC` index naming and the Prisma docstring. **If** a future feature needs per-org log views, the right pattern is:

```sql
-- (Future, NOT in this migration)
CREATE POLICY "team_members_read_org_logs"
  ON public.edge_function_logs
  FOR SELECT TO authenticated
  USING (client_id IS NOT NULL AND is_team_member(client_id::text));
```

But that's a feature, not a leak fix. Out of scope for Phase 1g.

---

### 3. `clients` — drop permissive base-table policy, add a public view

**Tenant column**: `user_id` (text, NOT NULL). No `organization_id` column.

**Current policies (verbatim):**
```sql
-- polname: "public_read_active_clients"  (THE LEAK)
-- roles: {anon, authenticated}
-- cmd: SELECT
CREATE POLICY "public_read_active_clients"
  ON public.clients
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- polname: "users_manage_own_clients"  (KEEP — legitimate per-owner access)
-- roles: {authenticated}
-- cmd: ALL
-- using: (user_id = auth.uid()::text)
-- with_check: (user_id = auth.uid()::text)

-- polname: "service_role_all_clients"  (KEEP)
-- roles: {service_role}
```

**Recommended replacement — drop the permissive policy and replace with a curated public view:**

```sql
-- Step 1: kill the permissive base-table read
DROP POLICY "public_read_active_clients" ON public.clients;

-- Step 2: expose a curated, column-restricted public view for the marketing directory.
-- Base table remains locked to user_id-scoped owners + service_role.
CREATE OR REPLACE VIEW public.clients_public AS
SELECT
  id,
  slug,
  name,
  url,
  industry,
  address_city,
  address_state,
  address_country,
  geo_lat,
  geo_lng,
  logo_url,
  description
FROM public.clients
WHERE active = true;

-- Lock down view ownership so it runs as the view owner (default — service-role
-- credentials in Supabase), bypassing RLS on the base table. Then grant SELECT
-- to anon/authenticated so PostgREST exposes /rest/v1/clients_public.
ALTER VIEW public.clients_public OWNER TO postgres;
REVOKE ALL ON public.clients_public FROM PUBLIC;
GRANT SELECT ON public.clients_public TO anon, authenticated;

COMMENT ON VIEW public.clients_public IS
  'Curated public marketing directory of active clients. Base-table clients has user_id-scoped RLS.
   This view exposes a fixed column subset only — no telephone, no opening_hours, no email,
   no internal fields. SYN-RLS-LEAK-001 / wiki: synthex-rls-leak-fixes-2026-05-16.';
```

**Why view-not-policy** (recommended): a base-table `USING (active = true)` policy is brittle — anyone with INSERT/UPDATE rights (the owning user) can flip `active=true` and instantly publish every column (telephone, address_street, opening_hours_json) to anon. A view forces the publishable column set into schema, so a future column added to `clients` does NOT auto-leak.

**Behaviour change**: any code reading `clients` filtered by `active=true` from an anonymous PostgREST call must switch to `clients_public`. Search Synthex for `from('clients').*active.*true` and `clients?active=eq.true` — if any frontend code uses this directly, it gets a route rename. If the only consumers are server-side (service role), no code change needed.

---

### 4. `client_videos` — restrict to client owner via `clients.user_id`

**Tenant column**: `client_id` (text, NOT NULL, FK → `clients.id`). Scope via the parent `clients.user_id`.

**Current policies (verbatim):**
```sql
-- polname: "public_read_client_videos"  (THE LEAK)
-- roles: {anon, authenticated}
-- cmd: SELECT
CREATE POLICY "public_read_client_videos"
  ON public.client_videos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- polname: "service_role_all_cv"  (KEEP)
-- roles: {service_role}
```

**Recommended replacement — two options, Phill picks:**

**Option A (recommended if videos are private to the client owner):**
```sql
DROP POLICY "public_read_client_videos" ON public.client_videos;

CREATE POLICY "users_select_own_client_videos"
  ON public.client_videos
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()::text
    )
  );
```

**Option B (if videos are intentionally part of the public marketing directory):**
```sql
DROP POLICY "public_read_client_videos" ON public.client_videos;

CREATE OR REPLACE VIEW public.client_videos_public AS
SELECT cv.id, cv.client_id, cv.youtube_video_id, cv.title, cv.description,
       cv.thumbnail_url, cv.published_at, cv.view_count
FROM public.client_videos cv
JOIN public.clients c ON c.id = cv.client_id
WHERE c.active = true;

REVOKE ALL ON public.client_videos_public FROM PUBLIC;
GRANT SELECT ON public.client_videos_public TO anon, authenticated;
```

**Recommendation**: Option A is the safer default. Take Option B only if a product owner confirms the marketing site loads YouTube embeds via PostgREST anon. Default to A; flip to B if a frontend grep shows anon usage.

---

### 5. `seasonal_signals` — global catalogue; downgrade leak severity, document

**Tenant column**: none — it's a global per-industry × per-state market signal catalogue (e.g. "Winter Pipe Season — VIC plumbing"). No `organization_id`.

**Important**: live `pg_policy` shows `seasonal_signals_read` is granted to `{authenticated}` only — **not `anon`**. So this is a smaller leak than the others: only cross-tenant authenticated read, not anon read. Still a leak (Tenant A sees Tenant B's catalogue subscription cohort), but lower severity.

**Current policy:**
```sql
-- polname: "seasonal_signals_read"
-- roles: {authenticated}
-- cmd: SELECT
CREATE POLICY "seasonal_signals_read"
  ON public.seasonal_signals
  FOR SELECT
  TO authenticated
  USING (true);
```

**Two valid resolutions:**

**Option A — keep as global catalogue, document explicitly:**
```sql
-- No DDL change. Add a documenting comment so the next auditor doesn't re-flag it.
COMMENT ON POLICY "seasonal_signals_read" ON public.seasonal_signals IS
  'INTENTIONAL CROSS-TENANT READ: seasonal_signals is a global per-industry × per-state
   market signal catalogue (no organization_id). All authenticated users see the same
   rows. Per-org personalisation lives in seasonal_signal_dismissals, which IS org-scoped.
   SYN-RLS-LEAK-001 / wiki: synthex-rls-leak-fixes-2026-05-16.';
```

**Option B — require team membership in at least one org:**
```sql
DROP POLICY "seasonal_signals_read" ON public.seasonal_signals;

CREATE POLICY "seasonal_signals_read_team_members"
  ON public.seasonal_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid()::text)
  );
```

**Recommendation**: Option A. A signed-in user with no team membership has no use for industry calendars, but the user-experience cost of Option B at signup (catalogue disappears until you join an org) is real. Option A is honest + auditable. Re-add to the validator as an explicit exempt.

---

## PR plan

**Single migration file path** (Supabase migrations, not Prisma — `clients`/`client_videos` are Supabase-only tables):

```
supabase/migrations/20260516000001_syn_rls_leak_001_fix_open_true_policies.sql
```

Migration content (per Phill's selection of which subset to ship):

1. `BEGIN;`
2. `DROP POLICY "Public can view agent tasks" ON public.agent_task_queue;` + new owner-scoped SELECT policy.
3. `DROP POLICY "authenticated_select" ON public.edge_function_logs;` (no replacement — deny-by-default).
4. `DROP POLICY "public_read_active_clients" ON public.clients;` + `CREATE OR REPLACE VIEW public.clients_public ...` + grants.
5. `DROP POLICY "public_read_client_videos" ON public.client_videos;` + Option A or B per Phill's call.
6. (Optional) `seasonal_signals` — Option A comment, or Option B `is_team_member` gate.
7. `COMMIT;`

**Expected behaviour change** (summary):

| Surface | Before | After |
|---|---|---|
| Anon GET `/rest/v1/agent_task_queue` | 200 / all rows | 200 / 0 rows |
| Authenticated GET own tasks | all rows | only `created_by = self` |
| Anon GET `/rest/v1/edge_function_logs` | (already denied by `authenticated_select` role list — no change for anon) | unchanged |
| Authenticated GET edge_function_logs | all rows | 0 rows |
| Anon GET `/rest/v1/clients?active=eq.true` | all active rows | 401/empty depending on PostgREST |
| Anon GET `/rest/v1/clients_public` | n/a | active rows, restricted columns |
| Anon GET `/rest/v1/client_videos` | all rows | 0 rows (Option A) / view (Option B) |
| Authenticated GET seasonal_signals | all rows | unchanged (Option A) / team-only (Option B) |

**Rollback plan** (in same migration as commented block):
```sql
-- ROLLBACK (do not run unless approved):
-- BEGIN;
-- CREATE POLICY "Public can view agent tasks" ON public.agent_task_queue FOR SELECT USING (true);
-- CREATE POLICY "authenticated_select" ON public.edge_function_logs FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "public_read_active_clients" ON public.clients FOR SELECT TO anon, authenticated USING (active = true);
-- CREATE POLICY "public_read_client_videos" ON public.client_videos FOR SELECT TO anon, authenticated USING (true);
-- DROP VIEW IF EXISTS public.clients_public;
-- DROP VIEW IF EXISTS public.client_videos_public;
-- COMMIT;
```

The migration is **non-destructive** — drops policies + adds policies/views. No data loss. Rollback is one SQL statement per dropped policy.

---

## Adversarial probe protocol

Phase 1a's CHANGE-MY-MIND noted that `SET LOCAL ROLE anon` inside the Supabase MCP service-role session may not perfectly emulate a real PostgREST anon-key REST call. The real probe must use the published `SUPABASE_ANON_KEY` against the live PostgREST endpoint.

For each patched table, run **before and after** the migration:

```bash
# 1. Anon REST probe (real PostgREST request, real anon JWT)
ANON_KEY="$(supabase status -o json | jq -r '.api.anon_key')"
PROJECT_URL="https://znyjoyjsvjotlzjppzal.supabase.co"

for tbl in agent_task_queue edge_function_logs clients client_videos seasonal_signals; do
  echo "=== $tbl (anon) ==="
  curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
    "$PROJECT_URL/rest/v1/$tbl?select=*&limit=5" | jq 'length // .'
done

# 2. Authenticated probe (real signed-in user JWT — needs a test user)
# Mint via supabase.auth.signInWithPassword({ email, password })
USER_JWT="<paste>"
for tbl in agent_task_queue edge_function_logs seasonal_signals; do
  echo "=== $tbl (authenticated user) ==="
  curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_JWT" \
    "$PROJECT_URL/rest/v1/$tbl?select=*&limit=5" | jq 'length // .'
done

# 3. Confirm clients_public view works for anon
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$PROJECT_URL/rest/v1/clients_public?select=*&limit=5" | jq 'length // .'
```

Pass criteria:

- Pre-migration: every leak table returns >0 rows for anon (or any for empty-but-permissive — confirm response is 200 with `[]` not 401).
- Post-migration:
  - `agent_task_queue`, `edge_function_logs`, `client_videos` (Option A): anon returns `[]`; authenticated test user returns only their own rows (or `[]` for edge_function_logs).
  - `clients`: anon returns `[]` on `/rest/v1/clients?active=eq.true`; anon returns rows on `/rest/v1/clients_public`.
  - `seasonal_signals` Option A: authenticated still returns rows (intentional).

**Lesson from Phase 1a**: do not rely on `SET LOCAL ROLE anon` inside the MCP service-role session for the post-migration probe. The above curl-based probe is the source of truth.

---

## Verification ledger

- **DID**: read the Phase 1a baseline; queried prod `pg_policy` and `information_schema.columns` for all 5 named tables; confirmed `is_team_member(text)` exists in prod as SECURITY DEFINER STABLE; located the canonical org-scoped RLS pattern in `supabase/migrations/20260319000001_rls_comprehensive_all_tables.sql`; corrected the baseline's mis-statement that `agent_task_queue` has `organization_id` (it does not — only `created_by` uuid).
- **VERIFIED** — three independent prod SQL queries:
  - `pg_policy` query returned 11 rows across the 5 tables — exact policy text matches what's quoted above verbatim.
  - `pg_proc` query confirms `is_team_member(row_org_id text)` exists in prod, `prosecdef=true`, language=sql, STABLE.
  - `information_schema.columns` confirms tenant columns: `agent_task_queue.created_by uuid`, `clients.user_id text`, `client_videos.client_id text`, `edge_function_logs.client_id uuid (nullable)`, `seasonal_signals` has no tenant column.
- **WHAT WOULD CHANGE MY MIND**:
  1. If a frontend grep shows anon code paths calling `/rest/v1/clients` or `/rest/v1/client_videos` directly (not via view), then dropping the permissive policies breaks marketing site rendering — the migration must ship paired with frontend changes. I did **not** grep the Synthex frontend for these calls — that's the next sub-task before the migration lands.
  2. If `is_team_member()` is referenced by other live policies (e.g. `authority_scores`) and its definition turns out to be wider than the prod definition above (e.g. it falls back to `true` for missing rows), reusing it is unsafe. Need a separate `is_team_member` runtime probe before phase 1g-impl ships.
  3. If `clients` has any column not listed in my proposed `clients_public` view that the marketing site needs (e.g. `telephone` for "click-to-call"), the view definition needs to widen. Confirm column set with product owner before merge.
  4. If Phill's "4th leak" was specifically meant to be **only one** of `{client_videos, seasonal_signals}` and not both, the migration is smaller. The proposal above covers both for completeness — Phill strikes whichever doesn't apply.

---

## Open questions for Phill (decision gate)

1. **Which of the 4 OPEN-TRUE leaks ship together?** All 4 (agent_task_queue, edge_function_logs, client_videos, seasonal_signals) + clients view = 5 patches in one migration. Or split.
2. **`client_videos` — Option A (private) or Option B (public view)?** Default recommend A.
3. **`seasonal_signals` — Option A (keep, comment) or Option B (team-membership gate)?** Default recommend A.
4. **`clients_public` view column set** — proposed: `id, slug, name, url, industry, address_city, address_state, address_country, geo_lat, geo_lng, logo_url, description`. Add `telephone` / `opening_hours_json` if the marketing site needs them.
5. **Should the migration also extend `scripts/validate-rls-coverage.ts`** (Phase 1a recommended action #4) to fail on `USING (true)` policies attached to `anon`/`authenticated`? Defer to Phase 1g-impl or fold in here.

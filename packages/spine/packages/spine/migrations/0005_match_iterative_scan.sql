-- 0005 — CONDITION 3: the match_* RPCs pin the HNSW scan GUCs so tenant/metadata-filtered recall is
-- COMPLETE (no silent under-return). GUCs are set via FUNCTION-LEVEL SET CLAUSES (not body set_config).
--
-- WHY four GUCs, and WHY as SET clauses (both points caught by the C3 adversarial load test —
-- see tests/c3_load_completeness.test.sql; all verified live on the sandbox):
--
--   1. hnsw.iterative_scan='strict_order' alone is NOT a completeness guarantee. pgvector applies
--      post-index filters (org_id / metadata / threshold / the RLS policy qual) AFTER the approximate
--      index scan, so iterative scan re-enters the graph — BUT only until it has examined
--      hnsw.max_scan_tuples tuples (DEFAULT 20000) or exhausted hnsw.scan_mem_multiplier*work_mem of
--      candidate memory. If a tenant's true matches rank globally beyond those bounds (a low-density
--      tenant sharing the index with a high-density one — the textbook multi-tenant case), strict_order
--      STILL silently returns fewer rows than exist. Verified: a target whose matches sit past the cap
--      returned 1/12; raising the cap returned 12/12. So we pin max_scan_tuples and scan_mem_multiplier too.
--
--   2. These MUST be function-level SET clauses, NOT `perform set_config(...,true)` in a plpgsql body.
--      A body set_config(...,is_local=true) is overridden by any ambient transaction-level SET LOCAL of
--      the same GUC (and is unreliable for RETURN QUERY), so it does not authoritatively pin the value.
--      A SET clause establishes the function's own GUC scope and wins over the ambient/session value.
--      Verified: body-set_config form returned 1/12 under a hostile ambient cap; the SET-clause form
--      returned 12/12. This also realigns these functions with sql/match_template.sql (the reusable
--      pattern), so "C3 DONE" covers the pattern new match fns copy, not just one hand-written function.
--
--   COMPLETENESS-OVER-LATENCY (deliberate): max_scan_tuples = INT_MAX means a chosen HNSW scan will, if
--   needed, walk the whole index rather than drop a tenant's rows. Safe in practice because every
--   production call carries the org filter (the DAL always passes p_org_id; RLS always adds
--   org_id = current_org_id()), so the planner prefers the EXACT btree(org_id)+sort path for tenant
--   recall and the unbounded HNSW fallback is rarely the chosen plan. NOTE: the HNSW under-return is a
--   LARGE-N phenomenon — for filtered queries the planner uses the exact (seq/btree)+sort path, which is
--   complete, until the table is large; so at P0 scale filtered recall is already complete and these GUCs
--   are defense-in-depth for the scale at which HNSW is eventually chosen. If pure metadata-filtered
--   semantic search over a very large evidence table becomes a hot path, add per-tenant PARTIAL HNSW
--   indexes so filtered recall is both complete AND bounded (tracked scale follow-up, not needed at P0).

create or replace function field.match_evidence(
  query_embedding public.vector(384), match_threshold float default 0.5,
  match_count int default 20, p_org_id uuid default null, filter_metadata jsonb default '{}'::jsonb)
returns table (id uuid, org_id uuid, evidence_class text, similarity float)
language sql
stable
set search_path = public, pg_temp
set hnsw.iterative_scan = 'strict_order'      -- re-enter the graph past ef_search
set hnsw.ef_search = '100'                    -- wider candidate set per round
set hnsw.max_scan_tuples = '2147483647'       -- C3: don't stop at the 20000 default (completeness)
set hnsw.scan_mem_multiplier = '2'            -- raise the work_mem candidate ceiling too
as $$
  select e.id, e.org_id, e.evidence_class, 1 - (e.embedding <=> query_embedding)
  from field.evidence e
  where (p_org_id is null or e.org_id = p_org_id) and e.metadata @> filter_metadata
    and e.embedding is not null and e.embedding <=> query_embedding < 1 - match_threshold
  order by e.embedding <=> query_embedding asc limit least(match_count, 200);
$$;

-- carsi.course is a GLOBAL catalog (no org_id; RLS = any authenticated user). No tenant isolation by
-- design; the same four GUCs guarantee complete threshold-filtered recall over the catalog.
-- (A filter_metadata overload can be added later to mirror match_evidence.)
create or replace function carsi.match_course(
  query_embedding public.vector(384), match_threshold float default 0.5, match_count int default 20)
returns table (id uuid, title text, similarity float)
language sql
stable
set search_path = public, pg_temp
set hnsw.iterative_scan = 'strict_order'
set hnsw.ef_search = '100'
set hnsw.max_scan_tuples = '2147483647'
set hnsw.scan_mem_multiplier = '2'
as $$
  select c.id, c.title, 1 - (c.embedding <=> query_embedding)
  from carsi.course c
  where c.embedding is not null and c.embedding <=> query_embedding < 1 - match_threshold
  order by c.embedding <=> query_embedding asc limit least(match_count, 200);
$$;

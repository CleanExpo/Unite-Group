-- Reusable pgvector match template for the Spine — CONDITION 3 baked in.
-- Closes the silent-HNSW-under-return hole: tenant/metadata filters are applied
-- AFTER the approximate index scan, so without iterative scan a filtered query can
-- return FEWER rows than exist. We set hnsw.iterative_scan inside the function so the
-- planner re-enters the index until the limit is satisfied.
--   Parameterize: <VEC_SCHEMA> (where `vector` is installed), <DIM>, <SCHEMA>, <TABLE>.
--   GREEN test MUST load > hnsw.ef_search (>40) rows across TWO tenants and assert the
--   filtered tenant gets the COMPLETE expected set (not merely "a non-match was dropped").

create or replace function <SCHEMA>.match_<TABLE>(
  query_embedding <VEC_SCHEMA>.vector(<DIM>),
  match_threshold float default 0.78,
  match_count     int   default 10,
  p_org_id        uuid  default null,            -- tenant filter pushed into the planner
  filter_metadata jsonb default '{}'::jsonb
)
returns table (id uuid, org_id uuid, content text, metadata jsonb, similarity float)
language sql
stable
set search_path = <VEC_SCHEMA>, pg_temp
set hnsw.iterative_scan = strict_order          -- <-- CONDITION 3: complete filtered recall
set hnsw.ef_search = 100                         -- wider candidate set; tune per table size
set hnsw.max_scan_tuples = 2147483647            -- <-- CONDITION 3: don't stop at the 20000 default
set hnsw.scan_mem_multiplier = 2                 --     (raise the work_mem candidate ceiling too)
-- NB: these MUST be function-level SET clauses (not body set_config), or an ambient SET LOCAL wins.
as $$
  select d.id, d.org_id, d.content, d.metadata,
         1 - (d.embedding <=> query_embedding) as similarity
  from <SCHEMA>.<TABLE> d
  where (p_org_id is null or d.org_id = p_org_id)   -- RLS still enforces; this aids the planner
    and d.metadata @> filter_metadata
    and d.embedding is not null                      -- NULL/zero vectors are unindexed (Hole 2)
    and d.embedding <=> query_embedding < 1 - match_threshold
  order by d.embedding <=> query_embedding asc
  limit least(match_count, 200);
$$;

-- Embedding columns are nullable by necessity (rows exist before embedding-gen completes).
-- CONDITION (Hole 2): a "pending-embedding" backfill check must report rows with NULL embedding
-- so nothing silently drops out of AI recall:
--   select count(*) from <SCHEMA>.<TABLE> where embedding is null;  -- alert if > 0 and stale

-- ── CONDITION 3 at VERY LARGE SCALE — the bounded fix: per-hot-path PARTIAL HNSW indexes ──
-- The four GUCs above keep the GENERIC match_* complete by letting the chosen HNSW scan walk far
-- enough (max_scan_tuples=INT_MAX). That is correct DEFENSE-IN-DEPTH but UNBOUNDED: when HNSW is the
-- chosen plan and a filtered subset's matches are buried past tens of thousands of nearer rows, the
-- scan may touch most of the index. Proven live (2026-06-09): at 60k rows a buried class returned 6/10
-- at the default cap 20000, 10/10 with the raised cap (but scanning the whole index).
--
-- The BOUNDED fix for a known HOT filter value (a specific high-traffic tenant or class at huge scale)
-- is a PARTIAL index over just those rows, applied per-hot-path (NOT speculatively for every value):
--   create index <TABLE>_<hotkey>_hnsw on <SCHEMA>.<TABLE>
--     using hnsw (embedding <VEC_SCHEMA>.vector_cosine_ops) where (<constant predicate>);
--   -- e.g. ... where (org_id = '<uuid>')   or   ... where (metadata @> '{"cls":"<v>"}'::jsonb)
-- Proven live: such a partial index is chosen NATURALLY for the matching CONSTANT-predicate query and
-- returns complete + bounded recall (scans only the partial index's rows, no post-filter waste).
--
-- CAVEAT (proven live): the GENERIC match_* function passes the filter as a PARAMETER, so the planner
-- CANNOT match it to a constant partial-index predicate — the generic RPC will NOT use a value-specific
-- partial index. Partial indexes therefore require a value-specific access path (a constant predicate in
-- the query), not the parameterized function. Reach for them only when a single hot value at very large
-- scale makes the unbounded generic scan too slow; otherwise the raised cap is sufficient and simpler.

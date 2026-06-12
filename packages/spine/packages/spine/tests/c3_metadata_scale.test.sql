-- ============================================================================
-- C3 metadata-filter completeness at PRODUCTION SCALE — the naturally-HNSW path.
-- Self-asserting; builds a 15k-row fixture, proves the silent under-return + the fix,
-- then cleans up. Run as a BYPASSRLS/service role with ON_ERROR_STOP.
-- This is a SCALE test (15k inserts + HNSW) — run on the dedicated spine project, not every CI tick.
-- PASS-verified live on the Unite-Group Test sandbox (xgqwfwqumliuguzhshwv) 2026-06-09.
--
-- WHY this test exists (it closes the hole the c3_load_completeness adversarial review exposed):
--   The 142-row test in c3_load_completeness.test.sql can only demonstrate the HNSW under-return by
--   FORCING the index (drop btree + seqscan=off) — a mechanism demo, not the production plan.
--   The metadata filter (`metadata @> ...`) has NO supporting index, so the planner picks the HNSW
--   Index Scan ON ITS OWN once the table is non-trivial. Verified live at 15k rows:
--     EXPLAIN => `Index Scan using evidence_embedding_hnsw`, `Filter: metadata @> {cls:3}`, no forcing.
--   Pre-fix behaviour (iterative_scan off, default ef_search) returned 5 of 50; the deployed function
--   (sql STABLE + 4 GUCs via SET clause) returns the complete, exact 50 with 0 off-class leak.
--
-- SELF-GUARD: if a future planner/stats change makes the query use the EXACT path (seq scan + sort)
--   instead of HNSW, the naive query would also return 50 and the `naive < 30` assertion FAILS loudly —
--   telling you the scale assumption broke and this test went vacuous. That is intentional.
-- ============================================================================

\set ON_ERROR_STOP on

-- ── Fixture: 15k rows under org Alpha, 8 metadata classes (cls 0..7), deterministic vectors.
--    All one org so the (un-indexed) metadata filter is the selective predicate => natural HNSW. ──
delete from field.evidence where metadata->>'c3scale'='true';
insert into field.evidence (org_id, job_id, sha256, evidence_class, embedding, metadata)
select '0a000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','c3scale-'||i,'c3scale',
  ('[' || (select string_agg((sin(i*0.0007 + g*0.013) + cos(i*0.31 + g*0.07))::real::text, ',') from generate_series(1,384) g) || ']')::public.vector(384),
  jsonb_build_object('c3scale', true, 'cls', (i % 8))
from generate_series(1,15000) i;

do $$
declare
  ORGA uuid := '0a000000-0000-0000-0000-000000000001';
  qv public.vector(384);
  gt int; naive int; fixed int; leak int; recall int;
begin
  select embedding into qv from field.evidence where sha256='c3scale-7500';

  -- exact ground truth: true nearest-50 cls:3 rows (force the exact path, no index scan)
  set local enable_indexscan = off; set local enable_bitmapscan = off;
  create temp table _gt on commit drop as
    select e.id from field.evidence e
    where e.org_id=ORGA and e.metadata @> '{"cls":3}'::jsonb and e.embedding is not null
    order by e.embedding <=> qv limit 50;
  reset enable_indexscan; reset enable_bitmapscan;
  select count(*) into gt from _gt;

  -- NAIVE pre-fix behaviour on the natural HNSW plan => under-return
  perform set_config('hnsw.iterative_scan','off',true);
  perform set_config('hnsw.ef_search','40',true);
  select count(*) into naive from (
    select e.id from field.evidence e
    where e.org_id=ORGA and e.metadata @> '{"cls":3}'::jsonb and e.embedding is not null
    order by e.embedding <=> qv limit 50) t;
  perform set_config('hnsw.iterative_scan','off',true);  -- (function overrides via its SET clause)

  -- DEPLOYED function => complete, no off-class leak, exact recall
  select count(*) into fixed from field.match_evidence(qv, -1, 50, ORGA, '{"cls":3}'::jsonb);
  select count(*) into leak from field.match_evidence(qv, -1, 50, ORGA, '{"cls":3}'::jsonb) m
    join field.evidence e on e.id=m.id where e.metadata->>'cls' <> '3';
  select count(*) into recall from field.match_evidence(qv, -1, 50, ORGA, '{"cls":3}'::jsonb) m
    where m.id in (select id from _gt);

  if gt <> 50 then raise exception 'C3-meta FAIL: ground truth top-50 cls:3 = % (want 50; fixture too small?)', gt; end if;
  if naive >= 30 then raise exception 'C3-meta FAIL: naive did not under-return (got %/50); plan likely no longer HNSW => test vacuous', naive; end if;
  if fixed <> 50 then raise exception 'C3-meta FAIL: deployed fn incomplete on natural HNSW metadata path (got %/50)', fixed; end if;
  if leak <> 0 then raise exception 'C3-meta FAIL: off-class leak = % (filter_metadata not applied)', leak; end if;
  if recall <> 50 then raise exception 'C3-meta FAIL: recall vs brute-force = %/50 (approximate miss)', recall; end if;

  raise notice 'C3-meta PASS: natural-HNSW metadata path — naive under-returns %/50, deployed fn complete 50/50, 0 leak, recall 50/50', naive;
end $$;

-- ── Teardown ────────────────────────────────────────────────────────────────
delete from field.evidence where metadata->>'c3scale'='true';

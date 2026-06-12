-- ============================================================================
-- C3 for carsi.match_course at PRODUCTION SCALE — the GLOBAL catalog path.
-- Self-asserting; builds 12k embedded courses, proves the under-return + fix + global RLS, cleans up.
-- Run as a BYPASSRLS/service role with ON_ERROR_STOP. SCALE test — run on the dedicated spine project.
-- PASS-verified live on the Unite-Group Test sandbox (xgqwfwqumliuguzhshwv) 2026-06-09.
--
-- carsi.course is a GLOBAL catalog: NO org_id, RLS course_read = (auth.uid() is not null). There is NO
-- tenant isolation by design — any authenticated user sees all courses; an unauthenticated caller sees none
-- (fail-closed). So the C3 concern here is COMPLETENESS, not isolation.
--
-- match_course has no secondary (org/metadata) filter, so its under-return mode is different from
-- match_evidence: requesting count > hnsw.ef_search truncates to ~ef_search WITHOUT iterative scan.
-- Verified live at 12k: naive (iterative_scan off, ef_search 40) returned 40 of 150 requested; the deployed
-- match_course (sql STABLE + 4 GUCs via SET clause) returns the complete, exact 150 (recall 150/150), and
-- count=500 caps to 200.
-- ============================================================================

\set ON_ERROR_STOP on

delete from carsi.course where metadata->>'c3course'='true';
insert into carsi.course (title, embedding, metadata)
select 'C3 Course '||i,
  ('[' || (select string_agg((sin(i*0.0007 + g*0.013) + cos(i*0.31 + g*0.07))::real::text, ',') from generate_series(1,384) g) || ']')::public.vector(384),
  jsonb_build_object('c3course', true)
from generate_series(1,12000) i;

-- ── Completeness (service role bypasses RLS; tests the count>ef_search under-return + fix + cap) ──
do $$
declare qv public.vector(384); gt int; naive int; fixed int; recall int; capped int;
begin
  select embedding into qv from carsi.course where title='C3 Course 6000' and metadata->>'c3course'='true' limit 1;

  set local enable_indexscan=off; set local enable_bitmapscan=off;
  create temp table _cgt on commit drop as
    select id from carsi.course where embedding is not null order by embedding <=> qv limit 150;
  reset enable_indexscan; reset enable_bitmapscan;
  select count(*) into gt from _cgt;

  perform set_config('hnsw.iterative_scan','off',true);
  perform set_config('hnsw.ef_search','40',true);
  select count(*) into naive from (select id from carsi.course where embedding is not null order by embedding<=>qv limit 150) t;

  select count(*) into fixed from carsi.match_course(qv, -1, 150);
  select count(*) into recall from carsi.match_course(qv, -1, 150) m where m.id in (select id from _cgt);
  select count(*) into capped from carsi.match_course(qv, -1, 500);

  if gt <> 150 then raise exception 'C3-course FAIL: ground truth nearest-150 = %', gt; end if;
  if naive >= 120 then raise exception 'C3-course FAIL: naive did not under-return (got %/150); plan may not be HNSW => vacuous', naive; end if;
  if fixed <> 150 then raise exception 'C3-course FAIL: deployed match_course incomplete (got %/150)', fixed; end if;
  if recall <> 150 then raise exception 'C3-course FAIL: recall vs brute force = %/150', recall; end if;
  if capped <> 200 then raise exception 'C3-course FAIL: least(count,200) cap not enforced (got % for count=500)', capped; end if;
  raise notice 'C3-course PASS: naive %/150, deployed complete 150/150 recall 150/150, cap(500)=200', naive;
end $$;

-- ── Global-catalog RLS: authenticated sees all; no auth sees none (fail-closed) ──
do $$
declare qv public.vector(384); authed int; anon int;
begin
  select embedding into qv from carsi.course where title='C3 Course 6000' and metadata->>'c3course'='true' limit 1;
  perform set_config('request.jwt.claims','{"sub":"0a000000-0000-0000-0000-0000000000a1"}',true);
  set local role authenticated;
  select count(*) into authed from carsi.match_course(qv, -1, 50);
  reset role;
  perform set_config('request.jwt.claims','{"app_metadata":{}}',true);
  set local role authenticated;
  select count(*) into anon from carsi.match_course(qv, -1, 50);
  reset role;
  if authed <> 50 then raise exception 'C3-course FAIL: authenticated user does not see the global catalog (got %)', authed; end if;
  if anon <> 0 then raise exception 'C3-course FAIL: course catalog not fail-closed for unauthenticated (got %)', anon; end if;
  raise notice 'C3-course PASS: global catalog — authenticated sees 50, no-sub sees 0 (fail-closed)';
end $$;

delete from carsi.course where metadata->>'c3course'='true';

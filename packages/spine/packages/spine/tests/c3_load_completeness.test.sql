-- ============================================================================
-- C3 load-completeness test — pgvector HNSW two-tenant filtered recall.
-- Self-asserting: RAISES on any failure, NOTICEs 'C3 PASS ...' per check.
-- Run AFTER spine migrations 0001..0005 + seed, as a BYPASSRLS / service role,
-- with ON_ERROR_STOP. Cleans up after itself (restores the pristine seed).
-- PASS-verified on the Unite-Group Test sandbox (xgqwfwqumliuguzhshwv) 2026-06-09.
--
-- WHAT CONDITION 3 ACTUALLY IS (and what the adversarial review corrected):
--   pgvector's HNSW index is APPROXIMATE: it returns ~ef_search nearest candidates, then any
--   non-index quals (org_id / metadata / threshold / the RLS policy) are applied as POST-filters.
--   So when a tenant's true matches rank globally beyond the scanned window, a filtered query
--   silently returns FEWER rows than exist — UNLESS the function re-enters the graph
--   (hnsw.iterative_scan) AND is allowed to scan far enough (hnsw.max_scan_tuples / scan_mem_multiplier).
--
--   Two facts this test pins, both verified live:
--   (1) SCALE/PLAN: the under-return only manifests when the planner CHOOSES the HNSW Index Scan.
--       For a FILTERED query the planner prefers the EXACT path (btree(org_id)+Sort, or Seq Scan+Sort)
--       until the table is large; that exact path is COMPLETE. So at P0 scale filtered recall is
--       already complete (no live bug); iterative_scan is DEFENSE-IN-DEPTH for the large-N HNSW regime.
--       => Section B forces the HNSW plan to exercise that regime deterministically at small N.
--   (2) BUDGET BOUND: hnsw.iterative_scan='strict_order' is NOT a completeness guarantee on its own —
--       it stops at hnsw.max_scan_tuples (default 20000). 0005 therefore also pins max_scan_tuples and
--       scan_mem_multiplier. Section C proves the function stays complete even under a hostile session cap.
--
-- Fixture geometry (deterministic, dense): q = base(d)=sin(d*0.30+0.7)+cos(d*0.11+2.1).
--   embedding[d] = base(d) + t*noise(n,d), noise(n,d)=sin(n*0.97+d*0.39+0.13)+cos(n*0.41+d*0.07+1.7).
--   Bravo(orgB)=130 rows t in [0.052,0.31] (NEAR, ranks 1..130); Alpha(orgA)=12 rows t in [0.97,1.19]
--   (FAR, ranks 131..142, all beyond ef_search=100, all within threshold 0.5). Bravo>=ef_search is the
--   load-bearing invariant that makes the iterative path actually get exercised (guard asserted in A).
-- ============================================================================

\set ON_ERROR_STOP on

-- ── Fixture (idempotent) ───────────────────────────────────────────────────
delete from field.evidence where metadata->>'c3load'='true';   -- clean slate if re-run
insert into field.customer (id, org_id, name) values
  ('10000000-0000-0000-0000-0000000000b1','0b000000-0000-0000-0000-000000000001','C3 Bravo Customer')
  on conflict (id) do nothing;
insert into field.job (id, org_id, customer_id, status, hazard_type) values
  ('11000000-0000-0000-0000-0000000000b1','0b000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-0000000000b1','open','water')
  on conflict (id) do nothing;
insert into field.evidence (org_id, job_id, sha256, evidence_class, embedding, metadata)
select '0b000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-0000000000b1','c3load-b-'||i,'c3load',
  ('[' || (select string_agg(round((
       (sin(d*0.30+0.7)+cos(d*0.11+2.1)) + (0.05+0.002*i)*(sin(i*0.97+d*0.39+0.13)+cos(i*0.41+d*0.07+1.7))
     )::numeric,6)::text, ',' order by d) from generate_series(1,384) d) || ']')::public.vector(384),
  '{"c3load":true}'::jsonb
from generate_series(1,130) i;
insert into field.evidence (org_id, job_id, sha256, evidence_class, embedding, metadata)
select '0a000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','c3load-a-'||j,'c3load',
  ('[' || (select string_agg(round((
       (sin(d*0.30+0.7)+cos(d*0.11+2.1)) + (0.95+0.02*j)*(sin((j+500)*0.97+d*0.39+0.13)+cos((j+500)*0.41+d*0.07+1.7))
     )::numeric,6)::text, ',' order by d) from generate_series(1,384) d) || ']')::public.vector(384),
  '{"c3load":true}'::jsonb
from generate_series(1,12) j;

-- ── A. Ground truth, guard, EXACT-path completeness (the plan production runs today), isolation,
--       and the Hole-2 NULL-embedding alarm. No forcing: this is the natural plan. ───────────────
do $$
declare
  ORGA uuid := '0a000000-0000-0000-0000-000000000001';
  ORGB uuid := '0b000000-0000-0000-0000-000000000001';
  qv public.vector(384);
  gt_alpha int; gt_bravo int; ahead int; nrank int;
  a_cnt int; a_leak int; a_missing int; a_extra int; b_cnt int; b_leak int; null_pending int;
begin
  select ('['||string_agg(round((sin(d*0.30+0.7)+cos(d*0.11+2.1))::numeric,6)::text,',' order by d)||']')::public.vector(384)
    into qv from generate_series(1,384) d;

  -- ground truth (index-free, exact)
  select count(*) into gt_alpha from field.evidence where metadata->>'c3load'='true' and org_id=ORGA and embedding is not null and embedding <=> qv < 0.5;
  select count(*) into gt_bravo from field.evidence where metadata->>'c3load'='true' and org_id=ORGB and embedding is not null and embedding <=> qv < 0.5;
  if gt_alpha <> 12 then raise exception 'C3 FAIL A.gt: expected 12 Alpha within threshold, got %', gt_alpha; end if;
  if gt_bravo <> 130 then raise exception 'C3 FAIL A.gt: expected 130 Bravo within threshold, got %', gt_bravo; end if;

  -- GUARD: rows ranked ahead of the first Alpha row must exceed ef_search, else the iterative path is
  -- never exercised and every downstream PASS would be vacuous. (Bravo=130 > 100.)
  select min(r) into nrank from (
    select org_id, row_number() over (order by embedding <=> qv) r
    from field.evidence where metadata->>'c3load'='true' and embedding is not null) s where org_id=ORGA;
  ahead := nrank - 1;
  if ahead <= 100 then raise exception 'C3 FAIL A.guard: only % rows ahead of first Alpha (need > ef_search=100); test would be vacuous', ahead; end if;

  -- EXACT-path completeness (the natural plan — btree(org_id)+Sort at this scale): the deployed fn
  -- must return exactly Alpha's ground-truth set, complete Bravo, zero leak.
  select count(*) into a_cnt from field.match_evidence(qv,0.5,50,ORGA);
  select count(*) into a_leak from field.match_evidence(qv,0.5,50,ORGA) m where m.org_id<>ORGA;
  select count(*) into a_missing from (select id from field.evidence where metadata->>'c3load'='true' and org_id=ORGA and embedding is not null and embedding<=>qv<0.5) g
    where not exists (select 1 from field.match_evidence(qv,0.5,50,ORGA) f where f.id=g.id);
  select count(*) into a_extra from field.match_evidence(qv,0.5,50,ORGA) f
    where not exists (select 1 from field.evidence g where g.metadata->>'c3load'='true' and g.org_id=ORGA and g.embedding is not null and g.embedding<=>qv<0.5 and g.id=f.id);
  if a_cnt<>12 or a_leak<>0 or a_missing<>0 or a_extra<>0 then
    raise exception 'C3 FAIL A.exact-alpha: cnt=% leak=% missing=% extra=% (want 12/0/0/0)', a_cnt,a_leak,a_missing,a_extra; end if;
  select count(*) into b_cnt from field.match_evidence(qv,0.5,200,ORGB);
  select count(*) into b_leak from field.match_evidence(qv,0.5,200,ORGB) m where m.org_id<>ORGB;
  if b_cnt<>130 or b_leak<>0 then raise exception 'C3 FAIL A.exact-bravo: cnt=% leak=% (want 130/0)', b_cnt,b_leak; end if;

  -- Hole 2: the seed Alpha evidence row has a NULL embedding => invisible to AI recall. The backfill
  -- alarm must be able to see it (completeness is defined over non-null embeddings only).
  select count(*) into null_pending from field.evidence where org_id=ORGA and embedding is null;
  if null_pending < 1 then raise exception 'C3 FAIL A.hole2: expected the NULL-embedding backfill alarm to find >=1 pending row, got %', null_pending; end if;

  raise notice 'C3 PASS A: gt alpha=12 bravo=130; guard ahead=% (>100); exact-path complete (alpha 12 set-equal, bravo 130, 0 leak); Hole-2 alarm sees % pending', ahead, null_pending;
end $$;

-- ── B. HNSW MECHANISM (forced index = the large-N regime, deterministically at small N).
--       Without the fix (iterative_scan=off) the index path under-returns; the deployed fn completes. ──
begin;
  drop index field.evidence_org_idx;       -- remove btree escape hatch
  set local enable_seqscan = off;           -- remove seq-scan escape hatch  => HNSW Index Scan forced
  set local hnsw.ef_search = 100;
  do $$
  declare
    ORGA uuid := '0a000000-0000-0000-0000-000000000001';
    qv public.vector(384); off_n int; fix_n int;
  begin
    select ('['||string_agg(round((sin(d*0.30+0.7)+cos(d*0.11+2.1))::numeric,6)::text,',' order by d)||']')::public.vector(384)
      into qv from generate_series(1,384) d;
    -- pre-0005 behaviour: iterative_scan off => the 100 nearest are all Bravo => Alpha dropped
    perform set_config('hnsw.iterative_scan','off',true);
    select count(*) into off_n from (select e.id from field.evidence e
       where e.org_id=ORGA and e.embedding is not null and e.embedding<=>qv<0.5
       order by e.embedding<=>qv limit 50) t;
    if off_n >= 12 then raise exception 'C3 FAIL B: control did not under-return on HNSW (off=%, expected <12); test lost its teeth', off_n; end if;
    -- the deployed (fixed) function pins strict_order + high cap internally => complete on the index path
    select count(*) into fix_n from field.match_evidence(qv,0.5,50,ORGA);
    if fix_n <> 12 then raise exception 'C3 FAIL B: deployed match_evidence incomplete on HNSW path (got %, want 12)', fix_n; end if;
    raise notice 'C3 PASS B: forced HNSW => iterative_scan off under-returns (%/12); deployed fn complete (12/12)', off_n;
  end $$;
rollback;   -- restores evidence_org_idx

-- ── C. SCAN-BUDGET REGRESSION GUARD: a hostile small max_scan_tuples must NOT make the deployed fn
--       under-return (it pins the cap internally). Proves the 0005 fix for the >20000-rows-at-scale bug. ──
begin;
  drop index field.evidence_org_idx;
  set local enable_seqscan = off;
  set local hnsw.max_scan_tuples = 50;     -- below Alpha's rank 131; pre-fix this gave 1/12
  do $$
  declare
    ORGA uuid := '0a000000-0000-0000-0000-000000000001';
    qv public.vector(384); raw_capped int; fixed int;
  begin
    select ('['||string_agg(round((sin(d*0.30+0.7)+cos(d*0.11+2.1))::numeric,6)::text,',' order by d)||']')::public.vector(384)
      into qv from generate_series(1,384) d;
    -- a raw strict_order query that does NOT raise the cap still under-returns (proves the bound is real)
    perform set_config('hnsw.iterative_scan','strict_order',true);
    select count(*) into raw_capped from (select e.id from field.evidence e
       where e.org_id=ORGA and e.embedding is not null and e.embedding<=>qv<0.5
       order by e.embedding<=>qv limit 50) t;
    if raw_capped >= 12 then raise exception 'C3 FAIL C: strict_order under a tiny cap did NOT under-return (got %); cap bound not demonstrated', raw_capped; end if;
    -- the deployed fn overrides the hostile session cap and stays complete
    select count(*) into fixed from field.match_evidence(qv,0.5,50,ORGA);
    if fixed <> 12 then raise exception 'C3 FAIL C: deployed match_evidence under-returned under hostile cap (got %, want 12) — max_scan_tuples not pinned', fixed; end if;
    raise notice 'C3 PASS C: under hostile max_scan_tuples=50, raw strict_order under-returns (%/12) but deployed fn pins the cap => complete (12/12)', raw_capped;
  end $$;
rollback;

-- ── D. RLS production path + isolation (forced HNSW). Tenancy via the authenticated role + JWT only
--       (p_org_id=NULL). is_internal_staff() must be false so the org_id branch is the one gating. ──
begin;
  drop index field.evidence_org_idx;
  set local enable_seqscan = off;
  select set_config('request.jwt.claims','{"app_metadata":{"org_id":"0a000000-0000-0000-0000-000000000001","person_id":"0a000000-0000-0000-0000-0000000000a1"}}', true);
  set local role authenticated;
  do $$
  declare
    ORGA uuid := '0a000000-0000-0000-0000-000000000001';
    qv public.vector(384); is_staff bool; total int; alpha int; leak int;
  begin
    select ('['||string_agg(round((sin(d*0.30+0.7)+cos(d*0.11+2.1))::numeric,6)::text,',' order by d)||']')::public.vector(384)
      into qv from generate_series(1,384) d;
    select core.is_internal_staff() into is_staff;
    if is_staff then raise exception 'C3 FAIL D: test identity is internal staff; isolation assertion would be vacuous'; end if;
    select count(*), count(*) filter (where m.org_id=ORGA), count(*) filter (where m.org_id<>ORGA)
      into total, alpha, leak from field.match_evidence(qv,0.5,50,null) m;   -- RLS-only scoping
    if total<>12 or alpha<>12 or leak<>0 then
      raise exception 'C3 FAIL D: RLS path total=% alpha=% leak=% (want 12/12/0)', total,alpha,leak; end if;
    raise notice 'C3 PASS D: RLS-only path on forced HNSW => complete (12) and zero cross-tenant leak; is_internal_staff()=false';
  end $$;
rollback;   -- restores index + role

-- ── E. Reverse isolation: org B (Bob) sees its complete Bravo set, zero Alpha (natural plan ok). ──
begin;
  select set_config('request.jwt.claims','{"app_metadata":{"org_id":"0b000000-0000-0000-0000-000000000001","person_id":"0b000000-0000-0000-0000-0000000000b1"}}', true);
  set local role authenticated;
  do $$
  declare
    ORGB uuid := '0b000000-0000-0000-0000-000000000001';
    qv public.vector(384); total int; bravo int; alpha_leak int;
  begin
    select ('['||string_agg(round((sin(d*0.30+0.7)+cos(d*0.11+2.1))::numeric,6)::text,',' order by d)||']')::public.vector(384)
      into qv from generate_series(1,384) d;
    select count(*), count(*) filter (where m.org_id=ORGB), count(*) filter (where m.org_id='0a000000-0000-0000-0000-000000000001')
      into total, bravo, alpha_leak from field.match_evidence(qv,0.5,200,null) m;
    if total<>130 or bravo<>130 or alpha_leak<>0 then
      raise exception 'C3 FAIL E: org B total=% bravo=% alpha_leak=% (want 130/130/0)', total,bravo,alpha_leak; end if;
    raise notice 'C3 PASS E: org B sees complete Bravo (130) and zero Alpha leak';
  end $$;
rollback;

-- ── Teardown: restore the pristine seed ────────────────────────────────────
delete from field.evidence where metadata->>'c3load'='true';
delete from field.job where id='11000000-0000-0000-0000-0000000000b1';
delete from field.customer where id='10000000-0000-0000-0000-0000000000b1';

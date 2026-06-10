-- RLS test matrix for the Spine (runnable on a seeded instance).
-- Simulates Supabase JWTs by setting request.jwt.claims + `set role authenticated`.
-- Each block: set claims → set role → assert counts → reset. (The CI version runs the
-- same assertions through supabase-js with real signed JWTs.)
-- Verified PASS on the non-prod sandbox 2026-06-09.

-- ── Member of org B (Bob): walled off from org A ─────────────────────────────
-- expect: leads=0 jobs=0 helen_pii=0 sales=0 orgs=1(own)
select set_config('request.jwt.claims','{"app_metadata":{"org_id":"<orgB>","person_id":"<bob>"}}', false);
set role authenticated;
select count(*) from leadgen.lead;                                          -- 0
select count(*) from field.job;                                            -- 0
select count(*) from core.person where party_id = '<helen>';              -- 0  (condition 2: PII isolation)
select count(*) from sales.opportunity;                                   -- 0  (sales internal-only)
select count(*) from core.organization;                                   -- 1  (own org only)
reset role;

-- ── Member of org A (Alice): sees own slice incl. legitimately-tied PII ──────
-- expect: leads=1 jobs=1 helen_pii=1 sales=0 membership=1
select set_config('request.jwt.claims','{"app_metadata":{"org_id":"<orgA>","person_id":"<alice>"}}', false);
set role authenticated;
select count(*) from leadgen.lead;                                         -- 1  (routed to A)
select count(*) from field.job;                                           -- 1
select count(*) from core.person where party_id = '<helen>';             -- 1  (via routed lead + customer tie)
select count(*) from sales.opportunity;                                  -- 0  (not staff)
select count(*) from nrpg.membership;                                    -- 1  (own)
reset role;

-- ── Internal staff (Phill): cross-tenant ─────────────────────────────────────
-- expect: is_internal_staff()=true, sees all orgs/persons/leads/sales
select set_config('request.jwt.claims','{"app_metadata":{"org_id":"<unite-group>","person_id":"<phill>"}}', false);
set role authenticated;
select core.is_internal_staff();                                          -- true (condition 4: live check)
select count(*) from core.organization;                                  -- all (3 in seed)
select count(*) from sales.opportunity;                                  -- all
reset role;
select set_config('request.jwt.claims','', false);

-- ── pgvector completeness (condition 3) — callers MUST set the GUC per session ─
-- set local hnsw.iterative_scan = 'strict_order';
-- set local hnsw.ef_search = 100;
-- select count(*) from field.match_evidence(<qvec>, -1.0, 500, '<orgA>'::uuid);
--   With > ef_search rows across two tenants, this MUST return the COMPLETE org-A set.
--   (Load-scale test runs in CI on the dedicated spine project.)

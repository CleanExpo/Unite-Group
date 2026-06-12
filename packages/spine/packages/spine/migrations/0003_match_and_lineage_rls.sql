-- 0003 — RLS on lineage/audit tables + initial pgvector match functions.
alter table core.source_record  enable row level security; alter table core.source_record  force row level security;
alter table core.identity_audit enable row level security; alter table core.identity_audit force row level security;
create policy source_record_staff on core.source_record for all using (core.is_internal_staff()) with check (core.is_internal_staff());
create policy identity_audit_staff on core.identity_audit for all using (core.is_internal_staff()) with check (core.is_internal_staff());

-- (superseded by 0005, which sets hnsw.iterative_scan at runtime — kept for ordered history)
create or replace function field.match_evidence(
  query_embedding public.vector(384), match_threshold float default 0.5,
  match_count int default 20, p_org_id uuid default null, filter_metadata jsonb default '{}'::jsonb)
returns table (id uuid, org_id uuid, evidence_class text, similarity float)
language sql stable set search_path = public, pg_temp as $$
  select e.id, e.org_id, e.evidence_class, 1 - (e.embedding <=> query_embedding)
  from field.evidence e
  where (p_org_id is null or e.org_id = p_org_id) and e.metadata @> filter_metadata and e.embedding is not null
    and e.embedding <=> query_embedding < 1 - match_threshold
  order by e.embedding <=> query_embedding asc limit least(match_count, 200);
$$;
create or replace function carsi.match_course(
  query_embedding public.vector(384), match_threshold float default 0.5, match_count int default 20)
returns table (id uuid, title text, similarity float)
language sql stable set search_path = public, pg_temp as $$
  select c.id, c.title, 1 - (c.embedding <=> query_embedding)
  from carsi.course c where c.embedding is not null and c.embedding <=> query_embedding < 1 - match_threshold
  order by c.embedding <=> query_embedding asc limit least(match_count, 200);
$$;

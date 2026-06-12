-- Refinement runs produce new spec versions; record which spec each one
-- revised so the iteration chain is queryable (v1 → v2 → …).

alter table specs add column if not exists parent_spec_id uuid references specs (id) on delete set null;
create index if not exists specs_parent_spec_id_idx on specs (parent_spec_id);

-- Row-security parity for the two semantic-ingestion tables (UNI-3247).
-- 20260713093000_unify_nexus_semantic_ingestion.sql creates public.document_embeddings and
-- public.document_chunks but never enables row security on them. Production has it ON for both
-- (pg_class.relrowsecurity, read-only catalogue query 04/11/2026), so this is a no-op there. It
-- closes the repo/production drift, so a Supabase branch replayed from migrations matches
-- production, and so the fail-closed guard in 20261104040000_portal_client_admission.sql (which
-- refuses to run while any public table has row security off) passes on that branch.
-- Down: not needed (production state is unchanged). Proof: scripts/portal-client-admission-db-proof.sh.

alter table if exists public.document_embeddings enable row level security;
alter table if exists public.document_chunks enable row level security;

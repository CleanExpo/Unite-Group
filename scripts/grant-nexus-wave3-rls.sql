-- Nexus Wave 3 — RLS Grant Script (Run in Supabase SQL Editor)
-- Grants service_role full access needed for semantic backfill + search endpoint

GRANT SELECT ON public.wiki_pages TO service_role;
GRANT SELECT ON public.agent_actions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_embeddings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO service_role;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify
SELECT table_name, grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'service_role' 
  AND table_name IN ('wiki_pages', 'document_embeddings', 'document_chunks');

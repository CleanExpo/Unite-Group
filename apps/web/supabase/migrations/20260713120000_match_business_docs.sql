-- FOUNDER-GATED: validate on a Supabase database branch; never apply directly to production.
-- UNI-2358: business-scoped similarity search for the RAG lane.
--
-- Target surface: `nexus_pages` — the only vector surface in the live schema that
-- carries BOTH `embedding vector(1536)` (added in migration 515, ivfflat cosine
-- index `idx_nexus_pages_embedding`) AND a `business_id` column. `document_chunks`
-- is wiki-scoped via `document_embeddings(source_type, source_id)` and has no
-- business scoping; `aiw_embeddings` scopes by `source_path` only.
--
-- Style/security mirrors `match_documents` (00000000000002_enable_pgvector.sql):
-- plpgsql, SECURITY INVOKER (RLS on nexus_pages applies to the caller), cosine
-- distance ordering — plus the explicit search_path hardening used by the newer
-- semantic_search_* functions (20260713093000_unify_nexus_semantic_ingestion.sql).

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.match_business_docs(
  p_business_id uuid,
  query_embedding vector(1536),
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity double precision
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.body::text AS content,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.nexus_pages p
  WHERE p.business_id = p_business_id
    AND p.embedding IS NOT NULL
    AND p.archived_at IS NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_business_docs(uuid, vector, int) IS
  'UNI-2358: cosine similarity search over nexus_pages scoped to one business. SECURITY INVOKER — caller RLS applies.';

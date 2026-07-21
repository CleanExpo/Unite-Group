-- FOUNDER-GATED: validate on a Supabase database branch; never apply directly to production.
-- UNI-2358 follow-up: `nexus_pages.business_id` is TEXT in the live schema; the
-- original `match_business_docs` (20260713120000) compared it to the uuid
-- parameter directly, which fails at runtime with 42883
-- (operator does not exist: text = uuid). Verified on DB branch
-- migration-catchup-20260714: unfixed call errors, cast version returns cleanly.
-- Callers pass `businesses.id` (uuid) — see src/lib/site-agent/grounding.ts —
-- so the cast belongs at the SQL boundary, not in the caller.

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
  WHERE p.business_id = p_business_id::text
    AND p.embedding IS NOT NULL
    AND p.archived_at IS NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_business_docs(uuid, vector, int) IS
  'UNI-2358: cosine similarity search over nexus_pages scoped to one business. SECURITY INVOKER — caller RLS applies. business_id column is text; parameter cast at the boundary.';

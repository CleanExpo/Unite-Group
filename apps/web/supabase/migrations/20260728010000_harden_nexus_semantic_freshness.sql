-- FOUNDER-GATED: validate on a Supabase database branch; never apply directly to production.
-- Follow-up to 20260727010000: source snapshot time, not ingestion write time,
-- is the authority for queue and fail-closed freshness decisions.

SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.wiki_pages_needing_embedding(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id text,
  title text,
  content text,
  tags text[],
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH chunk_rollup AS (
    SELECT
      document_id,
      count(*) AS chunk_count,
      count(*) FILTER (WHERE embedding IS NOT NULL) AS vector_chunk_count
    FROM public.document_chunks
    GROUP BY document_id
  )
  SELECT w.id, w.title, w.content, w.tags, w.updated_at
  FROM public.wiki_pages w
  LEFT JOIN public.document_embeddings d
    ON d.source_type = 'wiki'
   AND d.source_id = w.id
  LEFT JOIN chunk_rollup c ON c.document_id = d.id
  WHERE d.id IS NULL
     OR d.embedding IS NULL
     OR d.metadata->>'source_updated_at' IS NULL
     OR (d.metadata->>'source_updated_at')::timestamptz < w.updated_at
     OR COALESCE(c.chunk_count, 0) = 0
     OR c.vector_chunk_count < c.chunk_count
  ORDER BY w.updated_at, w.id
  LIMIT GREATEST(COALESCE(p_limit, 100), 0);
$$;

CREATE OR REPLACE FUNCTION public.nexus_semantic_coverage(
  p_freshness_interval interval DEFAULT interval '30 days'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH wiki AS (
  SELECT id, updated_at FROM public.wiki_pages
), docs AS (
  SELECT
    id,
    source_id,
    embedding,
    updated_at,
    (metadata->>'source_updated_at')::timestamptz AS source_updated_at
  FROM public.document_embeddings
  WHERE source_type = 'wiki'
), chunk_rollup AS (
  SELECT
    document_id,
    count(*) AS chunk_count,
    count(*) FILTER (WHERE embedding IS NOT NULL) AS vector_chunk_count,
    max(created_at) AS freshest_chunk
  FROM public.document_chunks
  GROUP BY document_id
), defects AS (
  SELECT
    wiki.id,
    docs.id AS document_id,
    docs.updated_at AS document_updated_at,
    docs.source_updated_at,
    chunk_rollup.freshest_chunk,
    (docs.id IS NULL OR docs.embedding IS NULL) AS missing_page_vector,
    (docs.id IS NULL OR COALESCE(chunk_rollup.chunk_count, 0) = 0) AS missing_chunks,
    (
      COALESCE(chunk_rollup.chunk_count, 0) > 0
      AND chunk_rollup.vector_chunk_count < chunk_rollup.chunk_count
    ) AS invalid_chunk_vectors,
    (
      docs.id IS NOT NULL
      AND (
        docs.source_updated_at IS NULL
        OR docs.source_updated_at < wiki.updated_at
      )
    ) AS stale_chunks,
    (
      docs.id IS NOT NULL
      AND docs.embedding IS NOT NULL
      AND COALESCE(chunk_rollup.chunk_count, 0) > 0
      AND chunk_rollup.vector_chunk_count = chunk_rollup.chunk_count
      AND docs.source_updated_at >= wiki.updated_at
      AND GREATEST(docs.updated_at, chunk_rollup.freshest_chunk)
          < now() - p_freshness_interval
    ) AS freshness_policy_only
  FROM wiki
  LEFT JOIN docs ON docs.source_id = wiki.id
  LEFT JOIN chunk_rollup ON chunk_rollup.document_id = docs.id
), duplicate_keys AS (
  SELECT count(*) AS duplicate_count
  FROM (
    SELECT document_id, chunk_index
    FROM public.document_chunks
    GROUP BY document_id, chunk_index
    HAVING count(*) > 1
  ) duplicates
), totals AS (
  SELECT
    count(*) AS wiki_pages,
    count(*) FILTER (WHERE NOT missing_page_vector) AS page_vectors,
    count(*) FILTER (
      WHERE NOT missing_chunks
        AND NOT invalid_chunk_vectors
    ) AS chunk_documents,
    count(*) FILTER (WHERE missing_page_vector) AS missing_page_vectors,
    count(*) FILTER (WHERE missing_chunks) AS missing_chunk_documents,
    count(*) FILTER (WHERE invalid_chunk_vectors) AS invalid_chunk_vectors,
    count(*) FILTER (WHERE stale_chunks) AS stale_chunk_documents,
    count(*) FILTER (
      WHERE missing_page_vector
         OR missing_chunks
         OR invalid_chunk_vectors
         OR stale_chunks
    ) AS actionable_documents,
    count(*) FILTER (WHERE freshness_policy_only) AS freshness_policy_documents
  FROM defects
)
SELECT jsonb_build_object(
  'wiki_pages', totals.wiki_pages,
  'page_vectors', totals.page_vectors,
  'chunk_documents', totals.chunk_documents,
  'duplicate_chunk_keys', duplicate_keys.duplicate_count,
  'missing_page_vectors', totals.missing_page_vectors,
  'missing_chunk_documents', totals.missing_chunk_documents,
  'invalid_chunk_vectors', totals.invalid_chunk_vectors,
  'stale_chunk_documents', totals.stale_chunk_documents,
  'actionable_documents', totals.actionable_documents,
  'freshness_policy_documents', totals.freshness_policy_documents,
  'stale_documents', totals.actionable_documents
)
FROM totals CROSS JOIN duplicate_keys;
$$;

REVOKE ALL ON FUNCTION public.wiki_pages_needing_embedding(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wiki_pages_needing_embedding(integer) TO service_role;
REVOKE ALL ON FUNCTION public.nexus_semantic_coverage(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nexus_semantic_coverage(interval) TO service_role;

COMMENT ON FUNCTION public.wiki_pages_needing_embedding(integer) IS
  'Bounded fail-closed queue using source snapshot time for missing/null vectors and absent, invalid, or stale chunks.';
COMMENT ON FUNCTION public.nexus_semantic_coverage(interval) IS
  'Nexus semantic coverage using source snapshot time; actionable defects remain separate from age-only freshness policy.';

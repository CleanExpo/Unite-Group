-- FOUNDER-GATED: validate on a Supabase database branch; never apply directly to production.
-- Repair the Nexus semantic queue so every fail-closed coverage defect is actionable.
-- Age-only freshness policy remains visible, but does not re-embed unchanged content.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.upsert_wiki_semantic_document(
  p_source_id text,
  p_title text,
  p_content text,
  p_embedding vector(1536),
  p_embedding_model text,
  p_source_updated_at timestamptz,
  p_content_sha256 text,
  p_chunks jsonb
)
RETURNS TABLE(document_id uuid, chunk_count integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_document_id uuid;
  v_expected_chunks integer;
BEGIN
  IF p_source_id IS NULL OR btrim(p_source_id) = '' THEN
    RAISE EXCEPTION 'source id is required';
  END IF;
  IF p_embedding IS NULL THEN
    RAISE EXCEPTION 'page embedding is required for %', p_source_id;
  END IF;
  IF p_content_sha256 IS NULL OR btrim(p_content_sha256) = '' THEN
    RAISE EXCEPTION 'content hash is required for %', p_source_id;
  END IF;
  IF jsonb_typeof(p_chunks) <> 'array' OR jsonb_array_length(p_chunks) = 0 THEN
    RAISE EXCEPTION 'at least one chunk is required for %', p_source_id;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_chunks) AS candidate
    WHERE candidate->>'chunk_index' IS NULL
       OR (candidate->>'chunk_index')::integer < 0
       OR candidate->>'content' IS NULL
       OR candidate->'embedding' IS NULL
       OR candidate->'embedding' = 'null'::jsonb
       OR candidate->>'content_sha256' IS NULL
  ) THEN
    RAISE EXCEPTION 'every chunk requires an index, content, embedding and hash for %', p_source_id;
  END IF;

  INSERT INTO public.document_embeddings (
    source_type, source_id, title, content, embedding, embedding_model, metadata
  ) VALUES (
    'wiki', p_source_id, p_title, p_content, p_embedding, p_embedding_model,
    jsonb_build_object(
      'source_updated_at', p_source_updated_at,
      'content_sha256', p_content_sha256,
      'ingested_at', now()
    )
  )
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    embedding = EXCLUDED.embedding,
    embedding_model = EXCLUDED.embedding_model,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_document_id;

  INSERT INTO public.document_chunks (
    document_id, chunk_index, content, embedding, metadata, created_at
  )
  SELECT
    v_document_id,
    (item->>'chunk_index')::integer,
    item->>'content',
    (item->'embedding')::text::vector,
    jsonb_build_object('content_sha256', item->>'content_sha256'),
    now()
  FROM jsonb_array_elements(p_chunks) AS item
  ON CONFLICT ON CONSTRAINT document_chunks_document_index_unique DO UPDATE SET
    content = EXCLUDED.content,
    embedding = EXCLUDED.embedding,
    metadata = EXCLUDED.metadata,
    created_at = now();

  v_expected_chunks := jsonb_array_length(p_chunks);
  DELETE FROM public.document_chunks AS dc
  WHERE dc.document_id = v_document_id
    AND dc.chunk_index >= v_expected_chunks;

  IF (
    SELECT count(*)
    FROM public.document_chunks AS dc
    WHERE dc.document_id = v_document_id
      AND dc.embedding IS NOT NULL
  ) <> v_expected_chunks THEN
    RAISE EXCEPTION 'chunk read-back failed for %', p_source_id;
  END IF;

  RETURN QUERY SELECT v_document_id, v_expected_chunks;
END;
$$;

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
      count(*) FILTER (WHERE embedding IS NOT NULL) AS vector_chunk_count,
      max(created_at) AS freshest_chunk
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
     OR d.updated_at < w.updated_at
     OR COALESCE(c.chunk_count, 0) = 0
     OR c.vector_chunk_count < c.chunk_count
     OR c.freshest_chunk < w.updated_at
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
  SELECT id, source_id, embedding, updated_at
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
        docs.updated_at < wiki.updated_at
        OR (
          COALESCE(chunk_rollup.chunk_count, 0) > 0
          AND chunk_rollup.freshest_chunk < wiki.updated_at
        )
      )
    ) AS stale_chunks,
    (
      docs.id IS NOT NULL
      AND docs.embedding IS NOT NULL
      AND COALESCE(chunk_rollup.chunk_count, 0) > 0
      AND chunk_rollup.vector_chunk_count = chunk_rollup.chunk_count
      AND docs.updated_at >= wiki.updated_at
      AND chunk_rollup.freshest_chunk >= wiki.updated_at
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
  -- Backwards-compatible key: now means recoverable ingestion defects, not age alone.
  'stale_documents', totals.actionable_documents
)
FROM totals CROSS JOIN duplicate_keys;
$$;

REVOKE ALL ON FUNCTION public.wiki_pages_needing_embedding(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wiki_pages_needing_embedding(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.nexus_semantic_coverage(interval) TO service_role;

COMMENT ON FUNCTION public.wiki_pages_needing_embedding(integer) IS
  'Bounded fail-closed queue for missing/null page vectors and absent, invalid, or source-stale wiki chunks.';
COMMENT ON FUNCTION public.nexus_semantic_coverage(interval) IS
  'Nexus semantic coverage: actionable ingestion defects are separate from unchanged age-policy freshness.';

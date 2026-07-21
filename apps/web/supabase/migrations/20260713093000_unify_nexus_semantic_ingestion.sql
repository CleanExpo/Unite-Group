-- FOUNDER-GATED: validate on a Supabase database branch; never apply directly to production.
-- Canonical, transactional ingestion path for Nexus wiki page and chunk vectors.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id text NOT NULL,
  title text,
  content text,
  embedding vector(1536),
  embedding_model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_embeddings_source_unique UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.document_embeddings(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_chunks_document_index_unique UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding
  ON public.document_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.semantic_search_chunks(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.78,
  match_count integer DEFAULT 20,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid, document_id uuid, content text, similarity double precision,
  metadata jsonb, source_type text, source_id text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT c.id, c.document_id, c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.metadata, d.source_type, d.source_id
  FROM public.document_chunks c
  JOIN public.document_embeddings d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
    AND (filter = '{}'::jsonb OR d.metadata @> filter)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.semantic_search_documents(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.78,
  match_count integer DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid, source_type text, source_id text, title text,
  similarity double precision, metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT d.id, d.source_type, d.source_id, d.title,
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.metadata
  FROM public.document_embeddings d
  WHERE d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
    AND (filter = '{}'::jsonb OR d.metadata @> filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

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
  IF jsonb_typeof(p_chunks) <> 'array' OR jsonb_array_length(p_chunks) = 0 THEN
    RAISE EXCEPTION 'at least one chunk is required for %', p_source_id;
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
  ON CONFLICT (document_id, chunk_index) DO UPDATE SET
    content = EXCLUDED.content,
    embedding = EXCLUDED.embedding,
    metadata = EXCLUDED.metadata,
    created_at = now();

  v_expected_chunks := jsonb_array_length(p_chunks);
  DELETE FROM public.document_chunks
  WHERE document_chunks.document_id = v_document_id
    AND chunk_index >= v_expected_chunks;

  IF (SELECT count(*) FROM public.document_chunks WHERE document_id = v_document_id)
     <> v_expected_chunks THEN
    RAISE EXCEPTION 'chunk read-back failed for %', p_source_id;
  END IF;

  RETURN QUERY SELECT v_document_id, v_expected_chunks;
END;
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
  SELECT id::text AS id FROM public.wiki_pages
), docs AS (
  SELECT id, source_id, embedding, metadata
  FROM public.document_embeddings
  WHERE source_type = 'wiki'
), chunk_rollup AS (
  SELECT document_id, count(*) AS chunk_count, max(created_at) AS freshest_chunk
  FROM public.document_chunks
  GROUP BY document_id
), duplicate_keys AS (
  SELECT count(*) AS duplicate_count
  FROM (
    SELECT document_id, chunk_index
    FROM public.document_chunks
    GROUP BY document_id, chunk_index
    HAVING count(*) > 1
  ) duplicates
)
SELECT jsonb_build_object(
  'wiki_pages', (SELECT count(*) FROM wiki),
  'page_vectors', (
    SELECT count(*) FROM wiki JOIN docs ON docs.source_id = wiki.id
    WHERE docs.embedding IS NOT NULL
  ),
  'chunk_documents', (
    SELECT count(*) FROM wiki
    JOIN docs ON docs.source_id = wiki.id
    JOIN chunk_rollup ON chunk_rollup.document_id = docs.id
    WHERE chunk_rollup.chunk_count > 0
  ),
  'duplicate_chunk_keys', (SELECT duplicate_count FROM duplicate_keys),
  'stale_documents', (
    SELECT count(*) FROM wiki
    LEFT JOIN docs ON docs.source_id = wiki.id
    LEFT JOIN chunk_rollup ON chunk_rollup.document_id = docs.id
    WHERE docs.embedding IS NULL
       OR chunk_rollup.chunk_count IS NULL
       OR chunk_rollup.freshest_chunk < now() - p_freshness_interval
       OR (
         docs.metadata->>'source_updated_at' IS NOT NULL
         AND chunk_rollup.freshest_chunk < (docs.metadata->>'source_updated_at')::timestamptz
       )
  )
);
$$;

REVOKE ALL ON FUNCTION public.upsert_wiki_semantic_document(text, text, text, vector, text, timestamptz, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_wiki_semantic_document(text, text, text, vector, text, timestamptz, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.nexus_semantic_coverage(interval) TO service_role;

COMMENT ON FUNCTION public.upsert_wiki_semantic_document IS
  'Transactional, idempotent wiki page + chunk vector ingestion. Sandbox-first and service-role only.';
COMMENT ON FUNCTION public.nexus_semantic_coverage IS
  'Fail-closed coverage/freshness evidence for Nexus wiki semantic retrieval.';

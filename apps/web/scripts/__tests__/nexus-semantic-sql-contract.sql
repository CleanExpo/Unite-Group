\set ON_ERROR_STOP on
SET search_path TO public, extensions;

INSERT INTO public.wiki_pages (id, title, content, tags, created_at, updated_at)
VALUES
  ('healthy', 'Healthy', 'healthy current content', '{}', now(), now()),
  ('missing-document', 'Missing document', 'missing document content', '{}', now(), now()),
  ('null-vector', 'Null vector', 'null vector content', '{}', now(), now()),
  ('missing-chunks', 'Missing chunks', 'missing chunks content', '{}', now(), now()),
  ('stale-document', 'Stale document', 'changed source content', '{}', now() - interval '2 days', now()),
  ('null-chunk-vector', 'Null chunk vector', 'null chunk vector content', '{}', now(), now()),
  ('freshness-only', 'Freshness policy only', 'old but unchanged content', '{}', now() - interval '60 days', now() - interval '60 days');

INSERT INTO public.document_embeddings (
  source_type, source_id, title, content, embedding, embedding_model, metadata, created_at, updated_at
)
SELECT
  'wiki',
  source_id,
  initcap(replace(source_id, '-', ' ')),
  source_id || ' content',
  CASE WHEN source_id = 'null-vector' THEN NULL ELSE array_fill(0.001::real, ARRAY[1536])::vector END,
  'test-1536',
  '{}'::jsonb,
  CASE WHEN source_id IN ('stale-document', 'freshness-only') THEN now() - interval '60 days' ELSE now() END,
  CASE WHEN source_id IN ('stale-document', 'freshness-only') THEN now() - interval '60 days' ELSE now() END
FROM unnest(ARRAY[
  'healthy',
  'null-vector',
  'missing-chunks',
  'stale-document',
  'null-chunk-vector',
  'freshness-only'
]) AS source_id;

INSERT INTO public.document_chunks (
  document_id, chunk_index, content, embedding, metadata, created_at
)
SELECT
  d.id,
  0,
  d.source_id || ' chunk',
  CASE WHEN d.source_id = 'null-chunk-vector' THEN NULL ELSE array_fill(0.001::real, ARRAY[1536])::vector END,
  '{}'::jsonb,
  CASE WHEN d.source_id = 'freshness-only' THEN now() - interval '60 days' ELSE now() END
FROM public.document_embeddings d
WHERE d.source_type = 'wiki'
  AND d.source_id <> 'missing-chunks';

DO $$
DECLARE
  queued text[];
  coverage jsonb;
BEGIN
  SELECT array_agg(id ORDER BY id)
  INTO queued
  FROM public.wiki_pages_needing_embedding(100);

  IF queued IS DISTINCT FROM ARRAY[
    'missing-chunks',
    'missing-document',
    'null-chunk-vector',
    'null-vector',
    'stale-document'
  ]::text[] THEN
    RAISE EXCEPTION 'queue contract mismatch: %', queued;
  END IF;

  SELECT public.nexus_semantic_coverage(interval '30 days') INTO coverage;

  IF coverage->>'wiki_pages' <> '7'
     OR coverage->>'page_vectors' <> '5'
     OR coverage->>'chunk_documents' <> '4'
     OR coverage->>'missing_page_vectors' <> '2'
     OR coverage->>'missing_chunk_documents' <> '2'
     OR coverage->>'invalid_chunk_vectors' <> '1'
     OR coverage->>'stale_chunk_documents' <> '1'
     OR coverage->>'actionable_documents' <> '5'
     OR coverage->>'freshness_policy_documents' <> '1'
     OR coverage->>'stale_documents' <> '5'
     OR coverage->>'duplicate_chunk_keys' <> '0' THEN
    RAISE EXCEPTION 'coverage contract mismatch: %', coverage;
  END IF;
END
$$;

DO $$
DECLARE
  test_vector vector(1536) := array_fill(0.002::real, ARRAY[1536])::vector;
  test_chunks jsonb := jsonb_build_array(
    jsonb_build_object(
      'chunk_index', 0,
      'content', 'first chunk',
      'embedding', to_jsonb(array_fill(0.002::real, ARRAY[1536])),
      'content_sha256', 'first-hash'
    ),
    jsonb_build_object(
      'chunk_index', 1,
      'content', 'second chunk',
      'embedding', to_jsonb(array_fill(0.003::real, ARRAY[1536])),
      'content_sha256', 'second-hash'
    )
  );
  target_id uuid;
  returned_count integer;
BEGIN
  SELECT document_id, chunk_count INTO target_id, returned_count
  FROM public.upsert_wiki_semantic_document(
    'missing-document',
    'Missing document',
    'missing document content',
    test_vector,
    'test-1536',
    now(),
    'page-hash',
    test_chunks
  );
  IF returned_count <> 2 THEN
    RAISE EXCEPTION 'first upsert read-back mismatch: %', returned_count;
  END IF;

  SELECT document_id, chunk_count INTO target_id, returned_count
  FROM public.upsert_wiki_semantic_document(
    'missing-document',
    'Missing document',
    'missing document content',
    test_vector,
    'test-1536',
    now(),
    'page-hash',
    test_chunks
  );
  IF returned_count <> 2
     OR (SELECT count(*) FROM public.document_chunks WHERE document_id = target_id) <> 2 THEN
    RAISE EXCEPTION 'idempotent rerun created unstable chunks';
  END IF;
  IF (
    SELECT count(*)
    FROM public.document_chunks c
    JOIN public.document_embeddings d ON d.id = c.document_id
    WHERE d.source_type = 'wiki' AND d.source_id = 'healthy'
  ) <> 1 THEN
    RAISE EXCEPTION 'repair changed healthy document chunks';
  END IF;
END
$$;

DO $$
DECLARE
  canary_ids text[] := ARRAY['exit-thesis', 'ccw', 'synthex', 'recent-wiki-canary'];
  canary_titles text[] := ARRAY[
    'Exit Thesis — $2B by June 2028',
    'CCW — Carpet Cleaners Warehouse',
    'Synthex',
    'Recent Wiki Canary'
  ];
  vector_values real[];
  canary_vector vector(1536);
  canary_document_id uuid;
BEGIN
  FOR index IN 1..array_length(canary_ids, 1) LOOP
    vector_values := array_fill(0.0::real, ARRAY[1536]);
    vector_values[index] := 1.0;
    canary_vector := vector_values::vector;

    INSERT INTO public.wiki_pages (id, title, content, tags, updated_at)
    VALUES (
      canary_ids[index],
      canary_titles[index],
      'Deterministic retrieval evidence for ' || canary_ids[index],
      '{}',
      now()
    );
    INSERT INTO public.document_embeddings (
      source_type, source_id, title, content, embedding, embedding_model, metadata
    ) VALUES (
      'wiki', canary_ids[index], canary_titles[index],
      'Deterministic retrieval evidence for ' || canary_ids[index],
      canary_vector, 'test-1536', '{}'::jsonb
    ) RETURNING id INTO canary_document_id;
    INSERT INTO public.document_chunks (
      document_id, chunk_index, content, embedding, metadata
    ) VALUES (
      canary_document_id, 0,
      'Deterministic retrieval evidence for ' || canary_ids[index],
      canary_vector, '{}'::jsonb
    );
  END LOOP;
END
$$;

SET enable_indexscan TO off;
DO $$
DECLARE
  canary_ids text[] := ARRAY['exit-thesis', 'ccw', 'synthex', 'recent-wiki-canary'];
  vector_values real[];
  canary_vector vector(1536);
  document_source text;
  chunk_source text;
  started_at timestamptz;
  elapsed interval;
BEGIN
  FOR index IN 1..array_length(canary_ids, 1) LOOP
    vector_values := array_fill(0.0::real, ARRAY[1536]);
    vector_values[index] := 1.0;
    canary_vector := vector_values::vector;
    started_at := clock_timestamp();

    SELECT result.source_id INTO document_source
    FROM public.semantic_search_documents(canary_vector, 0.99, 1) AS result;
    SELECT result.source_id INTO chunk_source
    FROM public.semantic_search_chunks(canary_vector, 0.99, 1) AS result;

    elapsed := clock_timestamp() - started_at;
    IF document_source IS DISTINCT FROM canary_ids[index]
       OR chunk_source IS DISTINCT FROM canary_ids[index] THEN
      RAISE EXCEPTION 'semantic canary mismatch for %: document=%, chunk=%',
        canary_ids[index], document_source, chunk_source;
    END IF;
    IF elapsed >= interval '2 seconds' THEN
      RAISE EXCEPTION 'semantic canary exceeded 2 seconds for %: %',
        canary_ids[index], elapsed;
    END IF;
    RAISE NOTICE 'semantic canary % PASS in %', canary_ids[index], elapsed;
  END LOOP;
END
$$;
RESET enable_indexscan;

-- The unique key makes duplicates impossible in a healthy schema. Prove the
-- coverage gate still fails closed if drift removes that invariant.
ALTER TABLE public.document_chunks
  DROP CONSTRAINT document_chunks_document_index_unique;
INSERT INTO public.document_chunks (document_id, chunk_index, content, embedding, metadata)
SELECT document_id, chunk_index, content, embedding, metadata
FROM public.document_chunks
WHERE document_id = (
  SELECT id FROM public.document_embeddings
  WHERE source_type = 'wiki' AND source_id = 'healthy'
)
LIMIT 1;

DO $$
DECLARE
  coverage jsonb;
BEGIN
  SELECT public.nexus_semantic_coverage(interval '30 days') INTO coverage;
  IF coverage->>'duplicate_chunk_keys' <> '1' THEN
    RAISE EXCEPTION 'duplicate fail-closed contract mismatch: %', coverage;
  END IF;
END
$$;

SELECT 'nexus semantic SQL contract PASS' AS result;

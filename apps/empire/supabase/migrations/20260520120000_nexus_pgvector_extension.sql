-- migration: 20260520120000_nexus_pgvector_extension.sql
-- Wave 3: Progressive Search + Continuous Improvement Engine
--UNI-2035: pgvector schema extension
--UNI-2036: Semantic ingest pipeline (depends on this)

BEGIN;

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Core tables for semantic search

-- Stores the main document / page level embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL,                    -- 'wiki', 'linear_issue', 'agent_action', 'ccw_ticket', 'health_snapshot'
    source_id text NOT NULL,                      -- e.g. wiki slug, linear identifier, etc.
    title text,
    content text,                                 -- truncated for reference
    embedding vector(1536),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(source_type, source_id)
);

-- Stores chunked fragments for RAG retrieval (higher recall)
CREATE TABLE IF NOT EXISTS document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES document_embeddings(id) ON DELETE CASCADE,
    chunk_index int NOT NULL,
    content text NOT NULL,
    embedding vector(1536),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    UNIQUE(document_id, chunk_index)
);

-- 3. Updated_at trigger
CREATE OR REPLACE FUNCTION update_nexus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_document_embeddings_updated_at
    BEFORE UPDATE ON document_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_nexus_updated_at();

-- 4. Semantic search functions (primary RAG API)

-- Search across chunks (recommended for most queries)
CREATE OR REPLACE FUNCTION semantic_search_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 20,
    filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity float,
    metadata jsonb,
    source_type text,
    source_id text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.content,
        1 - (c.embedding <=> query_embedding) AS similarity,
        c.metadata,
        d.source_type,
        d.source_id
    FROM document_chunks c
    JOIN document_embeddings d ON d.id = c.document_id
    WHERE (1 - (c.embedding <=> query_embedding)) > match_threshold
      AND (filter = '{}' OR d.metadata @> filter)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Search at document level (higher-level summaries)
CREATE OR REPLACE FUNCTION semantic_search_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10,
    filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
    id uuid,
    source_type text,
    source_id text,
    title text,
    similarity float,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.source_type,
        d.source_id,
        d.title,
        1 - (d.embedding <=> query_embedding) AS similarity,
        d.metadata
    FROM document_embeddings d
    WHERE (1 - (d.embedding <=> query_embedding)) > match_threshold
      AND (filter = '{}' OR d.metadata @> filter)
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Indexes (IVFFlat for production scale)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding
    ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 6. RLS (aligned with existing Unite-Group patterns)
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- FOUNDER full access (matches existing user_role enum)
CREATE POLICY "FOUNDER can manage all document embeddings"
    ON document_embeddings
    FOR ALL
    TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'FOUNDER')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'FOUNDER');

CREATE POLICY "FOUNDER can manage all document chunks"
    ON document_chunks
    FOR ALL
    TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'FOUNDER')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'FOUNDER');

-- 7. Comments for traceability
COMMENT ON TABLE document_embeddings IS 'Wave 3 semantic search layer. Supports UNI-2035 and UNI-2036. Sandbox-first.';
COMMENT ON TABLE document_chunks IS 'Chunked RAG retrieval layer. Supports UNI-2035 and UNI-2036.';
COMMENT ON FUNCTION semantic_search_chunks IS 'Primary RAG function for Nexus Progressive Search (UNI-2035/2036)';

COMMIT;
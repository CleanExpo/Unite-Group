import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { requireAdmin } from '@/lib/security/require-admin';

// OpenAI client is only instantiated if the key exists.
// This prevents build-time crashes when the key is not set in the current environment.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface SearchResult {
  document_id: string;
  content: string;
  similarity: number;
  metadata: any;
  source_type: string;
  source_id: string;
}

/**
 * POST /api/search/nexus
 * Natural language semantic search over Nexus document_embeddings
 */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = await request.json();
    const { query, limit = 10, min_similarity = 0.75 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    // Validate semantic search configuration before making external calls.
    if (!openai) {
      return NextResponse.json(
        { error: 'Semantic search is not configured (OPENAI_API_KEY missing)' },
        { status: 503 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Semantic search is not configured (Supabase env missing)' },
        { status: 503 }
      );
    }

    // 1. Embed the incoming query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Call the progressive semantic search function
    const { data, error } = await supabase.rpc('semantic_search_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: min_similarity,
      match_count: limit,
    });

    if (error) {
      console.error('semantic_search_chunks error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    const results: SearchResult[] = (data || []).map((row: any) => ({
      document_id: row.document_id,
      content: row.content,
      similarity: row.similarity,
      metadata: row.metadata,
      source_type: row.source_type,
      source_id: row.source_id,
    }));

    return NextResponse.json({
      query,
      count: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Nexus search error:', err);
    return NextResponse.json(
      { error: 'Internal server error', message: err.message },
      { status: 500 }
    );
  }
}

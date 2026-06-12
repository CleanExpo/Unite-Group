#!/usr/bin/env tsx
/**
 * Nexus Wave 3 - Sandbox Backfill Script
 * Target: xgqwfwqumliuguzhshwv (sandbox with pgvector + test data live)
 * Uses real OpenAI embeddings + corrected wiki_pages schema (no 'slug')
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIM = 1536;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const BATCH_SIZE = 6;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required in environment');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// === SANDBOX PROJECT (Wave 3 schema lives here) ===
const supabase = createClient(
  'https://xgqwfwqumliuguzhshwv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getEmbedding(text: string): Promise<number[]> {
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIM,
  });
  return resp.data[0].embedding;
}

async function upsertDocument(record: {
  source_type: string;
  source_id: string;
  title: string;
  content: string;
  metadata: any;
}) {
  const { data, error } = await supabase
    .from('document_embeddings')
    .upsert(record, { onConflict: 'source_type,source_id' })
    .select('id')
    .single();

  if (error) {
    console.error('upsertDocument error:', error);
    return null;
  }
  return data;
}

async function upsertChunk(documentId: string, content: string, embedding: number[]) {
  const { error } = await supabase.from('document_chunks').insert({
    document_id: documentId,
    content,
    embedding,
    metadata: {},
  });
  if (error) console.error('upsertChunk error:', error);
}

function createChunks(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + size, text.length);
    chunks.push(text.slice(i, end));
    i = end - overlap;
  }
  return chunks;
}

async function backfillWikiSandbox(limit = 15) {
  console.log(`\n📖 Backfilling wiki_pages in SANDBOX (limit ${limit})...`);

  const { data: pages, error } = await supabase
    .from('wiki_pages')
    .select('id, title, content, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('wiki_pages query failed:', error.message);
    return;
  }
  if (!pages?.length) {
    console.log('No wiki_pages found in sandbox.');
    return;
  }

  let count = 0;
  for (const page of pages) {
    const content = page.content || '';
    const chunks = createChunks(content);

    const doc = await upsertDocument({
      source_type: 'wiki',
      source_id: page.id,
      title: page.title || 'Untitled',
      content: content.substring(0, 2000),
      metadata: { updated_at: page.updated_at },
    });

    if (!doc) continue;

    for (const chunk of chunks) {
      const emb = await getEmbedding(chunk);
      await upsertChunk(doc.id, chunk, emb);
    }

    console.log(`  ✓ ${page.id} — ${chunks.length} chunks`);
    count++;
    if (count % BATCH_SIZE === 0) await new Promise(r => setTimeout(r, 1200));
  }
  console.log(`Completed ${count} wiki pages`);
}

async function main() {
  console.log('🚀 Nexus Wave 3 – SANDBOX Backfill (real embeddings)');
  await backfillWikiSandbox(12);
  console.log('\n✅ Sandbox backfill complete. Ready for NL endpoint verification.');
}

main().catch(console.error);

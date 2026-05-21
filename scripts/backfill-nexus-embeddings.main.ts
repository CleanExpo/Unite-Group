#!/usr/bin/env tsx
/**
 * Nexus Wave 3 — Main Project Backfill
 * Target: lksfwktwtmyznckodsau (production schema with real data)
 * Uses real OpenAI + corrected schema
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIM = 1536;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const BATCH_SIZE = 5;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

async function upsertDocument(record: any) {
  const { data, error } = await supabase
    .from('document_embeddings')
    .upsert(record, { onConflict: 'source_type,source_id' })
    .select('id').single();
  if (error) { console.error('upsert error:', error.message); return null; }
  return data;
}

function createChunks(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + size, text.length);
    chunks.push(text.slice(i, end));
    i = end - overlap;
  }
  return chunks;
}

async function backfill(limit = 20) {
  console.log(`📖 Backfilling wiki_pages (limit ${limit}) on MAIN project...`);

  const { data: pages, error } = await supabase
    .from('wiki_pages')
    .select('id, title, content, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('Query error:', error.message); return; }
  if (!pages?.length) { console.log('No pages found'); return; }

  let count = 0;
  for (const page of pages) {
    const chunks = createChunks(page.content || '');
    const doc = await upsertDocument({
      source_type: 'wiki',
      source_id: page.id,
      title: page.title,
      content: (page.content || '').substring(0, 2000),
      metadata: { updated_at: page.updated_at },
      embedding_model: EMBEDDING_MODEL
    });
    if (!doc) continue;

    for (const chunk of chunks) {
      const emb = await getEmbedding(chunk);
      await supabase.from('document_chunks').insert({
        document_id: doc.id,
        content: chunk,
        embedding: emb
      });
    }

    console.log(`  ✓ ${page.id} — ${chunks.length} chunks`);
    count++;
    if (count % BATCH_SIZE === 0) await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`✅ Completed ${count} wiki pages`);
}

async function main() {
  console.log('🚀 Nexus Wave 3 – MAIN Backfill Started');
  await backfill(50);
  console.log('✅ Backfill finished. NL search endpoint is ready.');
}
main().catch(console.error);

#!/usr/bin/env tsx
/**
 * Nexus Wave 3 - First Backfill Script (Wiki + Agent Actions)
 * 
 * UNI-2035 → UNI-2036
 * 
 * Now wired with real OpenAI embeddings (text-embedding-3-large).
 * Run in sandbox first before promoting to prod.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// === CONFIG ===
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIM = 1536;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const BATCH_SIZE = 10; // for OpenAI rate limits

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// === Embedding Function ===
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIM,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('OpenAI embedding error:', err);
    return Array(EMBEDDING_DIM).fill(0); // fallback
  }
}

// === Backfill Logic (identical to previous version) ===

async function backfillWikiPages(limit = 30) {
  console.log(`\n📖 Backfilling wiki_pages (limit ${limit})...`);

  const { data: pages, error } = await supabase
    .from('wiki_pages')
    .select('id, title, content, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!pages || pages.length === 0) {
    console.log('No wiki pages found.');
    return;
  }

  let count = 0;
  for (const page of pages) {
    const content = page.content || '';
    const chunks = createChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);

    const { data: doc } = await upsertDocument({
      source_type: 'wiki',
      source_id: page.id,
      title: page.title,
      content: content.substring(0, 2000),
      metadata: { updated_at: page.updated_at }
    });

    if (!doc) continue;

    await upsertChunks(doc.id, chunks);
    console.log(`  ✓ ${page.id} (${chunks.length} chunks)`);
    count++;
    if (count % BATCH_SIZE === 0) await delay(1000); // rate limit
  }
  console.log(`Completed ${count} wiki pages`);
}

async function backfillAgentActions(limit = 50) {
  console.log(`\n🤖 Backfilling agent_actions (limit ${limit})...`);

  const { data: actions, error } = await supabase
    .from('agent_actions')
    .select('id, intent, result, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!actions || actions.length === 0) {
    console.log('No agent actions found.');
    return;
  }

  let count = 0;
  for (const action of actions) {
    const combinedText = `${action.intent || ''}\n\n${action.result || ''}`.trim();
    const chunks = createChunks(combinedText, CHUNK_SIZE, CHUNK_OVERLAP);

    const { data: doc } = await upsertDocument({
      source_type: 'agent_action',
      source_id: action.id,
      title: action.intent?.substring(0, 100) || 'Agent Action',
      content: combinedText.substring(0, 2000),
      metadata: { created_at: action.created_at }
    });

    if (!doc) continue;

    await upsertChunks(doc.id, chunks);
    console.log(`  ✓ Agent ${action.id}`);
    count++;
  }
  console.log(`Completed ${count} agent actions`);
}

// === Helpers ===

async function upsertDocument(doc: any) {
  const { error, data } = await supabase
    .from('document_embeddings')
    .upsert(doc, { onConflict: 'source_type,source_id' })
    .select()
    .single();

  if (error) {
    console.error('Document upsert error:', error);
    return null;
  }
  return data;
}

async function upsertChunks(documentId: string, chunks: string[]) {
  const rows = await Promise.all(
    chunks.map(async (content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      embedding: await getEmbedding(content),
    }))
  );

  const { error } = await supabase
    .from('document_chunks')
    .upsert(rows, { onConflict: 'document_id,chunk_index' });

  if (error) console.error('Chunk upsert error:', error);
}

function createChunks(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks.length > 0 ? chunks : [''];
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === Main ===
async function main() {
  console.log('🚀 Nexus Wave 3 – Real Embedding Backfill Started\n');

  await backfillWikiPages(20);      // conservative first run
  await backfillAgentActions(30);

  console.log('\n✅ Backfill complete.');
  console.log('Run this query to verify:');
  console.log(`
    SELECT * FROM semantic_search_chunks(
      (SELECT embedding FROM document_chunks LIMIT 1),
      0.75,
      10
    );
  `);
}

main().catch(console.error);
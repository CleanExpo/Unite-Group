#!/usr/bin/env tsx
/**
 * Nexus Wave 3 Backfill – Self-contained runner
 * Loads env directly from .env.local + 1Password fallback
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

function loadEnvVar(key: string): string {
  // 1. Try process.env first (already set from shell)
  if (process.env[key]) return process.env[key]!;

  // 2. Parse .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`^${key}=["']?([^"'\\s]+)["']?`, 'm'));
    if (match) return match[1];
  }

  // 3. Try common backup files
  const backupFiles = ['.env.local.bak', '.env.vercel-pull.tmp', '.env.sandbox.local'];
  for (const f of backupFiles) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
      const c = fs.readFileSync(p, 'utf8');
      const m = c.match(new RegExp(`^${key}=["']?([^"'\\s]+)["']?`, 'm'));
      if (m) return m[1];
    }
  }

  return '';
}

const OPENAI_API_KEY = loadEnvVar('OPENAI_API_KEY');
const SUPABASE_URL = loadEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE = loadEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!OPENAI_API_KEY || OPENAI_API_KEY === '***' || OPENAI_API_KEY.length < 20) {
  console.error('❌ OPENAI_API_KEY not found or is masked (***).');
  console.error('   Please temporarily put your real key in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Supabase credentials missing from .env.local');
  process.exit(1);
}

console.log('✅ Environment loaded successfully');
console.log(`   OPENAI: ${OPENAI_API_KEY.length} chars`);
console.log(`   SUPABASE: ${SUPABASE_URL}`);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const MODEL = 'text-embedding-3-large';
const DIM = 1536;
const CHUNK_SIZE = 800;
const OVERLAP = 100;
const BATCH = 5;

async function getEmbedding(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({
    model: MODEL,
    input: text,
    dimensions: DIM,
  });
  return r.data[0].embedding;
}

function createChunks(text: string): string[] {
  if (!text || text.length === 0) return [];
  const chunks: string[] = [];
  let start = 0;
  const maxChunks = 200; // safety cap for very long pages
  while (start < text.length && chunks.length < maxChunks) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    const nextStart = end - OVERLAP;
    start = Math.max(0, nextStart);
    if (end === text.length) break;
  }
  return chunks;
}

async function upsertDocument(record: any) {
  const { data, error } = await supabase
    .from('document_embeddings')
    .upsert(record, { onConflict: 'source_type,source_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  console.log('\n🚀 Nexus Wave 3 – Real Backfill Starting on MAIN project\n');

  const { data: pages, error } = await supabase
    .from('wiki_pages')
    .select('id, title, content, updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);

  if (error) throw error;
  console.log(`Found ${pages.length} wiki_pages to embed`);

  let done = 0;
  for (const page of pages) {
    const content = page.content || '';
    const chunks = createChunks(content);

    const doc = await upsertDocument({
      source_type: 'wiki',
      source_id: page.id,
      title: page.title,
      content: content.substring(0, 2000),
      metadata: { updated_at: page.updated_at },
      embedding_model: MODEL,
    });

    for (const chunkText of chunks) {
      const embedding = await getEmbedding(chunkText);
      await supabase.from('document_chunks').insert({
        document_id: doc.id,
        content: chunkText,
        embedding,
        metadata: {},
      });
    }

    done++;
    console.log(`✓ ${page.id} — ${chunks.length} chunks [${done}/${pages.length}]`);

    if (done % BATCH === 0) {
      await new Promise(r => setTimeout(r, 1100));
    }
  }

  console.log(`\n✅ Wave 3 Backfill Complete: ${done} documents embedded with real vectors`);
}

main().catch(console.error);

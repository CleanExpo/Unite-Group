#!/usr/bin/env tsx
/**
 * Wave 3 Chunk Repair
 * Re-processes all wiki_pages and inserts proper chunks + embeddings
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

function loadEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!;
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`^${key}=[\"']?([^\"'\\s]+)[\"']?`, 'm'));
    if (match) return match[1];
  }
  const backups = ['.env.local.bak', '.env.vercel-pull.tmp'];
  for (const f of backups) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
      const c = fs.readFileSync(p, 'utf8');
      const m = c.match(new RegExp(`^${key}=[\"']?([^\"'\\s]+)[\"']?`, 'm'));
      if (m) return m[1];
    }
  }
  return '';
}

const OPENAI_API_KEY = loadEnvVar('OPENAI_API_KEY');
const SUPABASE_URL = loadEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE = loadEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
  console.error('❌ OPENAI key invalid');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const MODEL = 'text-embedding-3-large';
const DIM = 1536;
const CHUNK_SIZE = 800;
const OVERLAP = 100;

function createChunks(text: string): string[] {
  if (!text || text.length === 0) return [];
  const chunks: string[] = [];
  let start = 0;
  const maxChunks = 200;
  while (start < text.length && chunks.length < maxChunks) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    const next = end - OVERLAP;
    start = Math.max(0, next);
    if (end === text.length) break;
  }
  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({ model: MODEL, input: text, dimensions: DIM });
  return r.data[0].embedding;
}

async function repair() {
  console.log('🔧 Starting Wave 3 Chunk Repair...');

  const { data: pages, error } = await supabase
    .from('wiki_pages')
    .select('id, title, content')
    .limit(60);

  if (error) throw error;
  console.log(`Found ${pages.length} pages to repair`);

  let done = 0;
  for (const page of pages) {
    const content = page.content || '';
    const chunks = createChunks(content);

    // Upsert parent document
    const { data: doc, error: docErr } = await supabase
      .from('document_embeddings')
      .upsert({
        source_type: 'wiki',
        source_id: page.id,
        title: page.title,
        content: content.substring(0, 2000),
        embedding_model: MODEL,
      }, { onConflict: 'source_type,source_id' })
      .select('id')
      .single();

    if (docErr) {
      console.error(`❌ Doc upsert failed for ${page.id}`);
      continue;
    }

    // Delete old chunks for this doc to avoid duplicates
    await supabase.from('document_chunks').delete().eq('document_id', doc.id);

    // Insert chunks with embeddings
    let chunkIndex = 0;
    for (const chunkText of chunks) {
      try {
        const embedding = await getEmbedding(chunkText);
        await supabase.from('document_chunks').insert({
          document_id: doc.id,
          chunk_index: chunkIndex,
          content: chunkText,
          embedding,
          metadata: {},
        });
        chunkIndex++;
      } catch (e) {
        console.error(`Embedding error on chunk ${chunkIndex} of ${page.id}`);
      }
    }

    done++;
    console.log(`✓ ${page.id} — ${chunks.length} chunks [${done}/${pages.length}]`);

    if (done % 5 === 0) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log(`\n✅ Repair complete. ${done} pages re-embedded.`);
}

repair().catch(console.error);
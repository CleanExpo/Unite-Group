// Vault → wiki_pages ingest (UNI-2373 P3).
// Reads markdown under WIKI_PATH / BRAIN1_WIKI_DIR / ~/2nd Brain/Wiki and upserts
// into public.wiki_pages. Service-role writes after founder session auth at the
// route boundary — wiki_pages has no founder_id column.

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hostHome } from '@/lib/host-home'

export const SKIP_WIKI_FILES = new Set(['log.md', 'index.md', 'MEMORY.md'])

export const MAX_WIKI_CONTENT_CHARS = 50_000

/**
 * The vault root: WIKI_PATH, then BRAIN1_WIKI_DIR, then `~/2nd Brain/Wiki`.
 *
 * `home` defaults to hostHome() rather than os.homedir() — see src/lib/host-home.ts
 * for why folding a literal home directory in here breaks `next build` on Windows.
 *
 * Returns '' when there is no env override and no home to fall back to, so the
 * caller fails on an unresolved path instead of silently reading a relative
 * `2nd Brain/Wiki` next to the process's working directory.
 */
export function resolveWikiIngestPath(
  env: NodeJS.ProcessEnv = process.env,
  home: string = hostHome(),
): string {
  const fromEnv = env.WIKI_PATH?.trim() || env.BRAIN1_WIKI_DIR?.trim()
  if (fromEnv) return fromEnv
  return home ? path.join(home, '2nd Brain', 'Wiki') : ''
}

export function pageIdFromRelative(relPath: string): string {
  return relPath.replace(/\\/g, '/').replace(/\.md$/i, '')
}

export function titleFromMarkdown(content: string, fallbackStem: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match?.[1]?.trim()) return match[1].trim()
  return fallbackStem.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function tagsFromWikiLinks(content: string, limit = 10): string[] {
  const tags = new Set<string>()
  for (const m of content.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const tag = m[1]?.trim()
    if (tag) tags.add(tag)
    if (tags.size >= limit) break
  }
  return [...tags]
}

export interface WikiPageUpsert {
  id: string
  title: string
  content: string
  tags: string[]
  word_count: number
  updated_at: string
}

export function buildWikiPageUpsert(
  relativeMdPath: string,
  content: string,
  updatedAt: Date = new Date(),
): WikiPageUpsert {
  const id = pageIdFromRelative(relativeMdPath)
  const stem = path.basename(relativeMdPath, path.extname(relativeMdPath))
  const clipped = content.slice(0, MAX_WIKI_CONTENT_CHARS)
  return {
    id,
    title: titleFromMarkdown(content, stem),
    content: clipped,
    tags: tagsFromWikiLinks(content),
    word_count: clipped.split(/\s+/).filter(Boolean).length,
    updated_at: updatedAt.toISOString(),
  }
}

/**
 * A vault root we could not READ is not an empty vault. Nested directories stay
 * best-effort (one unreadable subfolder must not fail a whole ingest), but a
 * failure to read the ROOT is fatal: swallowing it yields zero files, which the
 * caller reports as scanned: 0, failed: 0 — an apparently clean ingest of a
 * vault that was never opened. A typoed WIKI_PATH, a missing default vault and a
 * root permission failure all take this path.
 */
async function collectMarkdownFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function walk(dir: string, isRoot = false): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (err) {
      if (isRoot) throw err
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === '_archive-may-2026') continue
        await walk(full)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        if (SKIP_WIKI_FILES.has(entry.name)) continue
        out.push(full)
      }
    }
  }
  await walk(root, true)
  return out
}

export interface IngestWikiPagesOptions {
  wikiRoot: string
  supabase: Pick<SupabaseClient, 'from'>
  /** Only sync files with mtime strictly after this unix seconds (optional). */
  sinceUnixSeconds?: number
  /** Cap pages processed (founder API safety). */
  limit?: number
  dryRun?: boolean
}

export interface IngestWikiPagesResult {
  wikiRoot: string
  scanned: number
  upserted: number
  failed: number
  dryRun: boolean
  errors: Array<{ id: string; message: string }>
  sampleIds: string[]
}

export async function ingestWikiPages(
  opts: IngestWikiPagesOptions,
): Promise<IngestWikiPagesResult> {
  const files = await collectMarkdownFiles(opts.wikiRoot)
  const errors: Array<{ id: string; message: string }> = []
  const sampleIds: string[] = []
  let upserted = 0
  let scanned = 0
  const limit = opts.limit ?? Number.POSITIVE_INFINITY

  for (const full of files) {
    if (upserted + errors.length >= limit) break
    const st = await stat(full)
    if (
      opts.sinceUnixSeconds != null &&
      st.mtimeMs / 1000 <= opts.sinceUnixSeconds
    ) {
      continue
    }
    scanned += 1
    const rel = path.relative(opts.wikiRoot, full)
    let content: string
    try {
      content = await readFile(full, 'utf8')
    } catch (err) {
      errors.push({
        id: pageIdFromRelative(rel),
        message: err instanceof Error ? err.message : String(err),
      })
      continue
    }
    const row = buildWikiPageUpsert(rel, content, st.mtime)
    if (sampleIds.length < 8) sampleIds.push(row.id)
    if (opts.dryRun) {
      upserted += 1
      continue
    }
    const { error } = await opts.supabase.from('wiki_pages').upsert(row, {
      onConflict: 'id',
    })
    if (error) {
      errors.push({ id: row.id, message: error.message })
    } else {
      upserted += 1
    }
  }

  return {
    wikiRoot: opts.wikiRoot,
    scanned,
    upserted,
    failed: errors.length,
    dryRun: Boolean(opts.dryRun),
    errors: errors.slice(0, 20),
    sampleIds,
  }
}

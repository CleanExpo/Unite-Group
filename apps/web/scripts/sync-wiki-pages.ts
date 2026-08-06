#!/usr/bin/env npx tsx
/**
 * CLI: vault → wiki_pages ingest (UNI-2373 P3).
 *
 *   cd apps/web
 *   WIKI_PATH="$HOME/2nd Brain/Wiki" npx tsx scripts/sync-wiki-pages.ts
 *   npx tsx scripts/sync-wiki-pages.ts --dry-run --limit 20
 *   npx tsx scripts/sync-wiki-pages.ts --since-last
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createServiceClient } from '../src/lib/supabase/service'
import {
  ingestWikiPages,
  resolveWikiIngestPath,
} from '../src/lib/wiki/ingest'

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const sinceLast = args.has('--since-last')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined

  const wikiRoot = resolveWikiIngestPath()
  const marker = path.join(wikiRoot, '.last_supabase_sync')
  let sinceUnixSeconds: number | undefined
  if (sinceLast && existsSync(marker)) {
    const raw = readFileSync(marker, 'utf8').trim()
    const n = Number(raw)
    if (Number.isFinite(n)) sinceUnixSeconds = n
  }

  const supabase = dryRun
    ? ({ from: () => ({ upsert: async () => ({ error: null }) }) } as never)
    : createServiceClient()

  const result = await ingestWikiPages({
    wikiRoot,
    supabase,
    dryRun,
    sinceUnixSeconds,
    limit,
  })

  console.log(JSON.stringify(result, null, 2))

  if (!dryRun && result.upserted > 0) {
    writeFileSync(marker, String(Date.now() / 1000), 'utf8')
  }

  if (result.failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

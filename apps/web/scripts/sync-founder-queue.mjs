#!/usr/bin/env node

/**
 * Mission Control Day 1 — Founder queue sync.
 *
 * Copies the repo-root FOUNDER-QUEUE.md ledger to an in-tree location
 * (`data/command-centre/founder-queue.md`) so it is inside apps/web's
 * output-file-tracing root and ships in the Vercel lambda bundle. The root
 * file sits two levels above apps/web and is never traced into the
 * serverless bundle, so reading it directly ENOENTs in production — the same
 * shape as sync-portfolio-registry.mjs (UNI-2297).
 *
 * Runs as part of `prebuild`. Fails loudly if the ledger is missing — a build
 * without it would render the "Blocked on me" tile as unavailable on every
 * request.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(appRoot, '..', '..', 'FOUNDER-QUEUE.md')
const target = join(appRoot, 'data', 'command-centre', 'founder-queue.md')

if (!existsSync(source)) {
  console.error(`✖ sync-founder-queue: ledger not found at ${source}`)
  console.error('  The "Blocked on me" tile reads FOUNDER-QUEUE.md. Refusing to build without it.')
  process.exit(1)
}

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
console.log(`✓ sync-founder-queue: copied ${source} → ${target}`)

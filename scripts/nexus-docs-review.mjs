#!/usr/bin/env node

// Deterministic semantic review layer for the Nexus official-docs watcher.
//
// It reads the watcher's report.json plus the current and prior normalised
// content snapshots, then classifies each per-source delta as either
// `volatile_noise` (only vendor counters / relative-time / marketing chrome
// moved) or `material_change` (substantive documentation drift). For material
// changes it emits a proposed Markdown update, the source URL and the content
// hashes. It performs NO network I/O and NEVER overwrites a committed baseline
// or snapshot — it only ever writes proposals into an explicit output dir.

import { readdir, readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { assertPathInsideRoot, sha256 } from './nexus-docs-watch.mjs'

const MAX_DIFF_LINES = 40

class ReviewError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ReviewError'
    this.code = code
  }
}

function vendorSlug(vendor) {
  return String(vendor).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function validateClassification(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new ReviewError('invalid_classification', 'Classification config must be an object')
  }
  if (config.schemaVersion !== 1) {
    throw new ReviewError('invalid_classification', 'Classification schemaVersion must be 1')
  }
  if (typeof config.placeholder !== 'string' || config.placeholder.length === 0) {
    throw new ReviewError('invalid_classification', 'Classification placeholder must be a non-empty string')
  }
  const buckets = [config.default, ...Object.values(config.vendors ?? {})]
  for (const bucket of buckets) {
    if (!bucket || !Array.isArray(bucket.volatile)) {
      throw new ReviewError('invalid_classification', 'Each classification bucket needs a volatile array')
    }
    for (const pattern of bucket.volatile) {
      if (typeof pattern !== 'string') {
        throw new ReviewError('invalid_classification', 'Volatile patterns must be strings')
      }
      try {
        // eslint-disable-next-line no-new
        new RegExp(pattern, 'gi')
      } catch {
        throw new ReviewError('invalid_classification', `Invalid volatile pattern: ${pattern}`)
      }
    }
  }
  return config
}

export function compileVolatile(config, vendor) {
  const patterns = [
    ...(config.default?.volatile ?? []),
    ...(config.vendors?.[vendor]?.volatile ?? []),
  ]
  return patterns.map((pattern) => new RegExp(pattern, 'gi'))
}

export function stripVolatile(text, regexes, placeholder) {
  let stripped = String(text)
  for (const regex of regexes) {
    stripped = stripped.replace(regex, placeholder)
  }
  return stripped
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
}

function lineDiff(priorText, currentText) {
  const prior = String(priorText).split('\n').map((line) => line.trim()).filter(Boolean)
  const current = String(currentText).split('\n').map((line) => line.trim()).filter(Boolean)
  const priorSet = new Set(prior)
  const currentSet = new Set(current)
  const removed = prior.filter((line) => !currentSet.has(line))
  const added = current.filter((line) => !priorSet.has(line))
  const lines = []
  for (const line of removed.slice(0, MAX_DIFF_LINES)) lines.push(`- ${line}`)
  for (const line of added.slice(0, MAX_DIFF_LINES)) lines.push(`+ ${line}`)
  const truncated = removed.length + added.length > MAX_DIFF_LINES * 2
  return { lines, added: added.length, removed: removed.length, truncated }
}

function proposedMarkdown(item, diff, surface) {
  const lines = [
    `### ${item.id}`,
    '',
    `- Vendor: ${item.vendor}`,
    `- Source: ${item.url}`,
    `- Change: ${item.change}`,
    `- Prior hash: ${item.priorSha256 ?? 'none'}`,
    `- Current hash: ${item.currentSha256 ?? 'none'}`,
  ]
  if (surface) {
    lines.push(`- Surface: ${surface.label ?? surface.surface} (${surface.surface})`)
    if (surface.note) lines.push(`- Surface note: ${surface.note}`)
    if (Array.isArray(surface.excludes) && surface.excludes.length > 0) {
      lines.push(`- Explicitly excludes: ${surface.excludes.join('; ')}`)
    }
  }
  lines.push('', '```diff')
  if (diff && diff.lines.length > 0) {
    lines.push(...diff.lines)
    if (diff.truncated) lines.push(`… diff truncated (${diff.added} added / ${diff.removed} removed lines)`)
  } else {
    lines.push('+ (new source — no prior snapshot to diff)')
  }
  lines.push('```', '')
  return lines.join('\n')
}

// Pure classifier: takes the parsed report, classification config and content
// maps (Map<sourceId, normalisedText>) and returns a review object.
export function runReview({ report, classification, currentContent, priorSnapshots, now }) {
  validateClassification(classification)
  if (!report || typeof report !== 'object' || !Array.isArray(report.sources)) {
    throw new ReviewError('invalid_report', 'Review requires a report with a sources array')
  }
  const current = currentContent instanceof Map ? currentContent : new Map(Object.entries(currentContent ?? {}))
  const prior = priorSnapshots instanceof Map ? priorSnapshots : new Map(Object.entries(priorSnapshots ?? {}))
  const surfaces = classification.sourceSurfaces ?? {}
  const placeholder = classification.placeholder

  const items = []
  for (const entry of [...report.sources].sort((a, b) => a.id.localeCompare(b.id))) {
    if (entry.outcome !== 'ok') continue
    const surface = surfaces[entry.id] ?? null
    const base = {
      id: entry.id,
      vendor: entry.vendor,
      url: entry.finalUrl ?? entry.url,
      change: entry.change,
      currentSha256: entry.normalisedSha256 ?? null,
      priorSha256: null,
      surface,
      reasons: [],
      classification: 'unchanged',
      proposedMarkdown: null,
      pagePath: `docs/vendor-intelligence/${vendorSlug(entry.vendor)}.md`,
    }

    if (entry.change === 'unchanged') {
      items.push(base)
      continue
    }

    const currentText = current.get(entry.id)
    const priorText = prior.get(entry.id)
    base.priorSha256 = typeof priorText === 'string' ? sha256(priorText) : null

    if (entry.change === 'first_seen') {
      base.classification = 'material_change'
      base.reasons.push('first_seen')
      base.proposedMarkdown = proposedMarkdown(base, null, surface)
      items.push(base)
      continue
    }

    // change === 'changed'
    if (typeof currentText !== 'string' || typeof priorText !== 'string') {
      base.classification = 'material_change'
      base.reasons.push('missing_snapshot')
      base.proposedMarkdown = proposedMarkdown(base, null, surface)
      items.push(base)
      continue
    }

    const regexes = compileVolatile(classification, entry.vendor)
    const strippedPrior = stripVolatile(priorText, regexes, placeholder)
    const strippedCurrent = stripVolatile(currentText, regexes, placeholder)
    if (strippedPrior === strippedCurrent) {
      base.classification = 'volatile_noise'
      base.reasons.push('only_volatile_regions_changed')
      items.push(base)
      continue
    }

    base.classification = 'material_change'
    base.reasons.push('normalised_content')
    const diff = lineDiff(priorText, currentText)
    base.proposedMarkdown = proposedMarkdown(base, diff, surface)
    items.push(base)
  }

  const count = (predicate) => items.filter(predicate).length
  return {
    schemaVersion: 1,
    generatedAt: now ?? new Date().toISOString(),
    reportGeneratedAt: report.generatedAt ?? null,
    summary: {
      total: items.length,
      materialChanges: count((item) => item.classification === 'material_change'),
      volatileNoise: count((item) => item.classification === 'volatile_noise'),
      unchanged: count((item) => item.classification === 'unchanged'),
      firstSeen: count((item) => item.reasons.includes('first_seen')),
      missingSnapshots: count((item) => item.reasons.includes('missing_snapshot')),
    },
    items,
  }
}

export function renderReviewJson(review) {
  return `${JSON.stringify(review, null, 2)}\n`
}

export function renderReviewMarkdown(review) {
  const material = review.items.filter((item) => item.classification === 'material_change')
  const lines = [
    '# Nexus vendor-intelligence review',
    '',
    `Generated: ${review.generatedAt}`,
    '',
    `Summary: ${review.summary.total} sources reviewed; ${review.summary.materialChanges} material; ${review.summary.volatileNoise} volatile noise; ${review.summary.unchanged} unchanged.`,
    '',
    '## Material changes',
    '',
  ]
  if (material.length === 0) {
    lines.push('_No material documentation changes proposed._', '')
  } else {
    for (const item of material) {
      lines.push(item.proposedMarkdown)
    }
  }
  lines.push('## Volatile noise (ignored)', '')
  const noise = review.items.filter((item) => item.classification === 'volatile_noise')
  if (noise.length === 0) {
    lines.push('_None._', '')
  } else {
    for (const item of noise) lines.push(`- \`${item.id}\` — ${item.url}`)
    lines.push('')
  }
  return lines.join('\n')
}

async function atomicWrite(target, value) {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporary, value, { encoding: 'utf8', mode: 0o644 })
  await rename(temporary, target)
}

async function readContentDir(root, dir) {
  const map = new Map()
  if (!dir) return map
  let safeDir
  try {
    safeDir = assertPathInsideRoot(root, dir)
  } catch {
    return map
  }
  let entries
  try {
    entries = await readdir(safeDir)
  } catch {
    return map
  }
  for (const name of entries) {
    if (!name.endsWith('.txt')) continue
    const id = name.slice(0, -'.txt'.length)
    const safeFile = assertPathInsideRoot(root, path.join(dir, name))
    const text = (await readFile(safeFile, 'utf8')).replace(/\n$/, '')
    map.set(id, text)
  }
  return map
}

function usage() {
  return [
    'Usage: node scripts/nexus-docs-review.mjs [options]',
    '',
    'Options:',
    '  --root <dir>          Target repository root (default: current directory)',
    '  --report <file>       Watcher report.json inside root (required)',
    '  --classification <f>  Classification config (default: config/nexus-docs-classification.json)',
    '  --content <dir>       Current normalised snapshots (default: content)',
    '  --snapshots <dir>     Prior committed snapshots (default: docs/vendor-intelligence/.snapshots)',
    '  --write <dir>         Output dir for review.json / review.md proposals (no baseline overwrite)',
    '  --help                Show this help',
  ].join('\n')
}

function parseArgs(argv) {
  const parsed = {
    root: '.',
    report: null,
    classification: 'config/nexus-docs-classification.json',
    content: 'content',
    snapshots: 'docs/vendor-intelligence/.snapshots',
    outputDir: null,
    help: false,
  }
  const valueFlags = new Set(['--root', '--report', '--classification', '--content', '--snapshots', '--write'])
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (valueFlags.has(argument)) {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        throw new ReviewError('invalid_arguments', `${argument} requires a value`)
      }
      index += 1
      if (argument === '--root') parsed.root = value
      if (argument === '--report') parsed.report = value
      if (argument === '--classification') parsed.classification = value
      if (argument === '--content') parsed.content = value
      if (argument === '--snapshots') parsed.snapshots = value
      if (argument === '--write') parsed.outputDir = value
      continue
    }
    if (argument === '--help') {
      parsed.help = true
      continue
    }
    throw new ReviewError('invalid_arguments', `Unknown argument: ${argument}`)
  }
  return parsed
}

async function readJsonInsideRoot(root, candidate, label) {
  const safePath = assertPathInsideRoot(root, candidate)
  let raw
  try {
    raw = await readFile(safePath, 'utf8')
  } catch {
    throw new ReviewError('input_read_failed', `Could not read ${label} inside target root`)
  }
  try {
    return JSON.parse(raw)
  } catch {
    throw new ReviewError('invalid_json_file', `${label} is not valid JSON`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }
  if (!args.report) {
    throw new ReviewError('invalid_arguments', '--report is required')
  }
  const { realpathSync } = await import('node:fs')
  const root = realpathSync(path.resolve(args.root))
  const report = await readJsonInsideRoot(root, args.report, 'report')
  const classification = await readJsonInsideRoot(root, args.classification, 'classification config')
  const currentContent = await readContentDir(root, args.content)
  const priorSnapshots = await readContentDir(root, args.snapshots)

  const review = runReview({ report, classification, currentContent, priorSnapshots })
  const json = renderReviewJson(review)
  const markdown = renderReviewMarkdown(review)

  if (args.outputDir) {
    const safeDir = assertPathInsideRoot(root, args.outputDir)
    await mkdir(safeDir, { recursive: true })
    await Promise.all([
      atomicWrite(path.join(safeDir, 'review.json'), json),
      atomicWrite(path.join(safeDir, 'review.md'), markdown),
    ])
  }

  process.stdout.write(json)
  process.stderr.write(markdown)
  process.exitCode = review.summary.materialChanges > 0 ? 3 : 0
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    const code = error instanceof ReviewError ? error.code : 'unexpected_failure'
    const message = error instanceof Error ? error.message : 'Unknown review failure'
    process.stderr.write(`nexus-docs-review ${code}: ${message}\n`)
    process.exitCode = 1
  })
}

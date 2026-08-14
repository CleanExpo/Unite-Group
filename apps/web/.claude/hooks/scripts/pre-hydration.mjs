#!/usr/bin/env node
// Cross-platform deterministic pre-hydration for the Minion blueprint engine.
//
// Produces a bounded manifest from the CURRENT apps/web tree. It deliberately
// avoids hard-coded backend/framework assumptions and never treats legacy paths
// as required context merely because an old template once referenced them.

import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css', '.sql', '.toml', '.yml', '.yaml',
])

const IGNORED_DIRS = new Set([
  'node_modules', '.next', '.git', 'coverage', 'dist', 'build', '.turbo', 'playwright-report', 'test-results',
])

const STOP_WORDS = new Set([
  'this', 'that', 'with', 'from', 'into', 'when', 'then', 'than', 'have', 'make', 'work', 'just', 'please',
  'feature', 'issue', 'task', 'change', 'update', 'create', 'build', 'implement', 'using', 'user', 'users',
])

function parseTaskText(argv) {
  const taskIndex = argv.indexOf('--task')
  if (taskIndex >= 0) return argv.slice(taskIndex + 1).join(' ').trim()
  return argv.slice(2).join(' ').trim()
}

function resolveWebRoot(start) {
  let current = path.resolve(start)
  for (let i = 0; i < 10; i += 1) {
    if (existsSync(path.join(current, '.claude')) && existsSync(path.join(current, 'package.json'))) return current
    const nested = path.join(current, 'apps', 'web')
    if (existsSync(path.join(nested, '.claude')) && existsSync(path.join(nested, 'package.json'))) return nested
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  throw new Error(`unable to resolve apps/web root from ${start}`)
}

function detectBlueprint(text) {
  if (/\b(bug|fix|broken|error|failing|crash|regression|defect)\b/i.test(text)) return 'bugfix'
  if (/\b(migrate|migration|upgrade|replace|move|switch|port)\b/i.test(text)) return 'migration'
  if (/\b(refactor|clean|simplify|extract|rename|restructure|reorganise|optimi[sz]e)\b/i.test(text)) return 'refactor'
  return 'feature'
}

function detectToolshed(text) {
  if (/\b(auth|login|security|rls|permission|oauth|cors|csrf|secret|credential)\b/i.test(text)) return 'security'
  if (/\b(database|migration|sql|schema|postgres|supabase|table|column|rls)\b/i.test(text)) return 'database'
  if (/\b(test|spec|playwright|vitest|e2e|unit|integration|coverage)\b/i.test(text)) return 'test'
  if (/\b(bug|fix|broken|error|crash|failing|regression|defect)\b/i.test(text)) return 'debug'
  if (/\b(api|endpoint|route|server|service|repository|webhook|cron|backend)\b/i.test(text)) return 'backend'
  if (/\b(react|component|ui|page|layout|frontend|css|style|responsive|visual|design)\b/i.test(text)) return 'frontend'
  return 'general'
}

function walkFiles(root, relativeDir, output) {
  const absoluteDir = path.join(root, relativeDir)
  if (!existsSync(absoluteDir)) return
  for (const name of readdirSync(absoluteDir)) {
    if (IGNORED_DIRS.has(name)) continue
    const relative = path.join(relativeDir, name)
    const absolute = path.join(root, relative)
    let stats
    try {
      stats = statSync(absolute)
    } catch {
      continue
    }
    if (stats.isDirectory()) {
      walkFiles(root, relative, output)
      continue
    }
    if (!stats.isFile()) continue
    if (ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase())) output.push(relative.split(path.sep).join('/'))
  }
}

function taskTokens(text) {
  return Array.from(new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  ))
}

function domainBonus(file, toolshed) {
  const p = file.toLowerCase()
  const rules = {
    frontend: /(^|\/)(src\/app|src\/components|components|app)\//,
    backend: /(^|\/)(src\/app\/api|src\/server|src\/lib).*/,
    database: /(supabase|migration|database|repository|schema|rls)/,
    security: /(auth|security|middleware|supabase|rls|permission|credential)/,
    test: /(test|spec|e2e|playwright|vitest)/,
    debug: /(src|test|spec|e2e)/,
    general: /(src|docs)/,
  }
  return rules[toolshed]?.test(p) ? 3 : 0
}

function scoreFile(file, tokens, toolshed) {
  const p = file.toLowerCase()
  let score = domainBonus(file, toolshed)
  for (const token of tokens) {
    if (p.includes(token)) score += 5
    const base = path.basename(p, path.extname(p))
    if (base === token) score += 5
  }
  if (/\.test\.|\.spec\.|__tests__|\/e2e\//.test(p)) score += toolshed === 'test' ? 3 : 1
  return score
}

function existing(root, paths) {
  return paths.filter((p) => existsSync(path.join(root, p)))
}

function brisbaneTimestamp(now = new Date()) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now)
}

function taskId(text, now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now).replaceAll('-', '')
  const slug = text
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 4)
    .join('-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'task'
  return `minion-${date}-${slug}`
}

function main() {
  const taskText = parseTaskText(process.argv)
  if (!taskText) {
    console.error('pre-hydration: task text is required')
    process.exit(2)
  }

  const webRoot = resolveWebRoot(process.env.CLAUDE_PROJECT_DIR || process.cwd())
  const blueprint = detectBlueprint(taskText)
  const toolshed = detectToolshed(taskText)
  const tokens = taskTokens(taskText)

  const always = existing(webRoot, [
    'CLAUDE.md',
    '.claude/commands/spm.md',
    '.claude/rules/core.md',
    '.claude/rules/verification-gate.md',
  ])

  const anchorsByToolshed = {
    frontend: ['src/app/globals.css', 'playwright.config.ts', 'vitest.config.ts'],
    backend: ['vitest.config.ts'],
    database: ['supabase/config.toml'],
    security: [],
    test: ['vitest.config.ts', 'playwright.config.ts'],
    debug: ['vitest.config.ts', 'playwright.config.ts'],
    general: [],
  }

  const files = []
  for (const root of ['src', 'e2e', 'supabase', 'scripts']) walkFiles(webRoot, root, files)

  const ranked = files
    .map((file) => ({ file, score: scoreFile(file, tokens, toolshed) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
    .slice(0, 10)
    .map(({ file }) => file)

  const domain = Array.from(new Set([
    ...existing(webRoot, anchorsByToolshed[toolshed] || []),
    ...ranked,
  ])).slice(0, 12)

  const manifest = {
    schema: 'nexus.minion-context-manifest.v2',
    task_id: taskId(taskText),
    blueprint,
    toolshed,
    web_root: webRoot,
    always,
    domain,
    read_budget: {
      initial_files: always.length + domain.length,
      expansion_max_files: 8,
      rule: 'Expansion requires a recorded reason and targeted search; no unbounded tree reads.',
    },
    task_text: taskText,
    generated: `${brisbaneTimestamp()} AEST`,
  }

  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)
}

try {
  main()
} catch (error) {
  console.error(`pre-hydration: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}

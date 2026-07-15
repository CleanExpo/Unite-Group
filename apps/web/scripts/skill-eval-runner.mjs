#!/usr/bin/env node
// scripts/skill-eval-runner.mjs — the skill_health producer (UNI-2373 register P7).
//
// The Skill Health dashboard (/founder — SkillHealthDashboard) reads the
// skill_health table and tells the founder to run this script; until now the
// script did not exist, so nothing ever populated the table. This runner:
//
//   1. discovers the repo's operating-doctrine skills (<repo-root>/.claude/skills/*/SKILL.md),
//   2. runs a fixed set of deterministic structural evals per skill (below),
//   3. records one skill_health row per skill via PostgREST using the
//      service-role key — the skill_health_service_role RLS policy exists
//      precisely for this automated runner (verified against prod 15/07/2026).
//
// Evals are real checks that actually run — a sub-100% pass rate is an honest
// health signal, not a CI failure. No third-party dependencies.
//
// Usage (from apps/web):
//   node scripts/skill-eval-runner.mjs --all              # eval + record every skill
//   node scripts/skill-eval-runner.mjs --skill carsi      # one skill
//   node scripts/skill-eval-runner.mjs --all --dry-run    # eval + print, no write
//
// Env (read from process.env, falling back to apps/web/.env.local):
//   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, FOUNDER_USER_ID

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

// ─── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const runAll = args.includes('--all')
const dryRun = args.includes('--dry-run')
const skillFlag = args.indexOf('--skill')
const onlySkill = skillFlag !== -1 ? args[skillFlag + 1] : null

if (!runAll && !onlySkill) {
  console.error('Usage: node scripts/skill-eval-runner.mjs --all | --skill <name> [--dry-run]')
  process.exit(1)
}

// ─── Env (process.env first, .env.local fallback — no dotenv dependency) ─────

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const envLocal = loadEnvLocal()
const env = (key) => {
  const v = process.env[key] ?? envLocal[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

// ─── Skill discovery ──────────────────────────────────────────────────────────

/**
 * The doctrine skills live at <repo-root>/.claude/skills. Anchor on the git
 * boundary (.git is a dir in a normal checkout, a file in a worktree) so the
 * walk never drifts into apps/web/.claude or the machine-global ~/.claude.
 */
function findSkillsRoot(from) {
  let dir = resolve(from)
  for (;;) {
    if (existsSync(join(dir, '.git'))) {
      const candidate = join(dir, '.claude', 'skills')
      return existsSync(candidate) && statSync(candidate).isDirectory() ? candidate : null
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

// ─── Evals — deterministic structural checks, one pass/fail each ─────────────

const LINE_BUDGET = 200 // feedback-tight-code soft cap; breach is an honest health miss

function parseFrontmatter(source) {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return null
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].trim()
  }
  return { fields: fm, body: source.slice(m[0].length) }
}

/** Returns [{ name, passed, detail }] — every eval always runs. */
function evaluateSkill(dirName, skillMdPath) {
  const results = []
  const exists = existsSync(skillMdPath)
  results.push({ name: 'skill-md-exists', passed: exists, detail: skillMdPath })
  if (!exists) {
    // Remaining evals cannot run without the file; they fail honestly.
    for (const name of ['frontmatter-parses', 'name-matches-dir', 'description-substantive', 'body-substantive', 'within-line-budget']) {
      results.push({ name, passed: false, detail: 'SKILL.md missing' })
    }
    return results
  }

  const source = readFileSync(skillMdPath, 'utf8')
  const parsed = parseFrontmatter(source)
  results.push({
    name: 'frontmatter-parses',
    passed: Boolean(parsed && parsed.fields.name && parsed.fields.description),
    detail: 'frontmatter with name + description',
  })
  results.push({
    name: 'name-matches-dir',
    passed: Boolean(parsed && parsed.fields.name === dirName),
    detail: `frontmatter name vs directory "${dirName}"`,
  })
  results.push({
    name: 'description-substantive',
    passed: Boolean(parsed && (parsed.fields.description ?? '').length >= 20),
    detail: 'description >= 20 chars',
  })
  const bodyLines = (parsed ? parsed.body : source).split(/\r?\n/).filter((l) => l.trim().length > 0)
  results.push({
    name: 'body-substantive',
    passed: bodyLines.length >= 10,
    detail: `${bodyLines.length} non-empty body lines (>= 10)`,
  })
  const totalLines = source.split(/\r?\n/).length
  results.push({
    name: 'within-line-budget',
    passed: totalLines <= LINE_BUDGET,
    detail: `${totalLines} lines (budget ${LINE_BUDGET})`,
  })
  return results
}

// ─── Recorder — PostgREST insert, write-then-confirm ─────────────────────────

async function recordRun(supabaseUrl, serviceKey, founderId, row) {
  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/skill_health`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ founder_id: founderId, ...row }),
  })
  if (!res.ok) {
    throw new Error(`skill_health insert failed for ${row.skill_name}: HTTP ${res.status} ${await res.text()}`)
  }
  const inserted = await res.json()
  if (!Array.isArray(inserted) || inserted.length !== 1 || !inserted[0].id) {
    throw new Error(`skill_health insert unconfirmed for ${row.skill_name}`)
  }
  return inserted[0]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const skillsRoot = findSkillsRoot(process.cwd())
if (!skillsRoot) {
  console.error('No .claude/skills directory found walking up from', process.cwd())
  process.exit(1)
}

const dirs = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => (onlySkill ? name === onlySkill : true))
  .sort()

if (dirs.length === 0) {
  console.error(onlySkill ? `Skill "${onlySkill}" not found under ${skillsRoot}` : `No skills under ${skillsRoot}`)
  process.exit(1)
}

let supabaseUrl = null
let serviceKey = null
let founderId = null
if (!dryRun) {
  supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL') ?? env('SUPABASE_URL')
  serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  founderId = env('FOUNDER_USER_ID')
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)',
    !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !founderId && 'FOUNDER_USER_ID',
  ].filter(Boolean)
  if (missing.length > 0) {
    console.error(`Missing env: ${missing.join(', ')} — set them or run with --dry-run.`)
    process.exit(1)
  }
}

console.log(`Skill eval runner — ${dirs.length} skill(s) from ${skillsRoot}${dryRun ? ' (dry run)' : ''}`)

let failures = 0
for (const name of dirs) {
  const results = evaluateSkill(name, join(skillsRoot, name, 'SKILL.md'))
  const passCount = results.filter((r) => r.passed).length
  const evalCount = results.length
  const passRate = Math.round((passCount / evalCount) * 10000) / 100
  const summary = `${name}: ${passCount}/${evalCount} (${passRate.toFixed(1)}%)`
  const misses = results.filter((r) => !r.passed).map((r) => `${r.name} — ${r.detail}`)

  if (dryRun) {
    console.log(`  ${summary}${misses.length ? `\n      miss: ${misses.join('\n      miss: ')}` : ''}`)
    continue
  }

  try {
    await recordRun(supabaseUrl, serviceKey, founderId, {
      skill_name: name,
      eval_count: evalCount,
      pass_count: passCount,
      pass_rate: passRate,
    })
    console.log(`  recorded ${summary}`)
  } catch (err) {
    failures += 1
    console.error(`  FAILED to record ${name}: ${err instanceof Error ? err.message : err}`)
  }
}

if (failures > 0) {
  console.error(`${failures} record failure(s).`)
  process.exit(1)
}

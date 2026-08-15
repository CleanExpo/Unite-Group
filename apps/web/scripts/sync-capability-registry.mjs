#!/usr/bin/env node

/**
 * Nexus — Capability registry sync
 *
 * Walks the monorepo for the capabilities that already exist on disk (Claude
 * Code agent definitions, SKILL.md skills, and configured MCP servers) and
 * writes a normalised manifest to `data/command-centre/capabilities.json`.
 *
 * Why a build step rather than a runtime walk: `.claude/`, `.skills/` and the
 * repo-root `.mcp.json` sit outside apps/web's output-file-tracing root, so a
 * lambda cannot read them — exactly the constraint that made
 * `sync-portfolio-registry.mjs` necessary for PORTFOLIO.yaml. Discovery
 * therefore happens at build time; the app reads the manifest.
 *
 * This manifest is what `cc_agents` / `cc_tools` are populated FROM. Those
 * tables are the registry EPIC-000 Stage 3 requires an agent to search before
 * building something new; while they were empty, every search returned nothing
 * and fell through to "build new" (ARR-001 §3.1).
 *
 * Discovery is list-only: names, descriptions and file paths. No file body is
 * copied, no command is executed, and no value from an MCP config is read —
 * only server keys and non-secret transport metadata.
 *
 * Runs as part of `prebuild`. A missing source directory is NOT fatal (a
 * checkout may legitimately lack one); an unreadable/malformed manifest target
 * is, because shipping a stale manifest silently reintroduces the empty
 * registry this closes.
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(appRoot, '..', '..')
const target = join(appRoot, 'data', 'command-centre', 'capabilities.json')

/** Directories that hold definitions but are not live capability. */
const EXCLUDED_DIR_NAMES = new Set(['_archived', '_template', 'node_modules', '.next'])

/** Roots we walk. Each is optional — a missing root contributes nothing. */
const AGENT_ROOTS = [
  join(appRoot, '.claude', 'agents'),
  join(repoRoot, '.claude', 'agents'),
]

const SKILL_ROOTS = [
  join(appRoot, '.skills', 'custom'),
  join(appRoot, '.claude', 'skills'),
  join(repoRoot, '.claude', 'skills'),
]

const MCP_CONFIGS = [
  join(repoRoot, '.mcp.json'),
  join(appRoot, '.mcp.json'),
]

/** Parse a leading `---\n...\n---` YAML frontmatter block. `{}` when absent. */
function readFrontmatter(filePath) {
  let raw
  try {
    raw = readFileSync(filePath, 'utf-8')
  } catch {
    return {}
  }
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  try {
    const parsed = parseYaml(match[1])
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    // A malformed frontmatter block degrades to "no metadata", never a build failure.
    return {}
  }
}

/** Recursively collect files named `fileName`, skipping excluded directories. */
function findFiles(root, fileName, depth = 0) {
  if (depth > 4) return []
  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return []
  }
  const found = []
  for (const entry of entries) {
    if (EXCLUDED_DIR_NAMES.has(entry.name)) continue
    const full = join(root, entry.name)
    if (entry.isDirectory()) {
      found.push(...findFiles(full, fileName, depth + 1))
    } else if (entry.name === fileName) {
      found.push(full)
    }
  }
  return found
}

function firstString(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return ''
}

function stringArray(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
}

/** Directory name of a definition file — the fallback identity when frontmatter has no name. */
function enclosingDirName(filePath) {
  return dirname(filePath).split(/[\\/]/).pop() ?? ''
}

/** Collisions found while assigning keys, reported at the end of the run. */
const nameCollisions = []

/**
 * Assign each entry a registry `key` that is unique across the whole manifest.
 *
 * Two DIFFERENT capabilities can legitimately share a `name` — apps/web carries
 * a `council-of-logic`, an `execution-guardian` and a `system-supervisor` under
 * BOTH `.skills/custom/` and `.claude/skills/custom/`, and the pairs differ by
 * 400-500 lines each. They are distinct skills that collide by name, not copies.
 *
 * Deduplicating by name would silently drop one of each pair, which is the
 * failure this function exists to prevent: the registry would under-report what
 * exists and a reuse-before-build search could miss the very capability it was
 * looking for. Colliding names are disambiguated by their definition path and
 * the collision is reported, never swallowed.
 */
function assignUniqueKeys(entries) {
  const byName = new Map()
  for (const entry of entries) {
    const bucket = byName.get(entry.name)
    if (bucket) bucket.push(entry)
    else byName.set(entry.name, [entry])
  }

  for (const [name, bucket] of byName) {
    if (bucket.length === 1) {
      bucket[0].key = name
      continue
    }
    nameCollisions.push({ name, paths: bucket.map((entry) => entry.definition_path) })
    for (const entry of bucket) {
      // The definition path is unique by construction, so `name@path` is too.
      entry.key = `${name}@${entry.definition_path}`
    }
  }

  return entries.sort((a, b) => a.key.localeCompare(b.key))
}

/** Same definition file reached through two roots — a true duplicate, safe to drop. */
function dedupeByPath(entries) {
  const seen = new Set()
  return entries.filter((entry) => {
    if (seen.has(entry.definition_path)) return false
    seen.add(entry.definition_path)
    return true
  })
}

function discoverAgents() {
  const agents = []
  for (const root of AGENT_ROOTS) {
    for (const file of [...findFiles(root, 'agent.md'), ...findFiles(root, 'AGENT.md')]) {
      const fm = readFrontmatter(file)
      const name = firstString(fm.name, enclosingDirName(file))
      if (!name) continue
      agents.push({
        name,
        role: firstString(fm.role, fm.description),
        model_tier: firstString(fm.model, fm.model_tier) || null,
        skills: stringArray(fm.skills_required ?? fm.skills),
        definition_path: relative(repoRoot, file).replace(/\\/g, '/'),
      })
    }
  }
  return assignUniqueKeys(dedupeByPath(agents))
}

function discoverSkills() {
  const skills = []
  for (const root of SKILL_ROOTS) {
    for (const file of findFiles(root, 'SKILL.md')) {
      const fm = readFrontmatter(file)
      const name = firstString(fm.name, enclosingDirName(file))
      if (!name) continue
      skills.push({
        name,
        description: firstString(fm.description),
        definition_path: relative(repoRoot, file).replace(/\\/g, '/'),
      })
    }
  }
  return assignUniqueKeys(dedupeByPath(skills))
}

/**
 * Read MCP server KEYS and non-secret transport metadata only. Values that can
 * carry credentials (`env`, `headers`, `args`) are never read.
 */
function discoverMcpServers() {
  const servers = new Map()
  for (const configPath of MCP_CONFIGS) {
    let parsed
    try {
      parsed = JSON.parse(readFileSync(configPath, 'utf-8'))
    } catch {
      continue
    }
    const block = parsed?.mcpServers
    if (!block || typeof block !== 'object') continue
    for (const [name, entry] of Object.entries(block)) {
      if (!name || servers.has(name)) continue
      servers.set(name, {
        name,
        transport: firstString(entry?.type, entry?.transport, entry?.command ? 'stdio' : ''),
        description: firstString(entry?.description),
        config_path: relative(repoRoot, configPath).replace(/\\/g, '/'),
      })
    }
  }
  return [...servers.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const manifest = {
  // Bumped when the manifest shape changes so a stale file is detectable.
  schema_version: 1,
  generated_from: relative(repoRoot, appRoot).replace(/\\/g, '/') || '.',
  agents: discoverAgents(),
  skills: discoverSkills(),
  mcp_servers: discoverMcpServers(),
}

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')

const total = manifest.agents.length + manifest.skills.length + manifest.mcp_servers.length
console.log(
  `✓ sync-capability-registry: ${manifest.agents.length} agents, ${manifest.skills.length} skills, ` +
    `${manifest.mcp_servers.length} MCP servers (${total} capabilities) → ${relative(appRoot, target)}`,
)

for (const collision of nameCollisions) {
  console.log(
    `  · name collision "${collision.name}" across ${collision.paths.length} definitions — ` +
      `all registered under distinct keys: ${collision.paths.join(', ')}`,
  )
}

if (total === 0) {
  // Not fatal — a partial checkout can legitimately have none — but silence
  // here is what let the empty registry go unnoticed, so say it loudly.
  console.warn(
    '⚠ sync-capability-registry: discovered ZERO capabilities. The registry will be empty and ' +
      'reuse-before-build searches will return nothing. Check the .claude/.skills roots exist.',
  )
}

// Discovery is intentionally non-fatal so a build never fails on a missing
// optional root; the counts above (and the warning) are the signal.
process.exit(0)

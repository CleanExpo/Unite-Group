// src/lib/command-centre/capabilities.ts
//
// Typed, read-only accessor over the capability manifest produced at build time
// by `scripts/sync-capability-registry.mjs`, plus the pure mappers that turn it
// into `cc_agents` / `cc_tools` rows.
//
// This is the SOURCE half of the capability registry. `registry-sync.ts` is the
// writer that lands these rows in Supabase, and `tools/catalogue.ts` is the
// reader that serves them. Until all three existed, `cc_agents` / `cc_tools`
// had no application readers or writers at all: EPIC-000 Stage 3 requires an
// agent to search the registry before building something new, and an empty
// registry answers "nothing found" for every candidate, silently inverting
// reuse into build-new (ARR-001 §3.1).
//
// Deployment note: `.claude/`, `.skills/` and the repo-root `.mcp.json` sit
// OUTSIDE apps/web's output-file-tracing root and never enter the Vercel lambda
// bundle, so they cannot be walked at runtime. The prebuild step writes the
// in-tree `data/command-centre/capabilities.json` this module reads — the same
// arrangement `registry.ts` uses for PORTFOLIO.yaml.
//
// Nothing here executes, spawns, or connects to anything. Discovery is
// list-only and no credential-bearing MCP field is ever read.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ToolRiskClass, ToolSource } from './tools/catalogue'

/**
 * One agent definition found on disk.
 *
 * `key` is the registry identity and is unique across the manifest; `name` is
 * the human label and is NOT. Two different capabilities can share a name (the
 * repo has three such skill pairs across `.skills/custom` and
 * `.claude/skills/custom`, differing by 400-500 lines each), so keying on
 * `name` would silently drop one of every pair.
 */
export interface DiscoveredAgent {
  key: string
  name: string
  role: string
  model_tier: string | null
  skills: string[]
  definition_path: string
}

/** One SKILL.md found on disk. See `DiscoveredAgent` for the key/name split. */
export interface DiscoveredSkill {
  key: string
  name: string
  description: string
  definition_path: string
}

/** One configured MCP server (keys and non-secret transport metadata only). */
export interface DiscoveredMcpServer {
  name: string
  transport: string
  description: string
  config_path: string
}

export interface CapabilityManifest {
  schema_version: number
  generated_from: string
  agents: DiscoveredAgent[]
  skills: DiscoveredSkill[]
  mcp_servers: DiscoveredMcpServer[]
}

/** A `cc_agents` row, minus the columns the database owns (id, founder_id, created_at). */
export interface CcAgentRow {
  name: string
  role: string
  autonomy_max_level: number
  model_tier: string | null
  skills: string[]
  active: boolean
}

/** A `cc_tools` row, minus the columns the database owns (id, founder_id, discovered_at). */
export interface CcToolRow {
  tool_key: string
  source: ToolSource
  server: string | null
  description: string
  input_schema: Record<string, never>
  risk_class: ToolRiskClass
  required_level: number
  approval_required: boolean
  active: boolean
}

export const EMPTY_MANIFEST: CapabilityManifest = {
  schema_version: 1,
  generated_from: '',
  agents: [],
  skills: [],
  mcp_servers: [],
}

/**
 * Conservative default autonomy for a discovered agent.
 *
 * Agent definitions on disk do not declare an autonomy ceiling, and inferring
 * one from a role string would be inventing governance. L1 matches the
 * `cc_agents.autonomy_max_level` column default; raising an individual agent is
 * a deliberate, human act against the row, not a side effect of discovery.
 */
export const DISCOVERED_AGENT_AUTONOMY_LEVEL = 1

/** In-tree manifest written by `prebuild` — the path that ships in the lambda bundle. */
function inTreeManifestPath(): string {
  return path.join(process.cwd(), 'data', 'command-centre', 'capabilities.json')
}

function nonEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim())
}

/**
 * Pure parser from manifest JSON text to a `CapabilityManifest`.
 *
 * Every field is re-validated rather than trusted: the manifest is generated,
 * but a stale or half-written file must degrade to "fewer capabilities", never
 * to a malformed row hitting a CHECK constraint at insert time.
 */
export function parseCapabilityManifest(jsonSource: string): CapabilityManifest {
  const parsed: unknown = JSON.parse(jsonSource)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('command-centre capabilities: malformed manifest (not an object)')
  }
  const raw = parsed as Record<string, unknown>

  const agents = Array.isArray(raw.agents) ? raw.agents : []
  const skills = Array.isArray(raw.skills) ? raw.skills : []
  const servers = Array.isArray(raw.mcp_servers) ? raw.mcp_servers : []

  return {
    schema_version: typeof raw.schema_version === 'number' ? raw.schema_version : 0,
    generated_from: nonEmpty(raw.generated_from),
    agents: agents
      .map((entry) => entry as Record<string, unknown>)
      .filter((entry) => nonEmpty(entry?.name) !== '')
      .map((entry) => ({
        // A manifest written before the key field existed falls back to `name`.
        key: nonEmpty(entry.key) || nonEmpty(entry.name),
        name: nonEmpty(entry.name),
        role: nonEmpty(entry.role),
        model_tier: nonEmpty(entry.model_tier) || null,
        skills: stringArray(entry.skills),
        definition_path: nonEmpty(entry.definition_path),
      })),
    skills: skills
      .map((entry) => entry as Record<string, unknown>)
      .filter((entry) => nonEmpty(entry?.name) !== '')
      .map((entry) => ({
        key: nonEmpty(entry.key) || nonEmpty(entry.name),
        name: nonEmpty(entry.name),
        description: nonEmpty(entry.description),
        definition_path: nonEmpty(entry.definition_path),
      })),
    mcp_servers: servers
      .map((entry) => entry as Record<string, unknown>)
      .filter((entry) => nonEmpty(entry?.name) !== '')
      .map((entry) => ({
        name: nonEmpty(entry.name),
        transport: nonEmpty(entry.transport),
        description: nonEmpty(entry.description),
        config_path: nonEmpty(entry.config_path),
      })),
  }
}

/**
 * Load the capability manifest. A missing or malformed manifest degrades to an
 * EMPTY manifest (logged) rather than throwing — the same posture `getProjects`
 * takes, because a blank capability tile is honest and recoverable while an
 * error boundary across the deck is not.
 */
export async function getCapabilityManifest(): Promise<CapabilityManifest> {
  try {
    const raw = await readFile(inTreeManifestPath(), 'utf-8')
    return parseCapabilityManifest(raw)
  } catch (error) {
    console.error(
      'command-centre capabilities: failed to load capabilities.json — serving empty manifest. ' +
        'Run `node scripts/sync-capability-registry.mjs` (it runs in prebuild).',
      error,
    )
    return EMPTY_MANIFEST
  }
}

/**
 * Map discovered agents to `cc_agents` rows.
 *
 * The row's `name` carries the manifest `key`, not the label: `cc_agents` is
 * UNIQUE(founder_id, name), so writing a colliding label would make two
 * distinct agents overwrite each other on upsert.
 */
export function toCcAgentRows(manifest: CapabilityManifest): CcAgentRow[] {
  return manifest.agents.map((agent) => ({
    name: agent.key,
    role: agent.role,
    autonomy_max_level: DISCOVERED_AGENT_AUTONOMY_LEVEL,
    model_tier: agent.model_tier,
    skills: agent.skills,
    active: true,
  }))
}

/**
 * Map discovered skills and MCP servers to `cc_tools` rows.
 *
 * Risk posture mirrors the static catalogue this replaces:
 *   - a skill is instructions, so reading one has no side effect → `read`,
 *     no approval, level 0;
 *   - an MCP server reaches a system outside this process → `external`,
 *     approval required.
 * `input_schema` stays `{}` because discovery genuinely does not know the
 * schemas; inventing one would be a fake-as-real claim.
 */
export function toCcToolRows(manifest: CapabilityManifest): CcToolRow[] {
  const skillRows: CcToolRow[] = manifest.skills.map((skill) => ({
    tool_key: `skill:${skill.key}`,
    source: 'project',
    server: null,
    description: skill.description || `Skill defined at ${skill.definition_path}.`,
    input_schema: {},
    risk_class: 'read',
    required_level: 0,
    approval_required: false,
    active: true,
  }))

  const mcpRows: CcToolRow[] = manifest.mcp_servers.map((server) => ({
    tool_key: `mcp:${server.name}`,
    source: 'mcp',
    server: server.name,
    description:
      server.description ||
      `MCP server configured in ${server.config_path}${server.transport ? ` (${server.transport})` : ''}.`,
    input_schema: {},
    risk_class: 'external',
    required_level: 2,
    approval_required: true,
    active: true,
  }))

  // Prefixed keys (`skill:` / `mcp:`) keep the two namespaces from colliding on
  // the `UNIQUE(founder_id, tool_key)` constraint when a skill and a server
  // share a name.
  return [...skillRows, ...mcpRows]
}

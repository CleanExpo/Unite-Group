import { describe, expect, it } from 'vitest'

import {
  DISCOVERED_AGENT_AUTONOMY_LEVEL,
  EMPTY_MANIFEST,
  parseCapabilityManifest,
  toCcAgentRows,
  toCcToolRows,
  type CapabilityManifest,
} from '@/lib/command-centre/capabilities'

function manifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return { ...EMPTY_MANIFEST, ...overrides }
}

describe('parseCapabilityManifest', () => {
  it('parses agents, skills and MCP servers from a well-formed manifest', () => {
    const parsed = parseCapabilityManifest(
      JSON.stringify({
        schema_version: 1,
        generated_from: 'apps/web',
        agents: [
          {
            name: 'code-auditor',
            role: 'Forensic audit',
            model_tier: 'opus',
            skills: ['audit/forensics.md'],
            definition_path: 'apps/web/.claude/agents/code-auditor/agent.md',
            key: 'code-auditor',
          },
        ],
        skills: [
          {
            name: 'council-of-logic',
            description: 'First-principles validation.',
            definition_path: 'apps/web/.skills/custom/council-of-logic/SKILL.md',
            key: 'council-of-logic',
          },
        ],
        mcp_servers: [
          { name: 'context7', transport: 'stdio', description: '', config_path: 'apps/web/.mcp.json' },
        ],
      }),
    )

    expect(parsed.schema_version).toBe(1)
    expect(parsed.agents).toHaveLength(1)
    expect(parsed.agents[0]).toMatchObject({ name: 'code-auditor', model_tier: 'opus' })
    expect(parsed.skills[0].name).toBe('council-of-logic')
    expect(parsed.mcp_servers[0].name).toBe('context7')
  })

  it('drops entries with no name rather than emitting a row that would fail insert', () => {
    const parsed = parseCapabilityManifest(
      JSON.stringify({
        agents: [{ role: 'nameless' }, { name: '   ' }, { name: 'kept' }],
        skills: [{ description: 'nameless skill' }],
        mcp_servers: [{ transport: 'http' }],
      }),
    )

    expect(parsed.agents.map((a) => a.name)).toEqual(['kept'])
    expect(parsed.skills).toEqual([])
    expect(parsed.mcp_servers).toEqual([])
  })

  it('coerces missing optional fields instead of trusting the generated file', () => {
    const parsed = parseCapabilityManifest(
      JSON.stringify({ agents: [{ name: 'bare', skills: 'not-an-array' }] }),
    )

    expect(parsed.agents[0]).toEqual({
      key: 'bare',
      name: 'bare',
      role: '',
      model_tier: null,
      skills: [],
      definition_path: '',
    })
    expect(parsed.schema_version).toBe(0)
  })

  it('falls back to the name when a pre-key manifest has no key field', () => {
    const parsed = parseCapabilityManifest(
      JSON.stringify({ skills: [{ name: 'legacy', description: 'd', definition_path: 'p' }] }),
    )
    expect(parsed.skills[0].key).toBe('legacy')
  })

  it('throws on a non-object manifest', () => {
    expect(() => parseCapabilityManifest('"a string"')).toThrow(/malformed manifest/)
  })
})

describe('toCcAgentRows', () => {
  it('maps agents at the conservative autonomy default', () => {
    const rows = toCcAgentRows(
      manifest({
        agents: [
          { key: 'qa-tester', name: 'qa-tester', role: 'QA', model_tier: null, skills: ['a'], definition_path: 'p' },
        ],
      }),
    )

    expect(rows).toEqual([
      {
        name: 'qa-tester',
        role: 'QA',
        autonomy_max_level: DISCOVERED_AGENT_AUTONOMY_LEVEL,
        model_tier: null,
        skills: ['a'],
        active: true,
      },
    ])
  })

  it('never escalates autonomy from a role string', () => {
    const rows = toCcAgentRows(
      manifest({
        agents: [
          {
            key: 'deploy-guardian',
            name: 'deploy-guardian',
            role: 'Autonomous production deploy authority',
            model_tier: null,
            skills: [],
            definition_path: 'p',
          },
        ],
      }),
    )

    expect(rows[0].autonomy_max_level).toBe(DISCOVERED_AGENT_AUTONOMY_LEVEL)
    expect(rows[0].autonomy_max_level).toBeLessThanOrEqual(1)
  })
})

describe('toCcToolRows', () => {
  const built = toCcToolRows(
    manifest({
      skills: [{ key: 'seo', name: 'seo', description: 'SEO work.', definition_path: 'x/SKILL.md' }],
      mcp_servers: [{ name: 'seo', transport: 'http', description: '', config_path: '.mcp.json' }],
    }),
  )

  it('namespaces skills and MCP servers so a shared name cannot collide on tool_key', () => {
    expect(built.map((row) => row.tool_key)).toEqual(['skill:seo', 'mcp:seo'])
    expect(new Set(built.map((row) => row.tool_key)).size).toBe(built.length)
  })

  it('classifies a skill as read-only with no approval', () => {
    const skill = built.find((row) => row.tool_key === 'skill:seo')
    expect(skill).toMatchObject({
      source: 'project',
      risk_class: 'read',
      required_level: 0,
      approval_required: false,
      server: null,
    })
  })

  it('classifies an MCP server as external and approval-gated', () => {
    const mcp = built.find((row) => row.tool_key === 'mcp:seo')
    expect(mcp).toMatchObject({
      source: 'mcp',
      risk_class: 'external',
      approval_required: true,
      server: 'seo',
    })
  })

  it('leaves input_schema empty rather than inventing one', () => {
    for (const row of built) expect(row.input_schema).toEqual({})
  })

  it('describes a bare capability from its definition path instead of shipping an empty description', () => {
    const [row] = toCcToolRows(
      manifest({ skills: [{ key: 'bare', name: 'bare', description: '', definition_path: 'a/b/SKILL.md' }] }),
    )
    expect(row.description).toContain('a/b/SKILL.md')
  })

  it('produces nothing from an empty manifest — the state that inverts reuse', () => {
    expect(toCcToolRows(EMPTY_MANIFEST)).toEqual([])
    expect(toCcAgentRows(EMPTY_MANIFEST)).toEqual([])
  })
})

// The repo really does carry two DIFFERENT skills named `council-of-logic` (one
// under .skills/custom, one under .claude/skills/custom, ~430 diff lines apart),
// and likewise for `execution-guardian` and `system-supervisor`. An earlier cut
// of the discovery script deduplicated by name and silently dropped one of every
// pair — the registry under-reported by three, so a reuse-before-build search
// could miss the capability it was looking for.
describe('name collisions between distinct capabilities', () => {
  const COLLIDING = manifest({
    skills: [
      {
        key: 'council-of-logic@apps/web/.skills/custom/council-of-logic/SKILL.md',
        name: 'council-of-logic',
        description: 'Mathematical first principles.',
        definition_path: 'apps/web/.skills/custom/council-of-logic/SKILL.md',
      },
      {
        key: 'council-of-logic@apps/web/.claude/skills/custom/council-of-logic/SKILL.md',
        name: 'council-of-logic',
        description: 'Multi-perspective reasoning.',
        definition_path: 'apps/web/.claude/skills/custom/council-of-logic/SKILL.md',
      },
    ],
    agents: [
      { key: 'a@one', name: 'chief-reviewer', role: 'x', model_tier: null, skills: [], definition_path: 'one' },
      { key: 'a@two', name: 'chief-reviewer', role: 'y', model_tier: null, skills: [], definition_path: 'two' },
    ],
  })

  it('registers BOTH same-named skills rather than dropping one', () => {
    const rows = toCcToolRows(COLLIDING)
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.description).sort()).toEqual([
      'Mathematical first principles.',
      'Multi-perspective reasoning.',
    ])
  })

  it('gives colliding skills distinct tool_keys so the upsert cannot overwrite', () => {
    const keys = toCcToolRows(COLLIDING).map((row) => row.tool_key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives colliding agents distinct cc_agents names for the same reason', () => {
    const names = toCcAgentRows(COLLIDING).map((row) => row.name)
    expect(names).toHaveLength(2)
    expect(new Set(names).size).toBe(2)
  })
})

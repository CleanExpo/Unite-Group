import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  getToolCatalogue,
  getKnownTools,
  parseMcpServerNames,
  KNOWN_TOOLS,
} from '@/lib/command-centre/tools/catalogue'

const EXPECTED_KEYS = [
  'linear',
  'supabase',
  'github',
  'google',
  'slack',
  'chrome',
  'playwright',
  'context7',
  'ref',
  'exa',
  'hermes:tools',
  'hermes:toolsets',
  'codex',
  'claude-code',
]

describe('command-centre tool catalogue', () => {
  it('returns the known static sources', () => {
    const keys = getKnownTools().map((t) => t.tool_key)
    for (const expected of EXPECTED_KEYS) {
      expect(keys).toContain(expected)
    }
  })

  it('marks NOTHING as invocable (list-only, zero execution risk)', async () => {
    const tools = await getToolCatalogue()
    expect(tools.length).toBeGreaterThanOrEqual(EXPECTED_KEYS.length)
    for (const tool of tools) {
      expect(tool.invocable).toBe(false)
    }
    // The static set is also entirely non-invocable.
    for (const tool of KNOWN_TOOLS) {
      expect(tool.invocable).toBe(false)
    }
  })

  it('assigns a valid risk_class and source to every entry', async () => {
    const validRisk = new Set(['read', 'write-local', 'write-shared', 'external', 'destructive'])
    const validSource = new Set(['hermes', 'mcp', 'project', 'codex', 'claude-code', 'local'])
    const tools = await getToolCatalogue()
    for (const tool of tools) {
      expect(validRisk.has(tool.risk_class)).toBe(true)
      expect(validSource.has(tool.source)).toBe(true)
    }
  })

  it('parses MCP server names from a Hermes-style YAML config (names only)', () => {
    const yaml = [
      'gateway:',
      '  port: 9119',
      'mcpServers:',
      '  linear:',
      '    command: npx',
      '    apiKey: lin_api_SHOULD_NOT_BE_READ',
      '  custom-server:',
      '    url: http://localhost:1234',
      'other:',
      '  foo: bar',
    ].join('\n')

    const names = parseMcpServerNames(yaml)
    expect(names).toContain('linear')
    expect(names).toContain('custom-server')
    // It must NOT capture nested value keys (no secret leakage).
    expect(names).not.toContain('apiKey')
    expect(names).not.toContain('command')
    expect(names).not.toContain('port')
  })

  // A build-time property, so it has to be asserted against the source: the
  // symptom is invisible to every runtime test and to CI. os.homedir() is
  // folded to a literal by @vercel/nft, which then globs the whole resolved
  // directory while tracing. On Windows that enumerates %LOCALAPPDATA% and its
  // self-referential "Application Data" junction, and `next build` dies EPERM
  // before compiling. Linux has no such junction, so CI stays green while every
  // Windows build breaks.
  it('never folds a literal home directory into a traced path', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src', 'lib', 'command-centre', 'tools', 'catalogue.ts'),
      'utf-8',
    )
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')

    expect(code).not.toMatch(/\bhomedir\s*\(/)
    expect(code).not.toMatch(/from\s+['"]node:os['"]/)
  })
})

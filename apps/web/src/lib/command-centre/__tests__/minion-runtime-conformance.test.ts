import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

function resolveWebRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i += 1) {
    if (existsSync(path.join(dir, '.claude')) && existsSync(path.join(dir, 'package.json'))) return dir
    dir = path.dirname(dir)
  }
  throw new Error('could not resolve apps/web root')
}

function findPython(): string | null {
  for (const candidate of ['python3', 'python']) {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' })
    if (result.status === 0) return candidate
  }
  return null
}

const WEB_ROOT = resolveWebRoot()
const PRE_HYDRATION = path.join(WEB_ROOT, '.claude', 'hooks', 'scripts', 'pre-hydration.mjs')
const ITERATION_HOOK = path.join(WEB_ROOT, '.claude', 'hooks', 'scripts', 'iteration-counter.py')
const PYTHON = findPython()
const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('Minion current-estate pre-hydration', () => {
  it('runs cross-platform through Node and returns only existing bounded paths', () => {
    const result = spawnSync(process.execPath, [PRE_HYDRATION, '--task', 'fix dashboard authentication regression'], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: WEB_ROOT },
    })

    expect(result.status).toBe(0)
    const manifest = JSON.parse(result.stdout) as {
      schema: string
      blueprint: string
      toolshed: string
      always: string[]
      domain: string[]
      read_budget: { expansion_max_files: number }
    }

    expect(manifest.schema).toBe('nexus.minion-context-manifest.v2')
    expect(manifest.blueprint).toBe('bugfix')
    expect(manifest.toolshed).toBe('security')
    expect(manifest.read_budget.expansion_max_files).toBeGreaterThan(0)
    expect(manifest.always).toContain('CLAUDE.md')

    for (const relative of [...manifest.always, ...manifest.domain]) {
      expect(existsSync(path.join(WEB_ROOT, relative)), `manifest path must exist: ${relative}`).toBe(true)
      expect(relative).not.toContain('apps/backend')
    }
  })
})

describe.skipIf(!PYTHON)('Minion iteration hook', () => {
  function makeState(total: number) {
    const root = mkdtempSync(path.join(tmpdir(), 'minion-hook-'))
    tempDirs.push(root)
    const stateDir = path.join(root, '.claude', 'data')
    const statePath = path.join(stateDir, 'minion-state.json')
    require('node:fs').mkdirSync(stateDir, { recursive: true })
    writeFileSync(statePath, JSON.stringify({
      active: true,
      task_id: 'minion-test',
      iterations: { total, implement: 0, fix_ci: 0, fix_lint: 0, diagnose: 0, other: 0 },
    }, null, 2))
    return { root, statePath }
  }

  it('increments an in-budget Task call', () => {
    const { root, statePath } = makeState(0)
    const result = spawnSync(PYTHON as string, [ITERATION_HOOK], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
      input: JSON.stringify({ tool_name: 'Task', tool_input: { prompt: 'implement bounded fix' } }),
    })
    expect(result.status).toBe(0)
    const state = JSON.parse(readFileSync(statePath, 'utf8'))
    expect(state.active).toBe(true)
    expect(state.iterations.total).toBe(1)
    expect(state.iterations.implement).toBe(1)
  })

  it('blocks the over-budget Task call and routes technically rather than to the founder', () => {
    const { root, statePath } = makeState(3)
    const result = spawnSync(PYTHON as string, [ITERATION_HOOK], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
      input: JSON.stringify({ tool_name: 'Task', tool_input: { prompt: 'implement again' } }),
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('MINION_TECHNICAL_REROUTE')
    expect(result.stderr).toContain('founder_decision_required: false')
    expect(result.stderr).not.toContain('Human review required')

    const state = JSON.parse(readFileSync(statePath, 'utf8'))
    expect(state.active).toBe(false)
    expect(state.technical_reroute_required).toBe(true)
    expect(state.escalation.founder_decision_required).toBe(false)
  })
})

describe('Minion instruction conformance', () => {
  it('uses the Node pre-hydration path, draft PR boundary and technical reroute vocabulary', () => {
    const command = readFileSync(path.join(WEB_ROOT, '.claude', 'commands', 'minion.md'), 'utf8')
    const protocol = readFileSync(path.join(WEB_ROOT, '.claude', 'rules', 'skills', 'minions-protocol.md'), 'utf8')

    expect(command).toContain('pre-hydration.mjs')
    expect(command).not.toContain('pre-hydration.ps1')
    expect(command).not.toContain('powershell -ExecutionPolicy')
    expect(command).toContain('gh pr create')
    expect(command).toContain('--draft')
    expect(command).toContain('--base main')
    expect(command).toContain('MINION_TECHNICAL_REROUTE')
    expect(command).not.toContain('Human review required')

    expect(protocol).toContain('technical_reroute_required: true')
    expect(protocol).not.toContain('The only human touchpoint is the PR review gate')
    expect(protocol).not.toContain('The pre-hydration manifest defines the COMPLETE set of files')
  })
})

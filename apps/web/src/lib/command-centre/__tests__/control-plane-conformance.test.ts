import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function resolveWebRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i += 1) {
    if (existsSync(path.join(dir, '.claude')) && existsSync(path.join(dir, 'package.json'))) return dir
    dir = path.dirname(dir)
  }
  throw new Error('could not resolve apps/web root for control-plane conformance test')
}

const WEB_ROOT = resolveWebRoot()
const read = (relativePath: string) => readFileSync(path.join(WEB_ROOT, relativePath), 'utf8')

describe('control-plane execution/verification conformance', () => {
  it('permits explicit SPM transitions without silent mode drift', () => {
    const core = read('.claude/rules/core.md')
    expect(core).toContain('explicit `/spm` lifecycle transition')
    expect(core).toContain('Stop Planning, Build')
    expect(core).not.toContain('Do not mix modes mid-task')
  })

  it('keeps routine technical QA with Nexus rather than the founder', () => {
    const gate = read('.claude/rules/verification-gate.md')
    expect(gate).toContain('Do not make Phill the default QA tester')
    expect(gate).toContain('Playwright')
    expect(gate).toContain('Computer Use')
    expect(gate).not.toContain('Reply "looks good"')
    expect(gate).not.toContain('please check:')
  })

  it('translates execution intent into SPM state instead of mandatory re-planning', () => {
    const translator = read('.skills/custom/outcome-translator/SKILL.md')
    expect(translator).toContain('Do not automatically generate a new gated plan')
    expect(translator).toContain('perform the next safe authorised move')
    expect(translator).not.toContain('.claude/rules/human-outcome-translation.md')
    expect(translator).not.toContain('outcome translation triggers AUDIT mode')
  })

  it('requires build and regression evidence before a done claim', () => {
    const done = read('.claude/commands/done.md')
    expect(done).toContain('verify-web-ci-build.mjs')
    expect(done).toContain('missing meaningful regression coverage is blocking')
    expect(done).not.toContain('Missing tests are noted but do not block')
  })

  it('does not label PR closeout as Production or unconditional Harness completion', () => {
    const harness = read('.claude/AGENT_HARNESS.md')
    expect(harness).toContain('## Phase 8 — Candidate closeout / release-ready handoff')
    expect(harness).toContain('This phase is not Production. A PR is not Production.')
    expect(harness).not.toContain('### Phase 8 — Production')
    expect(harness).toContain('technical rerouting occurs before founder escalation')
  })
})

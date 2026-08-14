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
  throw new Error('could not resolve apps/web root')
}

const WEB_ROOT = resolveWebRoot()
const read = (p: string) => readFileSync(path.join(WEB_ROOT, p), 'utf8')

describe('founder abstraction boundary', () => {
  it('keeps routine technical escalation inside the agent system', () => {
    const base = read('.claude/primers/BASE_PRIMER.md')
    const orchestratorPrimer = read('.claude/primers/ORCHESTRATOR_PRIMER.md')
    const verifierPrimer = read('.claude/primers/VERIFIER_PRIMER.md')

    for (const text of [base, orchestratorPrimer, verifierPrimer]) {
      expect(text).not.toContain('3 failed verification attempts')
      expect(text).not.toContain('3 failures → escalate to human')
      expect(text).not.toContain('Manual verification')
    }

    expect(base).toContain('Routine software-engineering decisions, diagnosis and QA belong to the agent system')
    expect(orchestratorPrimer).toContain('A fixed number of failed attempts is **not** a reason by itself to hand the task to Phill')
    expect(verifierPrimer).toContain('Do not escalate to Phill solely because verification failed a fixed number of times')
  })

  it('does not make the founder the database/API implementation designer', () => {
    const spec = read('.claude/agents/spec-builder/agent.md')
    expect(spec).toContain('Do not ask Phill technical implementation questions')
    expect(spec).not.toContain('New Supabase tables needed?')
    expect(spec).not.toContain('New API routes?')
    expect(spec).not.toContain('hand to user for completion')
    expect(spec).not.toContain('≥ 80%')
  })

  it('does not silently mutate dependencies to suppress errors', () => {
    const orchestrator = read('.claude/agents/orchestrator/agent.md')
    expect(orchestrator).toContain('Never mutate dependencies/configuration merely to suppress an error')
    expect(orchestrator).toContain('Do not automatically run dependency-changing operations')
    expect(orchestrator).not.toContain('| `Cannot find module`    | `pnpm install`')
  })

  it('teaches the founder to manage outcomes rather than perform QA', () => {
    const guide = read('docs/NON_CODER_BUILD_GUIDE.md')
    expect(guide).toContain('You do not need to become the software engineer')
    expect(guide).toContain('Treat it as an **escaped Nexus defect**')
    expect(guide).not.toContain('Confirm the checklist')
    expect(guide).not.toContain('Not knowing which folder to look in')
    expect(guide).not.toContain('Say "looks good" or describe what\'s wrong')
  })
})

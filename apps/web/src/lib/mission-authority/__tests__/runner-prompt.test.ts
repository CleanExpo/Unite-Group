import { describe, expect, it } from 'vitest'
import policy from '../../../../../../scripts/nexus-runner/mission-authority.json'
import { renderAuthorityBlock } from '../../../../../../scripts/nexus-runner/authority-prompt.mjs'
import { taskPrompt } from '../../../../../../scripts/nexus-runner/runner.mjs'

// UNI-2779 — the runner's rules are rendered from mission-authority.json, not
// hand-written. A hand-written "never deploy" contradicted the preview build
// step the same file grants; a derived block cannot drift from the policy.

const clone = () => JSON.parse(JSON.stringify(policy)) as typeof policy
const BARE_NEVER_DEPLOY = /never deploy(?! to production)/i

describe('renderAuthorityBlock', () => {
  const block = renderAuthorityBlock(policy)

  it('states the do-not-ask build rule and the self-repair rule', () => {
    expect(block).toContain('BUILD_AUTHORISED')
    expect(block).toContain('do not stop to ask the founder before any build step')
    expect(block).toMatch(/failed test, review or CI check, diagnose, repair and retry yourself/)
    expect(block).toContain('Never ask "shall I continue"')
  })

  it('lists every build step and every protected action from the JSON', () => {
    for (const description of Object.values(policy.build)) expect(block).toContain(description)
    for (const description of Object.values(policy.protected_descriptions)) expect(block).toContain(description)
  })

  it('forbids production deploys but allows previews, and never says a bare "never deploy"', () => {
    expect(block).toContain('never deploy to production')
    expect(block).toMatch(/preview deploys are allowed/i)
    expect(block).not.toMatch(BARE_NEVER_DEPLOY)
  })

  it('is derived: mutating a protected entry in a fixture changes the output', () => {
    const fixture = clone()
    fixture.protected_descriptions.merge = 'Fusing two branches together (fixture wording)'
    const mutated = renderAuthorityBlock(fixture)
    expect(mutated).not.toEqual(block)
    expect(mutated).toContain('Fusing two branches together (fixture wording)')
    expect(mutated).not.toContain(policy.protected_descriptions.merge)
  })

  it('is derived: a new protected action in a fixture is rendered as an escalation', () => {
    const fixture = clone() as typeof policy & { protected: Record<string, string>; protected_descriptions: Record<string, string> }
    fixture.protected.rename_repository = 'founder'
    fixture.protected_descriptions.rename_repository = 'Renaming the repository (fixture)'
    expect(renderAuthorityBlock(fixture)).toContain('Renaming the repository (fixture)')
  })

  it('refuses a policy with a protected action that has no description (fails closed)', () => {
    const fixture = clone() as typeof policy & { protected: Record<string, string> }
    fixture.protected.undocumented = 'founder'
    expect(() => renderAuthorityBlock(fixture)).toThrow(/undocumented/)
  })
})

describe('runner taskPrompt uses the rendered authority block', () => {
  const prompt = taskPrompt({ title: 'Research', objective: 'Compare existing options', priority: 'normal', execution_mode: 'branch-preview' })

  it('embeds the rendered block verbatim in place of hand-written HARD RULES', () => {
    expect(prompt).toContain(renderAuthorityBlock(policy))
    expect(prompt).not.toContain('HARD RULES (L2 autonomy ceiling')
    expect(prompt).not.toMatch(BARE_NEVER_DEPLOY)
  })

  it('keeps the worktree rule and the FINAL LINE contract', () => {
    expect(prompt).toContain('Create a fresh git worktree off origin/main under .claude/worktrees/')
    expect(prompt).toContain('FINAL LINE OF YOUR OUTPUT (exactly one of):')
    expect(prompt).toContain('PR_URL: <the draft PR url>')
  })
})

/*
 * The gate against the canonical policy — UNI-2779.
 *
 * scripts/nexus-runner/mission-authority.json is the one authority. The gate
 * reads its class for the actions both describe; these tests pin that the gate
 * neither interrupts the founder for a BUILD_CONTINUE action it maps, nor lets
 * any SAFE_RELEASE / PROTECTED_RELEASE action below L3.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  MISSION_AUTHORITY_ACTION_CLASSES,
  POLICY_MAPPED_ACTIONS,
  classifyShellCommand,
  evaluateToolCall,
  tierForPolicyAction,
} from './autonomy-gate'

const HERE = path.dirname(fileURLToPath(import.meta.url))

function bash(command: string) {
  return evaluateToolCall({ tool: 'Bash', input: { command }, adapter: 'claude-code', requestId: 'req-1' })
}

describe('the vendored policy is the canonical policy, byte for byte', () => {
  it('matches scripts/nexus-runner/mission-authority.json exactly', () => {
    // The app's build context cannot reach the repo root, so the gate imports a
    // copy. A copy that can drift is a second authority; this makes drift red.
    let dir = HERE
    let canonical: string | null = null
    for (let i = 0; i < 12 && canonical === null; i += 1) {
      const candidate = path.join(dir, 'scripts', 'nexus-runner', 'mission-authority.json')
      if (existsSync(candidate)) canonical = candidate
      dir = path.dirname(dir)
    }
    // Not found is a failure, never a skip: a sync test that cannot see the
    // canonical file has checked nothing.
    expect(canonical, 'canonical mission-authority.json not found above the test').not.toBeNull()
    const vendored = readFileSync(path.join(HERE, 'mission-authority.json'))
    expect(vendored.equals(readFileSync(canonical as string))).toBe(true)
  })
})

/*
 * Representative commands for every non-build action. Drawn from
 * apps/web/src/lib/command-centre/__tests__/runner-authority-envelope.test.ts
 * PROTECTED_COMMANDS (joined into shell strings), plus the dangerous variants of
 * the two relaxed build commands.
 */
const NON_BUILD_COMMANDS: Record<string, Array<string>> = {
  merge: [
    'gh pr merge 12 --squash',
    'gh pr merge 12 --auto',
    'gh api -X PUT repos/CleanExpo/Unite-Group/pulls/12/merge',
    'git merge origin/main',
    'gh -R o/r pr merge 1',
    'gh --repo x/y pr merge 1',
    "gh config set alias.m 'pr merge'",
    'gh m 1',
  ],
  mark_pr_ready: [
    'gh pr ready 12',
    'gh -R o/r pr ready 1',
    'gh pr create --title t --body b',
    'gh pr create --fill',
    'gh pr create --draft=false --fill',
    'gh pr create --draft --draft=false --fill',
    'gh --repo o/r pr create --title t --body b',
    // a value flag consumes the next word: this is a NON-draft PR titled "--draft"
    'gh pr create --title --draft --fill',
    "gh pr create --fill --title '--draft'",
    'gh pr create --fill -- --draft',
    // options outside the draft grammar stay L3 even with --draft
    'gh pr create --draft --body-file notes.md',
    'gh pr create --draft --reviewer someone --fill',
    'gh -R o/r pr create --draft --fill',
  ],
  promote_production: [
    'vercel --prod',
    'vercel deploy --prod',
    'vercel deploy --prod=true',
    'vercel deploy --target=production',
    'vercel deploy --target production',
    'vercel --target=prod',
    'vercel deploy --target preview --prod',
    'vercel promote url',
    'vercel rollback',
    'vercel redeploy url',
    'git push origin HEAD:main',
    'git -C /tmp push origin main',
    'vercel --cwd x promote https://x.vercel.app',
    'vercel --foo ls promote https://x.vercel.app',
  ],
  public_publish: [
    'gh release create v1.0.0',
    'gh gist create notes.md --public',
    'git push origin --tags',
    'npm publish',
  ],
  spend_expansion: ['vercel domains buy example.com'],
  destructive_action: [
    'git push --force origin feature-x',
    'git push origin --delete feature-x',
    'git reset --hard HEAD',
    'git branch -D feature-x',
    'git branch -d feature-x',
    'git branch --delete feature-x',
    'git branch -M main',
    'supabase db push',
    'supabase migration up',
    'gh repo delete CleanExpo/Unite-Group',
    'rm -rf build',
  ],
  credential_change: [
    'gh secret set X',
    'vercel env add X',
    'vercel pull',
    'vercel --token t env add FOO',
    'supabase secrets set X=1',
    'gh api repos/CleanExpo/Unite-Group/actions/secrets',
  ],
  authority_change: [
    'gh api --method PATCH repos/CleanExpo/Unite-Group',
    'gh repo edit --visibility public',
    'gh workflow run ci.yml',
    'gh some-future-subcommand',
    'vercel some-future-subcommand',
    'vercel link',
    'vercel alias set a b',
    // --yes can create and link a new Vercel project; deliberately not a preview
    'vercel deploy --yes',
  ],
}
/** Policy actions with no shell form for the gate to see (mirrors the web envelope test). */
const NON_BUILD_NOT_TOOL_GATED = ['strategic_scope_change']

describe('no SAFE_RELEASE or PROTECTED_RELEASE action classifies below L3', () => {
  const nonBuild = Object.entries(MISSION_AUTHORITY_ACTION_CLASSES).filter(([, cls]) => cls !== 'BUILD_CONTINUE')

  it('the policy has release actions to check (positive control)', () => {
    expect(nonBuild.map(([, cls]) => cls)).toContain('SAFE_RELEASE')
    expect(nonBuild.map(([, cls]) => cls)).toContain('PROTECTED_RELEASE')
  })

  it('every non-build policy action has representative commands or a stated reason it has none', () => {
    // A new protected action in the policy turns this red until it is mapped.
    expect([...Object.keys(NON_BUILD_COMMANDS), ...NON_BUILD_NOT_TOOL_GATED].sort()).toEqual(
      nonBuild.map(([action]) => action).sort(),
    )
  })

  for (const [action, cls] of nonBuild) {
    for (const command of NON_BUILD_COMMANDS[action] ?? []) {
      it(`${cls} ${action}: ${JSON.stringify(command)} is L3 and blocked`, () => {
        expect(classifyShellCommand(command).tier).toBe('L3')
        expect(bash(command)).toMatchObject({ tier: 'L3', allowed: false })
      })
    }
  }
})

describe('policy BUILD_CONTINUE commands are not founder interruptions', () => {
  const draftPr = [
    'gh pr create --draft --title t --body b',
    'gh pr create -d --fill',
    'gh pr create --draft --title "Fix the thing" --body "Draft for review"',
    "gh pr create --title 'merge ready' --draft --base main --label wip",
    'gh pr create --draft --title=t --body=b',
  ]
  const preview = [
    'vercel',
    'vercel deploy',
    'vercel deploy --target=preview',
    'vercel deploy --target preview',
    'vercel deploy --prebuilt',
  ]

  it.each(draftPr)('draft_pr: %j is L1 and allowed', (command) => {
    const result = classifyShellCommand(command)
    expect(result.tier).toBe('L1')
    expect(result.reason).toMatch(/'draft_pr' as BUILD_CONTINUE/)
    expect(bash(command)).toMatchObject({ tier: 'L1', allowed: true })
  })

  it.each(preview)('preview_within_existing_mandate: %j is L1 and allowed', (command) => {
    const result = classifyShellCommand(command)
    expect(result.tier).toBe('L1')
    expect(result.reason).toMatch(/'preview_within_existing_mandate' as BUILD_CONTINUE/)
    expect(bash(command)).toMatchObject({ tier: 'L1', allowed: true })
  })

  it('maps only actions the policy defines, and only BUILD_CONTINUE ones', () => {
    expect(POLICY_MAPPED_ACTIONS.length).toBeGreaterThan(0)
    for (const action of POLICY_MAPPED_ACTIONS) {
      expect(MISSION_AUTHORITY_ACTION_CLASSES[action], action).toBe('BUILD_CONTINUE')
    }
  })

  it('reads the tier from the policy class rather than restating it', () => {
    expect(tierForPolicyAction('draft_pr')).toBe('L1')
    expect(tierForPolicyAction('draft_pr', { draft_pr: 'SAFE_RELEASE' })).toBe('L3')
    expect(tierForPolicyAction('draft_pr', { draft_pr: 'PROTECTED_RELEASE' })).toBe('L3')
    // the policy's own rule: an action missing from the map escalates
    expect(tierForPolicyAction('draft_pr', {})).toBe('L3')
    expect(tierForPolicyAction('toString', {})).toBe('L3')
  })
})

describe('git branch: listing stays L0, mutation does not', () => {
  it.each(['git branch', 'git branch -a', 'git branch --show-current', 'git branch -vv'])(
    '%j is L0',
    (command) => {
      expect(classifyShellCommand(command).tier).toBe('L0')
    },
  )
})

describe('the relaxation keeps every fail-closed behaviour', () => {
  it.each([
    'FOO=1 vercel deploy',
    'PATH=/tmp/evil vercel deploy',
    '/tmp/evil/vercel deploy',
    '/tmp/evil/gh pr create --draft --fill',
    'vercel deploy; git push',
    'vercel deploy && rm -rf /',
    'gh pr create --draft --fill | sh',
    'gh pr create --draft --title "$(cat .env)"',
    'gh pr create --draft --title $TITLE',
    'gh pr create --draft --title `whoami`',
    "gh pr create --draft --title 'rotate the token'",
    'gh pr create --draft --body-file .env',
    'gh pr create --draft --title "unterminated',
    'gh pr create --draft --title a\\ b',
    'bash -c "vercel deploy"',
    'npx vercel deploy',
    'eval vercel deploy',
    'xargs gh pr create --draft --fill',
  ])('%j stays L3', (command) => {
    expect(classifyShellCommand(command).tier).toBe('L3')
  })
})

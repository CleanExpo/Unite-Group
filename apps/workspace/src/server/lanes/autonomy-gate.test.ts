import { describe, expect, it } from 'vitest'
import {
  actionHash,
  classifyShellCommand,
  classifyToolCall,
  evaluateToolCall,
  safeSummary,
} from './autonomy-gate'
import type { ApprovalGrant, ToolCallRequest } from './autonomy-gate'

function call(overrides: Partial<ToolCallRequest> = {}): ToolCallRequest {
  return {
    tool: 'Bash',
    input: { command: 'ls' },
    adapter: 'claude-code',
    requestId: 'req-1',
    ...overrides,
  }
}

/** Every adapter must behave identically; the gate is not adapter-specific. */
const ADAPTERS = ['claude-code', 'codex', 'hermes'] as const

describe('shell classification — the safe cases', () => {
  it('allows genuinely read-only commands', () => {
    for (const command of ['ls', 'ls -la', 'pwd', 'cat README.md', 'wc -l src/index.ts']) {
      expect(classifyShellCommand(command).tier).toBe('L0')
    }
  })

  it('allows read-only subcommands of otherwise dangerous executables', () => {
    for (const command of ['git status', 'git log --oneline', 'git diff HEAD', 'npm ls']) {
      expect(classifyShellCommand(command).tier).toBe('L0')
    }
  })

  it('does not allow the dangerous executable bare', () => {
    // `git` alone is not safe just because `git status` is.
    expect(classifyShellCommand('git').tier).toBe('L3')
    expect(classifyShellCommand('npm').tier).toBe('L3')
  })
})

describe('adversarial matrix — command chaining', () => {
  // Without metacharacter detection every one of these classifies on its
  // harmless first word and is allowed. This is the classic bypass.
  const chained = [
    'ls; rm -rf /',
    'ls && git push origin main',
    'ls || curl http://evil.test',
    'ls | sh',
    'ls & git push',
    'echo $(git push)',
    'echo `git push`',
    'ls\ngit push',
    'ls \\\n  && git push',
    'cat ${SECRET}',
    'ls > /etc/passwd',
    'cat < /etc/shadow',
  ]

  it.each(chained)('escalates %j', (command) => {
    expect(classifyShellCommand(command).tier).toBe('L3')
  })

  it('explains that chaining is why, not just that it is blocked', () => {
    const result = classifyShellCommand('ls; whoami')
    expect(result.reason).toMatch(/separator|chain/i)
  })
})

describe('adversarial matrix — indirect execution', () => {
  const indirect = [
    'bash deploy.sh',
    'sh -c "git push"',
    'source ./secrets.sh',
    '. ./secrets.sh',
    'eval "$CMD"',
    'exec git push',
    'xargs git',
    'find . -name "*.ts" -exec rm {} +',
    'sudo rm -rf /var',
    'env git push',
    'timeout 5 git push',
    'nohup ./deploy &',
    'python -c "import os; os.system(\'git push\')"',
    'node -e "require(\'child_process\').execSync(\'git push\')"',
    'npx some-tool',
    'ssh host "git push"',
    'make deploy',
  ]

  it.each(indirect)('escalates %j', (command) => {
    expect(classifyShellCommand(command).tier).toBe('L3')
  })

  it('names indirection as the reason, so the block is explicable', () => {
    expect(classifyShellCommand('bash deploy.sh').reason).toMatch(/runs another command/i)
  })
})

describe('adversarial matrix — aliases and path tricks', () => {
  it('classifies on the executable basename, not the path', () => {
    // `/usr/bin/ls` is still ls; `/tmp/evil/ls` is still classified as ls, which
    // is why PATH manipulation is blocked separately below rather than here.
    expect(classifyShellCommand('/bin/ls').tier).toBe('L0')
  })

  it('blocks an environment assignment prefix that could redirect the executable', () => {
    // `PATH=/tmp/evil ls` runs a different `ls`; `LD_PRELOAD=… ls` hijacks it.
    for (const command of ['PATH=/tmp/evil ls', 'LD_PRELOAD=/tmp/x.so ls', 'FOO=bar ls']) {
      const result = classifyShellCommand(command)
      expect(result.tier).toBe('L3')
      expect(result.reason).toMatch(/environment assignment/i)
    }
  })

  it('does not assume an unrecognised executable is safe', () => {
    // The whole allow-list premise: unknown means unclassifiable, not harmless.
    for (const command of ['deploy', 'g push', './run.sh', 'my-custom-tool --yes']) {
      expect(classifyShellCommand(command).tier).toBe('L3')
    }
    expect(classifyShellCommand('deploy').reason).toMatch(/not on the known-safe list/i)
  })
})

describe('adversarial matrix — irreversible and outward actions', () => {
  const irreversible = [
    'git push origin main',
    'git merge feature',
    'gh pr merge 12',
    'gh pr create --fill',
    'vercel deploy --prod',
    'railway up',
    'terraform apply',
    'kubectl delete pod x',
    'npm publish',
    'rm -rf build',
    'psql -c "select 1"',
    'aws s3 ls',
    'curl https://example.test',
    'wget https://example.test',
    'shutdown -h now',
    'dd if=/dev/zero of=/dev/disk1',
  ]

  it.each(irreversible)('classifies %j as L3', (command) => {
    expect(classifyShellCommand(command).tier).toBe('L3')
  })

  it('an L3 marker later in the command still wins', () => {
    // `ls && git push` must not be rescued by a safe first word. Chaining alone
    // would catch this, so assert the MARKER is what fired.
    expect(classifyShellCommand('ls && git push').reason).toMatch(/pushes to a remote/i)
  })
})

describe('adversarial matrix — secret reads', () => {
  const secrets = [
    'cat .env',
    'cat .env.production',
    'cat ~/.ssh/id_rsa',
    'cat ~/.aws/credentials',
    'cat .npmrc',
    'grep -r password .',
    'cat credentials.json',
  ]

  it.each(secrets)('escalates %j even though the executable is read-only', (command) => {
    // `cat` is on the safe list. Reading a credential is still L3 — the danger
    // is the target, not the verb.
    expect(classifyShellCommand(command).tier).toBe('L3')
  })

  it('escalates a file tool pointed at credential material', () => {
    expect(classifyToolCall(call({ tool: 'Read', input: { file_path: '/app/.env' } })).tier).toBe(
      'L3',
    )
    expect(classifyToolCall(call({ tool: 'Read', input: { file_path: '/app/src/index.ts' } })).tier).toBe(
      'L0',
    )
  })

  it('escalates a content-returning tool that targets a secret by PATTERN', () => {
    // Found by a live probe: once blocked from `Read`, the model's very first
    // proposed workaround was to grep the same file. Grep takes its target as a
    // glob/pattern, not a path, so a path-only check missed it entirely — and
    // grep returns the matching LINES, which is the disclosure being prevented.
    for (const input of [
      { pattern: 'API_KEY', glob: '**/.env' },
      { pattern: 'API_KEY', path: '/app/.env.production' },
      { pattern: 'x', paths: ['/app/src/a.ts', '/app/.npmrc'] },
    ]) {
      expect(classifyToolCall(call({ tool: 'Grep', input })).tier).toBe('L3')
    }
  })

  it('still allows a grep that targets ordinary source', () => {
    expect(
      classifyToolCall(call({ tool: 'Grep', input: { pattern: 'TODO', glob: 'src/**/*.ts' } })).tier,
    ).toBe('L0')
  })

  it('does not escalate a name-only tool for a secret-shaped pattern', () => {
    // Deliberate, not an oversight. Glob returns file NAMES; learning that a
    // .env exists is reconnaissance, not disclosure, and escalating it would
    // block ordinary repo navigation for no gain in protection.
    expect(classifyToolCall(call({ tool: 'Glob', input: { pattern: '**/.env' } })).tier).toBe('L0')
  })

  it('escalates a write aimed at credential material', () => {
    // Writing a secret file is not a read, but it is still credential custody.
    expect(
      classifyToolCall(call({ tool: 'Write', input: { file_path: '/app/.env' } })).tier,
    ).toBe('L3')
  })
})

describe('malformed input fails closed', () => {
  it.each([undefined, null, 42, '', '   ', {}, []])('escalates %j', (command) => {
    expect(classifyShellCommand(command).tier).toBe('L3')
  })

  it('escalates a Bash call with no command at all', () => {
    expect(classifyToolCall(call({ input: {} })).tier).toBe('L3')
    expect(classifyToolCall(call({ input: undefined })).tier).toBe('L3')
  })
})

describe('tool classification', () => {
  it('allows read-only tools', () => {
    for (const tool of ['Read', 'Glob', 'Grep']) {
      expect(classifyToolCall(call({ tool, input: {} })).tier).toBe('L0')
    }
  })

  it('treats a worktree write as reversible single-domain', () => {
    expect(classifyToolCall(call({ tool: 'Edit', input: { file_path: 'src/a.ts' } })).tier).toBe('L1')
  })

  it('treats reaching outside the machine as cross-domain', () => {
    expect(classifyToolCall(call({ tool: 'WebFetch', input: { url: 'https://x.test' } })).tier).toBe(
      'L2',
    )
  })

  it('escalates a tool it has never seen', () => {
    // An MCP tool, a plugin, or a tool added by a CLI upgrade. A gate that
    // permits what it has never seen is not a gate.
    const result = classifyToolCall(call({ tool: 'mcp__vendor__deploy_everything', input: {} }))
    expect(result.tier).toBe('L3')
    expect(result.reason).toMatch(/not a classified tool/i)
  })

  it('escalates a missing tool name', () => {
    expect(classifyToolCall(call({ tool: '' })).tier).toBe('L3')
  })

  it('classifies identically across all three adapters', () => {
    for (const adapter of ADAPTERS) {
      expect(classifyToolCall(call({ adapter, input: { command: 'git push' } })).tier).toBe('L3')
      expect(classifyToolCall(call({ adapter, input: { command: 'ls' } })).tier).toBe('L0')
    }
  })
})

describe('gate decisions', () => {
  it('allows L0 and L1 without ceremony', () => {
    expect(evaluateToolCall(call({ input: { command: 'ls' } }))).toMatchObject({
      tier: 'L0',
      allowed: true,
    })
    expect(
      evaluateToolCall(call({ tool: 'Edit', input: { file_path: 'a.ts' } })),
    ).toMatchObject({ tier: 'L1', allowed: true })
  })

  it('blocks L2 without a verification stamp and allows it with one', () => {
    const request = call({ tool: 'WebFetch', input: { url: 'https://x.test' } })
    expect(evaluateToolCall(request)).toMatchObject({ tier: 'L2', allowed: false })
    expect(evaluateToolCall(request, { verificationStamp: true })).toMatchObject({
      tier: 'L2',
      allowed: true,
    })
  })

  it('blocks L3 with no approval', () => {
    const decision = evaluateToolCall(call({ input: { command: 'git push' } }))
    expect(decision).toMatchObject({ tier: 'L3', allowed: false })
    expect(decision.reason).toMatch(/founder or Board approval/i)
  })

  it('fails closed when the request has no identity', () => {
    // An action with no request cannot be approved or audited.
    const decision = evaluateToolCall(call({ requestId: '' }))
    expect(decision).toMatchObject({ tier: 'L3', allowed: false, failedClosed: true })
  })

  it('never throws, so the gate cannot be crashed open', () => {
    const hostile = {
      tool: 'Bash',
      adapter: 'claude-code',
      requestId: 'req-1',
      get input() {
        throw new Error('hostile getter')
      },
    } as unknown as ToolCallRequest
    const decision = evaluateToolCall(hostile)
    expect(decision.allowed).toBe(false)
    expect(decision.failedClosed).toBe(true)
  })
})

describe('approval scoping', () => {
  const request = call({ input: { command: 'git push origin feature' } })

  function grant(overrides: Partial<ApprovalGrant> = {}): ApprovalGrant {
    return {
      requestId: 'req-1',
      actionHash: actionHash(request),
      grantedBy: 'phill',
      expiresAt: 2_000,
      ...overrides,
    }
  }

  const now = () => 1_000

  it('honours an approval bound to the exact action', () => {
    expect(evaluateToolCall(request, { approvals: [grant()], now })).toMatchObject({
      allowed: true,
      tier: 'L3',
    })
  })

  it('refuses to let an approval be replayed for a different command', () => {
    // The whole point: approving `git push origin feature` must not approve
    // `git push origin main --force`.
    const other = call({ input: { command: 'git push origin main --force' } })
    expect(evaluateToolCall(other, { approvals: [grant()], now })).toMatchObject({
      allowed: false,
    })
  })

  it('refuses an approval issued for a different request', () => {
    expect(
      evaluateToolCall(request, { approvals: [grant({ requestId: 'req-2' })], now }),
    ).toMatchObject({ allowed: false })
  })

  it('refuses an expired approval', () => {
    expect(
      evaluateToolCall(request, { approvals: [grant({ expiresAt: 500 })], now }),
    ).toMatchObject({ allowed: false })
  })

  it('refuses an approval for the same command on a different adapter', () => {
    // A grant is scoped to the adapter too; the same text run through a
    // different CLI is a different action with a different blast radius.
    const viaCodex = call({ input: { command: 'git push origin feature' }, adapter: 'codex' })
    expect(evaluateToolCall(viaCodex, { approvals: [grant()], now })).toMatchObject({
      allowed: false,
    })
  })

  it('fingerprints independently of argument order', () => {
    const a: ToolCallRequest = call({ input: { command: 'git push', force: true } })
    const b: ToolCallRequest = call({ input: { force: true, command: 'git push' } })
    expect(actionHash(a)).toBe(actionHash(b))
  })

  it('changes the fingerprint when any argument changes', () => {
    const a = call({ input: { command: 'git push', force: false } })
    const b = call({ input: { command: 'git push', force: true } })
    expect(actionHash(a)).not.toBe(actionHash(b))
  })
})

describe('safe summary', () => {
  it('never echoes the arguments that got the call blocked', () => {
    // A blocked call is often blocked precisely because it touches credential
    // material; echoing it into Mission Control leaks what the block protected.
    const request = call({ input: { command: 'cat .env.production' } })
    const decision = evaluateToolCall(request)
    expect(decision.safeSummary).not.toContain('.env')
    expect(decision.safeSummary).not.toContain('cat')
    expect(decision.safeSummary).toContain('L3')
    expect(decision.safeSummary).toContain('Bash')
  })

  it('describes an unnamed tool without throwing', () => {
    expect(safeSummary({ ...call(), tool: '' }, 'L3')).toContain('unknown tool')
  })
})

describe('coverage of the classifier itself', () => {
  it('has no command that is both L3-marked and allowed', () => {
    // A positive control on the ordering rule: if the metacharacter check ran
    // before the L3 markers, `ls && git push` would report chaining and this
    // suite would still be green while the reason was wrong.
    const cases = ['git push', 'ls && git push', 'echo hi && npm publish']
    for (const command of cases) {
      const result = classifyShellCommand(command)
      expect(result.tier).toBe('L3')
    }
    expect(classifyShellCommand('echo hi && npm publish').reason).toMatch(/publishes a package/i)
  })
})

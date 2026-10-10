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

  it('allows no subcommand of an otherwise dangerous executable (review r20)', () => {
    // git lost its last read-only subcommands in review r20; node runs other
    // programs, so `node --version` was never allowed either.
    for (const command of ['git ls-files', 'node --version', 'node -v']) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('does not allow the dangerous executable bare', () => {
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
  it('does not trust a program by its basename', () => {
    // `/tmp/evil/ls` used to classify as ls (Codex review r8 of UNI-2409: a
    // lane-written `lane/cat` ran as L0). Without the hook's on-disk check an
    // explicit path is not trusted; with it, only a system binary is.
    for (const command of ['/bin/ls', '/tmp/evil/ls', './cat notes.txt', 'scripts/nexus-runner/bin/git status']) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
    const trust = (word: string) => word === 'ls' || word === '/bin/ls'
    expect(classifyShellCommand('/bin/ls', undefined, trust).tier).toBe('L0')
    expect(classifyShellCommand('/tmp/evil/ls', undefined, trust).tier).toBe('L3')
    expect(classifyShellCommand('cat notes.txt', undefined, trust).tier).toBe('L3')
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

  it('needs approval for a grep even over ordinary source (review r17)', () => {
    expect(
      classifyToolCall(call({ tool: 'Grep', input: { pattern: 'TODO', glob: 'src/**/*.ts' } })).tier,
    ).toBe('L3')
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
    for (const tool of ['Read', 'Glob']) {
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
    //
    // The `allowed` assertion is the point of the test NAME and was missing —
    // the body only checked `tier`, and `classifyShellCommand` has no `allowed`
    // field at all, so the name promised a check that could not have run.
    // Caught by the OpenRouter review swarm, and it is the same defect class as
    // `test-asserts-less-than-name` in that swarm's own benchmark corpus.
    // `allowed` lives on `evaluateToolCall`, so the claim has to be made there.
    const cases = ['git push', 'ls && git push', 'echo hi && npm publish']
    for (const command of cases) {
      expect(classifyShellCommand(command).tier).toBe('L3')
      expect(
        evaluateToolCall(call({ input: { command } })),
      ).toMatchObject({ tier: 'L3', allowed: false })
    }
    expect(classifyShellCommand('echo hi && npm publish').reason).toMatch(/publishes a package/i)
  })
})

/*
 * Secret disclosure through bare parameter expansion.
 *
 * Found by review on #1027 and reproduced against the merged gate before this
 * fix: `echo $ANTHROPIC_API_KEY` classified L0 and ran unreviewed. Three
 * independent checks each let it through — no L3_MARKER matched, SECRET_MARKERS
 * could not match an underscore-joined name because `\b` does not fire between
 * `_` and a letter, and SHELL_METACHARACTERS covered `${VAR}` but not `$VAR` —
 * and `echo` is a SAFE_EXECUTABLE. The braced spelling escalated, so the gate
 * blocked the expensive form of the attack and allowed the cheap one.
 */
describe('shell classification — secret disclosure via expansion', () => {
  it('escalates a bare $VAR expansion of a credential-shaped name', () => {
    for (const command of [
      'echo $ANTHROPIC_API_KEY',
      'echo $GITHUB_TOKEN',
      'echo $OPENROUTER_API_KEY',
      'echo $SUPABASE_SERVICE_ROLE_KEY',
      'cat $HOME/.config/token',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('escalates every expansion spelling, not just the braced one', () => {
    for (const command of [
      'echo $ANTHROPIC_API_KEY',
      'echo ${ANTHROPIC_API_KEY}',
      'echo "$ANTHROPIC_API_KEY"',
      'echo $1',
      'echo $@',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('matches credential markers inside underscore- and hyphen-joined names', () => {
    for (const command of [
      'cat anthropic_api_key.txt',
      'cat api-key.json',
      'grep secret config.yaml',
      'cat passwords.txt',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('does not fire on longer words that merely contain a marker', () => {
    // The trailing class requires a non-alphanumeric or end-of-string, so
    // `tokenizer` and `passwordless` are ordinary words, not credential
    // references. Without this the fix would escalate ordinary work and get
    // switched off — the real failure mode of an over-eager gate.
    for (const command of ['cat tokenizer.ts', 'grep passwordless auth.ts', 'ls tokenised/']) {
      expect(classifyShellCommand(command).tier, command).not.toBe('L3')
    }
  })

  it('DOES fire when the marker is a discrete component of a joined name', () => {
    // `tokens_backup` and `api_key` are the same shape: the marker followed by
    // a separator. No boundary rule can admit ANTHROPIC_API_KEY and reject
    // tokens_backup, and that is the right trade for this gate — a directory
    // literally named `tokens` plausibly holds tokens, and escalation asks for
    // approval rather than blocking. Pinned so the asymmetry is a deliberate,
    // visible choice rather than an accident someone later "fixes".
    for (const command of ['ls tokens_backup_dir_name', 'cat my-secret-notes.md']) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('still allows the safe commands the gate exists to let through', () => {
    for (const command of ['ls', 'ls -la', 'pwd', 'cat README.md', 'wc -l README.md']) {
      expect(classifyShellCommand(command).tier, command).toBe('L0')
    }
  })
})

/*
 * Worktree containment for lane-local writes.
 *
 * Found by review on #1027: the L1 branch returned the reason "writes inside
 * the lane worktree" while no path check existed anywhere in the module, and
 * GateOptions carried no root to check against. The reason string asserted a
 * control that was never implemented, and the audit trail recorded that
 * assertion for every allowed write.
 */
describe('lane-local writes — worktree containment', () => {
  const ROOT = '/tmp/agent/.hermes/worktrees/lane-42'

  it('escalates a write to the gate’s own control surface, root or no root', () => {
    // The hook is re-spawned from a fixed path per call, so overwriting it
    // disables the gate for the rest of the run. This must hold even when no
    // worktree root is configured.
    for (const file_path of [
      '/tmp/agent/.hermes/lanes/gate/run-1/settings.json',
      '/tmp/agent/.claude/settings.json',
      '/repo/.git/hooks/pre-commit',
      '/tmp/agent/.bashrc',
      '/app/src/server/lanes/autonomy-hook.mjs',
    ]) {
      for (const opts of [{}, { worktreeRoot: ROOT }]) {
        const result = classifyToolCall(call({ tool: 'Write', input: { file_path } }), opts)
        expect(result.tier, `${file_path} ${JSON.stringify(opts)}`).toBe('L3')
        expect(result.reason).toMatch(/controls it runs under/i)
      }
    }
    // `.ssh` is also refused, but by the credential-material check that runs
    // earlier — a different reason for the same correct answer, asserted
    // separately rather than loosening the message above.
    expect(
      classifyToolCall(call({ tool: 'Write', input: { file_path: '/tmp/agent/.ssh/id_rsa' } })).tier,
    ).toBe('L3')
  })

  it('escalates a write outside the configured worktree root', () => {
    for (const file_path of [
      '/etc/passwd',
      '/tmp/agent/other-lane/src/index.ts',
      `${ROOT}/../lane-43/src/index.ts`,
    ]) {
      const result = classifyToolCall(
        call({ tool: 'Write', input: { file_path } }),
        { worktreeRoot: ROOT },
      )
      expect(result.tier, file_path).toBe('L3')
    }
  })

  it('allows a write inside the configured worktree root', () => {
    for (const file_path of [`${ROOT}/src/index.ts`, `${ROOT}/nested/dir/a.md`]) {
      const result = classifyToolCall(
        call({ tool: 'Write', input: { file_path } }),
        { worktreeRoot: ROOT },
      )
      expect(result.tier, file_path).toBe('L1')
      expect(result.reason).toMatch(/containment checked/i)
    }
  })

  it('escalates a write whose path is in no recognised field, once a root exists', () => {
    // Otherwise containment passes by finding nothing to check — vacuously
    // green in the one place that must not be.
    const result = classifyToolCall(
      call({ tool: 'Write', input: { destination: `${ROOT}/x.ts` } }),
      { worktreeRoot: ROOT },
    )
    expect(result.tier).toBe('L3')
    expect(result.reason).toMatch(/cannot be checked/i)
  })

  it('still allows TodoWrite, which writes a task list and not a path', () => {
    expect(
      classifyToolCall(call({ tool: 'TodoWrite', input: { todos: [] } }), { worktreeRoot: ROOT }).tier,
    ).toBe('L1')
  })

  it('says containment was NOT enforced when no root is configured', () => {
    // The tier is unchanged — escalating every write on every un-wired lane is
    // how a gate gets switched off wholesale — but the reason must stop
    // asserting a check that did not run.
    const result = classifyToolCall(call({ tool: 'Write', input: { file_path: '/anywhere/x.ts' } }))
    expect(result.tier).toBe('L1')
    expect(result.reason).toMatch(/NOT enforced/i)
  })

  it('threads the root from evaluateToolCall, not just classifyToolCall', () => {
    // The check is worthless if the decision path does not pass the root down.
    const decision = evaluateToolCall(
      call({ tool: 'Write', input: { file_path: '/etc/passwd' } }),
      { worktreeRoot: ROOT },
    )
    expect(decision.tier).toBe('L3')
    expect(decision.allowed).toBe(false)
  })
})

/**
 * UNI-2409 Codex slice. Codex edits files with `apply_patch`, which carries the
 * whole patch in `command`; the paths live on the patch header lines. Before
 * this, `apply_patch` was an unknown tool and every Codex edit escalated.
 */
describe('codex apply_patch — paths from the patch headers', () => {
  const ROOT = '/tmp/agent/.hermes/worktrees/lane-42'
  const patch = (...headers: string[]) => ({
    tool: 'apply_patch',
    input: { command: ['*** Begin Patch', ...headers.flatMap((h) => [h, '+x']), '*** End Patch'].join('\n') },
  })

  it('allows a patch whose every file is inside the worktree root', () => {
    const result = classifyToolCall(
      call(patch(`*** Update File: ${ROOT}/src/a.ts`, `*** Add File: ${ROOT}/src/b.ts`)),
      { worktreeRoot: ROOT },
    )
    expect(result.tier).toBe('L1')
    expect(result.reason).toMatch(/containment checked/i)
  })

  it('escalates a patch that adds, deletes or moves a file outside the root', () => {
    for (const header of [
      '*** Add File: /etc/cron.d/x',
      `*** Delete File: ${ROOT}/../lane-43/a.ts`,
      '*** Move to: /tmp/agent/other/a.ts',
    ]) {
      const result = classifyToolCall(
        call(patch(`*** Update File: ${ROOT}/src/a.ts`, header)),
        { worktreeRoot: ROOT },
      )
      expect(result.tier, header).toBe('L3')
    }
  })

  it('reads an indented or CRLF header, so an outside-root file is not missed', () => {
    const command = [
      '*** Begin Patch',
      `*** Update File: ${ROOT}/src/a.ts`,
      '+x',
      '  *** Add File: /etc/cron.d/x',
      '+y',
      '*** End Patch',
    ].join('\r\n')
    const result = classifyToolCall(call({ tool: 'apply_patch', input: { command } }), { worktreeRoot: ROOT })
    expect(result.tier).toBe('L3')
  })

  it('escalates a patch that touches credential material', () => {
    const result = classifyToolCall(call(patch(`*** Update File: ${ROOT}/.env`)), { worktreeRoot: ROOT })
    expect(result.tier).toBe('L3')
    expect(result.reason).toMatch(/credential/i)
  })

  it('escalates a patch into .codex, root or no root', () => {
    for (const opts of [{}, { worktreeRoot: ROOT }]) {
      const result = classifyToolCall(call(patch(`*** Add File: ${ROOT}/.codex/config.toml`)), opts)
      expect(result.tier, JSON.stringify(opts)).toBe('L3')
      expect(result.reason).toMatch(/controls it runs under/i)
    }
  })

  it('fails closed on a patch it cannot read', () => {
    for (const input of [
      {},
      { command: 'not a patch' },
      { command: '*** Begin Patch\n*** End Patch' },
      { command: 42 },
    ]) {
      const result = classifyToolCall(call({ tool: 'apply_patch', input }))
      expect(result.tier, JSON.stringify(input)).toBe('L3')
    }
  })
})

describe('.codex is agent configuration for every write tool', () => {
  it('escalates a Write into .codex even with no root configured', () => {
    const result = classifyToolCall(call({ tool: 'Write', input: { file_path: '/srv/a/.codex/config.toml' } }))
    expect(result.tier).toBe('L3')
    expect(result.reason).toMatch(/controls it runs under/i)
  })
})

/** UNI-2409 Codex review r2: read-only executables whose options are not. */
describe('read-only executables with writing, launching or recursive options', () => {
  const tier = (command: string) => classifyShellCommand(command).tier

  it('escalates options that write a file or run a program', () => {
    for (const command of [
      'sort -o /tmp/outside.txt input.txt',
      'sort -uo .codex/config.toml input.txt',
      'sort --output=.codex/config.toml input.txt',
      'sort --compress-program=evil input.txt',
      'uniq input.txt out.txt',
      'file -C -m magic',
      'date -s 2020-01-01',
      'hostname evil',
      'git diff --output=/tmp/x',
      'git diff --ext-diff',
      'git remote add x https://example.com/x.git',
      'git remote set-url origin https://example.com/x.git',
    ]) {
      expect(tier(command), command).toBe('L3')
    }
  })

  it('escalates reads of whole trees, hidden files or links', () => {
    for (const command of [
      'grep -R SECRET linked',
      'grep -rn SECRET .',
      'grep --recursive SECRET .',
      'grep -d recurse SECRET .',
      'rg --hidden SECRET',
      'rg -uu SECRET',
      'rg -L SECRET',
      'rg --no-ignore SECRET',
      'rg --pre cat SECRET',
      'rg SYNTHETIC_ONLY .',
      'rg -n TODO',
      'diff -r a b',
      'diff --recursive a b',
    ]) {
      expect(tier(command), command).toBe('L3')
    }
  })

  it('escalates unquoted globs and braces, which expand to unseen paths', () => {
    for (const command of ['cat .e*', 'cat .en?', 'cat .e[n]v', 'cat .e{nv,x}', 'ls *.ts']) {
      expect(tier(command), command).toBe('L3')
    }
  })

  it('still allows the ordinary forms', () => {
    for (const command of [
      'grep -n TODO src/a.ts',
    ]) {
      expect(tier(command), command).toBe('L0')
    }
  })

  it('checks quoted and --opt=value operands through the resolver', () => {
    const resolve = (target: string) => (target.endsWith('readme.txt') ? '/lane/.env' : '/lane/' + target)
    for (const command of [
      "cat 'readme.txt'",
      'cat "readme.txt"',
      'cat -- readme.txt',
      'grep -f readme.txt x',
      'wc --files0-from=readme.txt',
    ]) {
      expect(classifyShellCommand(command, resolve).tier, command).toBe('L3')
    }
    expect(classifyShellCommand("cat 'notes.txt'", resolve).tier).toBe('L0')
  })

  it('protects .git/config, which can name commands git runs', () => {
    expect(classifyToolCall(call({ tool: 'Write', input: { file_path: '/repo/.git/config' } })).tier).toBe('L3')
  })
})

describe('the logins a lane runs under are credential material', () => {
  it('escalates reads of CLI login files and process environments', () => {
    for (const command of [
      'cat /srv/a/.hermes/accounts/x/auth.json',
      'cat /srv/a/.codex/auth.json',
      'cat /srv/a/.config/gh/hosts.yml',
      'cat /proc/self/environ',
      'head /proc/1/environ',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
    expect(
      classifyToolCall(call({ tool: 'Read', input: { file_path: '/srv/a/.codex/auth.json' } })).tier,
    ).toBe('L3')
  })
})

describe('options that read a list of paths from a file', () => {
  it('escalates them on every allowed executable', () => {
    for (const command of [
      'sort --files0-from=names.txt',
      'sort --files0-from names.txt',
      'wc --files0-from=names.txt',
      'file -f names.txt',
      'git diff --pathspec-from-file=names.txt',
      'git log --pathspec-from-file names.txt',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })
})

describe('executables that are not read-only in every invocation are not on the list', () => {
  it('escalates sort, uniq, file, date, hostname and diff in their plainest forms', () => {
    // sort spills temp files to -T or $TMPDIR outside the worktree (Codex review r5).
    for (const command of ['sort input.txt', 'sort -T /tmp/sibling -S 1K input.txt', 'uniq input.txt', 'file a.txt', 'date', 'hostname', 'diff . ../other-lane']) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })
})

describe('review r6: git diff --no-index and npm', () => {
  it('escalates git diff --no-index and every npm subcommand', () => {
    for (const command of [
      'git diff --no-index lane sibling',
      'npm ls',
      'npm ls --cache /tmp/sibling --prefix lane',
      'npm view react',
      'npm outdated',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })
})

describe('review r7: tilde forms the resolver does not model', () => {
  it('escalates ~name, ~+ and ~-, at word start and after = or :', () => {
    for (const command of [
      'cat ~phill/lane/innocent.txt',
      'cat ~+/innocent.txt',
      'cat ~-/innocent.txt',
      'wc --x=~phill/innocent.txt',
      'cat a:~phill/innocent.txt',
      'cat @(.e?v)',
      'cat !(notes).txt',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('still allows ~ and ~/ (resolved to the home directory) and a ~ inside a word', () => {
    for (const command of ['cat ~/notes.txt', 'ls ~', 'cat a~b.txt', "cat '~phill'"]) {
      expect(classifyShellCommand(command).tier, command).toBe('L0')
    }
  })
})

describe('review r9: policy-mapped commands need a trusted program too', () => {
  it('escalates gh and vercel when the program is not trusted, keeps the policy tier when it is', () => {
    for (const command of ['gh pr create --draft --base main', 'vercel --target preview']) {
      expect(classifyShellCommand(command, undefined, () => false).tier, command).toBe('L3')
      expect(classifyShellCommand(command, undefined, () => true).tier, command).toBe('L1')
    }
  })
})

describe('review r10: every per-process /proc file is credential material', () => {
  it('escalates environ aliases and other process files', () => {
    for (const command of [
      'cat /proc/1/task/1/environ',
      'cat /proc/self/task/42/environ',
      'cat /proc/thread-self/environ',
      'cat /proc/123/cmdline',
      'cat ../../proc/1/environ',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('still allows system-wide /proc files that are not per-process', () => {
    for (const command of ['cat /proc/cpuinfo', 'cat /proc/meminfo']) {
      expect(classifyShellCommand(command).tier, command).toBe('L0')
    }
  })
})

describe('review r11: option spellings, abbreviations and the grep allow-list', () => {
  it('escalates grep recursion in every spelling and any unknown grep option', () => {
    for (const command of [
      'grep --directories recurse SYNTHETIC .',
      'grep --directories=recurse SYNTHETIC .',
      'grep --dir recurse SYNTHETIC .',
      'grep --recur SYNTHETIC .',
      'grep -d recurse SYNTHETIC .',
      'grep -drecurse SYNTHETIC .',
      'grep -D read SYNTHETIC x',
      'grep -f patterns.txt x',
      'egrep -r SYNTHETIC .',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('escalates abbreviations of blocked long options', () => {
    for (const command of [
      'git diff --out=/tmp/x',
      'git diff --outp /tmp/x',
      'git diff --no-ind lane sibling',
      'git diff --ext',
      'git log --pathspec-from=names.txt',
      'wc --files0=names.txt',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('still allows ordinary grep options', () => {
    for (const command of [
      'grep -n TODO src/a.ts',
      'grep -inw TODO src/a.ts',
      'grep -A3 -B 2 TODO src/a.ts',
      'grep --color=never --line-number TODO src/a.ts',
      'grep -e TODO -- src/a.ts',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L0')
    }
  })
})

describe('review r12: git metadata is never written by a read command or a lane edit', () => {
  it('needs approval for git status, which rewrites the index', () => {
    expect(classifyShellCommand('git status').tier).toBe('L3')
    expect(classifyShellCommand('git status --short').tier).toBe('L3')
  })

  it('protects every git metadata path, including a linked worktree .git file', () => {
    for (const file_path of [
      '/repo/.git/config.worktree',
      '/repo/.git/info/attributes',
      '/repo/.git/index',
      '/repo/.git',
    ]) {
      for (const tool of ['Write', 'Edit']) {
        expect(classifyToolCall(call({ tool, input: { file_path } })).tier, `${tool} ${file_path}`).toBe('L3')
      }
    }
  })

  it('still allows ordinary writes whose names only resemble .git', () => {
    expect(classifyToolCall(call({ tool: 'Write', input: { file_path: '/repo/src/.gitignore' } })).tier).not.toBe('L3')
  })
})

describe('review r13: Windows spellings of protected and secret paths', () => {
  const WIN = 'C:\\lane'
  const resolvePath = (target: string) => target
  it('escalates Write and Edit to Windows-form protected paths', () => {
    for (const file_path of [
      `${WIN}\\.codex\\config.toml`,
      `${WIN}\\.git\\config`,
      `${WIN}\\apps\\workspace\\src\\server\\lanes\\autonomy-hook.mjs`,
      `${WIN}\\.CODEX\\config.toml`,
      `${WIN}\\.git.\\config`,
      `${WIN}\\.git \\hooks\\pre-commit`,
      `${WIN}\\.codex::$INDEX_ALLOCATION\\config.toml`,
      `${WIN}\\.claude\\settings.json`,
    ]) {
      for (const tool of ['Write', 'Edit']) {
        const result = classifyToolCall(call({ tool, input: { file_path } }), { worktreeRoot: WIN, resolvePath })
        expect(result.tier, `${tool} ${file_path}`).toBe('L3')
      }
    }
  })

  it('escalates an apply_patch header naming a Windows-form .codex target', () => {
    const command = `*** Begin Patch\n*** Add File: ${WIN}\\.codex\\config.toml\n+x\n*** End Patch\n`
    expect(
      classifyToolCall(call({ tool: 'apply_patch', input: { command } }), { worktreeRoot: WIN, resolvePath }).tier,
    ).toBe('L3')
  })

  it('escalates reads of Windows-form credential paths', () => {
    // `gh\\hosts.yml` matches the GitHub CLI login marker only once `\\` reads as `/`.
    for (const file_path of [`${WIN}\\.ENV`, `${WIN}\\.env.`, 'C:\\Users\\a\\AppData\\gh\\hosts.yml']) {
      expect(classifyToolCall(call({ tool: 'Read', input: { file_path } })).tier, file_path).toBe('L3')
    }
  })

  it('escalates an apply_patch header naming a Windows-form credential file', () => {
    const command = `*** Begin Patch\n*** Update File: ${WIN}\\gh\\hosts.yml\n+x\n*** End Patch\n`
    expect(classifyToolCall(call({ tool: 'apply_patch', input: { command } }), { worktreeRoot: WIN }).tier).toBe('L3')
  })

  it('still allows an ordinary Windows-form write inside the root', () => {
    const result = classifyToolCall(call({ tool: 'Write', input: { file_path: `${WIN}\\src\\a.ts` } }), {
      worktreeRoot: WIN,
      resolvePath,
    })
    expect(result.tier).toBe('L1')
  })
})

describe('review r14: no git command that prints remote URLs', () => {
  it('needs approval for every git remote form and other URL listings', () => {
    for (const command of [
      'git remote',
      'git remote -v',
      'git remote --verbose',
      'git remote show origin',
      'git remote get-url origin',
      'git ls-remote',
      'git config --get remote.origin.url',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })
})

describe('review r15: ripgrep is not a read-only executable', () => {
  it('needs approval for every rg form, file listing included', () => {
    // ripgrep obeys the LAST mode flag, so `--files --json PATTERN .` searches
    // file contents across the tree; no option check can follow that safely.
    const trusted = () => true
    for (const command of ['rg --files', 'rg --files --json SYNTHETIC_ONLY .', 'rg --json --files', 'rg --version']) {
      expect(classifyShellCommand(command, undefined, trusted).tier, command).toBe('L3')
    }
  })
})

describe('review r16: git helpers and tree-wide Grep', () => {
  it('needs approval for every git command that can run a diff driver or textconv', () => {
    for (const command of [
      'git log',
      'git log -p --textconv',
      'git diff',
      'git diff --stat',
      'git show HEAD',
      'git show --textconv HEAD:a',
      'git blame sample.txt',
    ]) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })

  it('protects .gitattributes, which selects the helper git runs', () => {
    for (const file_path of ['/repo/.gitattributes', '/repo/sub/.gitattributes', '/repo/.GitAttributes']) {
      expect(classifyToolCall(call({ tool: 'Write', input: { file_path } })).tier, file_path).toBe('L3')
    }
  })

  it('escalates a Grep that returns matching lines', () => {
    for (const input of [
      { pattern: 'SYNTHETIC_ONLY', path: '.', output_mode: 'content' },
      { pattern: 'TODO', glob: 'src/**/*.ts', output_mode: 'content' },
    ]) {
      expect(classifyToolCall(call({ tool: 'Grep', input })).tier).toBe('L3')
    }
    // An adapter whose Grep default is not documented must name its mode.
    expect(classifyToolCall(call({ tool: 'Grep', adapter: 'codex', input: { pattern: 'x', path: '.' } })).tier).toBe(
      'L3',
    )
  })

  it('escalates a Grep in names and count modes too (review r17)', () => {
    // A count or a matching name answers 'does the secret start with X?'.
    for (const input of [
      { pattern: '^SYNTHETIC_ONLY', path: '.' },
      { pattern: '^SYNTHETIC_ONLY', path: '.', output_mode: 'files_with_matches' },
      { pattern: '^SYNTHETIC_ONLY', path: '.', output_mode: 'count' },
    ]) {
      expect(classifyToolCall(call({ tool: 'Grep', input })).tier).toBe('L3')
    }
  })
})

describe('review r17: credential stores and the gate policy files', () => {
  it('escalates reads of standard credential stores', () => {
    for (const target of [
      '/srv/a/.git-credentials',
      '/srv/a/.netrc',
      'C:\\Users\\a\\_netrc',
      '/srv/a/.pgpass',
      '/srv/a/.pypirc',
      '/srv/a/.docker/config.json',
      '/srv/a/.kube/config',
      '/srv/a/.config/gcloud/application_default_credentials.json',
      '/srv/a/.gnupg/private-keys-v1.d/x.key',
    ]) {
      expect(classifyShellCommand(`cat ${target.replace(/\\/g, '/')}`).tier, target).toBe('L3')
      expect(classifyToolCall(call({ tool: 'Read', input: { file_path: target } })).tier, target).toBe('L3')
    }
  })

  it('still allows an ordinary file whose name only resembles one', () => {
    expect(classifyShellCommand('cat docs/netrc-format.md').tier).toBe('L0')
  })

  it('protects every file the hook loads, inside a root that contains the gate', () => {
    const root = '/gate-checkout'
    for (const file_path of [
      `${root}/apps/workspace/src/server/lanes/autonomy-gate.ts`,
      `${root}/apps/workspace/src/server/lanes/mission-authority.json`,
      `${root}/scripts/nexus-runner/mission-authority.json`,
    ]) {
      expect(classifyToolCall(call({ tool: 'Write', input: { file_path } }), { worktreeRoot: root }).tier, file_path).toBe(
        'L3',
      )
    }
    const command = `*** Begin Patch\n*** Update File: ${root}/apps/workspace/src/server/lanes/autonomy-gate.ts\n+x\n*** End Patch\n`
    expect(classifyToolCall(call({ tool: 'apply_patch', input: { command } }), { worktreeRoot: root }).tier).toBe('L3')
  })
})

describe('review r18: dash-prefixed operands are checked too', () => {
  it('escalates a dash-prefixed file that resolves to a secret, after -- or not', () => {
    const resolvePath = (target: string) => (target.endsWith('-notes.txt') ? '/lane/.env' : '/lane/' + target)
    for (const command of ['cat -- -notes.txt', 'head -n 5 -- -notes.txt', 'cat -notes.txt']) {
      expect(classifyShellCommand(command, resolvePath).tier, command).toBe('L3')
    }
  })

  it('still allows ordinary options that resolve to nothing secret', () => {
    const resolvePath = (target: string) => '/lane/' + target
    for (const command of ['head -n 5 src/a.ts', 'cat -- src/a.ts', 'wc -l src/a.ts']) {
      expect(classifyShellCommand(command, resolvePath).tier, command).toBe('L0')
    }
  })
})

describe('review r19: Windows rooted path forms are not lane-relative', () => {
  const WIN = 'C:\\lane'
  const resolvePath = (target: string) => target
  const outside = ['\\\\server\\share\\outside.txt', '\\outside.txt', '\\\\?\\C:\\outside.txt', 'C:outside.txt']
  it('escalates Write, Edit and apply_patch to UNC, root-relative, device and drive-relative paths', () => {
    for (const file_path of outside) {
      for (const tool of ['Write', 'Edit']) {
        const result = classifyToolCall(call({ tool, input: { file_path } }), { worktreeRoot: WIN, resolvePath })
        expect(result.tier, `${tool} ${file_path}`).toBe('L3')
      }
      const command = `*** Begin Patch\n*** Add File: ${file_path}\n+x\n*** End Patch\n`
      const patch = classifyToolCall(call({ tool: 'apply_patch', input: { command } }), { worktreeRoot: WIN, resolvePath })
      expect(patch.tier, `apply_patch ${file_path}`).toBe('L3')
    }
  })

  it('still allows relative and drive-absolute writes inside the root', () => {
    for (const file_path of ['src\\a.ts', 'src/a.ts', `${WIN}\\src\\a.ts`]) {
      const result = classifyToolCall(call({ tool: 'Write', input: { file_path } }), { worktreeRoot: WIN, resolvePath })
      expect(result.tier, file_path).toBe('L1')
    }
  })
})

describe('review r20: no git command is read-only', () => {
  it('needs approval for every git command, fsmonitor-running ls-files included', () => {
    for (const command of ['git ls-files', 'git rev-parse HEAD', 'git branch', 'git branch -a', 'git --version']) {
      expect(classifyShellCommand(command).tier, command).toBe('L3')
    }
  })
})

describe('review r21: files with another hard-linked name', () => {
  const shared = (target: string) => target.endsWith('ordinary.txt')
  it('escalates shell reads, tool reads, writes and patches of a multiply linked file', () => {
    for (const command of ['cat ordinary.txt', 'head -n 3 -- ordinary.txt']) {
      expect(classifyShellCommand(command, undefined, undefined, shared).tier, command).toBe('L3')
    }
    for (const tool of ['Read', 'Write', 'Edit', 'NotebookEdit']) {
      const result = classifyToolCall(call({ tool, input: { file_path: '/lane/ordinary.txt' } }), {
        worktreeRoot: '/lane',
        isSharedFile: shared,
      })
      expect(result.tier, tool).toBe('L3')
    }
    const command = '*** Begin Patch\n*** Update File: /lane/ordinary.txt\n+x\n*** End Patch\n'
    expect(
      classifyToolCall(call({ tool: 'apply_patch', input: { command } }), { worktreeRoot: '/lane', isSharedFile: shared })
        .tier,
    ).toBe('L3')
  })

  it('still allows a file with a single name', () => {
    expect(classifyShellCommand('cat notes.txt', undefined, undefined, shared).tier).toBe('L0')
    const result = classifyToolCall(call({ tool: 'Write', input: { file_path: '/lane/notes.txt' } }), {
      worktreeRoot: '/lane',
      isSharedFile: shared,
    })
    expect(result.tier).toBe('L1')
  })
})

describe('review r22: git config and the AWS tree are credential reads', () => {
  it('escalates shell and Read access to git config and every .aws file', () => {
    for (const target of [
      '/lane/.git/config',
      '/lane/.git/config.worktree',
      '/repo/.git/worktrees/lane/config.worktree',
      '/srv/a/.aws/config',
      '/srv/a/.aws/sso/cache/a1b2.json',
      '/srv/a/.aws/cli/cache/a1b2.json',
    ]) {
      expect(classifyShellCommand(`cat ${target}`).tier, target).toBe('L3')
      expect(classifyToolCall(call({ tool: 'Read', input: { file_path: target } })).tier, target).toBe('L3')
    }
  })

  it('escalates a symlink alias that resolves into .aws', () => {
    const resolvePath = (target: string) => (target.endsWith('alias.txt') ? '/srv/a/.aws/config' : '/lane/' + target)
    for (const command of ['cat alias.txt', 'head alias.txt']) {
      expect(classifyShellCommand(command, resolvePath).tier, command).toBe('L3')
    }
  })

  it('still allows files whose names only resemble these', () => {
    for (const command of ['cat docs/config.md', 'cat .github/config.yml']) {
      expect(classifyShellCommand(command).tier, command).toBe('L0')
    }
    // Through Read: in a shell command the word `aws` already escalates as a
    // cloud CLI, which is not what this rule is about.
    for (const file_path of ['/lane/src/aws-client.ts', '/lane/.awsignore']) {
      expect(classifyToolCall(call({ tool: 'Read', input: { file_path } })).tier, file_path).toBe('L0')
    }
  })
})

describe('review r23: user and system git config are credential reads', () => {
  it('escalates shell and Read access to every git config location', () => {
    for (const target of [
      '/srv/a/.gitconfig',
      '/etc/gitconfig',
      '/srv/a/.config/git/config',
      '/srv/a/.config/git/credentials',
      'C:/ProgramData/Git/config',
    ]) {
      expect(classifyShellCommand(`cat ${target}`).tier, target).toBe('L3')
      expect(classifyToolCall(call({ tool: 'Read', input: { file_path: target } })).tier, target).toBe('L3')
    }
    expect(classifyShellCommand('cat .gitconfig').tier).toBe('L3')
  })

  it('escalates a symlink alias that resolves to ~/.gitconfig', () => {
    const resolvePath = (target: string) => (target.endsWith('alias.txt') ? '/srv/a/.gitconfig' : '/lane/' + target)
    expect(classifyShellCommand('cat alias.txt', resolvePath).tier).toBe('L3')
  })

  it('still allows files whose names only resemble these', () => {
    for (const target of ['/lane/docs/gitconfig.md', '/lane/.config/gitx/config.ts', '/lane/src/git/config.ts']) {
      expect(classifyToolCall(call({ tool: 'Read', input: { file_path: target } })).tier, target).toBe('L0')
    }
  })
})

describe('review r24: a draft PR may only target main', () => {
  const trusted = () => true

  it('escalates a draft PR whose base is any branch other than main', () => {
    for (const command of [
      'gh pr create --draft --base feature/foo',
      'gh pr create --draft -B feature/foo',
      'gh pr create --draft --base=feature/foo',
      'gh pr create --draft --base main --base feature/foo',
      'gh pr create --draft --base Main',
      'gh pr create --draft -Bfeature/foo',
    ]) {
      expect(classifyShellCommand(command, undefined, trusted).tier, command).toBe('L3')
    }
  })

  it('keeps a draft PR into main at the policy tier', () => {
    for (const command of [
      'gh pr create --draft --base main',
      'gh pr create --draft -B main',
      'gh pr create --draft --base=main --title t --body b',
    ]) {
      expect(classifyShellCommand(command, undefined, trusted).tier, command).toBe('L1')
    }
  })
})

describe('review r25: a draft PR must name main as its base', () => {
  it('escalates a draft PR with no base, which gh may resolve from branch config', () => {
    for (const command of ['gh pr create --draft', 'gh pr create -d --fill', 'gh pr create --draft --title t --body b']) {
      expect(classifyShellCommand(command, undefined, () => true).tier, command).toBe('L3')
    }
  })
})

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  CLI_OUTPUT_LIMIT,
  createCliAdapter,
  createSupervisedSpawn,
  supervisedSpawn as productionSupervisedSpawn,
  redactCliOutput,
} from './cli-adapter'
import { StopNotAcknowledgedError, truncateUtf8 } from './adapter'
import { terminateProcessTree } from './process-tree'
import type { SpawnFn } from './cli-adapter'
import type { Lane } from './types'

const supervisedSpawn = createSupervisedSpawn(
  terminateProcessTree,
  process.platform,
  () => true,
)

function cliLane(tool: 'claude-code' | 'codex', account = 'max-1'): Lane {
  return {
    id: 'l1',
    kind: 'cli',
    backend: { kind: 'cli', tool, account },
    role: 'builder',
    repo: '/r',
    worktree: '/w/lane',
    branch: 'lane/l1',
    status: 'idle',
  }
}

type Captured = {
  command: string
  args: Array<string>
  cwd: string
  env: NodeJS.ProcessEnv
  input?: string
}

async function abortAndSettle(
  controller: AbortController,
  running: Promise<unknown> | undefined,
): Promise<void> {
  controller.abort()
  if (!running) return
  await Promise.race([
    running.then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 3_000)
      timer.unref()
    }),
  ])
}

describe('CliLaneAdapter', () => {
  it('honours byte limits smaller than the truncation marker', () => {
    const tiny = truncateUtf8('abcdef', 2)
    const multibyte = truncateUtf8('😀😀😀', 7, '')
    const multibyteMarker = truncateUtf8('abcdef', 3, '😀')

    expect(Buffer.byteLength(tiny, 'utf8')).toBeLessThanOrEqual(2)
    expect(Buffer.byteLength(multibyte, 'utf8')).toBeLessThanOrEqual(7)
    expect(multibyte).not.toContain('�')
    expect(Buffer.byteLength(multibyteMarker, 'utf8')).toBeLessThanOrEqual(3)
    expect(multibyteMarker).not.toContain('�')
  })

  it('pipes Claude missions over stdin instead of exposing them in argv', async () => {
    let cap: Captured | null = null
    const spawn: SpawnFn = async (command, args, opts) => {
      cap = { command, args, cwd: opts.cwd, env: opts.env, input: opts.input }
      return { code: 0, stdout: 'done', stderr: '' }
    }
    const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })
    const res = await adapter.run(cliLane('claude-code', 'max-2'), 'build it')
    expect(res.output).toBe('done')
    expect(cap!.command).toBe('claude')
    expect(cap!.args).toEqual(['-p'])
    expect(cap!.input).toBe('build it')
    expect(cap!.args).not.toContain('build it')
    expect(cap!.cwd).toBe('/w/lane')
    expect(cap!.env.CLAUDE_CONFIG_DIR).toBe('/accts/max-2')
  })

  it('pipes Codex missions over stdin instead of exposing them in argv', async () => {
    let cap: Captured | null = null
    const spawn: SpawnFn = async (command, args, opts) => {
      cap = { command, args, cwd: opts.cwd, env: opts.env, input: opts.input }
      return { code: 0, stdout: 'ok', stderr: '' }
    }
    const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })
    await adapter.run(cliLane('codex', 'openai-pro'), 'x')
    expect(cap!.command).toBe('codex')
    expect(cap!.args).toEqual(['exec', '-'])
    expect(cap!.input).toBe('x')
    expect(cap!.args).not.toContain('x')
    expect(cap!.env.CODEX_HOME).toBe('/accts/openai-pro')
  })

  it.each(['review', 'resume', '--dangerously-bypass-approvals-and-sandbox'])(
    'keeps parser-sensitive Codex mission text out of argv: %s',
    async (mission) => {
      const spawn = vi.fn<SpawnFn>().mockResolvedValue({
        code: 0,
        stdout: 'ok',
        stderr: '',
      })
      const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })

      await adapter.run(cliLane('codex', 'openai-pro'), mission)

      expect(spawn).toHaveBeenCalledWith(
        'codex',
        ['exec', '-'],
        expect.objectContaining({ cwd: '/w/lane', input: mission }),
      )
    },
  )

  it('does not inherit unrelated server credentials into CLI children', async () => {
    vi.stubEnv('UNRELATED_SERVER_SECRET', 'must-not-reach-child')
    let capturedEnv: NodeJS.ProcessEnv | undefined
    const adapter = createCliAdapter({
      accountsDir: '/accts',
      spawn: async (_command, _args, opts) => {
        capturedEnv = opts.env
        return { code: 0, stdout: 'ok', stderr: '' }
      },
    })

    try {
      await adapter.run(cliLane('codex'), 'x')
    } finally {
      vi.unstubAllEnvs()
    }

    expect(capturedEnv).not.toHaveProperty('UNRELATED_SERVER_SECRET')
    expect(capturedEnv?.PATH).toBeTruthy()
    expect(capturedEnv?.CODEX_HOME).toBe('/accts/max-1')
  })

  it('forwards the admitted shared OAuth token only to Claude children', async () => {
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'test-shared-oauth-token')
    const captured: Record<string, NodeJS.ProcessEnv> = {}
    const adapter = createCliAdapter({
      accountsDir: '/accts',
      spawn: async (command, _args, opts) => {
        captured[command] = opts.env
        return { code: 0, stdout: 'ok', stderr: '' }
      },
    })

    try {
      await adapter.run(cliLane('claude-code'), 'claude mission')
      await adapter.run(cliLane('codex'), 'codex mission')
    } finally {
      vi.unstubAllEnvs()
    }

    expect(captured.claude.CLAUDE_CODE_OAUTH_TOKEN).toBe(
      'test-shared-oauth-token',
    )
    expect(captured.codex).not.toHaveProperty('CLAUDE_CODE_OAUTH_TOKEN')
  })

  it('rejects account identifiers that escape the credential root', async () => {
    const spawn = vi.fn<SpawnFn>()
    const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })

    await expect(
      adapter.run(cliLane('codex', '../../outside'), 'x'),
    ).rejects.toThrow(/invalid cli account/i)
    expect(spawn).not.toHaveBeenCalled()
  })

  it('throws with stderr detail on a non-zero exit', async () => {
    const spawn: SpawnFn = async () => ({
      code: 1,
      stdout: '',
      stderr: 'not logged in',
    })
    const adapter = createCliAdapter({ spawn })
    await expect(adapter.run(cliLane('claude-code'), 'x')).rejects.toThrow(
      /exited 1: not logged in/,
    )
  })

  it('rejects non-cli lanes', async () => {
    const adapter = createCliAdapter({
      spawn: async () => ({ code: 0, stdout: '', stderr: '' }),
    })
    const gateway: Lane = {
      ...cliLane('claude-code'),
      kind: 'gateway',
      backend: { kind: 'gateway', provider: 'minimax', model: '' },
    }
    await expect(adapter.run(gateway, 'x')).rejects.toThrow(/only runs cli/)
  })

  it('passes the run abort signal to the supervised spawn', async () => {
    const controller = new AbortController()
    let capturedSignal: AbortSignal | undefined
    const spawn: SpawnFn = async (_command, _args, opts) => {
      capturedSignal = opts.signal
      return { code: 0, stdout: 'done', stderr: '' }
    }
    const adapter = createCliAdapter({ spawn })

    await adapter.run(cliLane('codex'), 'x', { signal: controller.signal })

    expect(capturedSignal).toBe(controller.signal)
  })

  it('redacts credential-shaped output and applies a hard output bound', () => {
    const raw = [
      `Authorization: Bearer ${'opaque-value'}`,
      `OPENAI_API_KEY=${'opaque-value'}`,
      `https://operator:${'opaque-value'}@example.com/path`,
      'x'.repeat(CLI_OUTPUT_LIMIT + 100),
    ].join('\n')

    const safe = redactCliOutput(raw)

    expect(safe).not.toContain('opaque-value')
    expect(safe).toContain('[REDACTED]')
    expect(safe).toContain('[output truncated]')
    expect(safe.length).toBeLessThanOrEqual(CLI_OUTPUT_LIMIT + 64)
  })

  it.each([
    ['OpenAI/Anthropic', `sk-${'a'.repeat(48)}`],
    ['GitHub classic', `ghp_${'A'.repeat(36)}`],
    ['GitHub fine-grained', `github_pat_${'A'.repeat(82)}`],
    ['Slack bot', `xoxb-${'1'.repeat(12)}-${'a'.repeat(24)}`],
    ['AWS access key', `AKIA${'A'.repeat(16)}`],
    ['Google API key', `AIza${'A'.repeat(35)}`],
    ['Stripe secret', `sk_live_${'a'.repeat(24)}`],
    ['Groq API key', `gsk_${'a'.repeat(48)}`],
    ['Hugging Face token', `hf_${'a'.repeat(48)}`],
  ])('redacts synthetic %s credential prefixes', (_label, credential) => {
    const safe = redactCliOutput(`agent output: ${credential}`)

    expect(safe).not.toContain(credential)
    expect(safe).toContain('[REDACTED]')
  })

  it('redacts ANSI-decorated authorisation values', () => {
    const credential = 'ansi-decorated-bearer-value'
    const safe = redactCliOutput(
      `\u001B[31mAuthorization\u001B[0m: \u001B[32mBearer\u001B[0m ${credential}`,
    )

    expect(safe).not.toContain(credential)
    expect(safe).toContain('[REDACTED]')
  })

  it('redacts credential-bearing JSON and quoted key-value output', () => {
    const values = ['opaque-json-value', 'opaque-quoted-value']
    const safe = redactCliOutput(
      `{"access_token":"${values[0]}"}\napi-key='${values[1]}'`,
    )

    for (const value of values) expect(safe).not.toContain(value)
  })

  it.each([
    ['equals-delimited Basic auth', 'authorization=Basic dXNlcjpwYXNz', 'dXNlcjpwYXNz'],
    ['JSON Basic auth', '{"authorization":"Basic dXNlcjpwYXNz"}', 'dXNlcjpwYXNz'],
    ['JSON Bearer auth', '{"Authorization":"Bearer opaque-token-value"}', 'opaque-token-value'],
  ])('redacts %s without leaving the credential suffix', (_label, raw, credential) => {
    const safe = redactCliOutput(raw)

    expect(safe).not.toContain(credential)
    expect(safe).toContain('[REDACTED]')
  })

  it('redacts Basic auth, JWTs, and private-key material', () => {
    const fixtures = [
      'Authorization: Basic dXNlcjpwYXNzd29yZA==',
      `eyJ${'a'.repeat(24)}.${'b'.repeat(24)}.${'c'.repeat(24)}`,
      '-----BEGIN PRIVATE KEY-----\nopaque-key-body\n-----END PRIVATE KEY-----',
    ]

    const safe = redactCliOutput(fixtures.join('\n'))

    expect(safe).not.toContain('dXNlcjpwYXNzd29yZA==')
    expect(safe).not.toContain(fixtures[1])
    expect(safe).not.toContain('opaque-key-body')
    expect(safe.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('redacts private-key material when capture ends before the PEM footer', () => {
    const beginMarker = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')
    const body = 'interrupted-private-key-body'
    const safe = redactCliOutput(`${beginMarker}\n${body}`)

    expect(safe).not.toContain(beginMarker)
    expect(safe).not.toContain(body)
    expect(safe).toContain('[REDACTED]')
  })

  it('redacts an incomplete provider token at the raw capture boundary', () => {
    const capturedTokenLength = 12
    const pathPrefix = '/Users/example/'
    const padding = 'x'.repeat(
      CLI_OUTPUT_LIMIT + 1 - pathPrefix.length - 1 - capturedTokenLength,
    )
    const fullToken = `ghp_${'A'.repeat(36)}`
    const captured = truncateUtf8(
      `${pathPrefix}${padding}\n${fullToken}`,
      CLI_OUTPUT_LIMIT + 1,
      '',
    )

    const safe = redactCliOutput(captured)

    expect(safe).not.toContain('ghp_')
    expect(safe).not.toContain('A'.repeat(8))
    expect(safe).toContain('[REDACTED]')
  })

  it('redacts local home and temporary filesystem paths', () => {
    const raw = [
      '/Users/example/worktrees/private-repo/src/index.ts',
      '/home/example/private-repo/config.json',
      '/private/var/folders/aa/bb/T/private-file',
      'C:\\Users\\example\\private-repo\\secret.txt',
    ].join('\n')

    const safe = redactCliOutput(raw)

    expect(safe).not.toContain('/Users/example')
    expect(safe).not.toContain('/home/example')
    expect(safe).not.toContain('/private/var/folders')
    expect(safe).not.toContain('C:\\Users\\example')
    expect(safe.match(/\[REDACTED_PATH\]/g)).toHaveLength(4)
  })

  it('acknowledges abort only after a real child process exits', async () => {
    const controller = new AbortController()
    const running = supervisedSpawn(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      {
        cwd: process.cwd(),
        env: process.env,
        signal: controller.signal,
      },
    )
    try {
      setTimeout(() => controller.abort(), 30)
      try {
        await running
        expect.fail('aborted child unexpectedly resolved')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const message = (error as Error).message
        if (/termination failed/i.test(message)) {
          expect(error).toBeInstanceOf(StopNotAcknowledgedError)
        } else {
          expect(message).toMatch(/aborted/i)
        }
      }
    } finally {
      await abortAndSettle(controller, running)
    }
  })

  it('rejects a child terminated by an external signal', async () => {
    await expect(
      supervisedSpawn(
        process.execPath,
        ['-e', "process.kill(process.pid, 'SIGTERM')"],
        { cwd: process.cwd(), env: process.env },
      ),
    ).rejects.toThrow(/signal|terminated/i)
  })

  it('checks the process group after a normal parent exit', async () => {
    const terminate = vi.fn(async () => {})
    const spawnWithTreeCheck = createSupervisedSpawn(
      terminate,
      process.platform,
      () => true,
    )

    await expect(
      spawnWithTreeCheck(process.execPath, ['-e', 'process.exit(0)'], {
        cwd: process.cwd(),
        env: process.env,
      }),
    ).resolves.toMatchObject({ code: 0 })

    expect(terminate).toHaveBeenCalledOnce()
    expect(terminate).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        force: false,
        ownedPids: expect.any(Set),
      }),
    )
  })

  it('decodes UTF-8 output across child stream chunk boundaries', async () => {
    const spawnWithTreeCheck = createSupervisedSpawn(
      async () => {},
      process.platform,
      () => true,
    )
    const script = [
      "const bytes = Buffer.from('😀')",
      'process.stdout.write(bytes.subarray(0, 2))',
      'setTimeout(() => process.stdout.write(bytes.subarray(2)), 10)',
    ].join(';')

    await expect(
      spawnWithTreeCheck(process.execPath, ['-e', script], {
        cwd: process.cwd(),
        env: process.env,
      }),
    ).resolves.toMatchObject({ stdout: '😀' })
  })

  // ── UNI-2406: live output forwarding ──────────────────────────────────────

  it('forwards process output to the live sink as it is written', async () => {
    const chunks: Array<[string, string]> = []
    const script =
      'process.stdout.write("first\\n"); process.stderr.write("problem\\n"); process.stdout.write("second\\n")'
    const result = await supervisedSpawn(process.execPath, ['-e', script], {
      cwd: process.cwd(),
      env: process.env,
      onOutput: (channel, chunk) => chunks.push([channel, chunk]),
    })

    expect(result.code).toBe(0)
    const joined = chunks.map(([, chunk]) => chunk).join('')
    expect(joined).toContain('first')
    expect(joined).toContain('second')
    expect(chunks.some(([channel]) => channel === 'stderr')).toBe(true)
    // The live sink must not replace the buffered result the orchestrator
    // still settles the lane's `lastOutput` from.
    expect(result.stdout).toContain('first')
    expect(result.stdout).toContain('second')
  })

  it('survives a live sink that throws, rather than taking the child down with it', async () => {
    const result = await supervisedSpawn(
      process.execPath,
      ['-e', 'process.stdout.write("still ran\\n")'],
      {
        cwd: process.cwd(),
        env: process.env,
        onOutput: () => {
          throw new Error('consumer exploded')
        },
      },
    )
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('still ran')
  })

  it('passes the live sink through the adapter to the spawn', async () => {
    const seen: Array<[string, string]> = []
    const spawn: SpawnFn = vi.fn(async (_command, _args, opts) => {
      opts.onOutput?.('stdout', 'from the child')
      return { code: 0, stdout: 'done', stderr: '' }
    })
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(cliLane('claude-code'), 'mission', {
      onOutput: (channel, chunk) => seen.push([channel, chunk]),
    })
    expect(seen).toEqual([['stdout', 'from the child']])
  })

  // ── UNI-2406: opt-in structured (stream-json) mode ────────────────────────

  const STREAM_JSON_FIXTURE = readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '__fixtures__',
      'claude-stream-json.jsonl',
    ),
    'utf8',
  )

  function structuredLane(): Lane {
    const lane = cliLane('claude-code')
    return { ...lane, backend: { ...lane.backend, kind: 'cli', tool: 'claude-code', account: 'max-1', structuredEvents: true } }
  }

  it('leaves the default prose invocation exactly as it was', async () => {
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: 'prose', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    const result = await adapter.run(cliLane('claude-code'), 'mission')
    // Not `--output-format stream-json`: a lane that did not opt in must be
    // byte-for-byte the behaviour it had before this ticket.
    expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual(['-p'])
    expect(result.output).toBe('prose')
  })

  it('asks for stream-json only when the lane opted in', async () => {
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(structuredLane(), 'mission')
    expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual([
      '-p',
      '--output-format',
      'stream-json',
      '--verbose',
    ])
  })

  it('never enables structured mode for codex, whose stream is a different shape', async () => {
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    const lane = cliLane('codex')
    await adapter.run(
      { ...lane, backend: { ...lane.backend, kind: 'cli', tool: 'codex', account: 'max-1', structuredEvents: true } },
      'mission',
    )
    expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual(['exec', '-'])
  })

  it('turns the real captured stream into tool events and readable text', async () => {
    const toolCalls: Array<{ name: string; status: string }> = []
    const output: string[] = []
    const spawn: SpawnFn = vi.fn(async (_command, _args, opts) => {
      // Split mid-line, as a real child process would.
      const half = Math.floor(STREAM_JSON_FIXTURE.length / 2)
      opts.onOutput?.('stdout', STREAM_JSON_FIXTURE.slice(0, half))
      opts.onOutput?.('stdout', STREAM_JSON_FIXTURE.slice(half))
      return { code: 0, stdout: STREAM_JSON_FIXTURE, stderr: '' }
    })
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    const result = await adapter.run(structuredLane(), 'mission', {
      onOutput: (_channel, chunk) => output.push(chunk),
      onToolCall: (call) => toolCalls.push({ name: call.name, status: call.status }),
    })

    expect(toolCalls).toEqual([
      { name: 'Read', status: 'started' },
      { name: 'Read', status: 'succeeded' },
    ])
    // Readable prose, not a wall of JSON braces.
    expect(output.join('')).toContain('hello world')
    expect(output.join('')).not.toContain('"type":"assistant"')
    expect(result.output).toContain('hello world')
  })

  it('passes stderr through untouched in structured mode', async () => {
    const output: Array<[string, string]> = []
    const spawn: SpawnFn = vi.fn(async (_command, _args, opts) => {
      opts.onOutput?.('stderr', 'a crash message\n')
      return { code: 0, stdout: '', stderr: 'a crash message\n' }
    })
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(structuredLane(), 'mission', {
      onOutput: (channel, chunk) => output.push([channel, chunk]),
    })
    // stderr is never JSONL. Feeding it to the parser would swallow the one
    // message that explains why a run died.
    expect(output).toEqual([['stderr', 'a crash message\n']])
  })

  it('reports a tool the CLI abandoned mid-call as failed', async () => {
    const toolCalls: Array<{ name: string; status: string }> = []
    const started = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-01-01T00:00:00.000Z',
      message: {
        content: [
          { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'sleep 999' } },
        ],
      },
    })
    const spawn: SpawnFn = vi.fn(async (_command, _args, opts) => {
      opts.onOutput?.('stdout', `${started}\n`)
      return { code: 0, stdout: '', stderr: '' }
    })
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(structuredLane(), 'mission', {
      onToolCall: (call) => toolCalls.push({ name: call.name, status: call.status }),
    })
    expect(toolCalls).toEqual([
      { name: 'Bash', status: 'started' },
      { name: 'Bash', status: 'failed' },
    ])
  })

  // ── UNI-2409: the gate is actually attached to the spawn ──────────────────

  const gate = {
    requestId: 'run-1',
    settingsPath: '/tmp/gate/settings.json',
    approvalsPath: '/tmp/gate/approvals.json',
    auditPath: '/tmp/gate/decisions.jsonl',
  }

  it('passes the gate settings to the CLI', async () => {
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(cliLane('claude-code'), 'mission', { gate })
    // Without `--settings` reaching the CLI the hook is never installed, and
    // the lane runs ungated while every unit test still passes.
    expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual([
      '-p',
      '--settings',
      '/tmp/gate/settings.json',
    ])
  })

  it('gives the hook its request identity, adapter and file paths', async () => {
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(cliLane('claude-code'), 'mission', { gate })
    const env = vi.mocked(spawn).mock.calls[0]?.[2].env ?? {}
    // CLI_ENV_ALLOWLIST strips everything it does not know, so these must be
    // added after it or the hook starts with no identity and blocks everything.
    expect(env.NEXUS_LANE_REQUEST_ID).toBe('run-1')
    expect(env.NEXUS_LANE_ADAPTER).toBe('claude-code')
    expect(env.NEXUS_APPROVALS_FILE).toBe('/tmp/gate/approvals.json')
    expect(env.NEXUS_GATE_AUDIT_FILE).toBe('/tmp/gate/decisions.jsonl')
  })

  it('keeps the gate settings alongside structured mode', async () => {
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(structuredLane(), 'mission', { gate })
    expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual([
      '-p',
      '--output-format',
      'stream-json',
      '--verbose',
      '--settings',
      '/tmp/gate/settings.json',
    ])
  })

  it('does not claim to gate a codex lane it cannot gate', async () => {
    // Codex does not read Claude Code settings. Passing `--settings` there
    // would be inert, and a lane that looks gated but is not is worse than one
    // that is honestly ungated.
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(cliLane('codex'), 'mission', { gate })
    expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual(['exec', '-'])
    const env = vi.mocked(spawn).mock.calls[0]?.[2].env ?? {}
    expect(env.NEXUS_LANE_REQUEST_ID).toBeUndefined()
  })

  it('runs ungated only when no gate was supplied at all', async () => {
    const spawn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const adapter = createCliAdapter({ spawn, accountsDir: '/tmp/accounts' })
    await adapter.run(cliLane('claude-code'), 'mission')
    expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual(['-p'])
  })

  it('does not spawn when the run was already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      supervisedSpawn(process.execPath, ['-e', 'process.exit(0)'], {
        cwd: process.cwd(),
        env: process.env,
        signal: controller.signal,
      }),
    ).rejects.toThrow(/aborted before spawn/i)
  })

  it.each(['darwin', 'linux', 'win32'] as const)(
    'rejects %s CLI execution before spawning without kernel containment',
    async (platform) => {
      const terminate = vi.fn(async () => {})
      const unsupportedSpawn = createSupervisedSpawn(terminate, platform)

      await expect(
        unsupportedSpawn('definitely-not-a-real-command', [], {
          cwd: process.cwd(),
          env: process.env,
        }),
      ).rejects.toThrow(new RegExp(`unsupported on ${platform}`, 'i'))
      expect(terminate).not.toHaveBeenCalled()
    },
  )

  it('keeps the production spawn export fail-closed on this host', async () => {
    await expect(
      productionSupervisedSpawn('definitely-not-a-real-command', [], {
        cwd: process.cwd(),
        env: process.env,
      }),
    ).rejects.toThrow(/unsupported.*kernel-backed owner/i)
  })

  it('fails stop acknowledgement when process-tree termination fails', async () => {
    let childPid: number | undefined
    const spawnWithBrokenTree = createSupervisedSpawn(
      async (pid) => {
        childPid = pid
        throw new Error('injected process-tree failure')
      },
      process.platform,
      () => true,
    )
    const controller = new AbortController()
    const running = spawnWithBrokenTree(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      {
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 10_000,
        signal: controller.signal,
      },
    )
    controller.abort()

    try {
      await expect(
        Promise.race([
          running,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('termination rejection hung')), 250),
          ),
        ]),
      ).rejects.toBeInstanceOf(StopNotAcknowledgedError)
    } finally {
      if (childPid) {
        try {
          process.kill(childPid, 'SIGKILL')
        } catch {
          // The supervised spawn may already have reaped it.
        }
      }
      await running.catch(() => {})
    }
  })

  it.skipIf(process.platform === 'win32')(
    'reaps detached descendants before reporting controller failure',
    async () => {
      const tempRoot = mkdtempSync(path.join(tmpdir(), 'lane-tree-fallback-'))
      const pidFile = path.join(tempRoot, 'descendant.pid')
      const readyFile = path.join(tempRoot, 'descendant.ready')
      const descendant = [
        "const { writeFileSync } = require('node:fs')",
        `writeFileSync(${JSON.stringify(readyFile)}, 'ready')`,
        'setInterval(() => {}, 1000)',
      ].join(';')
      const root = [
        "const { spawn } = require('node:child_process')",
        "const { writeFileSync } = require('node:fs')",
        `const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { detached: true, stdio: 'ignore' })`,
        `writeFileSync(${JSON.stringify(pidFile)}, String(child.pid))`,
        'setInterval(() => {}, 1000)',
      ].join(';')
      const spawnWithRejectedController = createSupervisedSpawn(
        async () => {
          throw new Error('injected controller failure')
        },
        process.platform,
        () => true,
      )
      const controller = new AbortController()
      let running: ReturnType<typeof spawnWithRejectedController> | undefined
      let descendantPid: number | undefined

      try {
        running = spawnWithRejectedController(process.execPath, ['-e', root], {
          cwd: process.cwd(),
          env: process.env,
          signal: controller.signal,
        })
        for (
          let attempt = 0;
          attempt < 100 && !existsSync(readyFile);
          attempt += 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
        expect(existsSync(readyFile)).toBe(true)
        descendantPid = Number(readFileSync(pidFile, 'utf8'))

        controller.abort()
        await expect(running).rejects.toBeInstanceOf(StopNotAcknowledgedError)

        let descendantAlive = true
        for (let attempt = 0; attempt < 100 && descendantAlive; attempt += 1) {
          try {
            process.kill(descendantPid, 0)
            await new Promise((resolve) => setTimeout(resolve, 10))
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
              descendantAlive = false
            } else {
              throw error
            }
          }
        }
        expect(descendantAlive).toBe(false)
      } finally {
        controller.abort()
        if (descendantPid) {
          try {
            process.kill(descendantPid, 'SIGKILL')
          } catch {
            // Already reaped by the supervisor.
          }
        }
        await running?.catch(() => {})
        rmSync(tempRoot, { recursive: true, force: true })
      }
    },
  )

  it.skipIf(process.platform === 'win32')(
    'does not acknowledge abort until a TERM-resistant descendant exits',
    async () => {
      const tempRoot = mkdtempSync(path.join(tmpdir(), 'lane-tree-test-'))
      const pidFile = path.join(tempRoot, 'descendant.pid')
      const readyFile = path.join(tempRoot, 'descendant.ready')
      const descendant = [
        "const { writeFileSync } = require('node:fs')",
        "process.on('SIGTERM', () => {})",
        `writeFileSync(${JSON.stringify(readyFile)}, 'ready')`,
        'setInterval(() => {}, 1000)',
      ].join(';')
      const root = [
        "const { spawn } = require('node:child_process')",
        "const { existsSync, writeFileSync } = require('node:fs')",
        `const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { detached: true, stdio: 'ignore' })`,
        `const publishPid = () => existsSync(${JSON.stringify(readyFile)}) ? setTimeout(() => writeFileSync(${JSON.stringify(pidFile)}, String(child.pid)), 50) : setTimeout(publishPid, 1)`,
        'publishPid()',
        'setInterval(() => {}, 1000)',
      ].join(';')
      const controller = new AbortController()
      let running: ReturnType<typeof supervisedSpawn> | undefined
      let descendantPid: number | undefined

      try {
        running = supervisedSpawn(process.execPath, ['-e', root], {
          cwd: process.cwd(),
          env: process.env,
          signal: controller.signal,
        })
        for (
          let attempt = 0;
          attempt < 100 && (!existsSync(readyFile) || !existsSync(pidFile));
          attempt += 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
        expect(existsSync(readyFile)).toBe(true)
        expect(existsSync(pidFile)).toBe(true)
        const observedDescendantPid = Number(readFileSync(pidFile, 'utf8'))
        descendantPid = observedDescendantPid

        controller.abort()
        try {
          await running
          expect.fail('aborted process tree unexpectedly resolved')
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          if (error instanceof StopNotAcknowledgedError) {
            expect(error.message).toMatch(/termination failed/i)
            try {
              process.kill(observedDescendantPid, 'SIGKILL')
            } catch (cleanupError) {
              expect(['EPERM', 'ESRCH']).toContain(
                (cleanupError as NodeJS.ErrnoException).code,
              )
            }
          } else {
            expect((error as Error).message).toMatch(/aborted/i)
            expect(() => process.kill(observedDescendantPid, 0)).toThrow(
              expect.objectContaining({ code: 'ESRCH' }),
            )
          }
        }
      } finally {
        await abortAndSettle(controller, running)
        if (descendantPid) {
          try {
            process.kill(descendantPid, 'SIGKILL')
          } catch (cleanupError) {
            expect(['EPERM', 'ESRCH']).toContain(
              (cleanupError as NodeJS.ErrnoException).code,
            )
          }
        }
        rmSync(tempRoot, { recursive: true, force: true })
      }
    },
    // Process-tree termination intentionally allows 1.5s for TERM and 3s for
    // SIGKILL acknowledgement; keep headroom for repeated ps discovery in CI.
    20_000,
  )
})

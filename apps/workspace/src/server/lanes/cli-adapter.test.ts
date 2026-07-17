import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  CLI_OUTPUT_LIMIT,
  createCliAdapter,
  createSupervisedSpawn,
  redactCliOutput,
  supervisedSpawn,
} from './cli-adapter'
import { StopNotAcknowledgedError, truncateUtf8 } from './adapter'
import type { SpawnFn } from './cli-adapter'
import type { Lane } from './types'

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

  it('spawns `claude -p <mission>` in the worktree with the account config dir', async () => {
    let cap: Captured | null = null
    const spawn: SpawnFn = async (command, args, opts) => {
      cap = { command, args, cwd: opts.cwd, env: opts.env }
      return { code: 0, stdout: 'done', stderr: '' }
    }
    const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })
    const res = await adapter.run(cliLane('claude-code', 'max-2'), 'build it')
    expect(res.output).toBe('done')
    expect(cap!.command).toBe('claude')
    expect(cap!.args).toEqual(['-p', 'build it'])
    expect(cap!.cwd).toBe('/w/lane')
    expect(cap!.env.CLAUDE_CONFIG_DIR).toBe('/accts/max-2')
  })

  it('spawns `codex exec <mission>` with CODEX_HOME for the account', async () => {
    let cap: Captured | null = null
    const spawn: SpawnFn = async (command, args, opts) => {
      cap = { command, args, cwd: opts.cwd, env: opts.env }
      return { code: 0, stdout: 'ok', stderr: '' }
    }
    const adapter = createCliAdapter({ spawn, accountsDir: '/accts' })
    await adapter.run(cliLane('codex', 'openai-pro'), 'x')
    expect(cap!.command).toBe('codex')
    expect(cap!.args).toEqual(['exec', 'x'])
    expect(cap!.env.CODEX_HOME).toBe('/accts/openai-pro')
  })

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
    const spawnWithTreeCheck = createSupervisedSpawn(terminate)

    await expect(
      spawnWithTreeCheck(process.execPath, ['-e', 'process.exit(0)'], {
        cwd: process.cwd(),
        env: process.env,
      }),
    ).resolves.toMatchObject({ code: 0 })

    expect(terminate).toHaveBeenCalledOnce()
    expect(terminate).toHaveBeenCalledWith(expect.any(Number), { force: false })
  })

  it('decodes UTF-8 output across child stream chunk boundaries', async () => {
    const spawnWithTreeCheck = createSupervisedSpawn(async () => {})
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

  it('fails stop acknowledgement when process-tree termination fails', async () => {
    let childPid: number | undefined
    const spawnWithBrokenTree = createSupervisedSpawn(async (pid) => {
      childPid = pid
      throw new Error('tree control unavailable')
    })
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
        "const { writeFileSync } = require('node:fs')",
        `const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { stdio: 'ignore' })`,
        `writeFileSync(${JSON.stringify(pidFile)}, String(child.pid))`,
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
        for (let attempt = 0; attempt < 100 && !existsSync(readyFile); attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
        expect(existsSync(readyFile)).toBe(true)
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
    10_000,
  )
})

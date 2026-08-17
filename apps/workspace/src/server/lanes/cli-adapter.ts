/**
 * CliLaneAdapter — runs a lane mission by spawning a real CLI coding agent in
 * the lane's worktree: Claude Code (with the role-account's config dir) or
 * Codex. The spawn is injected so the adapter is unit-testable without the CLIs.
 *
 * Credentials boundary: this only invokes already-authed CLIs. Each account's
 * login lives in its own config dir (CLAUDE_CONFIG_DIR / CODEX_HOME); the user
 * logs each account in once. The adapter never enters credentials.
 */
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import path from 'node:path'
import {
  LANE_OUTPUT_LIMIT,
  StopNotAcknowledgedError,
  sanitiseLaneOutput,
  truncateUtf8,
} from './adapter'
import {
  createProcessTreeTracker,
  processTreeContainmentSupported,
  terminateProcessTree,
} from './process-tree'
import { autonomyEnv } from './autonomy-settings'
import { createToolCallParser } from './tool-call-parser'
import { isValidCliAccount } from './types'
import type { LaneAdapter, LaneRunOptions, RunResult } from './adapter'
import type { ToolCallParserResult } from './tool-call-parser'
import type { ProcessTreeOptions } from './process-tree'
import type { Lane } from './types'

export const CLI_OUTPUT_LIMIT = LANE_OUTPUT_LIMIT
const RAW_CAPTURE_LIMIT = CLI_OUTPUT_LIMIT + 1
const TERMINATE_GRACE_MS = 1_500
const CLI_ENV_ALLOWLIST = [
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TERM',
  'COLORTERM',
  'NO_COLOR',
  'FORCE_COLOR',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'NODE_EXTRA_CA_CERTS',
] as const

function cliEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of CLI_ENV_ALLOWLIST) {
    if (source[key] !== undefined) env[key] = source[key]
  }
  return env
}

export function redactCliOutput(value: string): string {
  return sanitiseLaneOutput(value)
}

export interface SpawnResult {
  code: number
  stdout: string
  stderr: string
}

export interface SpawnOptions {
  cwd: string
  env: NodeJS.ProcessEnv
  /** Sensitive mission text is delivered over stdin, never process argv. */
  input?: string
  signal?: AbortSignal
  timeoutMs?: number
  /**
   * Live, per-write output sink (UNI-2406). Raw and unredacted — see
   * `LaneRunOptions.onOutput`. Deliberately separate from the buffered
   * `stdout`/`stderr` in `SpawnResult`, so the existing final-output contract
   * is untouched: a caller that ignores this gets exactly what it got before.
   */
  onOutput?: (channel: 'stdout' | 'stderr', chunk: string) => void
}

export type SpawnFn = (
  command: string,
  args: Array<string>,
  opts: SpawnOptions,
) => Promise<SpawnResult>

export type TerminateProcessTreeFn = (
  pid: number,
  options?: ProcessTreeOptions,
) => Promise<void>

export interface CliAdapterDeps {
  spawn?: SpawnFn
  /** Base dir holding per-account CLI config dirs. */
  accountsDir?: string
}

/** Per-account config dir so each plan/account stays isolated and authed. */
function accountConfigDir(accountsDir: string, account: string): string {
  if (!isValidCliAccount(account)) {
    throw new Error('Invalid CLI account identifier')
  }
  return path.join(accountsDir, account)
}

/** Build a supervised spawn with injectable process-tree control for failure drills. */
export function createSupervisedSpawn(
  terminate: TerminateProcessTreeFn = terminateProcessTree,
  platform: NodeJS.Platform = process.platform,
  isContainmentSupported: (
    platform: NodeJS.Platform,
  ) => boolean = processTreeContainmentSupported,
): SpawnFn {
  return function supervisedSpawnImpl(command, args, opts) {
    return new Promise((resolve, reject) => {
      if (!isContainmentSupported(platform)) {
        reject(
          new Error(
            `Safe CLI process containment is unsupported on ${platform} without a kernel-backed owner`,
          ),
        )
        return
      }
      if (opts.signal?.aborted) {
        reject(new Error('CLI run aborted before spawn'))
        return
      }
      let stdout = ''
      let stderr = ''
      let settled = false
      let terminating = false
      let timedOut = false
      let spawnError: Error | null = null
      let closing = false
      let terminationAck: Promise<void> | null = null
      const hasSettled = () => settled
      let child
      try {
        // Keep sensitive mission text out of process inspection by piping it.
        child = spawn(command, args, {
          cwd: opts.cwd,
          env: opts.env,
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: true,
        })
      } catch (err) {
        reject(err)
        return
      }
      const tracker = child.pid ? createProcessTreeTracker(child.pid) : null
      const appendBounded = (current: string, chunk: unknown) =>
        truncateUtf8(`${current}${String(chunk)}`, RAW_CAPTURE_LIMIT, '')
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdin.on('error', (error) => {
        spawnError = error
      })
      if (opts.input) child.stdin.end(opts.input)
      else child.stdin.end()
      // The live sink is notified before the bounded buffer is updated, and is
      // deliberately not subject to RAW_CAPTURE_LIMIT: the buffer exists to cap
      // what the FINAL result carries, whereas the stream has its own budget
      // and would otherwise go silent the moment a long run filled the buffer.
      const forward = (channel: 'stdout' | 'stderr', chunk: unknown) => {
        if (!opts.onOutput) return
        try {
          opts.onOutput(channel, String(chunk))
        } catch {
          // A failing consumer must never take down the supervised child; the
          // stream reports its own errors when the run settles.
        }
      }
      child.stdout.on('data', (d) => {
        forward('stdout', d)
        stdout = appendBounded(stdout, d)
      })
      child.stderr.on('data', (d) => {
        forward('stderr', d)
        stderr = appendBounded(stderr, d)
      })

      const rejectTerminationFailure = (error: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        opts.signal?.removeEventListener('abort', onAbort)
        void tracker?.stop().catch(() => {})
        reject(
          error instanceof StopNotAcknowledgedError
            ? error
            : new StopNotAcknowledgedError(
                `CLI process tree termination failed: ${error instanceof Error ? error.message : 'unknown termination error'}`,
              ),
        )
      }

      const reapAfterControllerFailure = async (
        pid: number,
        controllerError: unknown,
      ): Promise<never> => {
        const controllerDetail =
          controllerError instanceof Error
            ? controllerError.message
            : 'unknown controller error'
        try {
          await terminateProcessTree(pid, {
            force: true,
            graceMs: 0,
            ownedPids: tracker?.ownedPids,
          })
        } catch (fallbackError) {
          try {
            child.kill('SIGKILL')
          } catch {
            // The root may already have exited; tree control remains unacknowledged.
          }
          const fallbackDetail =
            fallbackError instanceof Error
              ? fallbackError.message
              : 'unknown fallback error'
          throw new StopNotAcknowledgedError(
            `CLI process tree termination failed: ${controllerDetail}; fallback reaping failed: ${fallbackDetail}`,
          )
        }
        throw new StopNotAcknowledgedError(
          `CLI process tree termination failed: ${controllerDetail}; fallback reaping completed`,
        )
      }

      const beginTermination = (force = false) => {
        if (settled || !child.pid || (terminating && !force)) return
        terminating = true
        terminationAck = terminate(child.pid, {
          force,
          graceMs: TERMINATE_GRACE_MS,
          ownedPids: tracker?.ownedPids,
        }).catch((error) => reapAfterControllerFailure(child.pid!, error))
        void terminationAck.catch(rejectTerminationFailure)
      }

      const onAbort = () => beginTermination()
      opts.signal?.addEventListener('abort', onAbort, { once: true })

      const timeoutMs = opts.timeoutMs ?? 180_000
      const timer = setTimeout(() => {
        timedOut = true
        beginTermination(true)
      }, timeoutMs)
      child.on('error', (err) => {
        spawnError = err
      })
      child.on('close', (code, signal) => {
        if (settled || closing) return
        closing = true
        void (async () => {
          let terminationError: unknown
          try {
            await tracker?.stop()
          } catch (error) {
            terminationError = error
          }
          if (!terminating && child.pid) {
            terminationAck = terminate(child.pid, {
              force: Boolean(signal || code === null),
              ownedPids: tracker?.ownedPids,
            })
          }
          try {
            await terminationAck
          } catch (error) {
            terminationError ??= error
          }

          if (hasSettled()) return
          settled = true
          clearTimeout(timer)
          opts.signal?.removeEventListener('abort', onAbort)
          if (terminationError) {
            reject(
              terminationError instanceof StopNotAcknowledgedError
                ? terminationError
                : new StopNotAcknowledgedError(
                    `CLI process tree termination failed: ${terminationError instanceof Error ? terminationError.message : 'unknown termination error'}`,
                  ),
            )
            return
          }
          if (timedOut) {
            reject(new Error(`CLI agent timed out after ${timeoutMs}ms`))
            return
          }
          if (terminating) {
            reject(new Error('CLI run aborted'))
            return
          }
          if (signal || code === null) {
            reject(
              new Error(
                `CLI agent terminated by ${signal ? `signal ${signal}` : 'an unknown signal'}`,
              ),
            )
            return
          }
          if (spawnError) {
            reject(spawnError)
            return
          }
          resolve({ code, stdout, stderr })
        })()
      })
    })
  }
}

/** Supervised spawn: run the CLI, collect output, and resolve only on exit. */
export const supervisedSpawn: SpawnFn = createSupervisedSpawn()

export function createCliAdapter(deps: CliAdapterDeps = {}): LaneAdapter {
  const spawnFn = deps.spawn || supervisedSpawn
  const accountsDir =
    deps.accountsDir || path.join(homedir(), '.hermes', 'accounts')

  return {
    async run(
      lane: Lane,
      mission: string,
      options: LaneRunOptions = {},
    ): Promise<RunResult> {
      if (lane.backend.kind !== 'cli') {
        throw new Error('CliLaneAdapter only runs cli lanes')
      }
      const { tool, account } = lane.backend
      const configDir = accountConfigDir(accountsDir, account)

      // Structured mode is claude-code only and opt-in. Codex's JSON stream is
      // a different shape and has no parser here yet; silently enabling a flag
      // it does not share would produce a lane that reports no tools at all
      // while looking like it works.
      const structured =
        tool === 'claude-code' && lane.backend.structuredEvents === true

      // UNI-2409: attach the autonomy gate as a PreToolUse hook. `gate` is
      // resolved by the composition root, which owns the temp settings file
      // and the approvals location; the adapter only passes it through.
      const gate = options.gate

      const command = tool === 'codex' ? 'codex' : 'claude'
      const baseArgs =
        tool === 'codex'
          ? ['exec', '-']
          : structured
            ? ['-p', '--output-format', 'stream-json', '--verbose']
            : ['-p']
      // `--settings` merges ADDITIONAL settings, so the hook narrows what the
      // lane may do without replacing the account's own configuration.
      const args =
        gate && tool === 'claude-code'
          ? [...baseArgs, '--settings', gate.settingsPath]
          : baseArgs

      // Isolate the account's auth via its own config dir, and ensure the
      // common CLI install locations are on PATH.
      const env: NodeJS.ProcessEnv = {
        ...cliEnvironment(process.env),
        PATH: [
          path.join(homedir(), '.local', 'bin'),
          path.join(homedir(), '.claude', 'bin'),
          process.env.PATH || '',
        ]
          .filter(Boolean)
          .join(':'),
        ...(tool === 'codex'
          ? { CODEX_HOME: configDir }
          : {
              CLAUDE_CONFIG_DIR: configDir,
              ...(process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim()
                ? {
                    CLAUDE_CODE_OAUTH_TOKEN:
                      process.env.CLAUDE_CODE_OAUTH_TOKEN.trim(),
                  }
                : {}),
            }),
        // The hook reads its request identity, adapter and approvals location
        // from the environment. CLI_ENV_ALLOWLIST strips everything else, so
        // these must be added after it rather than inherited.
        ...(gate && tool === 'claude-code'
          ? autonomyEnv({
              requestId: gate.requestId,
              adapter: 'claude-code',
              ...(gate.approvalsPath ? { approvalsFile: gate.approvalsPath } : {}),
              ...(gate.auditPath ? { auditFile: gate.auditPath } : {}),
            })
          : {}),
      }

      // In structured mode stdout is JSONL, not prose. Streaming those braces
      // to Mission Control would be worse than the final-only view it replaces,
      // so the parser turns them into text and tool events on the way past.
      const parser = structured ? createToolCallParser() : null
      let structuredText = ''
      const drain = (result: ToolCallParserResult) => {
        for (const call of result.toolCalls) options.onToolCall?.(call)
        for (const line of result.text) {
          structuredText += `${line}\n`
          options.onOutput?.('stdout', `${line}\n`)
        }
        if (result.outcome?.finalText) structuredText = result.outcome.finalText
      }

      const result = await spawnFn(command, args, {
        cwd: lane.worktree,
        env,
        input: mission,
        signal: options.signal,
        onOutput: parser
          ? (channel, chunk) => {
              // stderr is never JSONL — pass it straight through so a crash
              // message is not swallowed by the parser.
              if (channel === 'stderr') options.onOutput?.(channel, chunk)
              else drain(parser.push(chunk))
            }
          : options.onOutput,
      })
      if (parser) {
        drain(parser.flush())
        // A tool that never produced a result means the CLI died mid-call.
        // Reporting it as failed beats leaving a spinner running forever.
        for (const call of parser.unsettled()) options.onToolCall?.(call)
      }
      if (result.code !== 0) {
        const detail = redactCliOutput(
          result.stderr || result.stdout || '',
        ).slice(0, 400)
        throw new Error(`${command} exited ${result.code}: ${detail}`)
      }
      if (parser) return { output: redactCliOutput(structuredText) }
      return { output: redactCliOutput(result.stdout) }
    },
  }
}

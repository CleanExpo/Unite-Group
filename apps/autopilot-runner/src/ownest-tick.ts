import { randomUUID as nodeRandomUUID } from 'node:crypto'
import { createCrmClient, loadOwnestConfig } from './ownest/crm.js'
import { createHermesClient } from './ownest/hermes.js'
import { redactMissionText } from './ownest/policy.js'
import { runOwnestTick } from './ownest/tick.js'
import type {
  OwnestConfig,
  OwnestCrmClient,
  OwnestHermesClient,
  OwnestTickDeps,
  OwnestTickSummary,
} from './ownest/types.js'

const SUMMARY_SCHEMA = 'ownest.tick.summary.v1'
const PUBLIC_ERROR_LIMIT = 800

type TickRunner = (
  config: OwnestConfig,
  deps: OwnestTickDeps,
) => Promise<OwnestTickSummary>

export interface OwnestEntrypointDeps {
  crm?: OwnestCrmClient
  hermes?: OwnestHermesClient
  fetch?: typeof fetch
  runTick?: TickRunner
  now?: () => Date
  randomUUID?: () => string
  writeLine?: (line: string) => void
}

type PublicSummary = {
  schema: typeof SUMMARY_SCHEMA
  outcome: OwnestTickSummary['outcome'] | 'config_error' | 'fatal'
  reconciled?: number
  dispatched?: number
  taskId?: string
  error?: string
}

function defaultWriteLine(line: string): void {
  console.log(line)
}

function publicError(value: unknown, serviceRoleKey: string): string {
  let raw = 'Unknown OWNEST failure'
  try {
    raw = value instanceof Error ? value.message : String(value)
  } catch {
    // Untrusted rejection values cannot suppress the one-line failure receipt.
  }
  const withoutBoundCredential = serviceRoleKey
    ? raw.split(serviceRoleKey).join('[REDACTED]')
    : raw
  const redacted = redactMissionText(withoutBoundCredential).trim()
  return redacted.slice(0, PUBLIC_ERROR_LIMIT) || 'OWNEST tick failed'
}

function toPublicSummary(
  result: OwnestTickSummary,
  serviceRoleKey: string,
): PublicSummary {
  const output: PublicSummary = {
    schema: SUMMARY_SCHEMA,
    outcome: result.outcome,
    reconciled: result.reconciled,
    dispatched: result.dispatched,
  }
  if (result.taskId) output.taskId = result.taskId
  if (result.error) output.error = publicError(result.error, serviceRoleKey)
  return output
}

/** Runs exactly one bounded, reconcile-first OWNEST sweep. */
export async function main(
  env: NodeJS.ProcessEnv = process.env,
  overrides: OwnestEntrypointDeps = {},
): Promise<number> {
  const writeLine = overrides.writeLine ?? defaultWriteLine
  const loaded = loadOwnestConfig(env)
  if (!loaded.ok) {
    writeLine(JSON.stringify({ schema: SUMMARY_SCHEMA, outcome: 'config_error' }))
    return 1
  }

  const { config } = loaded
  try {
    const crm = overrides.crm ?? createCrmClient(config, { fetch: overrides.fetch ?? globalThis.fetch })
    const hermes = overrides.hermes ?? createHermesClient(config)
    const result = await (overrides.runTick ?? runOwnestTick)(config, {
      crm,
      hermes,
      now: overrides.now ?? (() => new Date()),
      randomUUID: overrides.randomUUID ?? nodeRandomUUID,
    })
    writeLine(JSON.stringify(toPublicSummary(result, config.serviceRoleKey)))
    return result.outcome === 'failed' ? 1 : 0
  } catch (error) {
    writeLine(JSON.stringify({
      schema: SUMMARY_SCHEMA,
      outcome: 'fatal',
      error: publicError(error, config.serviceRoleKey),
    }))
    return 1
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => {
    if (code !== 0) process.exitCode = code
  })
}

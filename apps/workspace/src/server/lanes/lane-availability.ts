/**
 * Real lane-backend availability detection (spec R9 fix).
 *
 * Slice 1 reported every backend as available, so the New IDE wizard offered
 * gateway providers and CLI accounts that then failed at lane creation — a
 * silent runtime failure the QA review flagged. This detects reality:
 *   - CLI backends: a *dedicated* login is the tool's credential marker under
 *     ~/.hermes/accounts. On macOS, `claude` stores credentials in the Keychain
 *     rather than CLAUDE_CONFIG_DIR, so per-account dirs stay empty even after
 *     `setup-token`; in that case a valid shared CLAUDE_CODE_OAUTH_TOKEN still
 *     authenticates the lane (one plan shared across accounts). So a CLI account
 *     is available when it has a dedicated login OR a shared token is present.
 *     (True per-account isolation needs the Linux/container host — deferred.)
 *   - Gateway backends: depend on the Hermes gateway being reachable; the route
 *     probes /health once (async) and passes the result into the sync check.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isValidCliAccount } from './types'
import type { AvailabilityCheck } from './backend-registry'
import type { CliBackend, LaneBackend } from './types'

function accountsRoot(): string {
  const home = process.env.HERMES_HOME ?? path.join(os.homedir(), '.hermes')
  return path.join(home, 'accounts')
}

/** True when a shared Claude Max OAuth token is present in the environment. */
export function sharedTokenPresent(): boolean {
  return !!process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim()
}

/** A CLI account has a dedicated login when its tool credential file exists. */
export function cliAccountHasDedicatedCreds(
  account: string,
  tool: CliBackend['tool'] = 'claude-code',
): boolean {
  if (!isValidCliAccount(account)) return false
  try {
    const credentialFile = tool === 'codex' ? 'auth.json' : '.credentials.json'
    return fs.statSync(path.join(accountsRoot(), account, credentialFile)).isFile()
  } catch {
    return false
  }
}

/**
 * A CLI account is available when it has a dedicated login, or when a shared
 * Max token can authenticate it (the macOS reality — one plan, shared).
 */
export function cliAccountAvailable(
  account: string,
  tool: CliBackend['tool'] = 'claude-code',
): boolean {
  return (
    cliAccountHasDedicatedCreds(account, tool) ||
    (tool === 'claude-code' && sharedTokenPresent())
  )
}

/** Why a CLI account is available — for honest UI labelling. */
export function cliAccountSource(
  account: string,
  tool: CliBackend['tool'] = 'claude-code',
): 'dedicated' | 'shared' | null {
  if (cliAccountHasDedicatedCreds(account, tool)) return 'dedicated'
  if (tool === 'claude-code' && sharedTokenPresent()) return 'shared'
  return null
}

/** Probe the gateway /health endpoint; true only when it responds ok. */
export async function probeGateway(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(2500),
    })
    return res.ok
  } catch {
    return false
  }
}

type GatewayBackend = Extract<LaneBackend, { kind: 'gateway' }>
type GatewayFetch = typeof fetch

interface GatewayModel {
  id: string
  provider: string
}

function readModelString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function loadGatewayModels(
  baseUrl: string,
  bearerToken?: string,
  fetcher: GatewayFetch = fetch,
): Promise<Array<GatewayModel>> {
  try {
    const res = await fetcher(`${baseUrl}/v1/models`, {
      headers: bearerToken
        ? { Authorization: `Bearer ${bearerToken}` }
        : {},
      signal: AbortSignal.timeout(2_500),
    })
    if (!res.ok) return []
    const payload = (await res.json()) as { data?: Array<unknown> }
    return (payload.data ?? [])
      .map((entry): GatewayModel | null => {
        if (!entry || typeof entry !== 'object') return null
        const record = entry as Record<string, unknown>
        const id =
          readModelString(record.id) ||
          readModelString(record.model) ||
          readModelString(record.name)
        if (!id) return null
        const provider = (
          readModelString(record.provider) ||
          readModelString(record.owned_by) ||
          (id.includes('/') ? id.split('/')[0] : '')
        ).toLowerCase()
        return { id, provider }
      })
      .filter((entry): entry is GatewayModel => entry !== null)
  } catch {
    return []
  }
}

/** Providers with at least one authenticated model in the live gateway catalogue. */
export async function probeGatewayProviders(
  baseUrl: string,
  bearerToken?: string,
  fetcher: GatewayFetch = fetch,
): Promise<ReadonlySet<string>> {
  const models = await loadGatewayModels(baseUrl, bearerToken, fetcher)
  return new Set(models.map((model) => model.provider).filter(Boolean))
}

/** Fail-closed availability check for the exact provider/model requested by a lane. */
export async function probeGatewayBackend(
  baseUrl: string,
  backend: GatewayBackend,
  bearerToken?: string,
  fetcher: GatewayFetch = fetch,
): Promise<boolean> {
  const models = await loadGatewayModels(baseUrl, bearerToken, fetcher)
  const provider = backend.provider.trim().toLowerCase()
  const providerModels = models.filter((model) => model.provider === provider)
  if (providerModels.length === 0) return false
  const requestedModel = backend.model.trim().toLowerCase()
  if (!requestedModel) return false
  return providerModels.some((model) => {
    const id = model.id.toLowerCase()
    return (
      id === requestedModel ||
      id === `${provider}/${requestedModel}` ||
      id.split('/').at(-1) === requestedModel
    )
  })
}

/**
 * Build a sync AvailabilityCheck from the authenticated provider catalogue.
 * CLI accounts still use dedicated-or-shared credential discovery.
 */
export function makeAvailabilityCheck(
  gatewayProviders: ReadonlySet<string>,
): AvailabilityCheck {
  return (backend: LaneBackend): boolean =>
    backend.kind === 'gateway'
      ? Boolean(backend.model.trim()) &&
        gatewayProviders.has(backend.provider.toLowerCase())
      : cliAccountAvailable(backend.account, backend.tool)
}

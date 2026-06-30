/**
 * Real lane-backend availability detection (spec R9 fix).
 *
 * Slice 1 reported every backend as available, so the New IDE wizard offered
 * gateway providers and CLI accounts that then failed at lane creation — a
 * silent runtime failure the QA review flagged. This detects reality:
 *   - CLI backends: a *dedicated* login is the account dir being non-empty under
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
import type { AvailabilityCheck } from './backend-registry'
import type { LaneBackend } from './types'

function accountsRoot(): string {
  const home = process.env.HERMES_HOME ?? path.join(os.homedir(), '.hermes')
  return path.join(home, 'accounts')
}

/** True when a shared Claude Max OAuth token is present in the environment. */
export function sharedTokenPresent(): boolean {
  return !!process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim()
}

/** A CLI account has a *dedicated* login when its account dir is non-empty. */
export function cliAccountHasDedicatedCreds(account: string): boolean {
  try {
    const dir = path.join(accountsRoot(), account)
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0
  } catch {
    return false
  }
}

/**
 * A CLI account is available when it has a dedicated login, or when a shared
 * Max token can authenticate it (the macOS reality — one plan, shared).
 */
export function cliAccountAvailable(account: string): boolean {
  return cliAccountHasDedicatedCreds(account) || sharedTokenPresent()
}

/** Why a CLI account is available — for honest UI labelling. */
export function cliAccountSource(
  account: string,
): 'dedicated' | 'shared' | null {
  if (cliAccountHasDedicatedCreds(account)) return 'dedicated'
  if (sharedTokenPresent()) return 'shared'
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

/**
 * Build a sync AvailabilityCheck from a pre-probed gateway-up flag. Gateway
 * providers are available iff the gateway is up; CLI accounts iff they have a
 * dedicated login or a shared Max token (see cliAccountAvailable).
 */
export function makeAvailabilityCheck(gatewayUp: boolean): AvailabilityCheck {
  return (backend: LaneBackend): boolean =>
    backend.kind === 'gateway' ? gatewayUp : cliAccountAvailable(backend.account)
}

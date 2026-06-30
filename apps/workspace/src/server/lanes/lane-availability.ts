/**
 * Real lane-backend availability detection (spec R9 fix).
 *
 * Slice 1 reported every backend as available, so the New IDE wizard offered
 * gateway providers and CLI accounts that then failed at lane creation — a
 * silent runtime failure the QA review flagged. This detects reality:
 *   - CLI backends: the Claude Code / Codex account dir must exist and be
 *     non-empty under ~/.hermes/accounts (an absent account = not signed in).
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

/** A CLI account is available when its account dir exists and is non-empty. */
export function cliAccountAvailable(account: string): boolean {
  try {
    const dir = path.join(accountsRoot(), account)
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0
  } catch {
    return false
  }
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
 * providers are available iff the gateway is up; CLI accounts iff their account
 * dir is present.
 */
export function makeAvailabilityCheck(gatewayUp: boolean): AvailabilityCheck {
  return (backend: LaneBackend): boolean =>
    backend.kind === 'gateway' ? gatewayUp : cliAccountAvailable(backend.account)
}

// src/lib/integrations/onepassword.ts
//
// UNI-2310 — read-only 1Password access, gated by a founder grant.
//
// Defence in depth: the operator-gateway still HARD-REFUSES arbitrary `op`
// shell commands (specialized-skill-mesh.ts). This module is the ONLY sanctioned
// read path, and it is doubly constrained:
//   1. It reads through the official @1password/sdk with a service-account token
//      scoped to a single vault — no shelling out, no arbitrary command surface.
//   2. Every read consults hasActiveOpGrant(founderId); with no active grant the
//      read is refused. The founder creates the grant through the CRM
//      (POST /api/integrations/onepassword/grant), which replaces ad-hoc `op`
//      sign-in with an auditable, short-TTL approval.
//
// Server-only. OP_SERVICE_ACCOUNT_TOKEN never reaches the browser bundle.

import { hasActiveOpGrant } from './onepassword-grants'

// The @1password/sdk is WASM-backed (Node runtime only). It is imported lazily
// inside getOpClient() — a static top-level import drags the .wasm into
// build-time page-data collection and ENOENTs. See next.config.mjs
// serverExternalPackages, which keeps it resolvable from node_modules at runtime.
type OpClient = { secrets: { resolve(reference: string): Promise<string> } }

const INTEGRATION_NAME = 'unite-group-nexus'
const INTEGRATION_VERSION = '1.0.0'

export class OpNotConfiguredError extends Error {
  constructor() {
    super('1Password is not configured (OP_SERVICE_ACCOUNT_TOKEN is unset)')
    this.name = 'OpNotConfiguredError'
  }
}

export class OpAccessNotGrantedError extends Error {
  constructor() {
    super('1Password access is not granted — the founder must approve a grant first')
    this.name = 'OpAccessNotGrantedError'
  }
}

/** True when the service-account token is present (feature is wired). */
export function isOpConfigured(): boolean {
  return Boolean(process.env.OP_SERVICE_ACCOUNT_TOKEN?.trim())
}

let cached: Promise<OpClient> | null = null

/** Lazily construct the SDK client. Throws OpNotConfiguredError when unwired. */
function getOpClient(): Promise<OpClient> {
  const token = process.env.OP_SERVICE_ACCOUNT_TOKEN?.trim()
  if (!token) throw new OpNotConfiguredError()
  if (!cached) {
    cached = import('@1password/sdk').then(({ createClient }) =>
      createClient({
        auth: token,
        integrationName: INTEGRATION_NAME,
        integrationVersion: INTEGRATION_VERSION,
      }),
    )
  }
  return cached
}

/**
 * Resolve a single `op://vault/item/field` secret reference — but only when the
 * founder holds an active grant. No grant → OpAccessNotGrantedError (the read is
 * refused, exactly as the operator-gateway would refuse a raw `op` command).
 */
export async function readOpSecret(founderId: string, secretReference: string): Promise<string> {
  if (!isOpConfigured()) throw new OpNotConfiguredError()
  if (!(await hasActiveOpGrant(founderId))) throw new OpAccessNotGrantedError()

  const client = await getOpClient()
  return client.secrets.resolve(secretReference)
}

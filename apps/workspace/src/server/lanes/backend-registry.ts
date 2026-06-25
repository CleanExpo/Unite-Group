/**
 * BackendRegistry — declares the lane backends and resolves a role to a
 * Claude Code account. It references already-authed providers/plans; it never
 * stores credentials. Slice 1 ships the catalog + role→account map + an
 * injectable availability check (real auth wiring lands with the adapters).
 */
import type { LaneBackend } from './types'

/** Gateway (API) providers routed through the Hermes gateway. */
export const GATEWAY_PROVIDERS = [
  'minimax',
  'openrouter',
  'anthropic',
  'openai',
] as const

/** Default role → Claude Code account pinning (configurable). */
export const DEFAULT_ROLE_ACCOUNT_MAP: Record<string, string> = {
  builder: 'max-1',
  reviewer: 'max-2',
  research: 'max-3',
}

export const CODEX_ACCOUNT = 'openai-pro'

export interface BackendDescriptor {
  id: string
  kind: 'gateway' | 'cli'
  label: string
  /** Best-effort: is this backend authed/usable right now. */
  available: boolean
}

/** A function that reports whether a backend is authed. Injectable for tests. */
export type AvailabilityCheck = (backend: LaneBackend) => boolean

/**
 * Resolve the Claude Code account for a role, falling back to a deterministic
 * account name when the role is not in the map.
 */
export function resolveCliAccount(
  role: string,
  map: Record<string, string> = DEFAULT_ROLE_ACCOUNT_MAP,
): string {
  return map[role] || `max-${role}`
}

/** Build a backend descriptor list for the New IDE wizard. */
export function listBackends(
  isAvailable: AvailabilityCheck,
): Array<BackendDescriptor> {
  const gateway: Array<BackendDescriptor> = GATEWAY_PROVIDERS.map(
    (provider) => ({
      id: `gateway:${provider}`,
      kind: 'gateway',
      label: provider,
      available: isAvailable({ kind: 'gateway', provider, model: '' }),
    }),
  )

  const cli: Array<BackendDescriptor> = [
    ...Object.values(DEFAULT_ROLE_ACCOUNT_MAP).map((account) => ({
      id: `cli:claude-code:${account}`,
      kind: 'cli' as const,
      label: `Claude Code (${account})`,
      available: isAvailable({ kind: 'cli', tool: 'claude-code', account }),
    })),
    {
      id: `cli:codex:${CODEX_ACCOUNT}`,
      kind: 'cli' as const,
      label: `Codex (${CODEX_ACCOUNT})`,
      available: isAvailable({
        kind: 'cli',
        tool: 'codex',
        account: CODEX_ACCOUNT,
      }),
    },
  ]

  return [...gateway, ...cli]
}

/**
 * Assert a backend is authed before a lane is created. Throws a clear,
 * user-facing reason when it is not.
 */
export function assertBackendAvailable(
  backend: LaneBackend,
  isAvailable: AvailabilityCheck,
): void {
  if (isAvailable(backend)) return
  const what =
    backend.kind === 'gateway'
      ? `gateway provider "${backend.provider}"`
      : `${backend.tool} account "${backend.account}"`
  throw new Error(
    `Backend ${what} is not configured. Add it via the provider wizard (API key) or sign in to the CLI before generating this IDE.`,
  )
}

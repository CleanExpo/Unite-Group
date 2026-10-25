// src/lib/command-centre/email-accounts.ts
//
// Mission Control "Email-account roster" — surfaces the org's email-relevant
// connection sources with an honest connected / needs-reauth / not-connected
// state. Reads the same substrate the Integrations panel models:
//   - vault  — a credentials_vault row exists for the founder under `service`
//   - env    — required env keys present (transactional email, e.g. SendGrid)
//
// This tile READS status only and links to Settings — it never touches OAuth
// routes (a sibling agent owns the connect UI). NorthStar "no fake-as-real":
// every provider carries a `source` discriminator; absence renders as an honest
// "not connected", never a silent fake. Pure + dependency-injected so the
// derivation is unit-tested without Supabase or env.

export type EmailAccountState = 'connected' | 'needs_reauth' | 'not_connected'
export type EmailAccountSource = 'vault' | 'env' | 'none'

export interface EmailProviderDef {
  id: string
  label: string
  /** 'vault' → per-founder token row; 'env' → env-key presence is the connection. */
  source: 'vault' | 'env'
  vaultService?: string
  envKeys?: string[]
}

/** Config-driven roster of email-relevant providers. */
export const EMAIL_PROVIDERS: EmailProviderDef[] = [
  { id: 'google', label: 'Google (Gmail)', source: 'vault', vaultService: 'google' },
  { id: 'microsoft', label: 'Microsoft 365', source: 'vault', vaultService: 'microsoft' },
  { id: 'imap', label: 'IMAP mailbox', source: 'vault', vaultService: 'imap' },
  { id: 'sendgrid', label: 'SendGrid (transactional)', source: 'env', envKeys: ['SENDGRID_API_KEY'] },
]

/** A credentials_vault row, reduced to the fields we read. */
export interface VaultRow {
  service: string
  updated_at: string | null
  last_accessed_at: string | null
  /** metadata may carry an `expires_at` ISO string; read defensively. */
  metadata?: unknown
}

export interface EmailAccountEntry {
  id: string
  label: string
  state: EmailAccountState
  source: EmailAccountSource
  /** Most recent activity timestamp for a vault-backed provider. */
  lastActivityAt: string | null
  detail: string | null
}

export interface EmailAccountsPayload {
  source: 'cc:email-accounts'
  generatedAt: string
  summary: { connected: number; needsReauth: number; notConnected: number; total: number }
  providers: EmailAccountEntry[]
}

function readExpiresAt(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as Record<string, unknown>).expires_at
  if (typeof raw !== 'string') return null
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? null : ms
}

export interface DeriveEmailAccountsInput {
  now: string
  providers?: EmailProviderDef[]
  vaultRows: VaultRow[]
  /** Which env keys are present (boolean map — never the values). */
  envPresent: Record<string, boolean>
}

/** Pure derivation of the email-account roster from vault rows + env presence. */
export function deriveEmailAccounts(input: DeriveEmailAccountsInput): EmailAccountsPayload {
  const providers = input.providers ?? EMAIL_PROVIDERS
  const nowMs = Date.parse(input.now)

  const entries: EmailAccountEntry[] = providers.map((p) => {
    if (p.source === 'vault') {
      const rows = input.vaultRows.filter((r) => r.service === p.vaultService)
      if (rows.length === 0) {
        return { id: p.id, label: p.label, state: 'not_connected', source: 'none', lastActivityAt: null, detail: 'no stored credential' }
      }
      // needs_reauth only when a real expiry signal says the token has lapsed.
      const expired = rows.some((r) => {
        const exp = readExpiresAt(r.metadata)
        return exp !== null && !Number.isNaN(nowMs) && exp < nowMs
      })
      const lastActivityAt =
        rows
          .map((r) => r.last_accessed_at ?? r.updated_at)
          .filter((v): v is string => !!v)
          .sort()
          .at(-1) ?? null
      return {
        id: p.id,
        label: p.label,
        state: expired ? 'needs_reauth' : 'connected',
        source: 'vault',
        lastActivityAt,
        detail: expired ? 'stored token expired — reconnect in Settings' : null,
      }
    }

    // env source: env-key presence IS the connection (no per-founder token).
    const configured = (p.envKeys ?? []).length > 0 && (p.envKeys ?? []).every((k) => input.envPresent[k] === true)
    return {
      id: p.id,
      label: p.label,
      state: configured ? 'connected' : 'not_connected',
      source: configured ? 'env' : 'none',
      lastActivityAt: null,
      detail: configured ? null : 'env key not set',
    }
  })

  return {
    source: 'cc:email-accounts',
    generatedAt: input.now,
    summary: {
      connected: entries.filter((e) => e.state === 'connected').length,
      needsReauth: entries.filter((e) => e.state === 'needs_reauth').length,
      notConnected: entries.filter((e) => e.state === 'not_connected').length,
      total: entries.length,
    },
    providers: entries,
  }
}

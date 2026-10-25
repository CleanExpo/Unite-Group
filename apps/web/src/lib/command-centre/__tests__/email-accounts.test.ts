import { describe, it, expect } from 'vitest'
import { deriveEmailAccounts, type VaultRow } from '../email-accounts'

const NOW = '2026-07-05T00:00:00.000Z'

function vault(over: Partial<VaultRow> = {}): VaultRow {
  return { service: 'google', updated_at: '2026-07-04T00:00:00.000Z', last_accessed_at: null, metadata: {}, ...over }
}

const NO_ENV = { SENDGRID_API_KEY: false }

describe('deriveEmailAccounts', () => {
  it('marks a vault-backed provider connected when a row exists', () => {
    const p = deriveEmailAccounts({ now: NOW, vaultRows: [vault({ service: 'google' })], envPresent: NO_ENV })
    const google = p.providers.find((x) => x.id === 'google')!
    expect(google.state).toBe('connected')
    expect(google.source).toBe('vault')
    expect(google.lastActivityAt).toBe('2026-07-04T00:00:00.000Z')
  })

  it('marks a vault provider not_connected (honest) when no row exists', () => {
    const p = deriveEmailAccounts({ now: NOW, vaultRows: [], envPresent: NO_ENV })
    const google = p.providers.find((x) => x.id === 'google')!
    expect(google.state).toBe('not_connected')
    expect(google.source).toBe('none')
  })

  it('emits needs_reauth only on a real expired metadata.expires_at signal', () => {
    const expired = vault({ service: 'microsoft', metadata: { expires_at: '2026-07-01T00:00:00.000Z' } })
    const p = deriveEmailAccounts({ now: NOW, vaultRows: [expired], envPresent: NO_ENV })
    expect(p.providers.find((x) => x.id === 'microsoft')!.state).toBe('needs_reauth')
  })

  it('does not fabricate needs_reauth when metadata carries no expiry', () => {
    const p = deriveEmailAccounts({ now: NOW, vaultRows: [vault({ service: 'imap', metadata: {} })], envPresent: NO_ENV })
    expect(p.providers.find((x) => x.id === 'imap')!.state).toBe('connected')
  })

  it('treats SendGrid as connected only when its env key is present', () => {
    const off = deriveEmailAccounts({ now: NOW, vaultRows: [], envPresent: { SENDGRID_API_KEY: false } })
    expect(off.providers.find((x) => x.id === 'sendgrid')!.state).toBe('not_connected')
    const on = deriveEmailAccounts({ now: NOW, vaultRows: [], envPresent: { SENDGRID_API_KEY: true } })
    const sg = on.providers.find((x) => x.id === 'sendgrid')!
    expect(sg.state).toBe('connected')
    expect(sg.source).toBe('env')
  })

  it('summarises counts across the roster', () => {
    const p = deriveEmailAccounts({
      now: NOW,
      vaultRows: [vault({ service: 'google' })],
      envPresent: { SENDGRID_API_KEY: true },
    })
    expect(p.summary.connected).toBe(2) // google + sendgrid
    expect(p.summary.notConnected).toBe(2) // microsoft + imap
    expect(p.summary.total).toBe(4)
  })
})

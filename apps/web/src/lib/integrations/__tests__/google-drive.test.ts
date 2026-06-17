import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  vaultRows: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/cache', () => ({
  getCached: () => null,
  setCache: () => {},
  invalidateCache: () => {},
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const b: Record<string, unknown> = {}
    b.from = () => b
    b.select = () => b
    b.eq = () => b
    b.limit = () => b
    b.then = (resolve: (v: { data: unknown }) => unknown) => resolve({ data: h.vaultRows })
    return b
  },
}))

vi.mock('@/lib/vault', () => ({
  decrypt: () => JSON.stringify({ access_token: 'a', refresh_token: 'r', expiry: 0 }),
}))

vi.mock('@/lib/integrations/google', () => ({
  getValidToken: vi.fn(async () => 'access-token'),
}))

import { getVaultFiles, getVaultFileContent } from '../google-drive'

const ROW = { encrypted_value: 'e', iv: 'i', salt: 's' }
const ORIG = { ...process.env }

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'valid-client.apps.googleusercontent.com'
  process.env.GOOGLE_CLIENT_SECRET = 'secret'
  process.env.GOOGLE_DRIVE_VAULT_FOLDER_ID = 'folder-123'
  h.vaultRows = [{ ...ROW }]
})

afterEach(() => {
  process.env.GOOGLE_CLIENT_ID = ORIG.GOOGLE_CLIENT_ID
  process.env.GOOGLE_CLIENT_SECRET = ORIG.GOOGLE_CLIENT_SECRET
  process.env.GOOGLE_DRIVE_VAULT_FOLDER_ID = ORIG.GOOGLE_DRIVE_VAULT_FOLDER_ID
})

describe('getVaultFiles — no silent empty on failure', () => {
  it('returns [] when Drive is not configured (honest not-connected)', async () => {
    delete process.env.GOOGLE_DRIVE_VAULT_FOLDER_ID
    expect(await getVaultFiles('founder-1')).toEqual([])
  })

  it('returns [] when no Google credentials are stored', async () => {
    h.vaultRows = []
    expect(await getVaultFiles('founder-1')).toEqual([])
  })

  it('throws (does NOT swallow into []) when the Drive list API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => '' } as Response)
    await expect(getVaultFiles('founder-1')).rejects.toThrow(/Drive list responded 502/)
  })

  it('returns the real file list on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: [{ id: 'f1', name: 'Note.md', mimeType: 'text/markdown', modifiedTime: '2026-06-17T00:00:00Z', webViewLink: 'x' }] }),
    } as Response)
    const files = await getVaultFiles('founder-1')
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('Note.md')
  })
})

describe('getVaultFileContent — no silent empty on failure', () => {
  it('returns "" when Drive is not configured', async () => {
    delete process.env.GOOGLE_DRIVE_VAULT_FOLDER_ID
    expect(await getVaultFileContent('founder-1', 'f1')).toBe('')
  })

  it('throws (does NOT swallow into "") when the Drive fetch API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' } as Response)
    await expect(getVaultFileContent('founder-1', 'f1')).rejects.toThrow(/Drive fetch responded 404/)
  })

  it('returns the real content on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '# Hello' } as Response)
    expect(await getVaultFileContent('founder-1', 'f1')).toBe('# Hello')
  })
})

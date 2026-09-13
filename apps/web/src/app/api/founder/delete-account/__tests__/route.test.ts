import { describe, it, expect, vi, beforeEach } from 'vitest'

const cleanupCalls: Array<[string, string, string]> = []
const founderTables = [
  'contacts', 'credentials_vault', 'approval_queue', 'social_channels',
  'brand_identities', 'generated_content', 'video_assets', 'social_engagements',
  'email_campaigns', 'platform_analytics', 'advisory_cases',
  'bookkeeper_transactions', 'email_triage_results',
]
const cleanupTables = [...founderTables, 'nexus_pages', 'nexus_rows']
const mockDeleteUser = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn()
const mockCleanup = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { DELETE } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/founder/delete-account', {
    method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('DELETE /api/founder/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupCalls.length = 0
    mockCleanup.mockResolvedValue({ data: null, error: null, count: 0 })
    mockFrom.mockImplementation((table: string) => ({
      delete: () => ({ eq: (column: string, value: string) => {
        cleanupCalls.push([table, column, value])
        return mockCleanup(table)
      } }),
    }))
    mockDeleteUser.mockResolvedValue({ error: null })
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
      auth: { admin: { deleteUser: mockDeleteUser } },
    } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await DELETE(req({ confirm: 'DELETE MY ACCOUNT' }))
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('returns 400 when confirm string wrong', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await DELETE(req({ confirm: 'wrong' }))
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('returns 200 and deleted: true on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await DELETE(req({ confirm: 'DELETE MY ACCOUNT' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
    expect(cleanupCalls).toEqual(cleanupTables.map(table => [
      table, founderTables.includes(table) ? 'founder_id' : 'owner_id', 'user-1',
    ]))
    expect(mockDeleteUser).toHaveBeenCalledExactlyOnceWith('user-1')
    expect(mockCleanup.mock.invocationCallOrder.at(-1)).toBeLessThan(mockDeleteUser.mock.invocationCallOrder[0])
  })

  it.each(['contacts', 'email_triage_results', 'nexus_pages', 'nexus_rows'])(
    'stops cleanup at %s failure without deleting auth or exposing private diagnostics', async failedTable => {
      vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
      const privateError = { message: 'private-message', details: 'private-details', hint: 'private-hint', code: 'private-code' }
      mockCleanup.mockImplementation(async (table: string) => ({
        data: null, error: table === failedTable ? privateError : null,
      }))
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const res = await DELETE(req({ confirm: 'DELETE MY ACCOUNT' }))
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body).toEqual({ error: 'Account deletion failed' })
        for (const marker of Object.values(privateError)) expect(JSON.stringify(body)).not.toContain(marker)
        expect(cleanupCalls.map(([table]) => table)).toEqual(cleanupTables.slice(0, cleanupTables.indexOf(failedTable) + 1))
        expect(mockDeleteUser).not.toHaveBeenCalled()
        expect(logged).not.toHaveBeenCalled()
      } finally {
        logged.mockRestore()
      }
    },
  )

  it('returns 500 when auth user deletion fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockDeleteUser.mockResolvedValue({ error: { message: 'Cannot delete' } })
    const res = await DELETE(req({ confirm: 'DELETE MY ACCOUNT' }))
    expect(res.status).toBe(500)
  })
})

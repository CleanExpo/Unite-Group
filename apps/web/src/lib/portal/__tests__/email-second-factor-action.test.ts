import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const createClient = vi.fn()
const createServiceClient = vi.fn()
const jar = new Map<string, string>()

vi.mock('@/lib/supabase/server', () => ({
  getUser: () => getUser(),
  createClient: () => createClient(),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => createServiceClient(),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => { jar.set(name, value) },
  }),
}))

import { sendPortalEmailCodeAction, verifyPortalEmailCodeAction } from '../email-second-factor-action'

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

beforeEach(() => {
  vi.clearAllMocks()
  jar.clear()
  process.env.VAULT_ENCRYPTION_KEY = 'test-vault-encryption-key-0123456789'
  getUser.mockResolvedValue({ id: 'user-1', email: 'Owner@Example.test' })
})

describe('portal email code actions', () => {
  it('emails the session address only, and will not create an account', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }))
    createClient.mockResolvedValue({ auth: { signInWithOtp } })
    expect(await sendPortalEmailCodeAction()).toEqual({ ok: true })
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.test',
      options: { shouldCreateUser: false },
    })
  })

  it('does not ask Supabase for another code inside the resend window', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }))
    createClient.mockResolvedValue({ auth: { signInWithOtp } })
    expect(await sendPortalEmailCodeAction()).toEqual({ ok: true })
    const second = await sendPortalEmailCodeAction()
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.outcome).toBe('rate_limited')
    expect(signInWithOtp).toHaveBeenCalledTimes(1)
  })

  it('refuses to report success when the assurance read stays below aal2', async () => {
    const meta: { current: Record<string, unknown> } = { current: { portal_tenant_slug: 'iaq' } }
    const updateUserById = vi.fn(async (_id: string, args: { app_metadata: Record<string, unknown> }) => {
      meta.current = args.app_metadata
      return { data: { user: { id: 'user-1' } }, error: null }
    })
    createServiceClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: async () => ({ data: { user: { id: 'user-1', app_metadata: meta.current } }, error: null }),
          updateUserById,
        },
      },
    })
    const enroll = vi.fn(async () => ({ data: { id: 'new-factor', type: 'totp', totp: { secret: SECRET } }, error: null }))
    const unenroll = vi.fn(async () => ({ error: null }))
    createClient.mockResolvedValue({
      auth: {
        verifyOtp: async () => ({ error: null }),
        mfa: {
          getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1' }, error: null }),
          listFactors: async () => ({ data: { all: [], totp: [] }, error: null }),
          enroll,
          unenroll,
          challenge: async () => ({ data: { id: 'ch' }, error: null }),
          verify: async () => ({ error: null }),
        },
      },
    })
    const result = await verifyPortalEmailCodeAction('123456')
    expect(result).toEqual({ ok: false, outcome: 'error' })
    expect(enroll).toHaveBeenCalledTimes(1)
    expect(updateUserById).toHaveBeenCalled()
    const saved = updateUserById.mock.calls[0]?.[1].app_metadata as { portal_tenant_slug?: string }
    expect(saved.portal_tenant_slug).toBe('iaq')
  })

  it('does not enrol or remove an authenticator the owner already has', async () => {
    createServiceClient.mockReturnValue({
      auth: { admin: { getUserById: async () => ({ data: { user: { id: 'user-1', app_metadata: {} } }, error: null }) } },
    })
    const enroll = vi.fn()
    const unenroll = vi.fn()
    createClient.mockResolvedValue({
      auth: {
        verifyOtp: async () => ({ error: null }),
        mfa: {
          getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1' }, error: null }),
          listFactors: async () => ({
            data: {
              all: [{ id: 'app', factor_type: 'totp', status: 'verified', friendly_name: 'Business portal' }],
              totp: [{ id: 'app', factor_type: 'totp', status: 'verified', friendly_name: 'Business portal' }],
            },
            error: null,
          }),
          enroll,
          unenroll,
          challenge: vi.fn(),
          verify: vi.fn(),
        },
      },
    })
    expect(await verifyPortalEmailCodeAction('123456')).toEqual({ ok: false, outcome: 'needs_authenticator' })
    expect(enroll).not.toHaveBeenCalled()
    expect(unenroll).not.toHaveBeenCalled()
  })
})

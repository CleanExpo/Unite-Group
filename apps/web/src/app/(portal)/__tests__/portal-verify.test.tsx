import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
const aal = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(async () => ({ auth: { mfa: { getAuthenticatorAssuranceLevel: aal } } })),
}))

import { getUser } from '@/lib/supabase/server'
import { safePortalReturn } from '@/lib/portal/paths'
import { VERIFY_STEP_TITLE } from '@/components/portal/portal-copy'
import { renderedFindings } from '@/__tests__/portal-forbidden-words'

import PortalVerifyPage, { metadata } from '../portal/verify/page'

const page = (redirectTo?: string) => PortalVerifyPage({ searchParams: Promise.resolve(redirectTo === undefined ? {} : { redirectTo }) })
function given(user: { id: string; email?: string | null } | null, level: 'aal1' | 'aal2' | null) {
  vi.mocked(getUser).mockResolvedValue(user as Awaited<ReturnType<typeof getUser>>)
  aal.mockResolvedValue({ data: { currentLevel: level }, error: null })
}

beforeEach(() => vi.clearAllMocks())

describe('/portal/verify (the second step for an owner signed in with the emailed link)', () => {
  it('sends a signed-out visitor to sign in, returning to the page they wanted', async () => {
    given(null, null)
    await expect(page('/portal/changes')).rejects.toThrow('REDIRECT:/auth/login?redirectTo=%2Fportal%2Fchanges')
  })

  it('sends an owner who has already confirmed (aal2) straight on, without the step', async () => {
    given({ id: 'u1', email: 'sam@example.test' }, 'aal2')
    await expect(page('/portal/setup')).rejects.toThrow('REDIRECT:/portal/setup')
  })

  it('shows the authenticator step to an owner on the emailed link only (aal1)', async () => {
    given({ id: 'u1', email: 'sam@example.test' }, 'aal1')
    const html = renderToStaticMarkup(<>{await page('/portal')}</>)
    expect(html).toContain('Confirm it is you.')
    expect(html).toContain(VERIFY_STEP_TITLE)
    expect(html).toContain('sam@example.test')
    expect(html).not.toContain('claim your portal')
    expect(renderedFindings(html)).toEqual([])
  })

  it('treats an unknown assurance level as not confirmed (fails closed)', async () => {
    given({ id: 'u1', email: null }, null)
    const html = renderToStaticMarkup(<>{await page()}</>)
    expect(html).toContain(VERIFY_STEP_TITLE)
  })

  it.each([
    ['https://evil.example/portal', '/portal'],
    ['//evil.example/portal', '/portal'],
    ['/\\evil.example', '/portal'],
    ['/portal/../founder/command-centre', '/portal'],
    ['/founder', '/portal'],
    ['/portalx', '/portal'],
    ['/portal/verify', '/portal'],
    ['/portal/verify?redirectTo=%2Fportal', '/portal'],
  ])('never sends an owner anywhere but a portal page: %s -> %s', async (raw, expected) => {
    expect(safePortalReturn(raw)).toBe(expected)
    given({ id: 'u1', email: null }, 'aal2')
    await expect(page(raw)).rejects.toThrow(`REDIRECT:${expected}`)
  })

  it('keeps a real portal page and its query', () => {
    expect(safePortalReturn('/portal/changes?id=1')).toBe('/portal/changes?id=1')
    expect(safePortalReturn(undefined)).toBe('/portal')
  })

  it('keeps the page out of search results', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

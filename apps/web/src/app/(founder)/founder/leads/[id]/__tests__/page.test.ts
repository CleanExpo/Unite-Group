import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import EnquiryPage from '../page'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`) },
  notFound: () => { throw new Error('not-found') },
}))
const ID = '00000000-0000-4000-8000-000000000001'
const page = (id = ID) => EnquiryPage({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('FOUNDER_USER_ID', 'founder-id')
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'founder-id' } }, error: null })
  const query = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle }
  mocks.from.mockReturnValue(query)
  mocks.select.mockReturnValue(query)
  mocks.eq.mockReturnValue(query)
  mocks.maybeSingle.mockResolvedValue({ data: { id: ID, first_name: 'Alex', last_name: 'Example',
    company: '<script>business</script>', email: 'lead@example.invalid', phone: '0400000000',
    message: '<script>private message</script>', interests: 'living-card', captured_at: '2026-10-24T12:00:00.000Z' }, error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe('authenticated enquiry view', () => {
  it('redirects unauthenticated readers before querying', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(page()).rejects.toThrow('redirect:/auth/login')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('rejects other users and invalid ids before querying', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'other-user' } }, error: null })
    await expect(page()).rejects.toThrow('not-found')
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'founder-id' } }, error: null })
    await expect(page('invalid')).rejects.toThrow('not-found')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('uses the authenticated founder scope and escapes private details', async () => {
    const html = renderToStaticMarkup(await page())
    expect(mocks.from).toHaveBeenCalledWith('crm_leads')
    expect(mocks.eq).toHaveBeenCalledWith('founder_id', 'founder-id')
    expect(mocks.eq).toHaveBeenCalledWith('id', ID)
    expect(html).toContain('lead@example.invalid')
    expect(html).toContain('0400000000')
    expect(html).toContain('Alex Example')
    expect(html).toContain('&lt;script&gt;private message&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('distinguishes missing records from failed reads without exposing provider errors', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(page()).rejects.toThrow('not-found')
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'SENTINEL-PRIVATE' } })
    await expect(page()).rejects.toThrow('Could not load enquiry')
  })
})

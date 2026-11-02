import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/portal/owner', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/portal/owner')>()
  return { ...real, getPortalOwner: vi.fn() }
})

import { redirect } from 'next/navigation'
import { getPortalOwner, type PortalAccess } from '@/lib/portal/owner'
import { NO_PASSWORD_LINE, PORTAL_STEPS } from '@/components/portal/portal-copy'

import PortalLayout, { metadata } from '../layout'
import PortalPage from '../portal/page'

const access = (a: PortalAccess) => vi.mocked(getPortalOwner).mockResolvedValue(a)
const render = async (node: Promise<React.ReactNode>) => renderToStaticMarkup(<>{await node}</>)
const CHILD = <p>PORTAL-CHILD</p>

beforeEach(() => vi.clearAllMocks())

describe('portal owner guard', () => {
  it('sends a signed-out visitor to sign in with a return to /portal', async () => {
    access({ status: 'anonymous' })
    await expect(PortalLayout({ children: CHILD })).rejects.toThrow('REDIRECT:/auth/login?redirectTo=%2Fportal')
    expect(redirect).toHaveBeenCalledWith('/auth/login?redirectTo=%2Fportal')
  })

  it('shows a signed-in non-owner the friendly no-portal page, not the portal', async () => {
    access({ status: 'not_owner', email: 'visitor@example.test' })
    const html = await render(PortalLayout({ children: CHILD }))
    expect(html).toContain('No portal here yet.')
    expect(html).toContain('visitor@example.test')
    expect(html).not.toContain('PORTAL-CHILD')
    expect(html).not.toMatch(/href="\/founder/)
  })

  it('shows a failed ownership check as try-again, never as no-portal', async () => {
    access({ status: 'error', email: 'sam@example.test' })
    const html = await render(PortalLayout({ children: CHILD }))
    expect(html).toContain('We could not open your portal.')
    expect(html).not.toContain('No portal here yet.')
    expect(html).not.toContain('PORTAL-CHILD')
  })

  it('lets an owner through to the welcome page', async () => {
    const owner: PortalAccess = { status: 'owner', userId: 'u1', email: 'sam@example.test', name: 'Sam', cardSlugs: ['sam-plumbing'] }
    access(owner)
    expect(await render(PortalLayout({ children: CHILD }))).toContain('PORTAL-CHILD')
    const page = await render(PortalPage())
    expect(page).toContain('Welcome, Sam.')
    expect(page).toContain('href="/c/sam-plumbing"')
    expect(page.match(/<h1/g)).toHaveLength(1)
    expect(page).not.toMatch(/href="\/founder/)
  })

  it('shows all five checklist steps and the no-password line on the welcome page', async () => {
    access({ status: 'owner', userId: 'u1', email: null, name: null, cardSlugs: ['sam-plumbing'] })
    const page = await render(PortalPage())
    expect(page).toContain('Welcome to your portal.')
    for (const step of PORTAL_STEPS) expect(page).toContain(step.title)
    expect(PORTAL_STEPS.map((s) => s.id)).toEqual(['intake', 'connect', 'audit', 'profile', 'reviews'])
    expect(page).toContain(NO_PASSWORD_LINE.replace(/'/g, '&#x27;'))
    expect(NO_PASSWORD_LINE).toBe("You never give us your password. You click Allow on Google's or Microsoft's own screen.")
  })

  it('renders nothing from the page itself for a non-owner (the layout owns that state)', async () => {
    access({ status: 'not_owner', email: null })
    expect(await PortalPage()).toBeNull()
  })

  it('keeps the portal out of search results', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

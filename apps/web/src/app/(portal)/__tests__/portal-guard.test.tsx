import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({ captureClientError: vi.fn() }))
vi.mock('@/lib/portal/owner', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/portal/owner')>()
  return { ...real, getPortalOwner: vi.fn() }
})

import { redirect } from 'next/navigation'
import { getPortalOwner, type PortalAccess } from '@/lib/portal/owner'
import { NO_PASSWORD_LINE, PORTAL_STEPS } from '@/components/portal/portal-copy'

import PortalLayout, { metadata } from '../layout'
import PortalPage from '../portal/page'
import PortalLoading from '../portal/loading'
import PortalError from '../portal/error'
import { NoPortalYet, PortalUnavailable } from '@/components/portal/portal-notice'
import { renderedFindings } from '@/__tests__/portal-forbidden-words'

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

// The source scan (src/__tests__/portal-no-password.test.ts) reads the files; this reads what React actually renders,
// so a prompt assembled at run time (joined, replaced, computed) is caught too. Every state a visitor can reach.
describe('no rendered portal page asks for a password', () => {
  const OWNER: PortalAccess = { status: 'owner', userId: 'u1', email: 'sam@example.test', name: 'Sam', cardSlugs: ['sam-plumbing', 'sam-gas'] }
  const BARE_OWNER: PortalAccess = { status: 'owner', userId: 'u2', email: null, name: null, cardSlugs: ['x'] }
  const ACCESS: [string, PortalAccess][] = [
    ['non-owner', { status: 'not_owner', email: 'v@example.test' }],
    ['non-owner, no email', { status: 'not_owner', email: null }],
    ['error', { status: 'error', email: 'v@example.test' }],
    ['owner', OWNER],
    ['owner, no name', BARE_OWNER],
  ]

  async function everyState(): Promise<[string, string][]> {
    const out: [string, string][] = []
    for (const [name, a] of ACCESS) {
      access(a)
      out.push([`layout: ${name}`, await render(PortalLayout({ children: CHILD }))])
      if (a.status === 'owner') out.push([`page: ${name}`, await render(PortalPage())])
    }
    out.push(['loading', renderToStaticMarkup(<PortalLoading />)])
    out.push(['error boundary', renderToStaticMarkup(<PortalError error={new Error('x')} reset={() => {}} />)])
    out.push(['no portal yet', renderToStaticMarkup(<NoPortalYet email={null} />)])
    out.push(['unavailable', renderToStaticMarkup(<PortalUnavailable email={null} />)])
    return out
  }

  it('finds nothing in any state, and really rendered the welcome page with its promise line (positive control)', async () => {
    const states = await everyState()
    expect(states.length).toBe(11)
    expect(states.some(([, html]) => html.includes(NO_PASSWORD_LINE.replace(/'/g, '&#x27;')))).toBe(true)
    expect(states.map(([name, html]) => [name, renderedFindings(html)]).filter(([, f]) => f.length > 0)).toEqual([])
  })

  it.each([
    ['a password field', '<input type="password"/>'],
    ['a prompt built at run time', `<p>Enter your ${'passXord'.replace('X', 'w')}</p>`],
    ['an invisible split', `<p>pass${String.fromCodePoint(0xad)}word</p>`],
    ['a split across markup', '<p>pass<b></b>word</p>'],
    ['the promise line made longer', `<p>${NO_PASSWORD_LINE} Now type your password.</p>`],
    ['login details', '<label>Your login details</label>'],
  ])('fires on %s', (_name, html) => {
    expect(renderedFindings(html).length).toBeGreaterThan(0)
  })
})

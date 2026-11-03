import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({ captureClientError: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/portal/changes/owner-stub', () => ({ getPortalOwner: vi.fn() }))

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { getPortalOwner } from '@/lib/portal/changes/owner-stub'
import type { PortalOwner } from '@/lib/portal/changes/types'
import { NO_PASSWORD_LINE, PORTAL_STEPS } from '@/components/portal/portal-copy'
import { NO_PASSWORD_LINE as SETUP_NO_PASSWORD_LINE } from '@/lib/portal/setup/items'

import PortalPage, { metadata } from '../portal/page'
import PortalLoading from '../portal/loading'
import PortalError from '../portal/error'
import { ConfirmItIsYou, NoPortalYet } from '@/components/portal/portal-notice'
import { renderedFindings } from '@/__tests__/portal-forbidden-words'

type State = { user: { id: string; email?: string | null } | null; owner: PortalOwner | null }

const OWNER: PortalOwner = { userId: 'u1', ownerId: 'u1', tenantSlug: 'sample-plumbing', plan: 'comp', aal: 'aal2' }
const LINK_ONLY: PortalOwner = { ...OWNER, aal: 'aal1' }

function given({ user, owner }: State) {
  vi.mocked(getUser).mockResolvedValue(user as Awaited<ReturnType<typeof getUser>>)
  vi.mocked(getPortalOwner).mockResolvedValue(owner)
}
const render = async () => renderToStaticMarkup(<>{await PortalPage()}</>)
const promise = NO_PASSWORD_LINE.replace(/'/g, '&#x27;')

beforeEach(() => vi.clearAllMocks())

describe('portal owner guard (/portal guards itself)', () => {
  it('sends a signed-out visitor to sign in with a return to /portal', async () => {
    given({ user: null, owner: null })
    await expect(PortalPage()).rejects.toThrow('REDIRECT:/auth/login?redirectTo=%2Fportal')
    expect(redirect).toHaveBeenCalledWith('/auth/login?redirectTo=%2Fportal')
  })

  it('shows a signed-in visitor with no portal the friendly no-portal page, pointing at the invite page', async () => {
    given({ user: { id: 'v1', email: 'visitor@example.test' }, owner: null })
    const html = await render()
    expect(html).toContain('No portal here yet.')
    expect(html).toContain('visitor@example.test')
    expect(html).toContain('href="/portal/join"')
    expect(html).not.toContain('Your checklist')
    expect(html).not.toMatch(/href="\/founder/)
  })

  it('asks an owner on the emailed link only (aal1) for the second step, never the welcome page', async () => {
    given({ user: { id: 'u1', email: 'sam@example.test' }, owner: LINK_ONLY })
    const html = await render()
    expect(html).toContain('Confirm it is you.')
    expect(html).toContain('href="/portal/verify?redirectTo=%2Fportal"')
    expect(html).not.toContain('Your checklist')
  })

  it('lets a confirmed (aal2) owner through to the welcome page with their plan', async () => {
    given({ user: { id: 'u1', email: 'sam@example.test' }, owner: OWNER })
    const page = await render()
    expect(page).toContain('Welcome to your portal.')
    expect(page).toContain('Free plan')
    expect(page).toContain('sam@example.test')
    expect(page.match(/<h1/g)).toHaveLength(1)
    expect(page).not.toMatch(/href="\/founder/)
  })

  it('shows the six pipeline stages in order, links the two live portal pages, and the no-password line', async () => {
    given({ user: { id: 'u1', email: null }, owner: { ...OWNER, plan: 'none' } })
    const page = await render()
    expect(PORTAL_STEPS.map((s) => s.id)).toEqual(['account', 'details', 'connections', 'build', 'changes', 'launch'])
    for (const step of PORTAL_STEPS) expect(page).toContain(step.title)
    expect(page).toContain('href="/portal/setup"')
    expect(page).toContain('href="/portal/changes"')
    expect(page).toContain('No plan yet')
    expect(page).toContain(promise)
    expect(NO_PASSWORD_LINE).toBe("You never give us your password. You click Allow on Google's or Microsoft's own screen.")
    // one home for the promise line: the welcome page and the setup checklist read the same constant
    expect(NO_PASSWORD_LINE).toBe(SETUP_NO_PASSWORD_LINE)
  })

  it('has no (portal) group layout that could lock signed-out invite holders out of /portal/join', () => {
    expect(existsSync(join(__dirname, '..', 'layout.tsx'))).toBe(false)
  })

  it('keeps the portal out of search results', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

// The source scan (src/__tests__/portal-no-password.test.ts) reads the files; this reads what React actually renders,
// so a prompt assembled at run time (joined, replaced, computed) is caught too. Every state a visitor can reach.
describe('no rendered portal page asks for a password', () => {
  const STATES: [string, State][] = [
    ['no portal', { user: { id: 'v', email: 'v@example.test' }, owner: null }],
    ['no portal, no email', { user: { id: 'v', email: null }, owner: null }],
    ['link only', { user: { id: 'u1', email: 'sam@example.test' }, owner: LINK_ONLY }],
    ['owner', { user: { id: 'u1', email: 'sam@example.test' }, owner: OWNER }],
    ['owner, paid', { user: { id: 'u1', email: null }, owner: { ...OWNER, plan: 'paid' } }],
  ]

  async function everyState(): Promise<[string, string][]> {
    const out: [string, string][] = []
    for (const [name, state] of STATES) {
      given(state)
      out.push([`page: ${name}`, await render()])
    }
    out.push(['loading', renderToStaticMarkup(<PortalLoading />)])
    out.push(['error boundary', renderToStaticMarkup(<PortalError error={new Error('x')} reset={() => {}} />)])
    out.push(['no portal yet', renderToStaticMarkup(<NoPortalYet email={null} />)])
    out.push(['confirm it is you', renderToStaticMarkup(<ConfirmItIsYou email={null} />)])
    return out
  }

  it('finds nothing in any state, and really rendered the welcome page with its promise line (positive control)', async () => {
    const states = await everyState()
    expect(states.length).toBe(9)
    expect(states.some(([, html]) => html.includes(promise))).toBe(true)
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

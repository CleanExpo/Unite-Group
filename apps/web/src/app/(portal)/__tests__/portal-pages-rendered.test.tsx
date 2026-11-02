import { prerender } from 'react-dom/static.edge'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Every portal page, in every access state, rendered as a visitor would get it, then scanned for password wording.
// The source scan (src/__tests__/portal-no-password.test.ts) reads files; this reads what React produced, so copy
// that lives outside the scanned folders (the setup checklist in lib/portal/setup/items.ts, the invite outcomes)
// or is built at run time is seen too. Codex review 03/11/2026: a password prompt in the setup checklist passed.

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({ captureClientError: vi.fn() }))
const aal = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(async () => ({ auth: { mfa: { getAuthenticatorAssuranceLevel: aal } } })),
}))
vi.mock('@/lib/portal/changes/server', () => ({ portalContext: vi.fn() }))
vi.mock('@/lib/portal/changes/owner-stub', () => ({ getPortalOwner: vi.fn() }))
vi.mock('@/lib/portal/setup/service', () => ({ listConnections: vi.fn() }))
vi.mock('@/lib/portal/changes/service', () => ({ listChangeRequests: vi.fn() }))
vi.mock('../portal/changes/actions', () => ({ submitChangeAction: vi.fn(), approveChangeAction: vi.fn(), askForEditsAction: vi.fn() }))
vi.mock('../portal/setup/actions', () => ({ saveConnectionAction: vi.fn(), markAccessGrantedAction: vi.fn() }))
vi.mock('../portal/join/actions', () => ({ requestJoinLinkAction: vi.fn(), redeemInviteAction: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { portalContext } from '@/lib/portal/changes/server'
import { getPortalOwner } from '@/lib/portal/changes/owner-stub'
import { listConnections } from '@/lib/portal/setup/service'
import { listChangeRequests } from '@/lib/portal/changes/service'
import type { PortalAccess } from '@/lib/portal/changes/access'
import type { ChangeRequest, PortalOwner } from '@/lib/portal/changes/types'
import { CHECKLIST } from '@/lib/portal/setup/items'
import { renderedFindings } from '@/__tests__/portal-forbidden-words'

import PortalPage from '../portal/page'
import SetupPage from '../portal/setup/page'
import ChangesPage from '../portal/changes/page'
import JoinPage from '../portal/join/page'
import VerifyPage from '../portal/verify/page'
import { JoinSteps, type JoinStep } from '../portal/join/join-steps'

const OWNER: PortalOwner = { userId: 'u1', ownerId: 'u1', tenantSlug: 'sample-plumbing', plan: 'comp', aal: 'aal2' }
const ACCESS: [string, PortalAccess][] = [
  ['ok', { kind: 'ok', owner: OWNER }],
  ['sign in', { kind: 'sign_in' }],
  ['second factor', { kind: 'verify_second_factor' }],
]
const REQUEST: ChangeRequest = {
  id: 'r1', tenantSlug: 'sample-plumbing', page: 'home', requestText: 'Swap the opening hours', photoPath: 'x.jpg',
  status: 'preview_ready', previewUrl: 'https://preview.example.test', editNote: null,
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', approvedAt: null,
}
// prerender waits for async server components (the setup and changes pages have async bodies).
async function html(node: Promise<React.ReactNode> | React.ReactNode): Promise<string> {
  const { prelude } = await prerender(<>{await node}</>)
  return new Response(prelude).text()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'sam@example.test' } as Awaited<ReturnType<typeof getUser>>)
  aal.mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null })
  vi.mocked(listConnections).mockResolvedValue({ ok: true, connections: [] } as never)
  vi.mocked(listChangeRequests).mockResolvedValue({ ok: true, requests: [REQUEST] } as never)
})

async function everyPage(): Promise<[string, string][]> {
  const out: [string, string][] = []
  for (const [name, access] of ACCESS) {
    vi.mocked(portalContext).mockResolvedValue({ access, db: {} } as never)
    out.push([`setup: ${name}`, await html(SetupPage())])
    out.push([`changes: ${name}`, await html(ChangesPage())])
  }
  vi.mocked(portalContext).mockResolvedValue({ access: ACCESS[0][1], db: {} } as never)
  vi.mocked(listConnections).mockResolvedValue({ ok: false, code: 'failed', message: 'We could not load your checklist. Please refresh.' } as never)
  out.push(['setup: failed read', await html(SetupPage())])
  for (const [name, owner] of [['welcome', OWNER], ['no portal', null], ['link only', { ...OWNER, aal: 'aal1' }]] as const) {
    vi.mocked(getPortalOwner).mockResolvedValue(owner)
    out.push([`portal: ${name}`, await html(PortalPage())])
  }
  out.push(['verify: step', await html(VerifyPage({ searchParams: Promise.resolve({ redirectTo: '/portal/setup' }) }))])
  for (const code of ['', 'ABCD-EFGH']) {
    out.push([`join page: code "${code}"`, await html(JoinPage({ searchParams: Promise.resolve({ code }) }))])
  }
  for (const step of ['code', 'sign-in', 'second-factor', 'claim'] as JoinStep[]) {
    out.push([`join step: ${step}`, await html(<JoinSteps step={step} code="ABCD-EFGH" email="sam@example.test" />)])
  }
  return out
}

describe('every rendered portal page', () => {
  it('shows no password wording in any state, and really rendered the setup checklist (positive control)', async () => {
    const pages = await everyPage()
    expect(pages.length).toBe(17)
    const setup = pages.find(([name]) => name === 'setup: ok')?.[1] ?? ''
    for (const item of CHECKLIST) expect(setup).toContain(item.title.replace(/'/g, '&#x27;'))
    expect(pages.find(([name]) => name === 'changes: ok')?.[1]).toContain('Swap the opening hours')
    expect(pages.map(([name, page]) => [name, renderedFindings(page)]).filter(([, f]) => f.length > 0)).toEqual([])
  })
})

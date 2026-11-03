import { randomUUID } from 'node:crypto'

import type { ReactNode } from 'react'
import { prerender } from 'react-dom/static.edge'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The invited owner's whole journey through the three portal slices, on the real page, action, owner and service
// code (UNI-3167 invite, UNI-3174 home, UNI-3168 changes and setup). Only Supabase is replaced, by an in-memory
// database that applies the same row rules as the migrations: a member reads her own membership rows at any aal;
// her tenant (public.portal_owner_tenant_slug) exists only on an aal2 session and is her oldest membership; every
// owner write goes through a function that re-checks it. Those rules are proven on Postgres by
// scripts/portal-owner-db-proof.sh (supabase/tests/portal_owner_journey.sql walks the same journey in SQL).

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({ captureClientError: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { createClient, getUser } from '@/lib/supabase/server'
import { hashInviteCode, normaliseInviteCode } from '@/lib/portal/invites/code'
import { BRII_EXAMPLE_CODE, BRII_OWNER_EMAIL, BRII_TENANT } from '@/lib/portal/invites/__fixtures__/brii'

import PortalPage from '../portal/page'
import ChangesPage from '../portal/changes/page'
import SetupPage from '../portal/setup/page'
import { approveChangeAction, askForEditsAction, submitChangeAction } from '../portal/changes/actions'
import { markAccessGrantedAction, saveConnectionAction } from '../portal/setup/actions'
import { redeemInviteAction } from '../portal/join/actions'

type User = { id: string; email: string; app_metadata?: Record<string, unknown> }
type Row = Record<string, unknown>
type Err = { message: string; code?: string }

/** The database, as the signed-in caller sees it through the row rules. */
function portalDb() {
  const db = {
    session: { user: null as User | null, aal: 'aal1' as 'aal1' | 'aal2' },
    codes: new Map<string, { tenant: string; used: boolean }>(),
    members: [] as { tenant_slug: string; user_id: string; created_at: string }[],
    plans: new Map<string, string>(),
    requests: [] as Row[],
    connections: [] as Row[],
  }
  const uid = () => db.session.user?.id ?? null
  // public.portal_owner_tenant_slug(): aal2 only, the caller's oldest membership
  const tenant = () => (db.session.aal !== 'aal2' ? null
    : db.members.filter((m) => m.user_id === uid())
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.tenant_slug.localeCompare(b.tenant_slug))[0]?.tenant_slug ?? null)
  const visible = (table: string): Row[] => {
    if (table === 'portal_tenant_members') return db.members.filter((m) => m.user_id === uid())
    if (table === 'portal_entitlements') {
      if (db.session.aal !== 'aal2') return []
      const mine = new Set(db.members.filter((m) => m.user_id === uid()).map((m) => m.tenant_slug))
      return [...db.plans].filter(([t]) => mine.has(t)).map(([tenant_slug, plan]) => ({ tenant_slug, plan, modules: {} }))
    }
    const rows = table === 'portal_change_requests' ? db.requests : table === 'portal_connections' ? db.connections : []
    return rows.filter((r) => r.tenant_slug === tenant())
  }
  const ok = (data: unknown) => ({ data, error: null })
  const fail = (message: string, code?: string) => ({ data: null, error: { message, code } as Err })
  const now = () => new Date(Date.now() + db.requests.length + db.members.length).toISOString()

  function rpc(fn: string, a: Record<string, unknown>) {
    if (!uid()) return fail('not signed in', '42501')
    if (fn === 'portal_redeem_invite') {
      if (db.session.aal !== 'aal2') return ok('needs_second_factor')
      const code = db.codes.get(String(a.p_code_hash))
      if (!code) return ok('not_found')
      if (code.used) return ok('used')
      code.used = true
      if (!db.members.some((m) => m.tenant_slug === code.tenant && m.user_id === uid())) {
        db.members.push({ tenant_slug: code.tenant, user_id: uid() as string, created_at: now() })
      }
      if ((db.plans.get(code.tenant) ?? 'none') === 'none') db.plans.set(code.tenant, 'comp')
      return ok('redeemed')
    }
    const t = tenant()
    if (!t) return fail('portal_not_owner')
    const request = () => db.requests.find((r) => r.id === a.p_request_id && r.tenant_slug === t)
    switch (fn) {
      case 'portal_create_change_request': {
        const id = randomUUID()
        db.requests.push({ id, tenant_slug: t, page: a.p_page, request_text: a.p_request_text, photo_path: a.p_photo_path,
          status: 'submitted', preview_url: null, edit_note: null, created_at: now(), updated_at: now(), approved_at: null })
        return ok(id)
      }
      case 'portal_approve_change_request':
      case 'portal_ask_for_change_edits': {
        const r = request()
        if (!r) return fail('portal_not_found')
        if (r.status !== 'preview_ready') return fail('portal_wrong_status')
        r.status = fn === 'portal_approve_change_request' ? 'approved' : 'in_progress'
        if (fn === 'portal_ask_for_change_edits') r.edit_note = a.p_note
        else r.approved_at = now()
        return ok(r.status)
      }
      case 'portal_save_connection': {
        const value = { profile_url: a.p_profile_url, property_id: a.p_property_id, notes: a.p_notes }
        const row = db.connections.find((c) => c.tenant_slug === t && c.kind === a.p_kind)
        if (row) Object.assign(row, value, { status: 'link_saved', updated_at: now() })
        else db.connections.push({ tenant_slug: t, kind: a.p_kind, status: 'link_saved', ...value, updated_at: now() })
        return ok('link_saved')
      }
      case 'portal_mark_connection_access_granted': {
        const row = db.connections.find((c) => c.tenant_slug === t && c.kind === a.p_kind)
        if (!row) return fail('portal_bad_input')
        row.status = 'access_granted'
        return ok('access_granted')
      }
    }
    return fail(`unknown function ${fn}`)
  }

  function from(table: string) {
    const eqs: [string, unknown][] = []
    const orders: [string, boolean][] = []
    let limit = Infinity
    const rows = () => visible(table).filter((r) => eqs.every(([c, v]) => r[c] === v))
      .sort((x, y) => {
        for (const [c, asc] of orders) {
          const p = String(x[c]), q = String(y[c])
          if (p !== q) return (p < q ? -1 : 1) * (asc ? 1 : -1)
        }
        return 0
      }).slice(0, limit)
    const q = {
      select: () => q,
      eq: (c: string, v: unknown) => (eqs.push([c, v]), q),
      order: (c: string, o: { ascending: boolean }) => (orders.push([c, o.ascending]), q),
      limit: (n: number) => ((limit = n), q),
      maybeSingle: async () => ok(rows()[0] ?? null),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(ok(rows())).then(resolve, reject),
    }
    return q
  }

  const client = {
    auth: {
      getUser: async () => ({ data: { user: db.session.user }, error: null }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: db.session.aal }, error: null }) },
    },
    from,
    rpc: async (fn: string, args: Record<string, unknown>) => rpc(fn, args),
  }
  return { db, client }
}

let world: ReturnType<typeof portalDb>
const IVI: User = { id: '00000000-0000-4000-8000-0000000000d4', email: BRII_OWNER_EMAIL }
const CODE_HASH = hashInviteCode(normaliseInviteCode(BRII_EXAMPLE_CODE) as string)

function signIn(user: User | null, aal: 'aal1' | 'aal2') {
  world.db.session = { user, aal }
}
// A node test (no JSX), so the real server modules load as they do on the server. prerender waits for the async
// page bodies, as in portal-pages-rendered.test.tsx.
async function html(node: Promise<ReactNode>): Promise<string> {
  const { prelude } = await prerender(await node)
  return new Response(prelude).text()
}
const pages = async () => ({ home: await html(PortalPage()), changes: await html(ChangesPage()), setup: await html(SetupPage()) })
/** Ivi claims her invite the way /portal/join does: on the emailed link, then the authenticator app, then claim. */
async function claimInvite() {
  signIn(IVI, 'aal1')
  expect(await redeemInviteAction(BRII_EXAMPLE_CODE)).toBe('needs_second_factor')
  signIn(IVI, 'aal2')
  expect(await redeemInviteAction(BRII_EXAMPLE_CODE)).toBe('redeemed')
}
/** Our team moves a request on (service role, outside the owner's session). */
function teamPreview(requestId: string, n: number) {
  const r = world.db.requests.find((x) => x.id === requestId) as Row
  Object.assign(r, { status: 'preview_ready', preview_url: `https://preview.example.test/brii/${n}` })
}

beforeEach(() => {
  vi.clearAllMocks()
  world = portalDb()
  world.db.codes.set(CODE_HASH, { tenant: BRII_TENANT, used: false })
  vi.mocked(createClient).mockImplementation(async () => world.client as never)
  vi.mocked(getUser).mockImplementation(async () => world.db.session.user as never)
})

describe('an owner who claimed her portal by invite uses the home, changes and setup pages', () => {
  it('before the invite she has no portal on any page, and every action is refused', async () => {
    signIn(IVI, 'aal2')
    const p = await pages()
    expect(p.home).toContain('No portal here yet.')
    for (const page of [p.changes, p.setup]) expect(page).toContain('Please sign in')
    expect(await submitChangeAction({ page: 'home', requestText: 'Change the phone number', photoPath: null })).toMatchObject({ ok: false })
    expect(await saveConnectionAction({ kind: 'facebook', value: 'https://www.facebook.com/brii', notes: '' })).toMatchObject({ ok: false })
    expect(world.db.requests).toEqual([])
    expect(world.db.connections).toEqual([])
  })

  it('after claiming at aal2, the home welcomes her with the free plan the invite gave', async () => {
    await claimInvite()
    expect(world.db.members).toMatchObject([{ tenant_slug: BRII_TENANT, user_id: IVI.id }])
    const { home } = await pages()
    expect(home).toContain('Welcome to your portal.')
    expect(home).toContain('Free plan')
    expect(home).toContain(BRII_OWNER_EMAIL)
    expect(home).not.toContain('No portal here yet.')
  })

  it('back on the emailed link only (aal1), every page asks her to confirm it is her, with a working link', async () => {
    await claimInvite()
    signIn(IVI, 'aal1')
    const p = await pages()
    expect(p.home).toContain('Confirm it is you.')
    expect(p.home).toContain('href="/portal/verify?redirectTo=%2Fportal"')
    expect(p.changes).toContain('href="/portal/verify?redirectTo=%2Fportal%2Fchanges"')
    expect(p.setup).toContain('href="/portal/verify?redirectTo=%2Fportal%2Fsetup"')
    expect(await submitChangeAction({ page: 'home', requestText: 'Change the phone number', photoPath: null }))
      .toMatchObject({ ok: false, message: 'Please confirm it is you with your second sign-in step first.' })
    expect(world.db.requests).toEqual([])
  })

  it('/portal/changes: she asks for a change, asks for edits on the preview, and approves the next one', async () => {
    await claimInvite()
    expect((await pages()).changes).toContain('Request a change')
    expect(await submitChangeAction({ page: 'contact', requestText: 'Change the phone number to 0400 000 000', photoPath: null }))
      .toMatchObject({ ok: true })
    const [request] = world.db.requests
    expect(request).toMatchObject({ tenant_slug: BRII_TENANT, status: 'submitted' })
    expect((await pages()).changes).toContain('Change the phone number to 0400 000 000')

    teamPreview(request.id as string, 1)
    expect(await askForEditsAction(request.id as string, 'Bigger phone number please')).toMatchObject({ ok: true })
    expect(request).toMatchObject({ status: 'in_progress', edit_note: 'Bigger phone number please' })
    teamPreview(request.id as string, 2)
    expect(await approveChangeAction(request.id as string)).toMatchObject({ ok: true, message: 'Approved. We will put it live and let you know.' })
    expect(request).toMatchObject({ status: 'approved' })
  })

  it('/portal/setup: she saves her links and says she added us; the checklist shows her progress', async () => {
    await claimInvite()
    expect(await saveConnectionAction({ kind: 'gbp', value: 'https://maps.app.goo.gl/brii1', notes: '' })).toMatchObject({ ok: true, message: 'Saved.' })
    expect(await markAccessGrantedAction('gbp')).toMatchObject({ ok: true })
    expect(await saveConnectionAction({ kind: 'facebook', value: 'https://www.facebook.com/brii', notes: '' })).toMatchObject({ ok: true })
    expect(world.db.connections.map((c) => `${c.tenant_slug}:${c.kind}:${c.status}`)).toEqual(['brii:gbp:access_granted', 'brii:facebook:link_saved'])
    const { setup } = await pages()
    expect(setup).toContain('https://maps.app.goo.gl/brii1')
    expect(setup.replaceAll('<!-- -->', '')).toContain('2 of 9 done')
  })

  it('another tenant stays invisible to her, and its requests cannot be decided by her', async () => {
    const other = { id: randomUUID(), tenant_slug: 'other-co', page: 'home', request_text: 'Other owner request', photo_path: null,
      status: 'preview_ready', preview_url: 'https://preview.example.test/other', edit_note: null,
      created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', approved_at: null }
    world.db.requests.push(other)
    await claimInvite()
    expect((await pages()).changes).not.toContain('Other owner request')
    expect(await approveChangeAction(other.id)).toEqual({ ok: false, message: 'We could not find that request.' })
    expect(other.status).toBe('preview_ready')
  })

  it('a tenant claim written into her token, with no membership, opens nothing', async () => {
    signIn({ ...IVI, app_metadata: { portal_tenant_slug: BRII_TENANT, portal_plan: 'paid' } }, 'aal2')
    const p = await pages()
    expect(p.home).toContain('No portal here yet.')
    expect(p.changes).toContain('Please sign in')
    expect(await markAccessGrantedAction('gbp')).toMatchObject({ ok: false })
  })
})

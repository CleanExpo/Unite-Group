import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }) }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/portal/owner', () => ({ getPortalOwner: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getPortalOwner } from '@/lib/portal/owner'
import type { PortalOwner } from '@/lib/portal/changes/types'

import PortalPage from '../../page'

const OWNER: PortalOwner = { userId: 'b1', ownerId: 'b1', tenantSlug: 'iaq-magazine', plan: 'comp', aal: 'aal2' }
function given(owner: PortalOwner) {
  vi.mocked(getUser).mockResolvedValue({ id: owner.userId, email: 'board@iaq.test' } as Awaited<ReturnType<typeof getUser>>)
  vi.mocked(getPortalOwner).mockResolvedValue(owner)
}
const render = async () => renderToStaticMarkup(<>{await PortalPage()}</>)

beforeEach(() => vi.clearAllMocks())

describe('/portal points IAQ members at their board page', () => {
  it('shows an IAQ member (aal2) the link to /portal/board', async () => {
    given(OWNER)
    const html = await render()
    expect(html).toContain('href="/portal/board"')
    expect(html).toContain('IAQ Magazine knowledge hub concept')
  })
  it('never shows the link to another tenant', async () => {
    given({ ...OWNER, tenantSlug: 'brii' })
    const html = await render()
    expect(html).not.toContain('/portal/board')
    expect(html).not.toContain('IAQ Magazine')
  })
})

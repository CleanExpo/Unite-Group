import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { PATCH } from '../route'

const ID = '123e4567-e89b-12d3-a456-426614174000'

// Records every .eq() on the read and the write so tenancy can be asserted.
function makeClient(read: unknown, write: unknown) {
  const readEq: unknown[][] = []
  const writeEq: unknown[][] = []
  const update = vi.fn()
  const readChain: Record<string, unknown> = {}
  readChain.eq = vi.fn((...a: unknown[]) => {
    readEq.push(a)
    return readChain
  })
  readChain.maybeSingle = vi.fn(() => Promise.resolve(read))
  const writeChain: Record<string, unknown> = {}
  writeChain.eq = vi.fn((...a: unknown[]) => {
    writeEq.push(a)
    return writeChain
  })
  writeChain.select = vi.fn(() => Promise.resolve(write))
  update.mockReturnValue(writeChain)
  const table = { select: vi.fn(() => readChain), update }
  return { client: { from: vi.fn(() => table) }, readEq, writeEq, update }
}

function req(body: unknown, raw = false) {
  return new Request(`http://localhost/api/coaching/extractions/${ID}`, {
    method: 'PATCH',
    body: raw ? (body as string) : JSON.stringify(body),
  })
}
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })
const proposed = { id: ID, status: 'proposed', body: 'original text', original_body: null }

describe('PATCH /api/coaching/extractions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('refuses unauthenticated requests and never opens the database', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await PATCH(req({ action: 'approve' }), ctx())
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('rejects a non-UUID id with 400', async () => {
    const res = await PATCH(req({ action: 'approve' }), ctx('not-a-uuid'))
    expect(res.status).toBe(400)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('rejects an unknown action, bad body type and bad JSON with 400', async () => {
    expect((await PATCH(req({ action: 'delete' }), ctx())).status).toBe(400)
    expect((await PATCH(req({ action: 'approve', body: 42 }), ctx())).status).toBe(400)
    expect((await PATCH(req('{bad', true), ctx())).status).toBe(400)
    expect(createClient).not.toHaveBeenCalled()
  })

  it("returns 404 when the row is not the founder's", async () => {
    const m = makeClient({ data: null, error: null }, { data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(m.client as never)
    const res = await PATCH(req({ action: 'reject' }), ctx())
    expect(res.status).toBe(404)
    expect(m.update).not.toHaveBeenCalled()
  })

  it('returns 409 when the row is no longer proposed', async () => {
    const m = makeClient({ data: { ...proposed, status: 'approved' }, error: null }, { data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(m.client as never)
    const res = await PATCH(req({ action: 'approve' }), ctx())
    expect(res.status).toBe(409)
    expect(m.update).not.toHaveBeenCalled()
  })

  it('returns 409 when the guarded write matches zero rows', async () => {
    const m = makeClient({ data: proposed, error: null }, { data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(m.client as never)
    const res = await PATCH(req({ action: 'approve' }), ctx())
    expect(res.status).toBe(409)
  })

  it('returns 500 when the read fails and when the write fails', async () => {
    const r = makeClient({ data: null, error: { message: 'x' } }, { data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(r.client as never)
    expect((await PATCH(req({ action: 'approve' }), ctx())).status).toBe(500)
    const w = makeClient({ data: proposed, error: null }, { data: null, error: { message: 'y' } })
    vi.mocked(createClient).mockResolvedValue(w.client as never)
    expect((await PATCH(req({ action: 'approve' }), ctx())).status).toBe(500)
  })

  it('approves with an edit, scoped to founder, id and proposed status', async () => {
    const m = makeClient({ data: proposed, error: null }, { data: [{ id: ID }], error: null })
    vi.mocked(createClient).mockResolvedValue(m.client as never)
    const res = await PATCH(req({ action: 'approve', body: 'edited text' }), ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: ID, status: 'approved' })
    expect(m.readEq).toContainEqual(['founder_id', 'user-123'])
    expect(m.writeEq).toEqual(
      expect.arrayContaining([['founder_id', 'user-123'], ['id', ID], ['status', 'proposed']]),
    )
    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', body: 'edited text', original_body: 'original text' }),
    )
  })
})

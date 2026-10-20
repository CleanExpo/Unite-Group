import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getTaskById: vi.fn(), saveMissionBusiness: vi.fn(), toDeliveryMissionView: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getUser: mocks.getUser, createClient: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: mocks.getTaskById }))
vi.mock('@/lib/command-centre/mission-business-store', () => ({ saveMissionBusiness: mocks.saveMissionBusiness }))
vi.mock('@/lib/command-centre/delivery-view', () => ({ toDeliveryMissionView: mocks.toDeliveryMissionView }))
import { POST } from '../route'
const taskId = '00000000-0000-4000-8000-000000000001'
const timestamp = '2026-10-20T10:00:00+00:00'
const task = { id: taskId, founder_id: 'founder', external_ref: 'delivery:research:request', metadata: {}, updated_at: timestamp }
function request(overrides = {}, origin = 'https://unite-group.in') {
  return new Request('https://unite-group.in/api/command-centre/missions/business', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, expectedUpdatedAt: timestamp, businessKey: 'unite-group', ...overrides }) })
}
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ id: 'founder' }); mocks.getTaskById.mockResolvedValue(task); mocks.saveMissionBusiness.mockResolvedValue(task); mocks.toDeliveryMissionView.mockReturnValue({ taskId, businessKey: 'unite-group' }) })
describe('mission business HTTP boundary', () => {
  it('requires authentication before any read or write', async () => {
    mocks.getUser.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(401)
    expect(mocks.getTaskById).not.toHaveBeenCalled()
  })
  it('files an existing mission under the real group entry and confirms its view', async () => {
    const result = await POST(request())
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ source: 'supabase', mission: { taskId, businessKey: 'unite-group' } })
    expect(mocks.getTaskById).toHaveBeenCalledWith({ founderId: 'founder', taskId })
    expect(mocks.saveMissionBusiness).toHaveBeenCalledWith(task, 'unite-group')
  })
  it('rejects cross-origin and unknown businesses before mutation', async () => {
    expect((await POST(request({}, 'https://other.example'))).status).toBe(403)
    expect((await POST(request({ businessKey: 'unknown' }))).status).toBe(400)
    expect(mocks.saveMissionBusiness).not.toHaveBeenCalled()
  })
  it('refuses stale versions and another founder’s rows', async () => {
    expect((await POST(request({ expectedUpdatedAt: '2026-10-19T10:00:00Z' }))).status).toBe(409)
    mocks.getTaskById.mockResolvedValue({ ...task, founder_id: 'other' })
    expect((await POST(request())).status).toBe(404)
    expect(mocks.saveMissionBusiness).not.toHaveBeenCalled()
  })
  it('reports unconfirmed persistence as failure', async () => {
    mocks.saveMissionBusiness.mockRejectedValue(new Error('unavailable'))
    expect((await POST(request())).status).toBe(503)
  })
})

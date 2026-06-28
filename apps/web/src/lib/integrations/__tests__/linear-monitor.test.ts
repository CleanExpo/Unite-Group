import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/linear', () => ({ fetchIssuesByTeamAndState: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn(() => Promise.resolve()) }))

import { fetchIssuesByTeamAndState } from '@/lib/integrations/linear'
import { notify } from '@/lib/notifications'
import { checkSynthexProgress } from '../linear-monitor'

const issue = (id: string, identifier: string, title: string) => ({
  id,
  identifier,
  title,
  priority: 0,
  team: { id: 't', key: 'SYN', name: 'Synthex' },
  project: null,
  state: { id: 's', name: 'In Review', type: 'started' },
})

describe('checkSynthexProgress', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries SYN / In Review server-side and notifies once per issue', async () => {
    vi.mocked(fetchIssuesByTeamAndState).mockResolvedValue([
      issue('1', 'SYN-1', 'First'),
      issue('2', 'SYN-2', 'Second'),
    ] as any)

    const result = await checkSynthexProgress()

    expect(fetchIssuesByTeamAndState).toHaveBeenCalledWith('SYN', 'In Review')
    expect(result.inReviewCount).toBe(2)
    expect(notify).toHaveBeenCalledTimes(2)
    expect(vi.mocked(notify).mock.calls[0][0]).toMatchObject({
      type: 'approval_alert',
      businessKey: 'synthex',
      metadata: { linearIssueId: '1', linearUrl: 'https://linear.app/issue/SYN-1' },
    })
  })

  it('returns 0 and sends no notifications when nothing is in review', async () => {
    vi.mocked(fetchIssuesByTeamAndState).mockResolvedValue([])
    const result = await checkSynthexProgress()
    expect(result.inReviewCount).toBe(0)
    expect(notify).not.toHaveBeenCalled()
  })
})

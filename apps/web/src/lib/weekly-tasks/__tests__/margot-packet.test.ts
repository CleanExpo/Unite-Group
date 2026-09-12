import { describe, expect, it } from 'vitest'
import fixture from './margot-first-five.fixture.json'
import { parseMargotWeeklyPacket } from '../margot-packet'

describe('local Margot review packet validation', () => {
  it('validates a synthetic five-entry editorial packet without promoting its release', () => {
    const before = structuredClone(fixture)
    const result = parseMargotWeeklyPacket(fixture)
    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Synthetic packet rejected')
    expect(result.data.episodes).toHaveLength(5)
    expect(fixture.sourceDocument).toBe('synthetic-test-fixture.md')
    expect(fixture.episodes.every(e => e.title.startsWith('Synthetic episode '))).toBe(true)
    expect(fixture.episodes[0].videoId).toBe('00000000000000000000000000000000')
    expect(result.data.episodes.filter(e => e.videoId)).toHaveLength(1)
    expect(result.data.scheduleStatus).toBe('proposed-not-scheduled')
    expect(result.data.episodes.every(e => e.releaseApproval === 'pending')).toBe(true)
    expect(result.data.episodes[2].slot).toBe('2026-09-21T16:00:00+10:00')
    expect(result.data.weekStartsAt).toBe('2026-09-17T16:00:00+10:00')
    expect(fixture).toEqual(before)
  })
  it.each(['duplicate', 'missing', 'unsafe_video', 'wrong_zone', 'outside_week', 'wrong_start', 'wrong_review', 'release_claim', 'extra_authority'])('rejects %s without returning a partial ready packet', defect => {
    const data = structuredClone(fixture)
    if (defect === 'duplicate') data.episodes[1].id = data.episodes[0].id
    if (defect === 'missing') data.episodes.pop()
    if (defect === 'unsafe_video') data.episodes[0].videoId = 'javascript:alert(1)'
    if (defect === 'wrong_zone') data.timezone = 'Australia/Sydney'
    if (defect === 'outside_week') data.episodes[0].slot = '2026-09-24T16:00:00+10:00'
    if (defect === 'wrong_start') data.weekStartsAt = '2026-09-18T16:00:00+10:00'
    if (defect === 'wrong_review') data.reviewDueAt = '2026-09-21T09:00:00+10:00'
    if (defect === 'release_claim') data.episodes[0].releaseApproval = 'approved'
    const input = defect === 'extra_authority' ? { ...data, publicationApproved: true } : data
    expect(parseMargotWeeklyPacket(input).success).toBe(false)
  })
})

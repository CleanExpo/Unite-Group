import { describe, it, expect } from 'vitest'
import {
  deriveMemberActivity,
  buildTeamActivity,
  brisbaneDateTime,
  ACTIVITY_DISCLAIMER,
  type TeamMember,
  type CommitRecord,
} from '../team-activity'

const NOW = '2026-07-05T00:00:00.000Z'

const RANA: TeamMember = { id: 'rana', name: 'Rana Muzamil', emails: ['mmlrana00@gmail.com', 'ranamuzamil1199@gmail.com'] }

function commit(over: Partial<CommitRecord> = {}): CommitRecord {
  return {
    authorEmail: 'mmlrana00@gmail.com',
    committerEmail: 'mmlrana00@gmail.com',
    authoredAt: '2026-07-04T02:00:00.000Z',
    subject: 'feat: add thing',
    ...over,
  }
}

describe('brisbaneDateTime', () => {
  it('buckets a UTC instant into Australia/Brisbane (UTC+10) date + time', () => {
    // 2026-07-04T02:00Z → 12:00 on 2026-07-04 in Brisbane
    expect(brisbaneDateTime('2026-07-04T02:00:00.000Z')).toEqual({ date: '2026-07-04', time: '12:00' })
  })

  it('rolls into the next Brisbane day for late-UTC instants', () => {
    // 2026-07-04T15:30Z → 01:30 on 2026-07-05 in Brisbane
    expect(brisbaneDateTime('2026-07-04T15:30:00.000Z')).toEqual({ date: '2026-07-05', time: '01:30' })
  })

  it('returns null for an unparseable instant', () => {
    expect(brisbaneDateTime('not-a-date')).toBeNull()
  })
})

describe('deriveMemberActivity', () => {
  it('matches commits by author OR committer email, case-insensitively', () => {
    const commits = [
      commit({ authorEmail: 'MMLRANA00@GMAIL.COM' }),
      commit({ authorEmail: 'someone@else.com', committerEmail: 'ranamuzamil1199@gmail.com' }),
      commit({ authorEmail: 'nobody@else.com', committerEmail: 'nobody@else.com' }),
    ]
    expect(deriveMemberActivity(RANA, commits).commitCount).toBe(2)
  })

  it('counts distinct Brisbane active days and computes first→last spans', () => {
    const commits = [
      commit({ authoredAt: '2026-07-04T00:00:00.000Z' }), // 10:00 Bris 07-04
      commit({ authoredAt: '2026-07-04T05:00:00.000Z' }), // 15:00 Bris 07-04
      commit({ authoredAt: '2026-07-03T01:00:00.000Z' }), // 11:00 Bris 07-03
    ]
    const a = deriveMemberActivity(RANA, commits)
    expect(a.activeDays).toBe(2)
    // newest day first
    expect(a.daySpans[0]!.date).toBe('2026-07-04')
    expect(a.daySpans[0]!.firstAt).toBe('10:00')
    expect(a.daySpans[0]!.lastAt).toBe('15:00')
    expect(a.daySpans[0]!.commitCount).toBe(2)
  })

  it('returns zeroed activity (no fabrication) when nobody matches', () => {
    const a = deriveMemberActivity(RANA, [commit({ authorEmail: 'x@y.com', committerEmail: 'x@y.com' })])
    expect(a.activeDays).toBe(0)
    expect(a.commitCount).toBe(0)
    expect(a.daySpans).toEqual([])
    expect(a.recentSubjects).toEqual([])
  })

  it('caps recent subjects and orders them newest first', () => {
    const commits = Array.from({ length: 8 }, (_, i) =>
      commit({ authoredAt: `2026-07-0${i + 1}T02:00:00.000Z`, subject: `commit ${i + 1}` }),
    )
    const a = deriveMemberActivity(RANA, commits)
    expect(a.recentSubjects).toHaveLength(5)
    expect(a.recentSubjects[0]).toBe('commit 8')
  })
})

describe('buildTeamActivity', () => {
  it('always carries the founder-approved not-clock-hours disclaimer', () => {
    const p = buildTeamActivity({ now: NOW, repo: 'CleanExpo/CCW-CRM', windowDays: 14, roster: [RANA], commits: { ok: true, commits: [commit()] } })
    expect(p.disclaimer).toBe(ACTIVITY_DISCLAIMER)
    expect(p.github).toBe('live')
  })

  it('is honest (not_connected) when GitHub is unwired — never fakes activity', () => {
    const p = buildTeamActivity({ now: NOW, repo: 'CleanExpo/CCW-CRM', windowDays: 14, roster: [RANA], commits: { ok: false, reason: 'not_connected' } })
    expect(p.github).toBe('not_connected')
    expect(p.members[0]!.commitCount).toBe(0)
    expect(p.githubDetail).toMatch(/GITHUB_TOKEN/)
  })

  it('renders the Linear half as source not connected', () => {
    const p = buildTeamActivity({ now: NOW, repo: 'CleanExpo/CCW-CRM', windowDays: 14, roster: [RANA], commits: { ok: true, commits: [] } })
    expect(p.linear.source).toBe('not_connected')
  })
})

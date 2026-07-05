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

const RANA: TeamMember = {
  id: 'rana',
  name: 'Rana Muzamil',
  emails: ['mmlrana00@gmail.com', 'ranamuzamil1199@gmail.com'],
  repos: ['CleanExpo/CCW-CRM'],
}

const PHILL: TeamMember = {
  id: 'phill',
  name: 'Phill McGurk',
  emails: ['support@carsi.com.au', 'phill.mcgurk@gmail.com'],
  repos: ['CleanExpo/Unite-Group', 'CleanExpo/Pi-Dev-Ops'],
}

function commit(over: Partial<CommitRecord> = {}): CommitRecord {
  return {
    authorEmail: 'mmlrana00@gmail.com',
    committerEmail: 'mmlrana00@gmail.com',
    authoredAt: '2026-07-04T02:00:00.000Z',
    subject: 'feat: add thing',
    repo: 'CleanExpo/CCW-CRM',
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

describe('deriveMemberActivity — repo-scoped multi-repo attribution', () => {
  it('matches Phill on either of his emails, across his own repos', () => {
    const commits = [
      commit({ authorEmail: 'support@carsi.com.au', repo: 'CleanExpo/Unite-Group' }),
      commit({ authorEmail: 'phill.mcgurk@gmail.com', repo: 'CleanExpo/Pi-Dev-Ops' }),
    ]
    expect(deriveMemberActivity(PHILL, commits).commitCount).toBe(2)
  })

  it('buckets a member\'s commits across multiple repos into one combined activity', () => {
    const commits = [
      commit({ authorEmail: 'support@carsi.com.au', repo: 'CleanExpo/Unite-Group', authoredAt: '2026-07-04T00:00:00.000Z' }),
      commit({ authorEmail: 'support@carsi.com.au', repo: 'CleanExpo/Pi-Dev-Ops', authoredAt: '2026-07-04T05:00:00.000Z' }),
    ]
    const a = deriveMemberActivity(PHILL, commits)
    expect(a.commitCount).toBe(2)
    expect(a.activeDays).toBe(1)
    expect(a.daySpans[0]!.commitCount).toBe(2)
  })

  it('does NOT match a commit whose repo is outside the member\'s repo list', () => {
    const commits = [commit({ authorEmail: 'support@carsi.com.au', repo: 'CleanExpo/CCW-CRM' })]
    expect(deriveMemberActivity(PHILL, commits).commitCount).toBe(0)
  })

  it('does NOT match the autogit bot email, even inside the member\'s own repo', () => {
    const commits = [commit({ authorEmail: 'noreply@unite-group.dev', repo: 'CleanExpo/Unite-Group' })]
    expect(deriveMemberActivity(PHILL, commits).commitCount).toBe(0)
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

  it('buckets commits per member across a multi-member, multi-repo roster without cross-attribution', () => {
    const commits = [
      commit({ authorEmail: 'mmlrana00@gmail.com', repo: 'CleanExpo/CCW-CRM' }),
      commit({ authorEmail: 'support@carsi.com.au', repo: 'CleanExpo/Unite-Group' }),
      commit({ authorEmail: 'phill.mcgurk@gmail.com', repo: 'CleanExpo/Pi-Dev-Ops' }),
    ]
    const p = buildTeamActivity({ now: NOW, repo: 'CleanExpo/CCW-CRM, CleanExpo/Unite-Group, CleanExpo/Pi-Dev-Ops', windowDays: 14, roster: [RANA, PHILL], commits: { ok: true, commits } })
    expect(p.members[0]!.id).toBe('rana')
    expect(p.members[0]!.commitCount).toBe(1)
    expect(p.members[1]!.id).toBe('phill')
    expect(p.members[1]!.commitCount).toBe(2)
  })

  it('stays live with a partial-failure detail note when only some repos failed (ok:true + detail)', () => {
    const p = buildTeamActivity({
      now: NOW,
      repo: 'CleanExpo/CCW-CRM, CleanExpo/Unite-Group',
      windowDays: 14,
      roster: [RANA],
      commits: { ok: true, commits: [commit()], detail: '1/2 repos fetched — failed: CleanExpo/Unite-Group (repo not found)' },
    })
    expect(p.github).toBe('live')
    expect(p.githubDetail).toMatch(/1\/2 repos fetched/)
    expect(p.members[0]!.commitCount).toBe(1)
  })
})

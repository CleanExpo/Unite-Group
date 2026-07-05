// src/lib/command-centre/team-activity.ts
//
// Mission Control "Per-person contractor activity" — derives a per-contractor
// activity picture from GitHub commits on a target repo (CCW-CRM first). The
// contractor roster is config-driven; Rana is seeded first.
//
// MANDATORY HONESTY: every figure here is ACTIVITY-DERIVED, NOT CLOCK HOURS.
// Commit author timestamps are batch-clustered (a contractor commits in bursts,
// not continuously) so a first→last span across a day is the window activity
// touched, never proven worked hours. The `ACTIVITY_DISCLAIMER` constant is the
// founder-approved wording and MUST be surfaced by any consumer.
//
// Pure + dependency-injected (the GitHub commit fetch is a seam) so the
// derivation is unit-tested without network or secrets. Times are bucketed in
// Australia/Brisbane (permanent AEST, UTC+10, no DST) — stable calendar-day and
// clock rendering for a Brisbane-based founder.

export const ACTIVITY_DISCLAIMER =
  'activity-derived — not clock hours (commit timestamps are batch-clustered and cannot prove hours worked)'

const TZ = 'Australia/Brisbane'

/** One contractor in the roster. Matched against commit author/committer email. */
export interface TeamMember {
  id: string
  name: string
  /** All email addresses this person commits under (lower-cased match). */
  emails: string[]
}

/** Config-driven roster. Rana first, per founder directive. */
export const TEAM_ROSTER: TeamMember[] = [
  {
    id: 'rana',
    name: 'Rana Muzamil',
    emails: ['mmlrana00@gmail.com', 'ranamuzamil1199@gmail.com'],
  },
]

/** A single commit reduced to the fields we derive activity from. */
export interface CommitRecord {
  /** Author email (commit.author.email from the GitHub API). */
  authorEmail: string | null
  /** Committer email — some tooling attributes here instead. */
  committerEmail: string | null
  /** Author date, ISO 8601 (commit.author.date). */
  authoredAt: string
  /** First line of the commit message. */
  subject: string
}

export type TeamActivitySource = 'live' | 'not_connected' | 'error'

export interface DaySpan {
  /** YYYY-MM-DD in Australia/Brisbane. */
  date: string
  /** First commit time that day, HH:mm AEST. */
  firstAt: string
  /** Last commit time that day, HH:mm AEST. */
  lastAt: string
  commitCount: number
}

export interface MemberActivity {
  id: string
  name: string
  commitCount: number
  /** Distinct AEST calendar days with ≥1 commit in the window. */
  activeDays: number
  /** Per-day first→last spans, newest day first. */
  daySpans: DaySpan[]
  /** Most recent commit subjects, newest first (capped). */
  recentSubjects: string[]
}

export interface TeamActivityPayload {
  source: 'cc:team-activity'
  generatedAt: string
  repo: string
  windowDays: number
  /** Founder-approved wording — consumers MUST render this. */
  disclaimer: string
  /** GitHub commit signal state. */
  github: TeamActivitySource
  githubDetail: string | null
  members: MemberActivity[]
  /** Linear-issues-by-assignee is not fetchable here — honest not-connected half. */
  linear: { source: 'not_connected'; detail: string }
}

const brisbaneParts = new Intl.DateTimeFormat('en-AU', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** { date: 'YYYY-MM-DD', time: 'HH:mm' } for an ISO instant, in Brisbane time. */
export function brisbaneDateTime(iso: string): { date: string; time: string } | null {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return null
  const parts = brisbaneParts.formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  let hour = get('hour')
  const minute = get('minute')
  // en-AU hour12:false can emit '24' for midnight — normalise to '00'.
  if (hour === '24') hour = '00'
  if (!year || !month || !day || !hour || !minute) return null
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

function matchMember(commit: CommitRecord, member: TeamMember): boolean {
  const emails = new Set(member.emails.map((e) => e.toLowerCase()))
  const author = commit.authorEmail?.toLowerCase()
  const committer = commit.committerEmail?.toLowerCase()
  return (!!author && emails.has(author)) || (!!committer && emails.has(committer))
}

/** Derive one member's activity from their matched commits. */
export function deriveMemberActivity(
  member: TeamMember,
  commits: CommitRecord[],
  maxSubjects = 5,
): MemberActivity {
  const mine = commits.filter((c) => matchMember(c, member))

  // Bucket by Brisbane calendar day.
  const byDay = new Map<string, { times: string[]; count: number }>()
  for (const c of mine) {
    const dt = brisbaneDateTime(c.authoredAt)
    if (!dt) continue
    const bucket = byDay.get(dt.date) ?? { times: [], count: 0 }
    bucket.times.push(dt.time)
    bucket.count += 1
    byDay.set(dt.date, bucket)
  }

  const daySpans: DaySpan[] = [...byDay.entries()]
    .map(([date, { times, count }]) => {
      const sorted = [...times].sort()
      return { date, firstAt: sorted[0]!, lastAt: sorted[sorted.length - 1]!, commitCount: count }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1)) // newest day first

  const recentSubjects = [...mine]
    .sort((a, b) => (a.authoredAt < b.authoredAt ? 1 : -1))
    .map((c) => c.subject)
    .filter((s) => s.length > 0)
    .slice(0, maxSubjects)

  return {
    id: member.id,
    name: member.name,
    commitCount: mine.length,
    activeDays: daySpans.length,
    daySpans,
    recentSubjects,
  }
}

export interface BuildTeamActivityInput {
  now: string
  repo: string
  windowDays: number
  roster?: TeamMember[]
  commits:
    | { ok: true; commits: CommitRecord[] }
    | { ok: false; reason: 'not_connected' | 'error'; detail?: string }
}

/** Build the full team-activity payload from a commit-fetch result. */
export function buildTeamActivity(input: BuildTeamActivityInput): TeamActivityPayload {
  const roster = input.roster ?? TEAM_ROSTER
  const commits = input.commits.ok ? input.commits.commits : []
  const github: TeamActivitySource = input.commits.ok ? 'live' : input.commits.reason
  const githubDetail = input.commits.ok
    ? null
    : (input.commits.detail ??
      (input.commits.reason === 'not_connected' ? 'GITHUB_TOKEN not configured' : 'commit fetch failed'))

  return {
    source: 'cc:team-activity',
    generatedAt: input.now,
    repo: input.repo,
    windowDays: input.windowDays,
    disclaimer: ACTIVITY_DISCLAIMER,
    github,
    githubDetail,
    members: roster.map((m) => deriveMemberActivity(m, commits)),
    linear: {
      source: 'not_connected',
      detail: 'Linear issues-by-assignee are not fetched server-side here.',
    },
  }
}

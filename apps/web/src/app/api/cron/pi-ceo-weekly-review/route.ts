// src/app/api/cron/pi-ceo-weekly-review/route.ts
// GET /api/cron/pi-ceo-weekly-review
// Weekly Pi-CEO Board strategic review — runs Sunday 20:00 UTC (Monday 06:00 AEST)
// Aggregates: Linear velocity, GitHub shipping, vault growth, agent activity, strategic decisions
// Outputs: Weekly strategic brief, decision queue, next-week priorities

import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { createServiceClient } from '@/lib/supabase/service'
import {
  fetchOrgRepos,
  fetchRecentCommits,
  fetchOpenPRs,
  isGitHubBoardConfigured,
} from '@/lib/integrations/github-board'
import {
  fetchRecentlyCompletedIssues,
  fetchInFlightIssues,
  fetchIssuesWithDueDates,
} from '@/lib/integrations/linear-board'
import { notify } from '@/lib/notifications'
import { isWeeklyReviewArmed } from './arming'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const GITHUB_ORG = process.env.GITHUB_OWNER ?? 'CleanExpo'

/** Postgres 42P01 = undefined_table. Distinguishes "table not migrated yet" from a
 *  genuine zero-execution week, so a migration gap doesn't silently read as perfect
 *  (but empty) agent activity in the weekly review (UNI-2284). */
export function isUndefinedTableError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '42P01')
}

export async function GET(request: Request) {
  const startTime = Date.now()

  // Auth
  const denied = assertCronAuth(request)
  if (denied) return denied

  const founderId = getFounderUserId()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
  }

  // Arming gate — dormant by default. Authenticated but unarmed is a healthy
  // no-op, not an error: report it honestly and write nothing (nexus-conventions
  // "merging this arms nothing"). Placed before the first read so an unarmed
  // invocation touches neither Supabase nor a paid upstream.
  if (!isWeeklyReviewArmed()) {
    return NextResponse.json({
      success: true,
      armed: false,
      persisted: false,
      reason: 'PI_CEO_WEEKLY_REVIEW_LIVE is not set to "1" — weekly review is dormant',
    })
  }

  try {
    const supabase = createServiceClient()
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const today = new Date().toISOString().split('T')[0]

    const videoPipelineStatsPromise = Promise.resolve(
      supabase.rpc('get_video_pipeline_stats', { p_founder_id: founderId })
    ).catch(() => ({ data: null }))

    // Parallel data fetch
    const [
      linearCompleted,
      linearInFlight,
      linearDue,
      videoPipelineResult,
      agentResult,
      vaultResult,
      decisionsResult,
    ] = await Promise.allSettled([
      fetchRecentlyCompletedIssues(weekStart),
      fetchInFlightIssues(),
      fetchIssuesWithDueDates(),
      videoPipelineStatsPromise,
      supabase
        .from('agent_executions')
        .select('agent_name, status, execution_time_ms, created_at')
        .eq('initiated_by', founderId)
        .gte('created_at', weekStart.toISOString()),
      supabase
        .from('knowledge_notes')
        .select('project_key, created_at', { count: 'exact' })
        .eq('founder_id', founderId)
        .eq('is_deleted', false),
      supabase
        .from('ceo_decisions')
        .select('status, title', { count: 'exact' })
        .eq('founder_id', founderId)
        .or('status.eq.open,status.eq.blocked'),
    ])

    // GitHub (conditional)
    let githubCommits = 0
    let githubOpenPRs = 0
    let githubConfigured = false

    try {
      githubConfigured = isGitHubBoardConfigured()
      if (githubConfigured) {
        const repos = await fetchOrgRepos(GITHUB_ORG)
        const repoResults = await Promise.allSettled(
          repos.slice(0, 10).map(async (repo) => {
            const [commits, prs] = await Promise.all([
              fetchRecentCommits(GITHUB_ORG, repo.name, weekStart),
              fetchOpenPRs(GITHUB_ORG, repo.name),
            ])
            return { commits: commits.length, prs: prs.length }
          })
        )
        for (const r of repoResults) {
          if (r.status === 'fulfilled') {
            githubCommits += r.value.commits
            githubOpenPRs += r.value.prs
          }
        }
      }
    } catch {
      githubConfigured = false
    }

    // Process agent metrics
    // agent_executions currently has no migration in apps/web (UNI-2284) — the
    // query survives via Promise.allSettled, but without this check a 42P01
    // (undefined_table) reads identically to a real zero-execution week.
    const agentTableMissing =
      agentResult.status === 'fulfilled' && isUndefinedTableError(agentResult.value.error)
    const agentData = agentResult.status === 'fulfilled' ? (agentResult.value.data ?? []) : []
    const successfulAgents = agentData.filter((a: Record<string, unknown>) => a.status === 'completed')
    const agentDurations = agentData
      .filter((a: Record<string, unknown>) => a.execution_time_ms != null)
      .map((a: Record<string, unknown>) => a.execution_time_ms as number)
    const avgDuration = agentDurations.length > 0
      ? Math.round(agentDurations.reduce((sum: number, d: number) => sum + d, 0) / agentDurations.length / 1000)
      : 0
    // Honest: with no agent executions tracked, success rate is unknown (null),
    // NOT a fabricated 100%. agent_executions has no writer yet, so this is the
    // normal case — don't report perfect success on zero data (No-Invaders #1).
    const successRate: number | null = agentData.length > 0 ? successfulAgents.length / agentData.length : null

    // Process vault metrics
    const vaultData = vaultResult.status === 'fulfilled' ? (vaultResult.value.data ?? []) : []
    const vaultCount = vaultResult.status === 'fulfilled' ? (vaultResult.value.count ?? 0) : 0
    const projectsSet = new Set(vaultData.map((n: Record<string, unknown>) => n.project_key as string))
    const notesAdded = vaultData.filter((n: Record<string, unknown>) => {
      const created = new Date(n.created_at as string)
      return created >= weekStart
    }).length

    // Process decisions
    const decisionData = decisionsResult.status === 'fulfilled' ? (decisionsResult.value.data ?? []) : []
    const openDecisions = decisionData.filter((d: Record<string, unknown>) => d.status === 'open').length
    const blockedDecisions = decisionData.filter((d: Record<string, unknown>) => d.status === 'blocked').length

    // Linear results.
    // A rejected fetch is NOT a zero week — reporting "0 shipped" when Linear was
    // unreachable is the fabricated-data failure the NorthStar rule forbids. Track
    // availability separately and let every downstream consumer degrade honestly.
    const linearAvailable =
      linearCompleted.status === 'fulfilled' &&
      linearInFlight.status === 'fulfilled' &&
      linearDue.status === 'fulfilled'
    const shipped = linearCompleted.status === 'fulfilled' ? linearCompleted.value.length : 0
    const inFlight = linearInFlight.status === 'fulfilled' ? linearInFlight.value.length : 0
    const overdue = linearDue.status === 'fulfilled'
      ? linearDue.value.filter((i: { dueDate?: string }) => i.dueDate && i.dueDate < today).length
      : 0

    // The RPC resolves to `{ data, error }`; a thrown call is caught to `{ data: null }`.
    // Any of those means "pipeline stats unavailable", which is not the same as a week
    // with zero video jobs — keep them distinguishable rather than defaulting to 0.
    const videoSettled = videoPipelineResult as { status: string; value?: { data?: Record<string, unknown> | null; error?: unknown } }
    const videoAvailable = videoSettled.status === 'fulfilled'
      && !videoSettled.value?.error
      && videoSettled.value?.data != null
    const videoPipelineData = videoAvailable ? (videoSettled.value!.data as Record<string, unknown>) : {}
    const videoJobsTotal = (videoPipelineData.total_jobs as number) ?? 0
    const videoJobsPublished = (videoPipelineData.published_this_week as number) ?? 0
    const videoJobsFailed = (videoPipelineData.failed_this_week as number) ?? 0
    const videoCostCents = (videoPipelineData.total_cost_cents as number) ?? 0
    const videoCostAud = Math.round(videoCostCents) / 100

    // Determine velocity score (0-100) — now includes video pipeline.
    // Linear supplies the shipped/in-flight term (30 of the 100 points) and is the
    // denominator; scoring it from a failed fetch would publish a confident number
    // derived from invented zeros. Unavailable Linear ⇒ no score, not a low score.
    const velocityScore: number | null = linearAvailable
      ? Math.min(100, Math.round(
          (shipped / Math.max(inFlight, 1)) * 30 +
          ((successRate ?? 0) * 25) +
          (Math.min(vaultCount, 100) / 100) * 15 +
          (githubCommits > 0 ? 10 : 0) +
          (videoJobsPublished > 0 ? 20 : 0)
        ))
      : null

    // Determine headline. Every branch below reads a Linear-derived count, so when
    // Linear is unavailable the honest headline is that the week could not be scored
    // — not "steady progress", which would be a verdict on data we never received.
    let headline: string
    if (!linearAvailable) headline = 'Weekly review incomplete — Linear unavailable'
    else if (shipped > inFlight) headline = 'Exceptional shipping velocity this week'
    else if (overdue > 5) headline = 'Overdue items require immediate attention'
    else if (notesAdded > 10) headline = 'Knowledge base growing rapidly'
    else if (blockedDecisions > 0) headline = 'Blocked decisions need your input'
    else headline = 'Steady progress across the portfolio'

    // Build brief
    const brief = {
      headline,
      executiveSummary: linearAvailable
        ? `Week ending ${today} — ${shipped} issues shipped, ${inFlight} in-flight, ${githubCommits} commits. Velocity: ${velocityScore}/100.`
        : `Week ending ${today} — Linear was unreachable, so shipping and in-flight counts are unavailable and no velocity score was computed. ${githubCommits} commits recorded${githubConfigured ? '' : ' (GitHub not configured)'}.`,
      velocityScore,
      topWins: !linearAvailable
        ? ['Shipping metrics unavailable — Linear unreachable']
        : shipped > 0
          ? [`${shipped} Linear issues shipped`, `${githubCommits} GitHub commits`]
          : ['No shipping metrics captured'],
      blockers: [
        ...(linearAvailable
          ? [
              overdue > 0 ? `${overdue} overdue items` : 'No overdue items',
              blockedDecisions > 0 ? `${blockedDecisions} blocked decisions` : 'No blocked decisions',
            ]
          : ['Linear unreachable — overdue and blocked counts unavailable']),
        ...(agentTableMissing ? ['agent_executions table not migrated — agent activity metrics unavailable'] : []),
        ...(videoAvailable ? [] : ['Video pipeline stats unavailable — job and cost figures not captured']),
      ],
      risks: [
        !linearAvailable
          ? 'WIP posture unknown — Linear unreachable'
          : inFlight > shipped * 3 ? 'WIP exceeds shipped by 3x — consider WIP limits' : 'WIP under control',
      ],
      decisionsRequired: [
        openDecisions > 0 ? `${openDecisions} open decisions in board` : 'No open decisions',
      ],
      nextWeekPriorities: [
        ...(linearAvailable
          ? [
              overdue > 0 ? `Clear ${overdue} overdue items` : 'Maintain zero overdue',
              inFlight > 0 ? `Ship ${Math.ceil(inFlight * 0.3)} from current WIP` : 'Plan next cycle',
            ]
          : ['Restore the Linear connection so next week can be scored']),
        vaultCount === 0 ? 'Connect Obsidian vault for knowledge sync' : `Expand ${projectsSet.size} documented projects`,
      ],
      metrics: {
        linear: linearAvailable
          ? { shipped, inFlight, overdue, created: shipped + inFlight, available: true }
          : { shipped: null, inFlight: null, overdue: null, created: null, available: false },
        github: { commits: githubCommits, openPRs: githubOpenPRs, configured: githubConfigured },
        vault: { notesAdded, notesTotal: vaultCount, projectsActive: projectsSet.size },
        agents: { executions: agentData.length, avgDurationSec: avgDuration, successRate: successRate === null ? null : Math.round(successRate * 100), tableMigrated: !agentTableMissing },
        decisions: { open: openDecisions, blocked: blockedDecisions },
        video: videoAvailable
          ? {
              totalJobs: videoJobsTotal,
              publishedThisWeek: videoJobsPublished,
              failedThisWeek: videoJobsFailed,
              totalCostAud: videoCostAud,
              available: true,
            }
          : { totalJobs: null, publishedThisWeek: null, failedThisWeek: null, totalCostAud: null, available: false },
      },
    }

    const briefMarkdown = formatBriefMarkdown(brief)

    // weekly_reviews is the authoritative store for the weekly markdown
    // (migration 20260618010000). supabase-js resolves rather than throws on a
    // database error, so the old try/catch could never have caught one — the
    // error object was simply discarded and the route still returned success.
    // Write-then-confirm: surface any persistence failure as a 500.
    const { error: weeklyErr } = await supabase
      .from('weekly_reviews')
      .upsert({
        founder_id: founderId,
        review_period_start: weekStart.toISOString().split('T')[0],
        headline: brief.headline,
        brief_md: briefMarkdown,
        metrics: brief.metrics as unknown as Record<string, unknown>,
        decisions_queue: brief.decisionsRequired,
        next_priorities: brief.nextWeekPriorities,
        // `status` is deliberately absent. The column defaults to 'new' on insert,
        // and omitting it from the payload means a re-run within the same period
        // refreshes content without resetting a founder's 'reviewed' back to 'new'
        // — the same clobber this change fixes on board_meetings, one table over.
        updated_at: new Date().toISOString(),
      }, { onConflict: 'founder_id,review_period_start' })
    if (weeklyErr) throw new Error(`weekly_reviews upsert failed: ${weeklyErr.message}`)

    // Surface the weekly on the boardroom page.
    //
    // `MeetingCard` renders `agenda` sections only — `brief_md` appears there
    // purely as a type. The previous code wrote `brief_md` and never `agenda`, so
    // a weekly row rendered as a card with an empty body. The visible surface is
    // therefore an agenda section, not markdown.
    //
    // `board_meetings` is UNIQUE (founder_id, meeting_date) and the daily
    // `ceo-board-meeting` cron runs 50 1 * * * — every day, Sunday included. The
    // previous upsert reset `status` to 'new' and overwrote the daily's `brief_md`,
    // `linear_data`, `github_data` and `metrics`, leaving a hybrid row. This merges
    // instead: the weekly owns exactly one namespaced agenda key and touches no
    // column the daily owns. See the schema options in
    // .spm/2026-08-07-p9-board-meetings-collision.md — a `meeting_type`
    // discriminator remains available as a founder/Board-gated migration.
    const weeklyAgendaSection = {
      title: 'Weekly review',
      highlight: velocityScore === null
        ? 'Velocity unavailable — Linear unreachable'
        : `Velocity ${velocityScore}/100 — ${brief.headline}`,
      items: [
        brief.executiveSummary,
        ...brief.topWins.map((w) => `Win: ${w}`),
        ...brief.blockers.map((b) => `Blocker: ${b}`),
        ...brief.risks.map((r) => `Risk: ${r}`),
        ...brief.nextWeekPriorities.map((p) => `Next: ${p}`),
      ],
    }

    const { data: existing, error: readErr } = await supabase
      .from('board_meetings')
      .select('id, agenda')
      .eq('founder_id', founderId)
      .eq('meeting_date', today)
      .maybeSingle()
    if (readErr) throw new Error(`board_meetings read failed: ${readErr.message}`)

    let meetingId: string | null = existing?.id ?? null

    if (existing) {
      // Merge into the daily's agenda; never touch status/brief_md/linear_data/etc.
      const { error: mergeErr } = await supabase
        .from('board_meetings')
        .update({
          agenda: { ...((existing.agenda as Record<string, unknown>) ?? {}), weekly: weeklyAgendaSection },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (mergeErr) throw new Error(`board_meetings merge failed: ${mergeErr.message}`)
    } else {
      // No daily row for today — create one carrying only the weekly section.
      const { data: inserted, error: insertErr } = await supabase
        .from('board_meetings')
        .insert({
          founder_id: founderId,
          meeting_date: today,
          status: 'new',
          agenda: { weekly: weeklyAgendaSection },
          brief_md: briefMarkdown,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle()

      if (insertErr) {
        // 23505 = unique_violation: the daily cron inserted between our read and
        // this write. Re-read and merge rather than clobbering what it just wrote.
        if ((insertErr as { code?: string }).code !== '23505') {
          throw new Error(`board_meetings insert failed: ${insertErr.message}`)
        }
        const { data: raced, error: reReadErr } = await supabase
          .from('board_meetings')
          .select('id, agenda')
          .eq('founder_id', founderId)
          .eq('meeting_date', today)
          .maybeSingle()
        if (reReadErr) throw new Error(`board_meetings re-read failed: ${reReadErr.message}`)
        if (!raced) throw new Error('board_meetings insert raced but no row found on re-read')
        const { error: raceMergeErr } = await supabase
          .from('board_meetings')
          .update({
            agenda: { ...((raced.agenda as Record<string, unknown>) ?? {}), weekly: weeklyAgendaSection },
            updated_at: new Date().toISOString(),
          })
          .eq('id', raced.id)
        if (raceMergeErr) throw new Error(`board_meetings race merge failed: ${raceMergeErr.message}`)
        meetingId = raced.id
      } else {
        meetingId = inserted?.id ?? null
      }
    }

    // Read back and confirm the founder-visible section actually landed. Without
    // this the route can only claim the write was accepted, not that it committed.
    const { data: confirmed, error: confirmErr } = await supabase
      .from('board_meetings')
      .select('agenda')
      .eq('founder_id', founderId)
      .eq('meeting_date', today)
      .maybeSingle()
    if (confirmErr) throw new Error(`board_meetings confirm read failed: ${confirmErr.message}`)
    if (!(confirmed?.agenda as Record<string, unknown> | undefined)?.weekly) {
      throw new Error('board_meetings confirm failed: weekly agenda section not present after write')
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000)
    console.log(
      `[Pi-CEO Weekly] ${today} review | Velocity: ${velocityScore ?? 'n/a (Linear unavailable)'} | ` +
      `Shipped: ${linearAvailable ? shipped : 'n/a'} | Vault: ${vaultCount}`
    )

    notify({
      type: 'cron_complete',
      title: `Weekly Review — ${today}`,
      body: brief.headline,
      // An unavailable upstream is a warning in its own right; a null score must
      // not fall through to 'info' as though the week scored fine.
      severity: velocityScore === null || velocityScore < 40 ? 'warning' : 'info',
      metadata: { durationSec },
    }).catch((err) => { console.error('[cron:pi-ceo-weekly-review:notify] activity log write failed', err) })

    return NextResponse.json({ success: true, armed: true, persisted: true, meetingId, brief })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Pi-CEO Weekly] Fatal error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export function formatBriefMarkdown(brief: {
  headline: string
  executiveSummary: string
  velocityScore: number | null
  topWins: string[]
  blockers: string[]
  risks: string[]
  decisionsRequired: string[]
  nextWeekPriorities: string[]
  metrics: unknown
}): string {
  const m = brief.metrics as Record<string, Record<string, number | boolean | null>>
  // `?? 0` would restore the exact fabrication this fixes: a null count means the
  // upstream was unreachable, and must not print as a real zero.
  const linearAvailable = m.linear?.available !== false
  const linearCell = (v: number | boolean | null | undefined) =>
    linearAvailable && v != null ? `${v}` : 'N/A (Linear unavailable)'
  return [
    `# Weekly Review`,
    ``,
    `> ${brief.headline}`,
    ``,
    brief.velocityScore === null
      ? `## Velocity Score: N/A (Linear unavailable)`
      : `## Velocity Score: ${brief.velocityScore}/100`,
    ``,
    `## Executive Summary`,
    brief.executiveSummary,
    ``,
    `## Wins`,
    ...brief.topWins.map((w: string) => `- ✅ ${w}`),
    ``,
    `## Blockers`,
    ...brief.blockers.map((b: string) => `- 🚫 ${b}`),
    ``,
    `## Risks`,
    ...brief.risks.map((r: string) => `- ⚠️ ${r}`),
    ``,
    `## Decisions`,
    ...brief.decisionsRequired.map((d: string) => `- 🎯 ${d}`),
    ``,
    `## Priorities`,
    ...brief.nextWeekPriorities.map((p: string, i: number) => `${i + 1}. ${p}`),
    ``,
    `## Metrics`,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Linear Shipped | ${linearCell(m.linear?.shipped)} |`,
    `| Linear In Flight | ${linearCell(m.linear?.inFlight)} |`,
    `| Linear Overdue | ${linearCell(m.linear?.overdue)} |`,
    `| GitHub Commits | ${m.github?.commits ?? 0} |`,
    `| GitHub Open PRs | ${m.github?.openPRs ?? 0} |`,
    `| Vault Notes Total | ${m.vault?.notesTotal ?? 0} |`,
    `| Vault Notes Added | ${m.vault?.notesAdded ?? 0} |`,
    `| Agent Executions | ${m.agents?.executions ?? 0} |`,
    `| Agent Success Rate | ${m.agents?.tableMigrated === false ? 'N/A (table not migrated)' : m.agents?.successRate == null ? 'N/A (no agent runs tracked)' : `${m.agents.successRate}%`} |`,
    `| Open Decisions | ${m.decisions?.open ?? 0} |`,
    `| Blocked Decisions | ${m.decisions?.blocked ?? 0} |`,
  ].join('\n')
}

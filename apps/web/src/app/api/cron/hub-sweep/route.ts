// src/app/api/cron/hub-sweep/route.ts
// GET /api/cron/hub-sweep
// Nightly intelligence sweep — runs at 11pm AEST (13:00 UTC)
//
// For each owned satellite business:
//   1. Linear: open issue count
//   2. GitHub: last commit SHA + date (if repo_url set)
//   3. Supabase: last MACAS verdict date
//   4. Supabase: last bookkeeper run date
//   5. Calculates health_status and upserts into hub_satellites

import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitiseError } from '@/lib/error-reporting'
import { fetchIssueCountByBusiness } from '@/lib/integrations/linear'
import { fetchLastCommit, parseRepoUrl } from '@/lib/integrations/github'
import { BUSINESSES } from '@/lib/businesses'
import { getPrivateAccessConfig } from '@/lib/auth/private-access'
import { evaluateAllowListHealth, type AllowListHealth } from '@/lib/auth/allow-list-health'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute — lightweight API polling only

// ── Health calculation ────────────────────────────────────────────────────────

// `null` here means GENUINELY ABSENT — never "the read failed". A null that
// merely meant "we could not ask" silently skipped both the red and the yellow
// bookkeeper branches and fell through to green. That invariant is enforced by
// the Supabase helpers below, which throw rather than return a null they did not
// observe; this function is only ever reached with dates that were actually read.
function calculateHealthStatus(opts: {
  openLinearIssues: number
  lastCommitDaysAgo: number | null
  lastBookkeeperDaysAgo: number | null
}): 'green' | 'yellow' | 'red' {
  const { openLinearIssues, lastCommitDaysAgo, lastBookkeeperDaysAgo } = opts

  // Critical signals → red
  if (openLinearIssues > 10) return 'red'
  if (lastBookkeeperDaysAgo !== null && lastBookkeeperDaysAgo > 60) return 'red'

  // Warning signals → yellow
  if (openLinearIssues > 3) return 'yellow'
  if (lastCommitDaysAgo !== null && lastCommitDaysAgo > 30) return 'yellow'
  if (lastBookkeeperDaysAgo !== null && lastBookkeeperDaysAgo > 30) return 'yellow'

  return 'green'
}

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24))
}

// ── Supabase queries ──────────────────────────────────────────────────────────

async function fetchBusinessIdMap(
  supabase: ReturnType<typeof createServiceClient>,
  founderId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('founder_id', founderId)

  // The error was discarded and an empty map returned — byte-for-byte what a
  // founder with no businesses rows looks like. Every satellite then resolved to
  // businessId null, fetchLastMacasVerdictDate "honestly" reported null, and the
  // sweep overwrote every real last_macas_verdict_date with null, which
  // HubStatusWidget renders as "Never". A failed read is unavailability, not an
  // empty estate. Same rule as fetchIssueCountByBusiness in integrations/linear.
  if (error) {
    throw new Error(`businesses slug→id read failed: ${error.message}`)
  }

  return new Map(
    ((data as Array<{ id: string; slug: string }> | null) ?? []).map(row => [row.slug, row.id])
  )
}

async function fetchLastMacasVerdictDate(
  supabase: ReturnType<typeof createServiceClient>,
  founderId: string,
  businessId: string | null
): Promise<string | null> {
  // Live per-business signal only — no proxy. A satellite with no businesses
  // row or no judged cases honestly reports null ("Never").
  if (!businessId) return null

  const { data, error } = await supabase
    .from('advisory_cases')
    .select('created_at')
    .eq('founder_id', founderId)
    .eq('business_id', businessId)
    .eq('status', 'judged')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // A failed query returned the same null as "no judged cases", so an unreadable
  // advisory_cases table was persisted as the honest-looking date "Never".
  if (error) {
    throw new Error(`advisory_cases read failed: ${error.message}`)
  }

  return (data as { created_at: string } | null)?.created_at ?? null
}

async function fetchLastBookkeeperRunDate(
  supabase: ReturnType<typeof createServiceClient>,
  founderId: string,
  businessKey: string
): Promise<string | null> {
  // bookkeeper_runs.businesses_processed is JSONB array — check if this business was included
  const { data, error } = await supabase
    .from('bookkeeper_runs')
    .select('completed_at, businesses_processed')
    .eq('founder_id', founderId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5)

  // The most direct fail-open of the three: a discarded error returned null, and
  // calculateHealthStatus treats a null bookkeeper date as "no signal", skipping
  // both the >60d red and the >30d yellow branch and returning green. An
  // unreadable bookkeeper_runs table rendered as a healthy satellite.
  if (error) {
    throw new Error(`bookkeeper_runs read failed: ${error.message}`)
  }

  if (!data) return null

  // Find the most recent run that processed this business
  for (const run of data as Array<{ completed_at: string | null; businesses_processed: Array<{ businessKey: string; status: string }> | null }>) {
    if (!run.businesses_processed) continue
    const bizResult = run.businesses_processed.find(b => b.businessKey === businessKey && b.status === 'success')
    if (bizResult) return run.completed_at
  }

  return null
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const startTime = Date.now()

  const denied = assertCronAuth(request)
  if (denied) return denied

  const founderId = getFounderUserId()
  if (!founderId) {
    console.error('[Hub Sweep] FOUNDER_USER_ID not set')
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // --- Founder allow-list drift check (2026-07-14 lockout prevention) ---
  // Verifies FOUNDER_ALLOWED_* / FOUNDER_USER_ID still name a real, active
  // auth user, so drift is flagged nightly instead of discovered as a lockout.
  let allowListHealth: AllowListHealth | null = null
  let allowListError: string | null = null
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 })
    if (error) throw error
    allowListHealth = evaluateAllowListHealth(
      getPrivateAccessConfig(),
      data.users.map(u => ({ id: u.id, email: u.email ?? null, lastSignInAt: u.last_sign_in_at ?? null })),
    )
    const log = allowListHealth.status === 'green' ? console.log : console.error
    log(`[Hub Sweep] Founder allow-list ${allowListHealth.status}: ${allowListHealth.detail}`)
  } catch (err) {
    // A FAILED check is not a neutral event: while it fails, founder-identity
    // drift is undetected, which is the exact condition this check exists to
    // catch. Previously this was a console.warn that left `allowListHealth`
    // null and did not affect `success`, so the sweep reported "0 errors" and
    // looked healthy for weeks while the guard was blind.
    //
    // Observed 10/08/2026: `listUsers` returned 500 "Database error finding
    // users" on every run — GoTrue cannot parse a Postgres 'infinity'
    // banned_until into a Go time. The sweep still reported success.
    allowListError = err instanceof Error ? err.message : String(err)
    console.error(
      '[Hub Sweep] Allow-list health check FAILED — founder drift is UNDETECTED:',
      allowListError,
    )
  }

  // Owned satellites only
  const ownedBusinesses = BUSINESSES.filter(b => b.type === 'owned')

  // --- Fetch Linear issue counts for all businesses in one call ---
  //
  // A failed fetch USED TO be swallowed here: `linearCounts` stayed empty, the
  // per-business `?? 0` below turned every missing count into a real zero, and
  // that zero was both persisted and fed to calculateHealthStatus — which reads
  // 0 open issues as 'green'. The sweep then reported "0 errors" and success.
  // A failed read was being written to the database as good news, which is the
  // same class of defect as the allow-list guard directly above. Found by
  // independent review 11/08/2026 with a control that rejected the fetch and
  // watched the sweep report success.
  let linearCounts: Record<string, number> = {}
  let linearError: string | null = null
  try {
    linearCounts = await fetchIssueCountByBusiness()
  } catch (err) {
    linearError = err instanceof Error ? err.message : String(err)
    console.error('[Hub Sweep] Linear fetch FAILED — issue counts are UNKNOWN, not zero:', linearError)
  }
  const linearUnavailable = linearError !== null

  // --- Fetch existing hub_satellites rows to get repo_url per business ---
  // open_linear_issues and health_status are read back so an unavailable Linear
  // can preserve what was last known rather than overwrite it with zeroes.
  const { data: existingRows, error: existingRowsError } = await supabase
    .from('hub_satellites')
    .select('business_key, repo_url, stack, notes, open_linear_issues, health_status, last_commit_sha, last_commit_at')
    .eq('founder_id', founderId)

  // This error was discarded. The preserved counts below are the ONLY thing
  // standing between an unavailable Linear and a zeroed column, so a failed
  // SELECT plus an unavailable Linear would silently overwrite real counts with
  // zero — the exact outcome the preservation exists to prevent.
  if (existingRowsError) {
    console.error('[Hub Sweep] Existing-satellite read FAILED — prior counts cannot be preserved:', existingRowsError.message)
  }
  const preservationUnavailable = existingRowsError != null

  // ABORT BEFORE MUTATION. Reporting the failure afterwards was not enough:
  // without the prior rows, every upsert below would write open_linear_issues 0
  // and null out founder-maintained fields (stack, notes, repo_url) that the
  // sweep only echoes back. Nothing rolls those writes back, so the sweep would
  // destroy real data and then report the failure it had already caused. Found
  // by independent review round 6, 11/08/2026.
  if (preservationUnavailable) {
    const durationMs = Date.now() - startTime
    console.error('[Hub Sweep] ABORTED before any write — prior satellite state is unreadable')
    return NextResponse.json(
      {
        success: false,
        aborted: true,
        durationMs,
        satellitesSwept: 0,
        errors: 0,
        allowListHealth,
        allowListError,
        allowListDegraded:
          allowListError !== null || (allowListHealth !== null && allowListHealth.status !== 'green'),
        linearError,
        linearDegraded: linearUnavailable,
        preservationError: existingRowsError?.message ?? null,
        preservationDegraded: true,
        // Not yet attempted — this abort happens before the slug→id read.
        businessMapError: null,
        businessMapDegraded: false,
        // Same: no satellite loop ran, so no commit read was attempted.
        githubDegraded: false,
        githubUnreadable: [],
        results: [],
      },
      { status: 500 },
    )
  }

  const existingMap = new Map(
    (existingRows ?? []).map(row => [
      row.business_key as string,
      row as {
        repo_url: string | null
        stack: string | null
        notes: string | null
        open_linear_issues: number | null
        health_status: string | null
        // Read back for the same reason as open_linear_issues: an unreadable
        // GitHub must preserve the last known commit rather than null it out.
        last_commit_sha: string | null
        last_commit_at: string | null
      },
    ])
  )

  // --- Resolve businesses slug → id once, for per-business MACAS lookups ---
  // This is a ROOT read: it gates every satellite's MACAS lookup at once. If it
  // fails, the map is empty for ALL satellites and every last_macas_verdict_date
  // is written as null — a fleet-wide "Never" caused by one failed SELECT, with
  // nothing to roll it back. Same rule as the preservation read above: abort
  // before any write. (Per-satellite reads below stay best-effort — a failure
  // there costs one satellite, not the fleet.)
  let businessIdMap: Map<string, string>
  try {
    businessIdMap = await fetchBusinessIdMap(supabase, founderId)
  } catch (err) {
    const businessMapError = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - startTime
    console.error('[Hub Sweep] ABORTED before any write — businesses slug→id map is unreadable:', businessMapError)
    return NextResponse.json(
      {
        success: false,
        aborted: true,
        durationMs,
        satellitesSwept: 0,
        errors: 0,
        allowListHealth,
        allowListError,
        allowListDegraded:
          allowListError !== null || (allowListHealth !== null && allowListHealth.status !== 'green'),
        linearError,
        linearDegraded: linearUnavailable,
        preservationError: null,
        preservationDegraded: false,
        businessMapError,
        businessMapDegraded: true,
        // No satellite loop ran, so no commit read was attempted.
        githubDegraded: false,
        githubUnreadable: [],
        results: [],
      },
      { status: 500 },
    )
  }

  const results: Array<{ businessKey: string; status: 'ok' | 'error'; error?: string }> = []

  // Commit-read failures must survive the loop. `commitUnavailable` below is
  // per-iteration and was reaching only `health_status`; nothing carried it out
  // to the sweep's verdict, so a wholly unreadable GitHub still reported
  // `success: true` and HTTP 200.
  //
  // That was a REGRESSION this branch introduced, not an inherited gap. On main
  // `fetchLastCommit` sat bare inside the per-satellite try, so a throw reached
  // its catch, pushed an error result and made `success: errorCount === 0`
  // false. Wrapping the call in a local try/catch — correct, so the last known
  // commit is preserved instead of overwritten with a null — swallowed the
  // throw before it reached that counter. The health lie was removed and a
  // success lie installed in its place. [UNI-2498]
  const githubUnreadable: Array<{ businessKey: string; error: string }> = []

  for (const business of ownedBusinesses) {
    try {
      const existing = existingMap.get(business.key)
      // User-set repo_url wins; fall back to the registry default so GitHub
      // commit data is live without manual seeding.
      const repoUrl = existing?.repo_url ?? business.repoUrl ?? null

      // --- GitHub: last commit ---
      // `fetchLastCommit` used to answer null for an unconfigured GitHub, a
      // non-OK response and a thrown fetch as well as for a repository with no
      // commits. All four arrived here identically, and a null commit date is
      // treated below as "no signal": it skips the staleness check entirely, so
      // an unreadable GitHub could certify this satellite GREEN — and the null
      // was then persisted over the real last commit. Same class as the Linear
      // count and the bookkeeper date already handled in this function; this is
      // the third signal, which was left behind. [UNI-2487]
      let lastCommitSha: string | null = null
      let lastCommitAt: string | null = null
      let commitUnavailable = false
      if (repoUrl) {
        const parsed = parseRepoUrl(repoUrl)
        if (parsed) {
          try {
            const commit = await fetchLastCommit(parsed.owner, parsed.repo)
            if (commit) {
              lastCommitSha = commit.sha
              lastCommitAt = commit.authorDate
            }
          } catch (err) {
            // Keep what was last known rather than overwrite it with a null
            // that reads as "never committed".
            commitUnavailable = true
            lastCommitSha = existing?.last_commit_sha ?? null
            lastCommitAt = existing?.last_commit_at ?? null
            const commitError = err instanceof Error ? err.message : String(err)
            // Carried out of the loop so it reaches the verdict, not just health.
            githubUnreadable.push({
              businessKey: business.key,
              error: sanitiseError(err, 'GitHub commit read failed', {
                route: '/api/cron/hub-sweep',
                businessKey: business.key,
              }),
            })
            console.error(
              `[Hub Sweep] GitHub commit read FAILED for ${business.key} — last commit is UNKNOWN, not absent:`,
              commitError,
            )
          }
        }
      }

      // --- Supabase: MACAS + bookkeeper dates ---
      const [lastMacasDate, lastBookkeeperDate] = await Promise.all([
        fetchLastMacasVerdictDate(supabase, founderId, businessIdMap.get(business.key) ?? null),
        fetchLastBookkeeperRunDate(supabase, founderId, business.key),
      ])

      // --- Linear issue count ---
      // When Linear could not be read, keep the last known count and refuse to
      // derive health from data we do not have.
      //
      // With NO prior row there is nothing to preserve: `open_linear_issues` is
      // NOT NULL, so writing the record at all would mint a literal 0 as this
      // satellite's first and only observation. Skip the write entirely and
      // record it as an error — an absent row is honest, a fabricated zero is
      // not. Found by independent review round 6, 11/08/2026.
      if (linearUnavailable && existing?.open_linear_issues == null) {
        console.error(`[Hub Sweep] Skipping first-ever write for ${business.key}: Linear unavailable, nothing to preserve`)
        results.push({
          businessKey: business.key,
          status: 'error',
          error: 'Linear unavailable and no prior row — refused to persist a manufactured zero',
        })
        continue
      }

      const openLinearIssues = linearUnavailable
        ? existing?.open_linear_issues ?? 0
        : linearCounts[business.key] ?? 0

      // --- Health calculation ---
      // 'unknown' is a first-class value in the schema CHECK constraint and is
      // already rendered by HubStatusWidget, so an unreadable source degrades
      // to honestly-unknown rather than silently to green.
      const healthStatus: 'green' | 'yellow' | 'red' | 'unknown' = linearUnavailable || commitUnavailable
        ? 'unknown'
        : calculateHealthStatus({
            openLinearIssues,
            lastCommitDaysAgo: daysSince(lastCommitAt),
            lastBookkeeperDaysAgo: daysSince(lastBookkeeperDate),
          })

      // --- Upsert ---
      // Written fields are read back below (write-then-confirm): reporting a
      // successful sweep without confirming what actually landed would let a
      // trigger, a policy or a divergent row present itself as a clean write.
      const { data: writtenRows, error } = await supabase
        .from('hub_satellites')
        .upsert(
          {
            founder_id: founderId,
            business_key: business.key,
            business_name: business.name,
            // Preserve existing user-set fields; only sweep writes its own fields
            repo_url: repoUrl,
            stack: existing?.stack ?? null,
            notes: existing?.notes ?? null,
            open_linear_issues: openLinearIssues,
            last_commit_sha: lastCommitSha,
            last_commit_at: lastCommitAt,
            last_macas_verdict_date: lastMacasDate,
            last_bookkeeper_run_date: lastBookkeeperDate,
            health_status: healthStatus,
            last_swept_at: now,
            last_sweep_data: {
              linearAvailable: !linearUnavailable,
              linearIssues: openLinearIssues,
              lastCommitSha,
              lastCommitAt,
              lastMacasDate,
              lastBookkeeperDate,
              healthStatus,
              sweptAt: now,
            },
          },
          { onConflict: 'founder_id,business_key' }
        )
        .select(
          'business_key, business_name, repo_url, stack, notes, open_linear_issues, ' +
            'last_commit_sha, last_commit_at, last_macas_verdict_date, ' +
            'last_bookkeeper_run_date, health_status, last_swept_at',
        )

      if (error) {
        console.error(`[Hub Sweep] Upsert failed for ${business.key}:`, error.message)
        results.push({ businessKey: business.key, status: 'error', error: sanitiseError(error, 'Failed to run hub sweep', { route: '/api/cron/hub-sweep', businessKey: business.key }) })
      } else {
        // Confirm what actually landed. An upsert that returns no error but no
        // row, or a row whose authoritative fields differ from what we sent,
        // is not a successful sweep — reporting it as one is how divergent
        // state gets certified as healthy.
        // Supabase cannot infer a row type from the concatenated select string,
        // so the readback is compared as plain records.
        const readback = (writtenRows ?? []) as unknown as Array<Record<string, unknown>>
        const written = readback.find((r) => r.business_key === business.key) ?? readback[0]

        // Every field this sweep persists is compared, not just two of thirteen.
        // Verifying a subset and reporting "ok" certifies the unverified rest —
        // a trigger, policy or default that rewrote repo_url, stack, notes or a
        // date would have passed silently. Found by independent review round 6.
        const expected: Record<string, unknown> = {
          business_key: business.key,
          business_name: business.name,
          repo_url: repoUrl,
          stack: existing?.stack ?? null,
          notes: existing?.notes ?? null,
          open_linear_issues: openLinearIssues,
          last_commit_sha: lastCommitSha,
          last_commit_at: lastCommitAt,
          last_macas_verdict_date: lastMacasDate,
          last_bookkeeper_run_date: lastBookkeeperDate,
          health_status: healthStatus,
          last_swept_at: now,
        }
        // Postgres spells the same instant differently on readback — timestamptz
        // echoes a sent "…T14:22:22Z" as "…T14:22:22+00:00" — so *_at fields
        // compare as instants, not strings. Every other field still compares
        // strictly: a text field must never pass on a coincidental date parse.
        // Before this, every sweep since 13/08/2026 errored "write readback
        // mismatch" while the write had actually landed.
        const sameStoredValue = (key: string, stored: unknown, sent: unknown): boolean => {
          if (stored === sent) return true
          if (key.endsWith('_at') && typeof stored === 'string' && typeof sent === 'string') {
            const storedMs = Date.parse(stored)
            const sentMs = Date.parse(sent)
            return Number.isFinite(storedMs) && Number.isFinite(sentMs) && storedMs === sentMs
          }
          return false
        }
        const divergent = written
          ? Object.keys(expected).filter((k) => !sameStoredValue(k, written[k], expected[k]))
          : []
        const mismatch = !written || divergent.length > 0

        if (mismatch) {
          const detail = written
            ? `stored values diverge on: ${divergent
                .map((k) => `${k} (stored ${JSON.stringify(written[k])}, sent ${JSON.stringify(expected[k])})`)
                .join('; ')}`
            : 'upsert returned no row'
          console.error(`[Hub Sweep] Write-then-confirm FAILED for ${business.key}: ${detail}`)
          results.push({
            businessKey: business.key,
            status: 'error',
            error: sanitiseError(new Error(`write readback mismatch: ${detail}`), 'Failed to run hub sweep', { route: '/api/cron/hub-sweep', businessKey: business.key }),
          })
        } else {
          results.push({ businessKey: business.key, status: 'ok' })
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      console.error(`[Hub Sweep] Error processing ${business.key}:`, msg)
      results.push({ businessKey: business.key, status: 'error', error: sanitiseError(err, 'Failed to run hub sweep', { route: '/api/cron/hub-sweep', businessKey: business.key }) })
    }
  }

  const durationMs = Date.now() - startTime
  const successCount = results.filter(r => r.status === 'ok').length
  const errorCount = results.filter(r => r.status === 'error').length

  // The allow-list guard is part of the sweep's verdict, not a side note. If it
  // could not run, or it ran and is not green, this sweep did NOT verify that
  // FOUNDER_USER_ID still names a real, active user — so it must not report
  // success. Anything monitoring `success` or the completion line would
  // otherwise be told everything is fine while the identity silently drifts.
  const allowListDegraded =
    allowListError !== null || (allowListHealth !== null && allowListHealth.status !== 'green')

  const allowListNote = allowListError
    ? ' — ALLOW-LIST CHECK FAILED (drift undetected)'
    : allowListHealth && allowListHealth.status !== 'green'
      ? ` — ALLOW-LIST ${allowListHealth.status.toUpperCase()}: ${allowListHealth.detail}`
      : ''

  // Same rule as the allow-list guard: a source this sweep could not read is
  // part of the verdict, not a side note. Every satellite's issue count and
  // health is now 'unknown', so reporting success would tell any monitor that
  // a sweep which verified nothing had verified everything.
  const linearNote = linearUnavailable
    ? ` — LINEAR UNAVAILABLE (issue counts and health unknown, not zero): ${linearError}`
    : ''

  // A failed preservation read is only dangerous in combination — but that
  // combination is precisely when prior counts get replaced by zeroes. The
  // sweep now aborts before any write in that case, so this point is only
  // reached with the preservation read intact.
  const preservationNote = ''

  // Third source, same rule as the allow-list guard and Linear. A satellite whose
  // last commit could not be read still had its row written — deliberately, with
  // the prior value preserved — so it is not an `errors` entry: the upsert
  // succeeded. But the sweep did not verify what it reports for that satellite,
  // and `7/7 satellites swept, 0 errors` printed directly beneath seven
  // `GitHub commit read FAILED` lines is exactly the false-success this branch
  // exists to remove. [UNI-2498]
  const githubDegraded = githubUnreadable.length > 0

  const githubNote = githubDegraded
    ? ` — GITHUB UNAVAILABLE for ${githubUnreadable.length}/${ownedBusinesses.length}` +
      ` (last commit unknown, not absent): ${githubUnreadable.map(g => g.businessKey).join(', ')}`
    : ''

  const log =
    errorCount > 0 || allowListDegraded || linearUnavailable || preservationUnavailable || githubDegraded
      ? console.error
      : console.log
  log(
    `[Hub Sweep] Complete in ${durationMs}ms — ` +
    `${successCount}/${ownedBusinesses.length} satellites swept, ${errorCount} errors` +
    allowListNote +
    linearNote +
    preservationNote +
    githubNote
  )

  const sweepSucceeded =
    errorCount === 0 && !allowListDegraded && !linearUnavailable && !preservationUnavailable &&
    !githubDegraded

  // The body has carried success:false since the allow-list guard landed, but
  // the RESPONSE was always 200 — and schedulers, uptime monitors and Vercel
  // cron retries key off HTTP status, not off a JSON field. A sweep that failed
  // to verify anything was being recorded as a successful invocation. Found by
  // independent review 11/08/2026.
  return NextResponse.json({
    success: sweepSucceeded,
    durationMs,
    satellitesSwept: successCount,
    errors: errorCount,
    allowListHealth,
    allowListError,
    allowListDegraded,
    linearError,
    linearDegraded: linearUnavailable,
    // Unreachable when set — the sweep aborts above rather than writing.
    preservationError: null,
    preservationDegraded: preservationUnavailable,
    // Same: an unreadable slug→id map aborts above rather than reaching here.
    businessMapError: null,
    businessMapDegraded: false,
    githubDegraded,
    // Named per satellite: a partial GitHub outage is the common case, and
    // "which ones" is what makes the 500 actionable rather than just loud.
    githubUnreadable,
    results,
  },
  // 500 on a failed verdict so the structured diagnostics survive while the
  // status line stops lying to whatever is watching.
  { status: sweepSucceeded ? 200 : 500 })
}

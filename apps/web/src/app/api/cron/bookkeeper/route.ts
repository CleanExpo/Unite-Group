// src/app/api/cron/bookkeeper/route.ts
// GET /api/cron/bookkeeper
// Nightly bookkeeper CRON — runs at 02:00 AEST (16:00 UTC)
// Authenticates via CRON_SECRET, then triggers the bookkeeper orchestrator.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { runBookkeeperForAllBusinesses } from '@/lib/bookkeeper/orchestrator'
import { notify } from '@/lib/notifications'
import { triggerMacasAdvisory } from '@/lib/advisory/auto-trigger'
import { prepareBookkeeperRun } from '@/lib/bookkeeper/run-control'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — processing 8 businesses sequentially

export async function GET(request: Request) {
  const startTime = Date.now()

  // 1. Authenticate — Vercel CRON sets Authorization: Bearer ***
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    console.error('[Bookkeeper CRON] CRON_SECRET environment variable not set')
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // 2. Get founder ID — single-tenant system
  const founderId = process.env.FOUNDER_USER_ID
  if (!founderId) {
    console.error('[Bookkeeper CRON] FOUNDER_USER_ID environment variable not set')
    return NextResponse.json(
      { error: 'FOUNDER_USER_ID not configured' },
      { status: 500 }
    )
  }

  try {
    // 3. Recover stale audit rows and reject a fresh overlapping run.
    const runControl = await prepareBookkeeperRun(founderId)
    if (runControl.activeRun) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bookkeeper run already in progress',
          activeRunId: runControl.activeRun.id,
          activeRunStartedAt: runControl.activeRun.startedAt,
        },
        { status: 409 },
      )
    }

    // 4. Run the bookkeeper pipeline
    console.log(`[Bookkeeper CRON] Starting nightly run for founder ${founderId}`)
    const result = await runBookkeeperForAllBusinesses(founderId)

    const durationMs = Date.now() - startTime
    console.log(
      `[Bookkeeper CRON] Completed in ${durationMs}ms — ` +
        `status: ${result.status}, ` +
        `transactions: ${result.totalTransactions}, ` +
        `auto-reconciled: ${result.autoReconciled}, ` +
        `flagged: ${result.flaggedForReview}`
    )

    // Fire-and-forget: auto-create MACAS advisory cases for qualifying businesses
    if (result.status !== 'failed') {
      void triggerMacasAdvisory({
        founderId,
        runId: result.runId,
        runCompletedAt: new Date().toISOString(),
        businessResults: result.businessResults.map(b => ({
          businessKey: b.businessKey,
          businessName: b.businessName,
          status: b.status,
          transactionCount: b.transactionCount,
          autoReconciled: b.autoReconciled,
          flaggedForReview: b.flaggedForReview,
        })),
      }).catch(err =>
        console.error('[Bookkeeper CRON] MACAS auto-trigger error:', err)
      )
    }

    // Fire-and-forget notification
    const severity = result.status === 'failed'
      ? 'critical' as const
      : result.flaggedForReview > 0
        ? 'warning' as const
        : 'info' as const
    notify({
      type: 'bookkeeper_summary',
      title: result.status === 'failed' ? 'Bookkeeper Run FAILED' : 'Bookkeeper Run Complete',
      body:
        `Processed ${result.totalTransactions} transactions in ${durationMs}ms. ` +
        `Auto-reconciled: ${result.autoReconciled}. ` +
        `Flagged for review: ${result.flaggedForReview}. ` +
        `GST collected: $${(result.gstCollectedCents / 100).toFixed(2)}, ` +
        `GST paid: $${(result.gstPaidCents / 100).toFixed(2)}, ` +
        `Net GST: $${(result.netGstCents / 100).toFixed(2)}.`,
      severity,
      metadata: {
        runId: result.runId,
        totalTransactions: result.totalTransactions,
        autoReconciled: result.autoReconciled,
        flaggedForReview: result.flaggedForReview,
        durationMs,
      },
    }).catch(() => {})

    const responseStatus = result.status === 'failed'
      ? 500
      : result.status === 'partial'
        ? 207
        : 200

    return NextResponse.json(
      {
        success: result.status === 'completed',
        runId: result.runId,
        status: result.status,
        recoveredStaleRunIds: runControl.recoveredStaleRunIds,
        totalTransactions: result.totalTransactions,
        autoReconciled: result.autoReconciled,
        flaggedForReview: result.flaggedForReview,
        gstCollectedCents: result.gstCollectedCents,
        gstPaidCents: result.gstPaidCents,
        netGstCents: result.netGstCents,
        durationMs,
        businessResults: result.businessResults.map((b) => ({
          businessKey: b.businessKey,
          status: b.status,
          transactionCount: b.transactionCount,
          error: b.error,
        })),
      },
      { status: responseStatus },
    )
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('[Bookkeeper CRON] Fatal error:', error)

    notify({
      type: 'bookkeeper_summary',
      title: 'Bookkeeper Run FAILED',
      body: `Fatal error after ${durationMs}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical',
      metadata: { durationMs },
    }).catch(() => {})

    return NextResponse.json(
      {
        success: false,
        error: sanitiseError(error, 'Unknown error'),
        durationMs,
      },
      { status: 500 }
    )
  }
}

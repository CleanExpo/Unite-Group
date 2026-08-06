// GET /api/cron/experiment-results-ingest — UNI-2373 P4
//
// Rolls platform_analytics into experiment_results for social posts linked to
// running experiment variants. Schedule: 18:30 UTC (30 min after analytics-sync).

import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitiseError } from '@/lib/error-reporting'
import {
  aggregateExperimentResultsFromAnalytics,
  extractExternalPostIds,
  type AnalyticsMetricRow,
  type LinkedSocialPost,
} from '@/lib/experiments/ingest-from-analytics'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const NO_STORE = { 'Cache-Control': 'no-store' } as const

type VariantRow = {
  id: string
  experiment_id: string
  founder_id: string
}

type SocialPostRow = {
  id: string
  founder_id: string
  experiment_variant_id: string
  platform_post_ids: Record<string, string> | null
}

type AnalyticsDbRow = {
  social_post_id: string | null
  post_external_id: string
  metric_date: string
  platform: string
  impressions: number | null
  reach: number | null
  clicks: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

export async function GET(request: Request) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  try {
    const supabase = createServiceClient()

    const { data: experiments, error: expError } = await supabase
      .from('experiments')
      .select('id')
      .eq('status', 'running')

    if (expError) {
      return NextResponse.json(
        {
          error: sanitiseError(expError, 'Failed to query running experiments', {
            route: '/api/cron/experiment-results-ingest',
          }),
        },
        { status: 500, headers: NO_STORE },
      )
    }

    const experimentIds = (experiments ?? []).map((e: { id: string }) => e.id)
    if (experimentIds.length === 0) {
      return NextResponse.json(
        { experiments: 0, linkedPosts: 0, upserted: 0, message: 'No running experiments' },
        { headers: NO_STORE },
      )
    }

    const { data: variants, error: varError } = await supabase
      .from('experiment_variants')
      .select('id, experiment_id, founder_id')
      .in('experiment_id', experimentIds)

    if (varError) {
      return NextResponse.json(
        {
          error: sanitiseError(varError, 'Failed to query experiment variants', {
            route: '/api/cron/experiment-results-ingest',
          }),
        },
        { status: 500, headers: NO_STORE },
      )
    }

    const variantRows = (variants ?? []) as VariantRow[]
    if (variantRows.length === 0) {
      return NextResponse.json(
        { experiments: experimentIds.length, linkedPosts: 0, upserted: 0, message: 'No variants' },
        { headers: NO_STORE },
      )
    }

    const variantById = new Map(variantRows.map((v) => [v.id, v]))
    const variantIds = variantRows.map((v) => v.id)

    const { data: posts, error: postError } = await supabase
      .from('social_posts')
      .select('id, founder_id, experiment_variant_id, platform_post_ids')
      .in('experiment_variant_id', variantIds)

    if (postError) {
      return NextResponse.json(
        {
          error: sanitiseError(postError, 'Failed to query experiment-linked social posts', {
            route: '/api/cron/experiment-results-ingest',
          }),
        },
        { status: 500, headers: NO_STORE },
      )
    }

    const socialPosts = (posts ?? []) as SocialPostRow[]
    const linkedPosts: LinkedSocialPost[] = []
    for (const post of socialPosts) {
      const variant = variantById.get(post.experiment_variant_id)
      if (!variant) continue
      linkedPosts.push({
        id: post.id,
        founderId: post.founder_id,
        experimentVariantId: post.experiment_variant_id,
        experimentId: variant.experiment_id,
        platformPostIds: post.platform_post_ids,
      })
    }

    if (linkedPosts.length === 0) {
      return NextResponse.json(
        {
          experiments: experimentIds.length,
          linkedPosts: 0,
          upserted: 0,
          message: 'No social posts linked to running experiment variants',
        },
        { headers: NO_STORE },
      )
    }

    const postIds = linkedPosts.map((p) => p.id)
    const externalIds = [
      ...new Set(linkedPosts.flatMap((p) => extractExternalPostIds(p.platformPostIds))),
    ]

    const analyticsByKey = new Map<string, AnalyticsDbRow>()

    for (const ids of chunk(postIds, 100)) {
      const { data, error } = await supabase
        .from('platform_analytics')
        .select(
          'social_post_id, post_external_id, metric_date, platform, impressions, reach, clicks, likes, comments, shares, saves',
        )
        .in('social_post_id', ids)

      if (error) {
        return NextResponse.json(
          {
            error: sanitiseError(error, 'Failed to query platform_analytics by social_post_id', {
              route: '/api/cron/experiment-results-ingest',
            }),
          },
          { status: 500, headers: NO_STORE },
        )
      }

      for (const row of (data ?? []) as AnalyticsDbRow[]) {
        const key = `${row.platform}|${row.post_external_id}|${row.metric_date}`
        analyticsByKey.set(key, row)
      }
    }

    for (const ids of chunk(externalIds, 100)) {
      if (ids.length === 0) continue
      const { data, error } = await supabase
        .from('platform_analytics')
        .select(
          'social_post_id, post_external_id, metric_date, platform, impressions, reach, clicks, likes, comments, shares, saves',
        )
        .in('post_external_id', ids)

      if (error) {
        return NextResponse.json(
          {
            error: sanitiseError(error, 'Failed to query platform_analytics by post_external_id', {
              route: '/api/cron/experiment-results-ingest',
            }),
          },
          { status: 500, headers: NO_STORE },
        )
      }

      for (const row of (data ?? []) as AnalyticsDbRow[]) {
        const key = `${row.platform}|${row.post_external_id}|${row.metric_date}`
        analyticsByKey.set(key, row)
      }
    }

    const analyticsRows: AnalyticsMetricRow[] = [...analyticsByKey.values()].map((row) => ({
      socialPostId: row.social_post_id,
      postExternalId: row.post_external_id,
      metricDate: row.metric_date,
      platform: row.platform,
      impressions: row.impressions,
      reach: row.reach,
      clicks: row.clicks,
      likes: row.likes,
      comments: row.comments,
      shares: row.shares,
      saves: row.saves,
    }))

    const upserts = aggregateExperimentResultsFromAnalytics(linkedPosts, analyticsRows)

    if (upserts.length === 0) {
      return NextResponse.json(
        {
          experiments: experimentIds.length,
          linkedPosts: linkedPosts.length,
          analyticsRows: analyticsRows.length,
          upserted: 0,
          message: 'No matching platform_analytics rows for linked experiment posts',
        },
        { headers: NO_STORE },
      )
    }

    let upserted = 0
    for (const batch of chunk(upserts, 50)) {
      const { error: upsertError } = await supabase
        .from('experiment_results')
        .upsert(batch, { onConflict: 'variant_id,period_date' })

      if (upsertError) {
        return NextResponse.json(
          {
            error: sanitiseError(upsertError, 'Failed to upsert experiment_results', {
              route: '/api/cron/experiment-results-ingest',
            }),
            upserted,
          },
          { status: 500, headers: NO_STORE },
        )
      }
      upserted += batch.length
    }

    return NextResponse.json(
      {
        experiments: experimentIds.length,
        linkedPosts: linkedPosts.length,
        analyticsRows: analyticsRows.length,
        upserted,
        source: 'api_sync',
      },
      { headers: NO_STORE },
    )
  } catch (err) {
    return NextResponse.json(
      {
        error: sanitiseError(err, 'Experiment results ingest cron failed', {
          route: '/api/cron/experiment-results-ingest',
        }),
      },
      { status: 500, headers: NO_STORE },
    )
  }
}

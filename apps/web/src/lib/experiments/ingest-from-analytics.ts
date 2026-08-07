// platform_analytics → experiment_results ingest (UNI-2373 P4).
//
// Experiments stay decorative without a producer: social_posts link to
// experiment_variants via experiment_variant_id; analytics-sync fills
// platform_analytics; this module aggregates those rows into daily
// experiment_results (source = api_sync).

export type LinkedSocialPost = {
  id: string
  founderId: string
  experimentVariantId: string
  experimentId: string
  /** platform → external post id, as stored by social-publisher */
  platformPostIds: Record<string, string> | null
}

export type AnalyticsMetricRow = {
  socialPostId: string | null
  postExternalId: string
  metricDate: string
  platform: string
  impressions: number | null
  reach: number | null
  clicks: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
}

export type ExperimentResultUpsert = {
  variant_id: string
  experiment_id: string
  founder_id: string
  period_date: string
  impressions: number
  reach: number
  clicks: number
  likes: number
  comments: number
  shares: number
  saves: number
  conversions: number
  conversion_value_cents: number
  platform_data: {
    platforms: string[]
    socialPostIds: string[]
    analyticsRows: number
  }
  source: 'api_sync'
}

export function extractExternalPostIds(
  platformPostIds: Record<string, string> | null | undefined,
): string[] {
  if (!platformPostIds || typeof platformPostIds !== 'object') return []
  return Object.values(platformPostIds)
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0)
}

export function resolvePostForAnalytics(
  row: AnalyticsMetricRow,
  postsById: Map<string, LinkedSocialPost>,
  postsByExternalId: Map<string, LinkedSocialPost>,
): LinkedSocialPost | null {
  if (row.socialPostId) {
    const byId = postsById.get(row.socialPostId)
    if (byId) return byId
  }
  return postsByExternalId.get(row.postExternalId) ?? null
}

function n(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

type AggBucket = {
  variant_id: string
  experiment_id: string
  founder_id: string
  period_date: string
  impressions: number
  reach: number
  clicks: number
  likes: number
  comments: number
  shares: number
  saves: number
  platforms: Set<string>
  socialPostIds: Set<string>
  analyticsRows: number
}

/**
 * Aggregate platform_analytics rows onto (variant_id, period_date) buckets.
 * Unlinked analytics rows are skipped. Multiple posts/platforms for the same
 * variant on the same day are summed.
 */
export function aggregateExperimentResultsFromAnalytics(
  posts: LinkedSocialPost[],
  analytics: AnalyticsMetricRow[],
): ExperimentResultUpsert[] {
  const postsById = new Map(posts.map((p) => [p.id, p]))
  const postsByExternalId = new Map<string, LinkedSocialPost>()
  for (const post of posts) {
    for (const ext of extractExternalPostIds(post.platformPostIds)) {
      postsByExternalId.set(ext, post)
    }
  }

  const buckets = new Map<string, AggBucket>()

  for (const row of analytics) {
    const post = resolvePostForAnalytics(row, postsById, postsByExternalId)
    if (!post) continue

    const periodDate = row.metricDate.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodDate)) continue

    const key = `${post.experimentVariantId}|${periodDate}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        variant_id: post.experimentVariantId,
        experiment_id: post.experimentId,
        founder_id: post.founderId,
        period_date: periodDate,
        impressions: 0,
        reach: 0,
        clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        platforms: new Set(),
        socialPostIds: new Set(),
        analyticsRows: 0,
      }
      buckets.set(key, bucket)
    }

    bucket.impressions += n(row.impressions)
    bucket.reach += n(row.reach)
    bucket.clicks += n(row.clicks)
    bucket.likes += n(row.likes)
    bucket.comments += n(row.comments)
    bucket.shares += n(row.shares)
    bucket.saves += n(row.saves)
    bucket.platforms.add(row.platform)
    bucket.socialPostIds.add(post.id)
    bucket.analyticsRows += 1
  }

  return [...buckets.values()].map((b) => ({
    variant_id: b.variant_id,
    experiment_id: b.experiment_id,
    founder_id: b.founder_id,
    period_date: b.period_date,
    impressions: b.impressions,
    reach: b.reach,
    clicks: b.clicks,
    likes: b.likes,
    comments: b.comments,
    shares: b.shares,
    saves: b.saves,
    conversions: 0,
    conversion_value_cents: 0,
    platform_data: {
      platforms: [...b.platforms].sort(),
      socialPostIds: [...b.socialPostIds].sort(),
      analyticsRows: b.analyticsRows,
    },
    source: 'api_sync' as const,
  }))
}

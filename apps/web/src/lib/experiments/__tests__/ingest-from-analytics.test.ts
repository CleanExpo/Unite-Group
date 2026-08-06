import { describe, expect, it } from 'vitest'
import {
  aggregateExperimentResultsFromAnalytics,
  extractExternalPostIds,
  resolvePostForAnalytics,
  type AnalyticsMetricRow,
  type LinkedSocialPost,
} from '../ingest-from-analytics'

const postA: LinkedSocialPost = {
  id: 'sp-1',
  founderId: 'founder-1',
  experimentVariantId: 'var-a',
  experimentId: 'exp-1',
  platformPostIds: { facebook: 'fb-111', instagram: 'ig-222' },
}

const postB: LinkedSocialPost = {
  id: 'sp-2',
  founderId: 'founder-1',
  experimentVariantId: 'var-b',
  experimentId: 'exp-1',
  platformPostIds: { linkedin: 'li-333' },
}

describe('extractExternalPostIds', () => {
  it('returns trimmed external ids', () => {
    expect(extractExternalPostIds({ facebook: '  abc  ', empty: '' })).toEqual(['abc'])
  })

  it('returns empty for nullish', () => {
    expect(extractExternalPostIds(null)).toEqual([])
    expect(extractExternalPostIds(undefined)).toEqual([])
  })
})

describe('resolvePostForAnalytics', () => {
  const byId = new Map([[postA.id, postA]])
  const byExt = new Map([
    ['fb-111', postA],
    ['ig-222', postA],
  ])

  it('prefers social_post_id', () => {
    const row: AnalyticsMetricRow = {
      socialPostId: 'sp-1',
      postExternalId: 'other',
      metricDate: '2026-08-01',
      platform: 'facebook',
      impressions: 1,
      reach: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    }
    expect(resolvePostForAnalytics(row, byId, byExt)?.id).toBe('sp-1')
  })

  it('falls back to external id', () => {
    const row: AnalyticsMetricRow = {
      socialPostId: null,
      postExternalId: 'fb-111',
      metricDate: '2026-08-01',
      platform: 'facebook',
      impressions: 1,
      reach: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    }
    expect(resolvePostForAnalytics(row, byId, byExt)?.id).toBe('sp-1')
  })

  it('returns null when unlinked', () => {
    const row: AnalyticsMetricRow = {
      socialPostId: null,
      postExternalId: 'unknown',
      metricDate: '2026-08-01',
      platform: 'tiktok',
      impressions: 9,
      reach: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    }
    expect(resolvePostForAnalytics(row, byId, byExt)).toBeNull()
  })
})

describe('aggregateExperimentResultsFromAnalytics', () => {
  it('sums metrics per variant and day across platforms', () => {
    const analytics: AnalyticsMetricRow[] = [
      {
        socialPostId: 'sp-1',
        postExternalId: 'fb-111',
        metricDate: '2026-08-01',
        platform: 'facebook',
        impressions: 100,
        reach: 80,
        clicks: 10,
        likes: 5,
        comments: 1,
        shares: 2,
        saves: 0,
      },
      {
        socialPostId: null,
        postExternalId: 'ig-222',
        metricDate: '2026-08-01',
        platform: 'instagram',
        impressions: 50,
        reach: 40,
        clicks: 4,
        likes: 3,
        comments: 0,
        shares: 1,
        saves: 2,
      },
      {
        socialPostId: null,
        postExternalId: 'li-333',
        metricDate: '2026-08-01',
        platform: 'linkedin',
        impressions: 20,
        reach: 15,
        clicks: 2,
        likes: 1,
        comments: 0,
        shares: 0,
        saves: 0,
      },
      {
        socialPostId: null,
        postExternalId: 'orphan',
        metricDate: '2026-08-01',
        platform: 'facebook',
        impressions: 999,
        reach: 0,
        clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      },
    ]

    const rows = aggregateExperimentResultsFromAnalytics([postA, postB], analytics)
    expect(rows).toHaveLength(2)

    const control = rows.find((r) => r.variant_id === 'var-a')
    expect(control).toMatchObject({
      experiment_id: 'exp-1',
      founder_id: 'founder-1',
      period_date: '2026-08-01',
      impressions: 150,
      reach: 120,
      clicks: 14,
      likes: 8,
      comments: 1,
      shares: 3,
      saves: 2,
      conversions: 0,
      source: 'api_sync',
    })
    expect(control?.platform_data.platforms).toEqual(['facebook', 'instagram'])
    expect(control?.platform_data.analyticsRows).toBe(2)

    const treatment = rows.find((r) => r.variant_id === 'var-b')
    expect(treatment).toMatchObject({
      impressions: 20,
      source: 'api_sync',
    })
  })

  it('returns empty when there are no linked posts', () => {
    expect(
      aggregateExperimentResultsFromAnalytics([], [
        {
          socialPostId: 'x',
          postExternalId: 'y',
          metricDate: '2026-08-01',
          platform: 'facebook',
          impressions: 1,
          reach: 0,
          clicks: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        },
      ]),
    ).toEqual([])
  })
})

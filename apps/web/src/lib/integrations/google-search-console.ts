// src/lib/integrations/google-search-console.ts
// Google Search Console API client for SEO analytics
// Reference: https://developers.google.com/webmaster-tools/search-console-api-original/v3

import { getValidToken } from './google-oauth'
import type { StoredTokens } from './google-oauth'

const GSC_BASE_URL = 'https://www.googleapis.com/webmasters/v3'

export interface GSCSite {
  siteUrl: string
  permissionLevel: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser'
}

export interface GSCSearchAnalyticsRequest {
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  dimensions?: ('date' | 'country' | 'device' | 'page' | 'query')[]
  type?: 'web' | 'image' | 'video' | 'news'
  rowLimit?: number
  startRow?: number
  dimensionFilterGroups?: {
    filters: {
      dimension: string
      operator: 'contains' | 'equals' | 'notEquals' | 'includingRegex' | 'excludingRegex'
      expression: string
    }[]
  }[]
}

export interface GSCSearchAnalyticsRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCSearchAnalyticsResponse {
  rows: GSCSearchAnalyticsRow[]
  responseAggregationType: 'auto' | 'byPage' | 'byProperty'
}

export interface GSCError {
  error: {
    code: number
    message: string
    status: string
  }
}

/**
 * List all sites the authenticated user has access to.
 */
export async function listSites(
  tokens: StoredTokens
): Promise<{ sites: GSCSite[]; error?: string }> {
  const token = await getValidToken(tokens)
  if (!token) return { sites: [], error: 'No valid Google token' }

  const res = await fetch(`${GSC_BASE_URL}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err: GSCError = await res.json()
    return { sites: [], error: err.error?.message || `GSC sites error: ${res.status}` }
  }

  const data = (await res.json()) as { siteEntry?: GSCSite[] }
  return { sites: data.siteEntry ?? [] }
}

/**
 * Fetch search analytics for a specific site.
 */
export async function fetchSearchAnalytics(
  siteUrl: string,
  params: GSCSearchAnalyticsRequest,
  tokens: StoredTokens
): Promise<{ data?: GSCSearchAnalyticsResponse; error?: string }> {
  const token = await getValidToken(tokens)
  if (!token) return { error: 'No valid Google token' }

  // URL-encode the site URL for the path
  const encodedSite = encodeURIComponent(siteUrl)

  const res = await fetch(
    `${GSC_BASE_URL}/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    }
  )

  if (!res.ok) {
    const err: GSCError = await res.json()
    return { error: err.error?.message || `GSC analytics error: ${res.status}` }
  }

  const data = (await res.json()) as GSCSearchAnalyticsResponse
  return { data }
}

/**
 * Fetch top queries for a site (convenience wrapper).
 */
export async function fetchTopQueries(
  siteUrl: string,
  days: number = 30,
  limit: number = 100,
  tokens: StoredTokens
): Promise<{ queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>; error?: string }> {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data, error } = await fetchSearchAnalytics(
    siteUrl,
    {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit,
    },
    tokens
  )

  if (error || !data) return { queries: [], error }

  const queries = data.rows.map((row) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100, // % with 2 decimals
    position: Math.round(row.position * 100) / 100,
  }))

  return { queries }
}

/**
 * Fetch top pages for a site (convenience wrapper).
 */
export async function fetchTopPages(
  siteUrl: string,
  days: number = 30,
  limit: number = 100,
  tokens: StoredTokens
): Promise<{ pages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>; error?: string }> {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data, error } = await fetchSearchAnalytics(
    siteUrl,
    {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: limit,
    },
    tokens
  )

  if (error || !data) return { pages: [], error }

  const pages = data.rows.map((row) => ({
    page: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100,
    position: Math.round(row.position * 100) / 100,
  }))

  return { pages }
}

/**
 * Fetch daily clicks/impressions trend.
 */
export async function fetchDailyTrend(
  siteUrl: string,
  days: number = 30,
  tokens: StoredTokens
): Promise<{ trend: Array<{ date: string; clicks: number; impressions: number }>; error?: string }> {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data, error } = await fetchSearchAnalytics(
    siteUrl,
    {
      startDate,
      endDate,
      dimensions: ['date'],
      rowLimit: 1000,
    },
    tokens
  )

  if (error || !data) return { trend: [], error }

  const trend = data.rows.map((row) => ({
    date: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
  }))

  return { trend }
}

// src/lib/integrations/google-analytics.ts
// Google Analytics 4 (GA4) Data API client
// Reference: https://developers.google.com/analytics/devguides/reporting/data/v1

import { getValidToken } from './google-oauth'
import type { StoredTokens } from './google-oauth'

const GA4_BASE_URL = 'https://analyticsdata.googleapis.com/v1beta'

export interface GA4RunReportRequest {
  propertyId: string  // Format: properties/XXXXXX or just XXXXXX
  dateRanges: Array<{ startDate: string; endDate: string }>
  dimensions?: Array<{ name: string }>
  metrics?: Array<{ name: string }>
  limit?: number
  offset?: number
  dimensionFilter?: GA4Filter
  metricFilter?: GA4Filter
  orderBys?: Array<{
    dimension?: { dimensionName: string; orderType?: 'ALPHANUMERIC' | 'CASE_INSENSITIVE_ALPHANUMERIC' | 'NUMERIC' }
    metric?: { metricName: string }
    desc?: boolean
  }>
}

export interface GA4Filter {
  fieldName: string
  stringFilter?: { matchType: 'EXACT' | 'BEGINS_WITH' | 'ENDS_WITH' | 'CONTAINS' | 'FULL_REGEXP' | 'PARTIAL_REGEXP'; value: string }
  inListFilter?: { values: string[] }
  numericFilter?: { operation: 'EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL'; value: { int64Value: string } }
}

export interface GA4RunReportResponse {
  dimensionHeaders: Array<{ name: string }>
  metricHeaders: Array<{ name: string; type: string }>
  rows: Array<{
    dimensionValues: Array<{ value: string }>
    metricValues: Array<{ value: string }>
  }>
  rowCount: number
  totals: Array<{
    dimensionValues: Array<{ value: string }>
    metricValues: Array<{ value: string }>
  }>
}

export interface GA4Error {
  error: {
    code: number
    message: string
    status: string
  }
}

// Standard dimensions
export const GA4_DIMENSIONS = {
  date: 'date',
  sessionSource: 'sessionSource',
  sessionMedium: 'sessionMedium',
  sessionCampaign: 'sessionCampaign',
  sessionDefaultChannelGroup: 'sessionDefaultChannelGroup',
  pageTitle: 'pageTitle',
  pagePath: 'pagePath',
  landingPage: 'landingPage',
  deviceCategory: 'deviceCategory',
  country: 'country',
  city: 'city',
} as const

// Standard metrics
export const GA4_METRICS = {
  sessions: 'sessions',
  activeUsers: 'activeUsers',
  newUsers: 'newUsers',
  screenPageViews: 'screenPageViews',
  averageSessionDuration: 'averageSessionDuration',
  bounceRate: 'bounceRate',
  sessionConversionRate: 'sessionConversionRate',
  totalAdRevenue: 'totalAdRevenue',
  eventCount: 'eventCount',
  eventValue: 'eventValue',
} as const

/**
 * Run a GA4 report.
 */
export async function runReport(
  propertyId: string,
  request: Omit<GA4RunReportRequest, 'propertyId'>,
  tokens: StoredTokens
): Promise<{ data?: GA4RunReportResponse; error?: string }> {
  const token = await getValidToken(tokens)
  if (!token) return { error: 'No valid Google token' }

  const cleanPropertyId = propertyId.replace(/^properties\//, '')

  const res = await fetch(
    `${GA4_BASE_URL}/properties/${cleanPropertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    }
  )

  if (!res.ok) {
    const err: GA4Error = await res.json()
    return { error: err.error?.message || `GA4 report error: ${res.status}` }
  }

  const data = (await res.json()) as GA4RunReportResponse
  return { data }
}

/**
 * Fetch traffic overview (sessions, users, bounce rate, avg duration).
 */
export async function fetchTrafficOverview(
  propertyId: string,
  days: number = 30,
  tokens: StoredTokens
): Promise<{
  overview?: {
    sessions: number
    activeUsers: number
    newUsers: number
    screenPageViews: number
    avgSessionDuration: number
    bounceRate: number
  }
  error?: string
}> {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data, error } = await runReport(
    propertyId,
    {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: GA4_METRICS.sessions },
        { name: GA4_METRICS.activeUsers },
        { name: GA4_METRICS.newUsers },
        { name: GA4_METRICS.screenPageViews },
        { name: GA4_METRICS.averageSessionDuration },
        { name: GA4_METRICS.bounceRate },
      ],
    },
    tokens
  )

  if (error || !data?.totals?.[0]) return { error }

  const m = data.totals[0].metricValues
  return {
    overview: {
      sessions: parseInt(m[0]?.value ?? '0'),
      activeUsers: parseInt(m[1]?.value ?? '0'),
      newUsers: parseInt(m[2]?.value ?? '0'),
      screenPageViews: parseInt(m[3]?.value ?? '0'),
      avgSessionDuration: parseFloat(m[4]?.value ?? '0'),
      bounceRate: parseFloat(m[5]?.value ?? '0'),
    },
  }
}

/**
 * Fetch daily traffic trend.
 */
export async function fetchDailyTrafficTrend(
  propertyId: string,
  days: number = 30,
  tokens: StoredTokens
): Promise<{ trend: Array<{ date: string; sessions: number; activeUsers: number }>; error?: string }> {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data, error } = await runReport(
    propertyId,
    {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: GA4_DIMENSIONS.date }],
      metrics: [
        { name: GA4_METRICS.sessions },
        { name: GA4_METRICS.activeUsers },
      ],
      orderBys: [{ dimension: { dimensionName: GA4_DIMENSIONS.date } }],
      limit: 1000,
    },
    tokens
  )

  if (error || !data) return { trend: [], error }

  const trend = data.rows.map((row) => ({
    date: row.dimensionValues[0]?.value ?? '',
    sessions: parseInt(row.metricValues[0]?.value ?? '0'),
    activeUsers: parseInt(row.metricValues[1]?.value ?? '0'),
  }))

  return { trend }
}

/**
 * Fetch traffic by channel (organic, direct, social, referral, etc.).
 */
export async function fetchTrafficByChannel(
  propertyId: string,
  days: number = 30,
  tokens: StoredTokens
): Promise<{ channels: Array<{ channel: string; sessions: number; activeUsers: number }>; error?: string }> {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data, error } = await runReport(
    propertyId,
    {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: GA4_DIMENSIONS.sessionDefaultChannelGroup }],
      metrics: [
        { name: GA4_METRICS.sessions },
        { name: GA4_METRICS.activeUsers },
      ],
      orderBys: [{ metric: { metricName: GA4_METRICS.sessions }, desc: true }],
      limit: 100,
    },
    tokens
  )

  if (error || !data) return { channels: [], error }

  const channels = data.rows.map((row) => ({
    channel: row.dimensionValues[0]?.value ?? '(not set)',
    sessions: parseInt(row.metricValues[0]?.value ?? '0'),
    activeUsers: parseInt(row.metricValues[1]?.value ?? '0'),
  }))

  return { channels }
}

/**
 * Fetch top pages by page views.
 */
export async function fetchTopPages(
  propertyId: string,
  days: number = 30,
  limit: number = 20,
  tokens: StoredTokens
): Promise<{ pages: Array<{ pagePath: string; pageTitle: string; screenPageViews: number; sessions: number }>; error?: string }> {
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data, error } = await runReport(
    propertyId,
    {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: GA4_DIMENSIONS.pagePath },
        { name: GA4_DIMENSIONS.pageTitle },
      ],
      metrics: [
        { name: GA4_METRICS.screenPageViews },
        { name: GA4_METRICS.sessions },
      ],
      orderBys: [{ metric: { metricName: GA4_METRICS.screenPageViews }, desc: true }],
      limit,
    },
    tokens
  )

  if (error || !data) return { pages: [], error }

  const pages = data.rows.map((row) => ({
    pagePath: row.dimensionValues[0]?.value ?? '(not set)',
    pageTitle: row.dimensionValues[1]?.value ?? '(not set)',
    screenPageViews: parseInt(row.metricValues[0]?.value ?? '0'),
    sessions: parseInt(row.metricValues[1]?.value ?? '0'),
  }))

  return { pages }
}

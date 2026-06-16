export type CrmOpportunityForecastStage =
  | 'new_signal'
  | 'qualified'
  | 'discovery'
  | 'proposal_needed'
  | 'proposal_sent'
  | 'negotiation'
  | 'decision_needed'
  | 'won_pending_client_conversion'
  | 'won_converted'
  | 'lost'
  | 'paused'
  | 'blocked_review'
  | string

export type CrmOpportunityForecastStatus =
  | 'open'
  | 'won'
  | 'lost'
  | 'paused'
  | 'blocked_review'
  | 'cancelled'
  | string

export interface CrmOpportunityForecastRow {
  id: string
  name: string
  stage: CrmOpportunityForecastStage
  status: CrmOpportunityForecastStatus
  value_amount: number | string | null
  value_currency: string | null
  probability: number | string | null
  expected_close_at: string | null
  approval_required: boolean | null
  approval_status: string | null
  owner?: string | null
  next_action?: string | null
  next_action_due_at?: string | null
}

export interface CrmForecastBucket {
  month: string
  currency: string
  opportunityCount: number
  weightedValue: number
  faceValue: number
}

export interface CrmApprovalGatedOpportunity {
  id: string
  name: string
  stage: string
  status: string
  approvalStatus: string
  weightedValue: number
  nextAction: string | null
}

export interface CrmOpportunityForecast {
  source: 'crm:opportunity-forecast'
  currency: string
  openOpportunityCount: number
  excludedOpportunityCount: number
  weightedForecast: number
  faceValue: number
  buckets: CrmForecastBucket[]
  approvalGated: CrmApprovalGatedOpportunity[]
}

const EXCLUDED_STATUSES = new Set(['lost', 'cancelled', 'blocked_review'])
const EXCLUDED_STAGES = new Set(['lost', 'blocked_review'])
const DEFAULT_CURRENCY = 'AUD'

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clampProbability(value: number | string | null | undefined): number {
  return Math.max(0, Math.min(100, toNumber(value)))
}

function monthKey(value: string | null | undefined): string {
  if (!value) return 'unscheduled'
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return 'unscheduled'
  return new Date(timestamp).toISOString().slice(0, 7)
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function isExcluded(row: CrmOpportunityForecastRow): boolean {
  return EXCLUDED_STATUSES.has(String(row.status).toLowerCase()) || EXCLUDED_STAGES.has(String(row.stage).toLowerCase())
}

function isApprovalGated(row: CrmOpportunityForecastRow): boolean {
  return row.approval_required === true || row.stage === 'won_pending_client_conversion'
}

export function buildOpportunityForecast(
  rows: CrmOpportunityForecastRow[],
  currency: string = DEFAULT_CURRENCY,
): CrmOpportunityForecast {
  const buckets = new Map<string, CrmForecastBucket>()
  const approvalGated: CrmApprovalGatedOpportunity[] = []
  let openOpportunityCount = 0
  let excludedOpportunityCount = 0
  let weightedForecast = 0
  let faceValue = 0

  for (const row of rows) {
    if (isExcluded(row)) {
      excludedOpportunityCount += 1
      continue
    }

    const value = Math.max(0, toNumber(row.value_amount))
    const probability = clampProbability(row.probability)
    const weightedValue = value * (probability / 100)
    const rowCurrency = row.value_currency?.trim() || currency
    const bucketKey = monthKey(row.expected_close_at)
    const bucketId = `${bucketKey}:${rowCurrency}`

    openOpportunityCount += 1
    weightedForecast += weightedValue
    faceValue += value

    const bucket = buckets.get(bucketId) ?? {
      month: bucketKey,
      currency: rowCurrency,
      opportunityCount: 0,
      weightedValue: 0,
      faceValue: 0,
    }
    bucket.opportunityCount += 1
    bucket.weightedValue += weightedValue
    bucket.faceValue += value
    buckets.set(bucketId, bucket)

    if (isApprovalGated(row)) {
      approvalGated.push({
        id: row.id,
        name: row.name,
        stage: row.stage,
        status: row.status,
        approvalStatus: row.approval_status || 'not_required',
        weightedValue: roundMoney(weightedValue),
        nextAction: row.next_action ?? null,
      })
    }
  }

  return {
    source: 'crm:opportunity-forecast',
    currency,
    openOpportunityCount,
    excludedOpportunityCount,
    weightedForecast: roundMoney(weightedForecast),
    faceValue: roundMoney(faceValue),
    buckets: [...buckets.values()]
      .map((bucket) => ({
        ...bucket,
        weightedValue: roundMoney(bucket.weightedValue),
        faceValue: roundMoney(bucket.faceValue),
      }))
      .sort((a, b) => a.month.localeCompare(b.month) || a.currency.localeCompare(b.currency)),
    approvalGated: approvalGated.sort((a, b) => b.weightedValue - a.weightedValue),
  }
}

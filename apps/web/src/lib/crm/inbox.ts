// src/lib/crm/inbox.ts
// Founder Inbox: one newest-first list of every inbound signal — website leads
// (crm_leads), card enquiries and card feedback. Reads go through the caller's
// RLS-scoped server client. A failed source is reported in `failedSources`;
// it is never folded into an empty list.

export type InboxSource = 'website_lead' | 'card_enquiry' | 'card_feedback'

export const INBOX_SOURCES: readonly InboxSource[] = ['website_lead', 'card_enquiry', 'card_feedback']

export const INBOX_SOURCE_LABELS: Record<InboxSource, string> = {
  website_lead: 'Website lead',
  card_enquiry: 'Card enquiry',
  card_feedback: 'Card feedback',
}

export const INBOX_WINDOW_DAYS = 90
export const INBOX_ROW_LIMIT = 500
const PREVIEW_MAX = 160

export interface InboxItem {
  id: string
  source: InboxSource
  receivedAt: string
  name: string
  email: string | null
  /** Business or card the signal came from, when known. */
  origin: string | null
  preview: string
  contactId: string | null
}

export interface LeadRow {
  id: string
  first_name: string
  last_name: string | null
  email: string
  company: string | null
  message: string | null
  interests: string | null
  source: string
  additional_data: Record<string, unknown> | null
  captured_at: string
}

export interface EnquiryRow {
  id: string
  created_at: string
  card_slug: string
  first_name: string
  business: string | null
  ask: string
  reply_email: string | null
}

export interface FeedbackRow {
  id: string
  created_at: string
  card_slug: string
  first_name: string
  answers: Record<string, unknown> | null
}

interface QueryResult {
  data: unknown[] | null
  error: { message: string } | null
}

/** Minimal structural view of the Supabase query builder used here. */
export interface InboxQuery extends PromiseLike<QueryResult> {
  select(columns: string): InboxQuery
  eq(column: string, value: string): InboxQuery
  gte(column: string, value: string): InboxQuery
  in(column: string, values: string[]): InboxQuery
  or(filters: string): InboxQuery
  order(column: string, options: { ascending: boolean }): InboxQuery
  limit(count: number): InboxQuery
}

export interface InboxClient {
  from(table: string): InboxQuery
}

export interface InboxResult {
  items: InboxItem[]
  failedSources: InboxSource[]
  contactLinksFailed: boolean
  /** Sources that returned the row limit, so older rows may be missing. */
  truncated: InboxSource[]
}

function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= PREVIEW_MAX ? flat : `${flat.slice(0, PREVIEW_MAX - 3)}...`
}

function fullName(first: string, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ').trim()
}

function describeAnswers(answers: Record<string, unknown> | null): string {
  if (!answers) return ''
  return Object.entries(answers)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join('; ')
}

export function mergeInbox(
  rows: { leads: LeadRow[]; enquiries: EnquiryRow[]; feedback: FeedbackRow[] },
  contactIdByEmail: ReadonlyMap<string, string>,
): InboxItem[] {
  const items: InboxItem[] = []

  for (const l of rows.leads) {
    const businessKey = l.additional_data?.business_key
    const key = l.email.toLowerCase()
    items.push({
      id: `website_lead:${l.id}`,
      source: 'website_lead',
      receivedAt: l.captured_at,
      name: fullName(l.first_name, l.last_name),
      email: l.email,
      origin: typeof businessKey === 'string' ? businessKey : l.company,
      preview: preview(l.message ?? l.interests ?? ''),
      contactId: contactIdByEmail.get(key) ?? null,
    })
  }

  for (const e of rows.enquiries) {
    items.push({
      id: `card_enquiry:${e.id}`,
      source: 'card_enquiry',
      receivedAt: e.created_at,
      name: e.first_name,
      email: e.reply_email,
      origin: e.business ? `${e.business} (card: ${e.card_slug})` : `card: ${e.card_slug}`,
      preview: preview(e.ask),
      contactId: e.reply_email ? (contactIdByEmail.get(e.reply_email.toLowerCase()) ?? null) : null,
    })
  }

  for (const f of rows.feedback) {
    items.push({
      id: `card_feedback:${f.id}`,
      source: 'card_feedback',
      receivedAt: f.created_at,
      name: f.first_name,
      email: null,
      origin: `card: ${f.card_slug}`,
      preview: preview(describeAnswers(f.answers)),
      contactId: null,
    })
  }

  return items.sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
}

export function filterInbox(items: InboxItem[], source: InboxSource | null): InboxItem[] {
  return source ? items.filter((i) => i.source === source) : items
}

export function parseSourceParam(value: string | string[] | undefined): InboxSource | null {
  return typeof value === 'string' && (INBOX_SOURCES as readonly string[]).includes(value)
    ? (value as InboxSource)
    : null
}

/**
 * PostgREST `or` filter matching any of `emails` case-insensitively (ilike). Stored contact emails keep
 * the case they were typed in, so an exact `in` would miss "Ann@Example.com" for the lowercased
 * "ann@example.com". Values are double-quoted so commas and parentheses cannot break the filter; an
 * address containing a quote or backslash cannot be quoted safely and is left unlinked. `_` and `%`
 * stay LIKE wildcards: that can only over-match, and the caller keys results by exact lowercased email.
 */
export function contactEmailFilter(emails: string[]): string {
  return emails
    .filter((e) => !/["\\]/.test(e))
    .map((e) => `email.ilike."${e}"`)
    .join(',')
}

async function run(query: () => InboxQuery): Promise<unknown[] | null> {
  try {
    const { data, error } = await query()
    return error || !data ? null : data
  } catch {
    return null
  }
}

export async function loadInbox(
  client: InboxClient,
  opts: { founderId: string; now: Date },
): Promise<InboxResult> {
  const since = new Date(opts.now.getTime() - INBOX_WINDOW_DAYS * 86_400_000).toISOString()

  const [leads, enquiries, feedback] = await Promise.all([
    run(() =>
      client
        .from('crm_leads')
        .select('id, first_name, last_name, email, company, message, interests, source, additional_data, captured_at')
        .eq('founder_id', opts.founderId)
        .gte('captured_at', since)
        .order('captured_at', { ascending: false })
        .limit(INBOX_ROW_LIMIT),
    ),
    run(() =>
      client
        .from('card_enquiries')
        .select('id, created_at, card_slug, first_name, business, ask, reply_email')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(INBOX_ROW_LIMIT),
    ),
    run(() =>
      client
        .from('card_feedback')
        .select('id, created_at, card_slug, first_name, answers')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(INBOX_ROW_LIMIT),
    ),
  ])

  const failedSources: InboxSource[] = []
  if (!leads) failedSources.push('website_lead')
  if (!enquiries) failedSources.push('card_enquiry')
  if (!feedback) failedSources.push('card_feedback')

  const leadRows = (leads ?? []) as LeadRow[]
  const enquiryRows = (enquiries ?? []) as EnquiryRow[]
  const feedbackRows = (feedback ?? []) as FeedbackRow[]

  const truncated: InboxSource[] = []
  if (leadRows.length >= INBOX_ROW_LIMIT) truncated.push('website_lead')
  if (enquiryRows.length >= INBOX_ROW_LIMIT) truncated.push('card_enquiry')
  if (feedbackRows.length >= INBOX_ROW_LIMIT) truncated.push('card_feedback')

  const emails = [
    ...new Set(
      [...leadRows.map((l) => l.email), ...enquiryRows.map((e) => e.reply_email)]
        .filter((e): e is string => Boolean(e))
        .map((e) => e.toLowerCase()),
    ),
  ]

  const contactIdByEmail = new Map<string, string>()
  let contactLinksFailed = false
  const emailFilter = contactEmailFilter(emails)
  if (emailFilter) {
    const contacts = await run(() =>
      client.from('contacts').select('id, email').eq('founder_id', opts.founderId).or(emailFilter),
    )
    if (!contacts) {
      contactLinksFailed = true
    } else {
      for (const c of contacts as Array<{ id: string; email: string | null }>) {
        if (c.email && !contactIdByEmail.has(c.email.toLowerCase())) {
          contactIdByEmail.set(c.email.toLowerCase(), c.id)
        }
      }
    }
  }

  return {
    items: mergeInbox({ leads: leadRows, enquiries: enquiryRows, feedback: feedbackRows }, contactIdByEmail),
    failedSources,
    contactLinksFailed,
    truncated,
  }
}

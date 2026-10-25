// Spam Act 2003 gate for marketing campaign sends (UNI-3017).
// A recipient is sendable only when (1) the founder's CRM records marketing consent for that
// address (crm_leads or crm_contacts, marketing_consent = true) and (2) SendGrid reports the
// address is not on any suppression or unsubscribe list. Anything that cannot be proven is
// skipped, and an unreadable consent table throws so the caller sends nothing.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SuppressionState } from '@/lib/notifications/sendgrid-suppression'

export interface GateRecipient {
  email: string
  name?: string
}

export interface SkipCounts {
  noConsent: number
  suppressed: number
  suppressionUnknown: number
}

export interface GateResult<T extends GateRecipient> {
  allowed: T[]
  skipped: SkipCounts
}

export interface GateOptions {
  checkSuppression: (address: string) => Promise<SuppressionState>
  /** Parallel SendGrid lookups per wave. */
  concurrency?: number
}

// Each address becomes one ilike term in an OR filter, so keep the URL short.
const CHUNK = 50

/** A PostgREST ilike term matching the address regardless of stored case or stray whitespace. */
function ilikeTerm(column: string, address: string): string {
  const like = address.replace(/[\\%_]/g, (c) => '\\' + c)
  const quoted = like.replace(/[\\"]/g, (c) => '\\' + c)
  return `${column}.ilike."%${quoted}%"`
}

async function consentedAddresses(
  supabase: SupabaseClient,
  founderId: string,
  table: 'crm_leads' | 'crm_contacts',
  column: 'email' | 'primary_email',
  addresses: string[],
): Promise<Set<string>> {
  const found = new Set<string>()
  for (let i = 0; i < addresses.length; i += CHUNK) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('founder_id', founderId)
      .eq('marketing_consent', true)
      .or(addresses.slice(i, i + CHUNK).map((a) => ilikeTerm(column, a)).join(','))
    if (error) throw new Error(`Could not read marketing consent from ${table}: ${error.message}`)
    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const value = row[column]
      // The ilike is a net, not proof: only an exact match after trim and lower-casing counts.
      if (typeof value === 'string') found.add(value.trim().toLowerCase())
    }
  }
  return found
}

export async function filterSendableRecipients<T extends GateRecipient>(
  supabase: SupabaseClient,
  founderId: string,
  recipients: T[],
  { checkSuppression, concurrency = 8 }: GateOptions,
): Promise<GateResult<T>> {
  const skipped: SkipCounts = { noConsent: 0, suppressed: 0, suppressionUnknown: 0 }

  // Normalise, drop malformed rows and duplicates.
  const seen = new Set<string>()
  const candidates: Array<{ recipient: T; key: string }> = []
  for (const recipient of recipients) {
    const key = typeof recipient?.email === 'string' ? recipient.email.trim().toLowerCase() : ''
    if (!key || seen.has(key)) continue
    seen.add(key)
    candidates.push({ recipient, key })
  }
  if (candidates.length === 0) return { allowed: [], skipped }

  const keys = candidates.map((c) => c.key)
  const fromLeads = await consentedAddresses(supabase, founderId, 'crm_leads', 'email', keys)
  const fromContacts = await consentedAddresses(supabase, founderId, 'crm_contacts', 'primary_email', keys)

  const consented = candidates.filter((c) => {
    const ok = fromLeads.has(c.key) || fromContacts.has(c.key)
    if (!ok) skipped.noConsent += 1
    return ok
  })

  const allowed: T[] = []
  for (let i = 0; i < consented.length; i += concurrency) {
    const wave = consented.slice(i, i + concurrency)
    const states = await Promise.all(
      wave.map((c) => checkSuppression(c.key).catch((): SuppressionState => 'unknown')),
    )
    wave.forEach((c, idx) => {
      const state = states[idx]
      if (state === 'clear') allowed.push(c.recipient)
      else if (state === 'suppressed') skipped.suppressed += 1
      else skipped.suppressionUnknown += 1
    })
  }

  return { allowed, skipped }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchContacts } from '@/lib/integrations/xero/client'
import { fetchGmailThreads } from '@/lib/integrations/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — fans out across Xero tenants + Gmail accounts

// Xero tenants with stored vault credentials (service='xero' labels in credentials_vault).
const XERO_BUSINESS_KEYS = ['dr', 'nrpg', 'carsi', 'restore', 'synthex', 'ato'] as const

type ContactRow = {
  founder_id: string
  display_name: string
  first_name?: string | null
  last_name?: string | null
  primary_email: string | null
  primary_phone?: string | null
  company_name?: string | null
  source: string
  source_detail: string
  status: string
  dedupe_email_key: string | null
  additional_data: Record<string, unknown>
}

// Parse an RFC-style From header: '"Name" <email@x.com>' or 'email@x.com'.
export function parseFrom(from: string): { name: string | null; email: string | null } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) {
    const email = m[2].trim().toLowerCase()
    return { name: m[1].trim() || null, email: /\S+@\S+\.\S+/.test(email) ? email : null }
  }
  const e = from.trim().toLowerCase()
  return { name: null, email: /\S+@\S+\.\S+/.test(e) ? e : null }
}

/**
 * Seeds crm_contacts from the founder's connected Xero tenants (business contacts) and
 * Gmail accounts (message senders). Authenticated via CRON_SECRET. Idempotent: skips any
 * contact whose email already exists for the founder, so it is safe to re-run.
 *
 * GET (not POST): Vercel Cron invokes the path with a GET request, matching every other
 * cron route in this app. Manual triggers use GET + the same CRON_SECRET bearer.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  // Dedupe against contacts already present for this founder. Email alone is insufficient:
  // many Xero contacts have no email, so we also key on the Xero contact id to keep re-runs
  // idempotent. The existing set MUST be read in full — PostgREST caps a single response at
  // 1000 rows, so we paginate; a partial read would let rows past row 1000 re-insert.
  const seen = new Set<string>()
  const seenXeroIds = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data: page, error: existErr } = await supabase
      .from('crm_contacts')
      .select('primary_email, additional_data')
      .eq('founder_id', founderId)
      .range(from, from + PAGE - 1)
    if (existErr) {
      return NextResponse.json({ error: `read existing failed: ${existErr.message}` }, { status: 500 })
    }
    for (const r of page ?? []) {
      const email = (r.primary_email ?? '').toLowerCase()
      if (email) seen.add(email)
      const xid = (r.additional_data as { xeroContactId?: string } | null)?.xeroContactId
      if (xid) seenXeroIds.add(xid)
    }
    if (!page || page.length < PAGE) break
  }

  const rows: ContactRow[] = []
  const report: { xero: Record<string, number | string>; gmail: Record<string, number | string> } = {
    xero: {},
    gmail: {},
  }

  // ── Xero: real business contacts, one tenant at a time (graceful per-tenant failure) ──
  for (const key of XERO_BUSINESS_KEYS) {
    try {
      const contacts = await fetchContacts(founderId, key)
      let added = 0
      for (const c of contacts) {
        if (c.ContactStatus === 'ARCHIVED' || !c.Name) continue
        if (seenXeroIds.has(c.ContactID)) continue
        const email = c.EmailAddress?.trim().toLowerCase() || null
        if (email && seen.has(email)) continue
        seenXeroIds.add(c.ContactID)
        if (email) seen.add(email)
        rows.push({
          founder_id: founderId,
          display_name: c.Name,
          first_name: c.FirstName ?? null,
          last_name: c.LastName ?? null,
          primary_email: email,
          primary_phone: c.Phones?.find((p) => p.PhoneNumber)?.PhoneNumber ?? null,
          company_name: c.Name,
          source: 'xero',
          source_detail: key,
          status: 'lead_only',
          dedupe_email_key: email,
          additional_data: {
            xeroContactId: c.ContactID,
            isCustomer: Boolean(c.IsCustomer),
            isSupplier: Boolean(c.IsSupplier),
            tenant: key,
          },
        })
        added++
      }
      report.xero[key] = added
    } catch (err) {
      report.xero[key] = `error: ${(err as Error).message}`
    }
  }

  // ── Gmail: senders from real recent threads (uses granted gmail.readonly scope) ──
  try {
    const { data: threads, source } = await fetchGmailThreads(founderId)
    if (source === 'gmail') {
      let added = 0
      for (const t of threads) {
        const { name, email } = parseFrom(t.from)
        if (!email || seen.has(email)) continue
        seen.add(email)
        rows.push({
          founder_id: founderId,
          display_name: name ?? email,
          primary_email: email,
          source: 'gmail',
          source_detail: t.businessKey,
          status: 'lead_only',
          dedupe_email_key: email,
          additional_data: { gmailFrom: t.from, account: t.email },
        })
        added++
      }
      report.gmail = { added, threadsScanned: threads.length, source }
    } else {
      report.gmail = { added: 0, source }
    }
  } catch (err) {
    report.gmail = { error: (err as Error).message }
  }

  // ── Insert (chunked) ──
  let inserted = 0
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error } = await supabase.from('crm_contacts').insert(chunk)
    if (error) {
      return NextResponse.json(
        { error: `insert failed: ${error.message}`, insertedBeforeFailure: inserted, report },
        { status: 500 }
      )
    }
    inserted += chunk.length
  }

  console.log(`[import-contacts] founder=${founderId} inserted=${inserted} candidates=${rows.length}`)
  return NextResponse.json({ ok: true, inserted, candidates: rows.length, report })
}

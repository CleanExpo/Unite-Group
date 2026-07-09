// UNI-2234 go-live — real lead_conversion executor.
//
// Auto-executes an L1 lead conversion: guards the lead is founder-scoped and in a
// convertible state, creates the "client contact" that represents the converted
// relationship, marks the lead converted, then READS BACK to confirm before
// resolving (write-then-confirm). Throws on any guard/DB failure so the caller
// (runCrmAutoExecution) records a `failed` outcome and never journals a false
// `executed`.
//
// Conversion semantics (schema-honest — no crm_clients table exists): create a
// `crm_contacts` row (status 'client_contact', linked_lead_id = lead) and set
// crm_leads.status='converted' + converted_at. `converted_client_id` is left null
// until a client entity exists. FLAGGED for founder confirmation before arming.

export interface LeadRow {
  id: string
  founder_id: string
  status: string
  converted_at: string | null
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  marketing_consent: boolean
}

interface DbResult<T> {
  data: T | null
  error: { message: string } | null
}

interface ContactInsert {
  founder_id: string
  display_name: string
  first_name: string | null
  last_name: string | null
  primary_email: string | null
  primary_phone: string | null
  company_name: string | null
  role_title: string | null
  linked_lead_id: string
  source: 'lead_conversion'
  status: 'client_contact'
  marketing_consent: boolean
}

interface LeadUpdate {
  status: 'converted'
  converted_at: string
  updated_at: string
}

/** Minimal founder-scoped client surface — the exact chained calls the executor
 *  makes. Kept narrow so the executor is unit-tested without a live Supabase. */
export interface LeadConversionClient {
  from(table: 'crm_leads'): {
    select(cols: string): {
      eq(c: 'id', v: string): { eq(c: 'founder_id', v: string): { single(): Promise<DbResult<LeadRow>> } }
    }
    update(payload: LeadUpdate): {
      eq(c: 'id', v: string): {
        eq(c: 'founder_id', v: string): { select(cols: string): { single(): Promise<DbResult<LeadRow>> } }
      }
    }
  }
  from(table: 'crm_contacts'): {
    insert(payload: ContactInsert): { select(cols: string): { single(): Promise<DbResult<{ id: string }>> } }
  }
}

export interface LeadConversionContext {
  client: LeadConversionClient
  founderId: string
  /** The crm_leads.id this approval converts. */
  subjectId: string
  now?: () => string
}

const CONVERTIBLE_STATUSES = new Set(['new', 'qualified'])
const LEAD_COLS = 'id, founder_id, status, converted_at, first_name, last_name, email, phone, company, job_title, marketing_consent'

/** Perform the conversion and resolve with the confirmed committed state; throw if unconfirmed. */
export async function executeLeadConversion(ctx: LeadConversionContext): Promise<Record<string, unknown>> {
  const { client, founderId, subjectId } = ctx
  const now = ctx.now?.() ?? new Date().toISOString()

  if (!subjectId) throw new Error('lead_conversion: subjectId (crm_leads.id) is required')

  const read = await client.from('crm_leads').select(LEAD_COLS).eq('id', subjectId).eq('founder_id', founderId).single()
  if (read.error) throw new Error(`lead_conversion: lead read failed: ${read.error.message}`)
  const lead = read.data
  if (!lead) throw new Error('lead_conversion: lead not found for founder')
  if (lead.converted_at || lead.status === 'converted') throw new Error('lead_conversion: lead already converted')
  if (!CONVERTIBLE_STATUSES.has(lead.status)) {
    throw new Error(`lead_conversion: lead status '${lead.status}' is not convertible`)
  }

  const displayName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || lead.email || 'Unknown'
  const contactInsert: ContactInsert = {
    founder_id: founderId,
    display_name: displayName,
    first_name: lead.first_name ?? null,
    last_name: lead.last_name ?? null,
    primary_email: lead.email ?? null,
    primary_phone: lead.phone ?? null,
    company_name: lead.company ?? null,
    role_title: lead.job_title ?? null,
    linked_lead_id: lead.id,
    source: 'lead_conversion',
    status: 'client_contact',
    marketing_consent: lead.marketing_consent,
  }
  const contactRes = await client.from('crm_contacts').insert(contactInsert).select('id').single()
  if (contactRes.error || !contactRes.data) {
    throw new Error(`lead_conversion: client contact insert failed: ${contactRes.error?.message ?? 'no row'}`)
  }
  const contactId = contactRes.data.id

  const update: LeadUpdate = { status: 'converted', converted_at: now, updated_at: now }
  const updated = await client
    .from('crm_leads')
    .update(update)
    .eq('id', lead.id)
    .eq('founder_id', founderId)
    .select(LEAD_COLS)
    .single()
  if (updated.error || !updated.data) {
    throw new Error(`lead_conversion: lead update failed: ${updated.error?.message ?? 'no row'}`)
  }
  // write-then-confirm: the read-back is the source of truth for the journal.
  if (updated.data.status !== 'converted' || !updated.data.converted_at) {
    throw new Error('lead_conversion: post-update read-back did not confirm converted state')
  }

  return { leadId: lead.id, contactId, status: updated.data.status, convertedAt: updated.data.converted_at }
}

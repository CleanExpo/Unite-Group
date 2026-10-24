import { isValidSlug } from './slug'

export interface EnquiryInput {
  firstName: string
  ask: string
  business?: string | null
  replyEmail?: string | null
}

export type EnquiryResult =
  | { ok: true; receipt: { id: string; status: 'received'; acceptedAt: string } }
  | { ok: false; status: 400 | 404 | 500 | 503; error: string }

type DbError = { message: string } | null
export interface EnquiryClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): PromiseLike<{ data: { published_at: string | null } | null; error: DbError }> }
    }
    insert(row: Record<string, unknown>): {
      select(columns: string): { single(): PromiseLike<{ data: { id?: string; created_at?: string } | null; error: DbError }> }
    }
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const fail = (status: 400 | 404 | 500, error: string): EnquiryResult => ({ ok: false, status, error })

/**
 * Store one enquiry for a published card and return a receipt. The receipt id is the stored row's id and is only
 * returned after the insert gave a row back; every other path is an error. The caller supplies the client
 * (a service-role one in the server action); nothing here connects to a database by itself.
 */
export async function submitCardEnquiry(client: EnquiryClient, slug: string, input: EnquiryInput): Promise<EnquiryResult> {
  if (!isValidSlug(slug)) return fail(400, 'invalid card')
  const firstName = input.firstName?.trim() ?? ''
  const ask = input.ask?.trim() ?? ''
  const business = input.business?.trim() || null
  const replyEmail = input.replyEmail?.trim() || null
  if (!firstName || firstName.length > 60) return fail(400, 'invalid first name')
  if (!ask || ask.length > 2000) return fail(400, 'invalid message')
  if (business && business.length > 120) return fail(400, 'invalid business')
  if (replyEmail && (replyEmail.length > 254 || !EMAIL_RE.test(replyEmail))) return fail(400, 'invalid email')

  const profile = await client.from('card_profiles').select('published_at').eq('card_slug', slug).maybeSingle()
  if (profile.error) return fail(500, 'could not check the card')
  if (!profile.data?.published_at) return fail(404, 'card not found')

  const { data, error } = await client
    .from('card_enquiries')
    .insert({ card_slug: slug, first_name: firstName, business, ask, reply_email: replyEmail, source: 'card-profile' })
    .select('id, created_at')
    .single()
  if (error || !data?.id) return fail(500, 'could not store the enquiry')
  return { ok: true, receipt: { id: data.id, status: 'received', acceptedAt: data.created_at ?? '' } }
}

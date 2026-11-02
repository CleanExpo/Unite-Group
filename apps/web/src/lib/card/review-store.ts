import { createClient } from '@supabase/supabase-js'

import { getSupabaseAnonConfig } from '@/lib/supabase/env-guard'

import { buildGoogleReviewUrl, type ReviewEventKind, type UaClass } from './review-link'
import { isValidSlug } from './slug'

// Reads a card's Google review link and records tap events, both with the publishable key only:
// the database (column grant + security-definer RPC) decides what anon may see and write.

type DbError = { message: string } | null
export interface ReviewStoreClient {
  from(table: 'card_profiles'): {
    select(columns: string): {
      eq(column: 'card_slug', value: string): {
        maybeSingle(): PromiseLike<{ data: { google_place_id?: string | null; published_at?: string | null } | null; error: DbError }>
      }
    }
  }
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: DbError }>
}

/** The two columns the review redirect reads; anon is granted google_place_id by the review migration. */
export const REVIEW_COLUMNS = 'google_place_id, published_at'

export function anonReviewClient(): ReviewStoreClient {
  const { url, anonKey } = getSupabaseAnonConfig()
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as ReviewStoreClient
}

/**
 * Three answers, never two: a card with a usable review link, a card without one, or a read that failed (for example
 * before the google_place_id migration is applied). A failed read is never reported as "no link".
 */
export type ReviewLinkState = { state: 'ready'; url: string } | { state: 'none' } | { state: 'unavailable' }

export async function getCardReviewLink(slug: string, client?: ReviewStoreClient): Promise<ReviewLinkState> {
  if (!isValidSlug(slug)) return { state: 'none' }
  let c: ReviewStoreClient
  try {
    c = client ?? anonReviewClient()
  } catch {
    return { state: 'unavailable' }
  }
  const { data, error } = await c.from('card_profiles').select(REVIEW_COLUMNS).eq('card_slug', slug).maybeSingle()
  if (error) {
    console.error('[cards] review link read failed:', error.message)
    return { state: 'unavailable' }
  }
  if (!data?.published_at) return { state: 'none' }
  const url = buildGoogleReviewUrl(data.google_place_id)
  return url ? { state: 'ready', url } : { state: 'none' }
}

/**
 * One tap/view event through card_log_review_event. Stores the card, the kind, an optional request id and a coarse
 * device class: no IP, no raw user agent, no name or contact. Best effort: it reports whether a row was written and
 * never throws, so a logging fault can never block the visitor's redirect.
 */
export async function logReviewEvent(
  event: { slug: string; kind: ReviewEventKind; requestId?: string | null; uaClass?: UaClass | null },
  client?: ReviewStoreClient,
): Promise<boolean> {
  if (!isValidSlug(event.slug)) return false
  try {
    const { data, error } = await (client ?? anonReviewClient()).rpc('card_log_review_event', {
      p_card_slug: event.slug,
      p_kind: event.kind,
      p_request_id: event.requestId ?? null,
      p_ua_class: event.uaClass ?? null,
    })
    if (error) {
      console.error('[cards] review event not recorded:', error.message)
      return false
    }
    return data === true
  } catch (err) {
    console.error('[cards] review event not recorded:', err instanceof Error ? err.message : String(err))
    return false
  }
}

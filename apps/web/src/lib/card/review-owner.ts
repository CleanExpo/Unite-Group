import { normalisePlaceIdInput } from './review-link'
import { isValidSlug } from './slug'

// The owner's side of review requests: which cards they own and each card's Place ID. Runs on the owner's own
// signed-in client, so row level security (card_owners.founder_id = auth.uid()) decides what comes back.

type DbError = { message: string } | null
type Rows<T> = PromiseLike<{ data: T[] | null; error: DbError }>
export interface OwnerClient {
  from(table: 'card_owners'): { select(columns: string): { eq(column: 'founder_id', value: string): Rows<{ card_slug: string }> } }
  from(table: 'card_profiles'): {
    select(columns: string): { in(column: 'card_slug', values: string[]): Rows<OwnerProfileRow> }
    update(values: { google_place_id: string | null }): {
      eq(column: 'card_slug', value: string): { select(columns: string): Rows<{ card_slug: string }> }
    }
  }
}

interface OwnerProfileRow {
  card_slug: string
  display_name: string
  business_name: string | null
  google_place_id: string | null
  published_at: string | null
}

export interface OwnerCard {
  slug: string
  displayName: string | null
  businessName: string | null
  placeId: string | null
  published: boolean
}

export type OwnerCardsResult = { status: 'ok'; cards: OwnerCard[] } | { status: 'error'; message: string }

/** A failed read is an error state, never an empty list. */
export async function loadOwnerCards(client: OwnerClient, founderId: string): Promise<OwnerCardsResult> {
  const owners = await client.from('card_owners').select('card_slug').eq('founder_id', founderId)
  if (owners.error) return { status: 'error', message: 'could not read your cards' }
  const slugs = (owners.data ?? []).map((r) => r.card_slug).filter(isValidSlug)
  if (slugs.length === 0) return { status: 'ok', cards: [] }
  const profiles = await client.from('card_profiles').select('card_slug, display_name, business_name, google_place_id, published_at').in('card_slug', slugs)
  // before the review migration is applied the google_place_id column does not exist: say so, do not show blanks
  if (profiles.error) return { status: 'error', message: 'review settings are not available yet' }
  const bySlug = new Map((profiles.data ?? []).map((p) => [p.card_slug, p]))
  return {
    status: 'ok',
    cards: slugs.map((slug) => {
      const p = bySlug.get(slug)
      return {
        slug,
        displayName: p?.display_name ?? null,
        businessName: p?.business_name ?? null,
        placeId: p?.google_place_id ?? null,
        published: Boolean(p?.published_at),
      }
    }),
  }
}

export type SavePlaceIdResult = { ok: true; placeId: string | null } | { ok: false; error: string }

/** Saves (or clears) a card's Place ID. Format is checked here and again by the database constraint. */
export async function savePlaceId(client: OwnerClient, slug: string, raw: unknown): Promise<SavePlaceIdResult> {
  if (!isValidSlug(slug)) return { ok: false, error: 'invalid card' }
  const placeId = normalisePlaceIdInput(raw)
  if (placeId === 'invalid') return { ok: false, error: 'that does not look like a Google Place ID (letters, numbers, - and _ only)' }
  const { data, error } = await client.from('card_profiles').update({ google_place_id: placeId }).eq('card_slug', slug).select('card_slug')
  if (error) return { ok: false, error: 'could not save the Place ID' }
  // zero rows back means the row is not this owner's (RLS) or the card has no profile yet: not a save
  if (!data || data.length !== 1) return { ok: false, error: 'this card has no profile you can edit yet' }
  return { ok: true, placeId }
}

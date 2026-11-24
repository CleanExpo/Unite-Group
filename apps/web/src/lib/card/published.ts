import { createClient } from '@supabase/supabase-js'

import { getSupabaseAnonConfig } from '@/lib/supabase/env-guard'

import { cardFilmSrc } from './film'
import { isStaffSlug, isValidSlug } from './slug'

/** The only columns the public ever reads; the database grants anon exactly these. */
export const PUBLIC_COLUMNS =
  'card_slug, display_name, role_title, business_name, email, phone, service_area, published_at, film_src'

/**
 * The same list without film_src: what the database served before 20261123100000_card_profiles_film_src.sql. That
 * migration is founder-gated and can land after this code is deployed, so a card read that fails only because the
 * column is missing is retried once with these columns and shows the card without a film (UNI-3528).
 */
const COLUMNS_BEFORE_FILM = PUBLIC_COLUMNS.replace(', film_src', '')

type ReadError = { message: string; code?: string }
function isMissingFilmColumn(error: ReadError): boolean {
  return /film_src/.test(error.message) && (error.code === '42703' || /does not exist|schema cache/.test(error.message))
}

export interface PublicCard {
  slug: string
  displayName: string
  roleTitle: string | null
  businessName: string | null
  email: string | null
  phone: string | null
  serviceArea: string | null
  /** A client card's film: a site path under /cards/media/, or null. Never a URL (card_profiles.film_src, UNI-3528). */
  filmSrc?: string | null
  /** Staff cards only (UNI-3146). These never come from card_profiles. */
  staff?: { photoUrl: string | null; logoUrl: string | null; website: string | null; address: string | null; offer: string | null }
}

interface StaffRow {
  card_slug: string
  staff_name: string
  photo_url: string | null
  mobile: string | null
  business_name: string | null
  logo_url: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  offer: string | null
}

export interface StaffCardReader {
  rpc(fn: 'card_staff_public', args: { p_slug: string }): PromiseLike<{ data: StaffRow[] | null; error: { message: string } | null }>
}

interface ProfileRow {
  card_slug: string
  display_name: string
  role_title: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  service_area: string | null
  published_at: string | null
  film_src?: string | null
}

export interface ProfileReader {
  from(table: 'card_profiles'): {
    select(columns: string): {
      eq(column: 'card_slug', value: string): {
        maybeSingle(): PromiseLike<{ data: ProfileRow | null; error: ReadError | null }>
      }
    }
  }
}

function anonReader(): ProfileReader {
  const { url, anonKey } = getSupabaseAnonConfig()
  // the publishable key and no cookies: the database, not this code, decides what is public
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as ProfileReader
}

/**
 * A staff card as the public sees it, or null when it is unknown, not set up or deactivated. The business details are read
 * from the owner's account on every request, so an owner's change reaches every card. A failed read throws.
 */
export async function getStaffCard(slug: string, client?: StaffCardReader): Promise<PublicCard | null> {
  if (!isStaffSlug(slug)) return null
  const { data, error } = await (client ?? (anonReader() as unknown as StaffCardReader)).rpc('card_staff_public', { p_slug: slug })
  if (error) throw new Error(`staff card read failed: ${error.message}`)
  const row = data?.[0]
  if (!row) return null
  return {
    slug: row.card_slug,
    displayName: row.staff_name,
    roleTitle: null,
    businessName: row.business_name,
    email: row.email,
    phone: row.mobile ?? row.phone,
    serviceArea: null,
    staff: { photoUrl: row.photo_url, logoUrl: row.logo_url, website: row.website, address: row.address, offer: row.offer },
  }
}

/** A published card's public fields, or null for an unknown, draft or invalid slug. A failed read throws. */
export async function getPublishedCard(slug: string, client?: ProfileReader): Promise<PublicCard | null> {
  if (!isValidSlug(slug)) return null
  const reader = client ?? anonReader()
  const read = (columns: string) => reader.from('card_profiles').select(columns).eq('card_slug', slug).maybeSingle()
  let { data, error } = await read(PUBLIC_COLUMNS)
  if (error && isMissingFilmColumn(error)) ({ data, error } = await read(COLUMNS_BEFORE_FILM))
  if (error) throw new Error(`card read failed: ${error.message}`)
  if (!data || !data.published_at) return null
  return {
    slug: data.card_slug,
    displayName: data.display_name,
    roleTitle: data.role_title,
    businessName: data.business_name,
    email: data.email,
    phone: data.phone,
    serviceArea: data.service_area,
    filmSrc: cardFilmSrc(data.film_src),
  }
}

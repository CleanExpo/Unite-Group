import { createClient } from '@supabase/supabase-js'

import { getSupabaseAnonConfig } from '@/lib/supabase/env-guard'

import { isValidSlug } from './slug'

/** The only columns the public ever reads; the database grants anon exactly these. */
export const PUBLIC_COLUMNS =
  'card_slug, display_name, role_title, business_name, email, phone, service_area, published_at'

export interface PublicCard {
  slug: string
  displayName: string
  roleTitle: string | null
  businessName: string | null
  email: string | null
  phone: string | null
  serviceArea: string | null
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
}

export interface ProfileReader {
  from(table: 'card_profiles'): {
    select(columns: string): {
      eq(column: 'card_slug', value: string): {
        maybeSingle(): PromiseLike<{ data: ProfileRow | null; error: { message: string } | null }>
      }
    }
  }
}

function anonReader(): ProfileReader {
  const { url, anonKey } = getSupabaseAnonConfig()
  // the publishable key and no cookies: the database, not this code, decides what is public
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as ProfileReader
}

/** A published card's public fields, or null for an unknown, draft or invalid slug. A failed read throws. */
export async function getPublishedCard(slug: string, client?: ProfileReader): Promise<PublicCard | null> {
  if (!isValidSlug(slug)) return null
  const { data, error } = await (client ?? anonReader()).from('card_profiles').select(PUBLIC_COLUMNS).eq('card_slug', slug).maybeSingle()
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
  }
}

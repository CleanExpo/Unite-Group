// src/lib/site-agent/site-keys.ts
// Site-key auth for the public site chat agent (UNI-2359).
//
// A publishable site key (`sk_site_...`) identifies ONE founder + business and
// optionally pins the origins allowed to embed the widget. Public routes look
// keys up via the service-role client (site_keys has forced founder-only RLS,
// so anon/session clients cannot read it).

import type { SupabaseClient } from '@supabase/supabase-js'

export const SITE_KEY_PREFIX = 'sk_site_'

export type SiteKeyValidation =
  | { ok: true; founderId: string; businessKey: string }
  | { ok: false; reason: string }

interface SiteKeyRow {
  founder_id: string
  business_key: string
  allowed_origins: string[] | null
  active: boolean
}

/** Generate a new publishable site key (app-side, never in SQL). */
export function generateSiteKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return SITE_KEY_PREFIX + Buffer.from(bytes).toString('base64url')
}

/** Normalise an origin for comparison: scheme + host + port, lowercased. */
function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin.toLowerCase()
  } catch {
    return value.trim().toLowerCase().replace(/\/+$/, '')
  }
}

/**
 * Validate a publishable site key against the `site_keys` table.
 *
 * - Key must exist and be active.
 * - When the row's `allowed_origins` is non-empty, the request origin must be
 *   present and allow-listed. An empty allow-list permits any origin.
 */
export async function validateSiteKey(
  supabase: SupabaseClient,
  publishableKey: string,
  origin: string | null,
): Promise<SiteKeyValidation> {
  if (!publishableKey || !publishableKey.startsWith(SITE_KEY_PREFIX)) {
    return { ok: false, reason: 'malformed_key' }
  }

  const { data, error } = await supabase
    .from('site_keys')
    .select('founder_id, business_key, allowed_origins, active')
    .eq('publishable_key', publishableKey)
    .maybeSingle()

  if (error) return { ok: false, reason: 'lookup_failed' }
  if (!data) return { ok: false, reason: 'unknown_key' }

  const row = data as SiteKeyRow
  if (!row.active) return { ok: false, reason: 'inactive_key' }

  const allowed = row.allowed_origins ?? []
  if (allowed.length > 0) {
    if (!origin) return { ok: false, reason: 'origin_required' }
    const normalized = normalizeOrigin(origin)
    if (!allowed.some((entry) => normalizeOrigin(entry) === normalized)) {
      return { ok: false, reason: 'origin_not_allowed' }
    }
  }

  return { ok: true, founderId: row.founder_id, businessKey: row.business_key }
}

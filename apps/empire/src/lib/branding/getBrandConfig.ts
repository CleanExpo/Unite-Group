// src/lib/branding/getBrandConfig.ts
// UNI-1992: Server-side brand_config fetcher with 5-minute in-memory cache.
//
// Used by /clients/[slug] layout (RSC) to load brand props server-side.
// Safe to import from server components — no "use client", no browser APIs.

import { getAdminClient } from '@/lib/supabase/admin';
import { BrandConfig, normalizeBrandConfig } from '@/types/brand-config';

export interface BrandedClient {
  id: string;
  slug: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  brand_config: BrandConfig; // always normalised — never raw
}

// Cache TTL — 5 minutes per Node process. Negative results share this TTL.
export const BRAND_CONFIG_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: BrandedClient | null;
  expiresAt: number;
}

// Module-scope cache: lives per Node process, cleared on redeploy.
const cache = new Map<string, CacheEntry>();

// In-flight dedupe: if two RSCs ask for the same slug while the cache is
// cold, both await the same promise — Supabase only fires once.
const inFlight = new Map<string, Promise<BrandedClient | null>>();

/**
 * Fetch a client's brand config by slug. Server-side only.
 *
 * Cached for 5 minutes per Node process. Returns null when the slug is not
 * found (callers should render a 404, not throw). Errors are logged and
 * swallowed — a missing brand config must never crash the page.
 */
export async function getBrandConfig(slug: string): Promise<BrandedClient | null> {
  const now = Date.now();

  const cached = cache.get(slug);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const existing = inFlight.get(slug);
  if (existing) return existing;

  const promise = fetchFromSupabase(slug)
    .then((value) => {
      cache.set(slug, { value, expiresAt: Date.now() + BRAND_CONFIG_TTL_MS });
      return value;
    })
    .finally(() => {
      inFlight.delete(slug);
    });

  inFlight.set(slug, promise);
  return promise;
}

/**
 * Invalidate the cache for a specific slug — call after admin updates a row
 * via the wizard. With no argument, clears the whole cache.
 */
export function invalidateBrandConfigCache(slug?: string): void {
  if (slug === undefined) {
    cache.clear();
    return;
  }
  cache.delete(slug);
}

async function fetchFromSupabase(slug: string): Promise<BrandedClient | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('nexus_clients')
      .select('id, slug, company_name, contact_name, contact_email, brand_config')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[getBrandConfig] Supabase error', { slug, error });
      return null;
    }
    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      company_name: data.company_name,
      contact_name: data.contact_name ?? null,
      contact_email: data.contact_email ?? null,
      brand_config: normalizeBrandConfig(data.brand_config),
    };
  } catch (err) {
    console.error('[getBrandConfig] Unexpected error', { slug, err });
    return null;
  }
}

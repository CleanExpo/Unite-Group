// src/lib/branding/getPortalContent.ts
// UNI-1947 Pillar 2: Server-side portal_content fetcher with 5-minute
// in-memory cache. Mirrors src/lib/branding/getBrandConfig.ts (UNI-1992).
//
// Used by /clients/<slug>/page.tsx to load portal content server-side.
// Safe to import from server components — no "use client", no browser APIs.

import { getAdminClient } from '@/lib/supabase/admin';
import { PortalContent, normalizePortalContent } from '@/types/portal-content';

export interface PortalRow {
  id: string;
  slug: string;
  portal_content: PortalContent; // always normalised — never raw
}

// Cache TTL — 5 minutes per Node process. Negative results share this TTL.
export const PORTAL_CONTENT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: PortalRow | null;
  expiresAt: number;
}

// Module-scope cache: lives per Node process, cleared on redeploy.
const cache = new Map<string, CacheEntry>();

// In-flight dedupe: if two RSCs ask for the same slug while the cache is
// cold, both await the same promise — Supabase only fires once.
const inFlight = new Map<string, Promise<PortalRow | null>>();

/**
 * Fetch a client's portal_content by slug. Server-side only.
 *
 * Cached for 5 minutes per Node process. Returns null when the slug is not
 * found (callers should render an empty state, not throw). Errors are
 * logged and swallowed — a missing portal must never crash the page.
 */
export async function getPortalContent(slug: string): Promise<PortalRow | null> {
  const now = Date.now();

  const cached = cache.get(slug);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const existing = inFlight.get(slug);
  if (existing) return existing;

  const promise = fetchFromSupabase(slug)
    .then((value) => {
      cache.set(slug, { value, expiresAt: Date.now() + PORTAL_CONTENT_TTL_MS });
      return value;
    })
    .finally(() => {
      inFlight.delete(slug);
    });

  inFlight.set(slug, promise);
  return promise;
}

/**
 * Invalidate the cache for a specific slug — call after admin updates a row.
 * With no argument, clears the whole cache.
 */
export function invalidatePortalContentCache(slug?: string): void {
  if (slug === undefined) {
    cache.clear();
    return;
  }
  cache.delete(slug);
}

async function fetchFromSupabase(slug: string): Promise<PortalRow | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('nexus_clients')
      .select('id, slug, portal_content')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[getPortalContent] Supabase error', { slug, error });
      return null;
    }
    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      portal_content: normalizePortalContent(data.portal_content),
    };
  } catch (err) {
    console.error('[getPortalContent] Unexpected error', { slug, err });
    return null;
  }
}

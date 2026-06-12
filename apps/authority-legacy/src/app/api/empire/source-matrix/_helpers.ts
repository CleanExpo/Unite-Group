// Module-private cache + reset helper for /api/empire/source-matrix.
//
// Lives in `_helpers.ts` (private file — not exported by Next.js App Router)
// so we can expose `resetCache()` to tests without breaking the App Router's
// "only handler symbols may be exported from route.ts" rule.

import type { BusinessSource, SourceKind } from '@/types/business-source';

export interface SourceMatrixBrand {
  slug: string;
  name: string;
  cells: Record<SourceKind, BusinessSource>;
}

export interface SourceMatrix {
  computed_at: string;
  brands: SourceMatrixBrand[];
}

interface CacheEntry {
  computed_at: number;
  payload: SourceMatrix;
}

let CACHED: CacheEntry | null = null;

export function getCache(): CacheEntry | null {
  return CACHED;
}

export function setCache(entry: CacheEntry): void {
  CACHED = entry;
}

export function resetCache(): void {
  CACHED = null;
}

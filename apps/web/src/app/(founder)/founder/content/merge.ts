// Pure helpers for the /founder/content unified content library.
// Kept free of Supabase/React so they can be unit-tested directly.

export type SourceFilter = 'all' | 'wiki' | 'pages' | 'drafts'

/** Narrow the ?source= search param to a known filter; anything else → 'all'. */
export function parseSourceFilter(raw: string | undefined): SourceFilter {
  return raw === 'wiki' || raw === 'pages' || raw === 'drafts' ? raw : 'all'
}

export interface Dated {
  /** ISO timestamp used for newest-first ordering; null/invalid sorts last. */
  timestamp: string | null
}

/** Merge any number of lists into one, newest-first; missing dates sink to the end. */
export function mergeNewestFirst<T extends Dated>(...lists: T[][]): T[] {
  return lists.flat().sort((a, b) => sortValue(b) - sortValue(a))
}

function sortValue(item: Dated): number {
  if (!item.timestamp) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(item.timestamp)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

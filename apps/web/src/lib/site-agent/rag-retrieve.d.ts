// Ambient contract for the UNI-2358 sibling module (`@/lib/rag/retrieve`),
// which is built on a sibling branch and does not exist here yet. This keeps
// `import('@/lib/rag/retrieve')` type-checking before that branch lands. The
// declared signature IS the agreed contract — if UNI-2358 changes it, update
// this file to match.
declare module '@/lib/rag/retrieve' {
  import type { SupabaseClient } from '@supabase/supabase-js'

  export function retrieve(
    supabase: SupabaseClient,
    businessId: string,
    query: string,
    k?: number,
  ): Promise<Array<{ content: string; source: string | null; similarity: number }>>
}

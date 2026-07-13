// src/lib/rag/embed-on-write.ts
// Best-effort embedding refresh for a nexus_pages row after its content is written.
//
// HONEST STATUS (UNI-2358): no apps/web code currently writes nexus_pages — it is a
// legacy Notion-like subsystem (see the comment in src/app/api/search/route.ts) whose
// rows were written by the older hub app; apps/web only reads it. This helper is the
// designated hook for whichever lane adds a write path: call it AFTER the row write.
//
// Contract: embedding failure must NEVER fail the caller's write. Every error
// (missing OPENAI_API_KEY, OpenAI outage, DB error) is caught, logged, and swallowed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { embed } from './embed';

export async function embedNexusPageOnWrite(
  supabase: SupabaseClient,
  pageId: string,
  text: string,
): Promise<boolean> {
  try {
    const vector = await embed(text);
    const { error } = await supabase
      .from('nexus_pages')
      .update({ embedding: JSON.stringify(vector) })
      .eq('id', pageId);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  } catch (err) {
    console.warn(
      `[rag] embed-on-write failed for nexus_pages ${pageId} (page write unaffected): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

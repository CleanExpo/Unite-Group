import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side only — uses the service role key. Returns null when Supabase
// isn't configured so the app still works before Phase 1 storage is set up.
function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface SavedRun {
  visionId: string;
  specId: string;
}

export async function saveRun(
  rawText: string,
  specContent: string,
): Promise<SavedRun | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data: vision, error: visionError } = await supabase
    .from("visions")
    .insert({ raw_text: rawText, status: "spec_generated" })
    .select("id")
    .single();
  if (visionError) throw new Error(`supabase visions insert: ${visionError.message}`);

  const { data: spec, error: specError } = await supabase
    .from("specs")
    .insert({ vision_id: vision.id, content: specContent })
    .select("id")
    .single();
  if (specError) throw new Error(`supabase specs insert: ${specError.message}`);

  return { visionId: vision.id, specId: spec.id };
}

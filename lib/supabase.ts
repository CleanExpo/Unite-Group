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

export type DatabaseStatus =
  | { state: "ok"; savedSpecs: number }
  | { state: "not_configured" }
  | { state: "error"; problem: string };

// Real connectivity check for the health endpoint — one cheap count query.
export async function checkDatabase(): Promise<DatabaseStatus> {
  const supabase = getClient();
  if (!supabase) return { state: "not_configured" };
  const { count, error } = await supabase
    .from("specs")
    .select("id", { count: "exact", head: true });
  if (error) return { state: "error", problem: error.message };
  return { state: "ok", savedSpecs: count ?? 0 };
}

export async function saveCritique(
  specId: string,
  critique: string,
  criticModel: string,
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("specs")
    .update({ critique, critic_model: criticModel })
    .eq("id", specId);
  if (error) throw new Error(`supabase critique update: ${error.message}`);
}

// The approval gate: marks the spec approved and the vision's status.
export async function approveSpec(specId: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: spec, error: specError } = await supabase
    .from("specs")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", specId)
    .select("vision_id")
    .single();
  if (specError) throw new Error(`supabase approve: ${specError.message}`);

  const { error: visionError } = await supabase
    .from("visions")
    .update({ status: "approved" })
    .eq("id", spec.vision_id);
  if (visionError) throw new Error(`supabase vision status: ${visionError.message}`);
}

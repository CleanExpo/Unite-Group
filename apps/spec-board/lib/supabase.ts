import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side only — uses the service role key. Returns null when Supabase
// isn't configured so the app still works before Phase 1 storage is set up.
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const getClient = getSupabase;

export interface SavedRun {
  visionId: string;
  specId: string;
}

export async function saveRun(
  rawText: string,
  specContent: string,
  parentSpecId?: string,
): Promise<SavedRun | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data: vision, error: visionError } = await supabase
    .from("visions")
    .insert({ raw_text: rawText, status: "spec_generated" })
    .select("id")
    .single();
  if (visionError) throw new Error(`supabase visions insert: ${visionError.message}`);

  let insert = await supabase
    .from("specs")
    .insert({
      vision_id: vision.id,
      content: specContent,
      ...(parentSpecId ? { parent_spec_id: parentSpecId } : {}),
    })
    .select("id")
    .single();
  if (insert.error && parentSpecId) {
    // Lineage column may not be migrated yet — save without it rather
    // than losing the spec.
    insert = await supabase
      .from("specs")
      .insert({ vision_id: vision.id, content: specContent })
      .select("id")
      .single();
  }
  if (insert.error) throw new Error(`supabase specs insert: ${insert.error.message}`);

  return { visionId: vision.id, specId: insert.data.id };
}

// Evidence Ledger: tagged claims extracted from a finished spec.
export async function saveFindings(
  visionId: string,
  claims: { claim: string; tag: string; sourceUrl: string | null }[],
): Promise<void> {
  const supabase = getClient();
  if (!supabase || claims.length === 0) return;
  const rows = claims.map((c) => ({
    vision_id: visionId,
    claim: c.claim,
    evidence_tag: c.tag,
    source_url: c.sourceUrl,
  }));
  const { error } = await supabase.from("findings").insert(rows);
  if (error) throw new Error(`supabase findings insert: ${error.message}`);
}

// PostgREST returns to-one joins as an object, but typings (and edge cases)
// can surface arrays — accept both.
function joined<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

export interface SpecListItem {
  specId: string;
  visionId: string;
  vision: string;
  createdAt: string;
  approvedAt: string | null;
  hasCritique: boolean;
  parentSpecId: string | null;
}

export interface SpecDetail extends SpecListItem {
  content: string;
  critique: string | null;
  boardResponses: { member: string; critique: string }[];
  evidence: { verified: number; inference: number; unconfirmed: number };
}

// The Spec Library: everything ever generated, newest first. The lineage
// column is selected when available; the fallback keeps the library working
// before the 0004_spec_lineage migration is applied.
export async function listSpecs(limit = 30): Promise<SpecListItem[]> {
  const supabase = getClient();
  if (!supabase) return [];
  let result = await supabase
    .from("specs")
    .select("id, vision_id, created_at, approved_at, critique, parent_spec_id, visions(raw_text)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (result.error) {
    result = (await supabase
      .from("specs")
      .select("id, vision_id, created_at, approved_at, critique, visions(raw_text)")
      .order("created_at", { ascending: false })
      .limit(limit)) as typeof result;
  }
  if (result.error) throw new Error(`supabase specs list: ${result.error.message}`);
  return (result.data ?? []).map((row) => {
    const vision = joined<{ raw_text: string }>(row.visions);
    return {
      specId: row.id,
      visionId: row.vision_id,
      vision: vision?.raw_text ?? "",
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      hasCritique: Boolean(row.critique),
      parentSpecId: row.parent_spec_id ?? null,
    };
  });
}

export async function getSpec(specId: string): Promise<SpecDetail | null> {
  const supabase = getClient();
  if (!supabase) return null;

  let result = await supabase
    .from("specs")
    .select(
      "id, vision_id, content, critique, created_at, approved_at, parent_spec_id, visions(raw_text)",
    )
    .eq("id", specId)
    .maybeSingle();
  if (result.error) {
    result = (await supabase
      .from("specs")
      .select("id, vision_id, content, critique, created_at, approved_at, visions(raw_text)")
      .eq("id", specId)
      .maybeSingle()) as typeof result;
  }
  if (result.error) throw new Error(`supabase spec get: ${result.error.message}`);
  const row = result.data;
  if (!row) return null;

  const { data: responses } = await supabase
    .from("board_responses")
    .select("critique, board_members(name)")
    .eq("spec_id", specId)
    .order("created_at", { ascending: true });

  const { data: findings } = await supabase
    .from("findings")
    .select("evidence_tag")
    .eq("vision_id", row.vision_id);

  const count = (tag: string) =>
    (findings ?? []).filter((f) => f.evidence_tag === tag).length;
  const vision = joined<{ raw_text: string }>(row.visions);

  return {
    specId: row.id,
    visionId: row.vision_id,
    vision: vision?.raw_text ?? "",
    content: row.content,
    critique: row.critique,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    hasCritique: Boolean(row.critique),
    parentSpecId: row.parent_spec_id ?? null,
    boardResponses: (responses ?? []).map((r) => ({
      member:
        joined<{ name: string }>(r.board_members)?.name ?? "Unknown seat",
      critique: r.critique,
    })),
    evidence: {
      verified: count("verified"),
      inference: count("inference"),
      unconfirmed: count("unconfirmed"),
    },
  };
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

import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

// Ask-the-board (Phase 3): advisor seats live as profile.md files under
// knowledge/board/ (the OS layer's source of truth); board_members rows in
// Supabase mirror them so responses can be stored relationally.

export interface BoardSeat {
  slug: string;
  name: string;
  seat: string;
  profile: string;
  sourceLinks: string[];
}

export function loadBoardSeats(): BoardSeat[] {
  const dir = path.join(process.cwd(), "knowledge", "board");
  if (!fs.existsSync(dir)) return [];

  const seats: BoardSeat[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const profilePath = path.join(dir, entry.name, "profile.md");
    if (!fs.existsSync(profilePath)) continue;
    const profile = fs.readFileSync(profilePath, "utf8");

    const name = profile.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (!name) continue;
    const seat = profile.match(/\*\*Seat:\*\*\s*(.+)$/m)?.[1]?.trim() ?? entry.name;
    const sourceLinks = [...profile.matchAll(/^- .*`([^`]+)`.*$/gm)].map((m) => m[1]);

    seats.push({ slug: entry.name, name, seat, profile, sourceLinks });
  }
  return seats;
}

// Mirrors seats into board_members (matched by name) and returns name → id.
export async function ensureBoardMembers(
  supabase: SupabaseClient,
  seats: BoardSeat[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const seat of seats) {
    const { data: existing, error: selectError } = await supabase
      .from("board_members")
      .select("id")
      .eq("name", seat.name)
      .maybeSingle();
    if (selectError) throw new Error(`board_members select: ${selectError.message}`);
    if (existing) {
      ids.set(seat.name, existing.id);
      continue;
    }
    const { data: inserted, error: insertError } = await supabase
      .from("board_members")
      .insert({ name: seat.name, seat: seat.seat, source_links: seat.sourceLinks })
      .select("id")
      .single();
    if (insertError) throw new Error(`board_members insert: ${insertError.message}`);
    ids.set(seat.name, inserted.id);
  }
  return ids;
}

export function personaPrompt(seat: BoardSeat): string {
  return `You are simulating one advisor seat on the board of The Fable System.
You are a persona LENS built from ingested material — never the real person,
never a source of truth. Your output feeds a human approval gate; it cannot
approve anything itself.

The advisor's profile and source material:

${seat.profile}

Rules:
- Critique strictly in this advisor's lens, grounded in the profile above.
  Cite the listed source files where a point leans on them.
- If the advisor's material does not cover part of the topic, say so in one
  line instead of fabricating their view.
- 3–6 bullets total: what they'd push on, what they'd cut, what they'd bet on.
- Tag factual claims [VERIFIED] / [INFERENCE] / [UNCONFIRMED].
- No preamble, no flattery, no closing summary.`;
}

export const SYNTHESIS_PROMPT = `You are combining per-seat board critiques for
The Fable System into one board view. The seats are persona lenses, not truth.

Output exactly three sections:
## Convergence — points multiple seats agree on (bullets).
## Tensions — where seats disagree, each stated as a real trade-off (bullets).
## Board verdict — one paragraph synthesis, and it MUST end with the literal
label: [INFERENCE] — persona synthesis, not fact.

No preamble.`;

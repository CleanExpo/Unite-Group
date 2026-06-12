import { NextResponse } from "next/server";
import { describeEngine } from "@/lib/llm";
import { checkDatabase } from "@/lib/supabase";
import { knowledgeCount, knowledgeSourceRepo } from "@/lib/knowledge";
import { loadBoardSeats } from "@/lib/board";
import { loadSkills } from "@/lib/skills";
import { researchConfigured } from "@/lib/research";

// Plain-language system check: is the engine configured, is the database
// connected, how many vault notes are ingested, who sits on the board,
// which skills are installed. Makes no LLM calls.
export async function GET() {
  const engine = describeEngine();
  const database = await checkDatabase();
  const notes = await knowledgeCount();
  const knowledge = {
    // "linked" means the engine can actually retrieve vault notes — they're
    // synced into Supabase by brain-1's CI, no app-side env needed.
    // "configured" only gates the in-app "Sync vault" button (legacy path).
    configured: Boolean(process.env.KNOWLEDGE_REPO && process.env.GITHUB_TOKEN),
    repo: process.env.KNOWLEDGE_REPO ?? (await knowledgeSourceRepo()),
    notes,
  };
  const board = { seats: loadBoardSeats().map((seat) => seat.name) };
  const skills = loadSkills();
  const research = { configured: researchConfigured() };
  return NextResponse.json(
    { engine, database, knowledge, board, skills, research },
    { headers: { "Cache-Control": "no-store" } },
  );
}

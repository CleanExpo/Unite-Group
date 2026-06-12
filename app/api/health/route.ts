import { NextResponse } from "next/server";
import { describeEngine } from "@/lib/llm";
import { checkDatabase } from "@/lib/supabase";
import { knowledgeCount, knowledgeSourceRepo } from "@/lib/knowledge";
import { loadBoardSeats } from "@/lib/board";

// Plain-language system check: is the engine configured, is the database
// connected, how many vault notes are ingested, who sits on the board.
// Makes no LLM calls.
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
  return NextResponse.json(
    { engine, database, knowledge, board },
    { headers: { "Cache-Control": "no-store" } },
  );
}

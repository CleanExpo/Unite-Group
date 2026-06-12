import { NextResponse } from "next/server";
import { describeEngine } from "@/lib/llm";
import { checkDatabase } from "@/lib/supabase";
import { knowledgeCount } from "@/lib/knowledge";

// Plain-language system check: is the engine configured, is the database
// connected, how many vault notes are ingested. Makes no LLM calls.
export async function GET() {
  const engine = describeEngine();
  const database = await checkDatabase();
  const knowledge = {
    configured: Boolean(process.env.KNOWLEDGE_REPO && process.env.GITHUB_TOKEN),
    repo: process.env.KNOWLEDGE_REPO ?? null,
    notes: await knowledgeCount(),
  };
  return NextResponse.json(
    { engine, database, knowledge },
    { headers: { "Cache-Control": "no-store" } },
  );
}

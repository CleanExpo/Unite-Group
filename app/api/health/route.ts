import { NextResponse } from "next/server";
import { describeEngine } from "@/lib/llm";
import { checkDatabase } from "@/lib/supabase";

// Plain-language system check: is the engine configured, is the database
// connected. Makes no LLM calls (free to hit any time).
export async function GET() {
  const engine = describeEngine();
  const database = await checkDatabase();
  return NextResponse.json(
    { engine, database },
    { headers: { "Cache-Control": "no-store" } },
  );
}

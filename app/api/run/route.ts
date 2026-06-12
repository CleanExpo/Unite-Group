import { NextResponse } from "next/server";
import { runEngine } from "@/lib/llm";
import { saveRun } from "@/lib/supabase";

export const maxDuration = 300;

export async function POST(request: Request) {
  let vision: unknown;
  try {
    ({ vision } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof vision !== "string" || vision.trim().length === 0) {
    return NextResponse.json({ error: "vision is required" }, { status: 400 });
  }

  let result;
  try {
    result = await runEngine(vision);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let saved = null;
  let saveError: string | null = null;
  try {
    saved = await saveRun(vision, result.text);
  } catch (error) {
    // Storage failure shouldn't lose the generated spec
    saveError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json({
    spec: result.text,
    provider: result.provider,
    model: result.model,
    saved,
    saveError,
    usage: result.usage,
    stopReason: result.stopReason,
  });
}

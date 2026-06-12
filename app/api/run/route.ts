import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getEnginePrompt } from "@/lib/engine-prompt";
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

  const client = new Anthropic(); // ANTHROPIC_API_KEY from server env only

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: getEnginePrompt(),
      messages: [{ role: "user", content: vision }],
    });
    const message = await stream.finalMessage();

    const spec = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    let saved = null;
    let saveError: string | null = null;
    try {
      saved = await saveRun(vision, spec);
    } catch (error) {
      // Storage failure shouldn't lose the generated spec
      saveError = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json({
      spec,
      saved,
      saveError,
      usage: message.usage,
      stopReason: message.stop_reason,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error ${error.status}: ${error.message}` },
        { status: 502 },
      );
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { runPersona } from "@/lib/llm";
import { summarizeCorpus, type Corpus } from "@/lib/playbook";
import { buildPlaybookPrompt } from "@/lib/playbook-catalogue";

export const maxDuration = 120;

// Synthesise a FABLE_PLAYBOOK.md.
//   { corpus }              — distilled JSONL metrics (from scripts/fable-distill.mjs)
//   { } or { corpus: null } — generic playbook from the verified catalogue alone
//   optional: targetModel   — the model the playbook will be injected into
export async function POST(request: Request) {
  let corpus: Corpus | null = null;
  let targetModel: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body === "object") {
      if (body.corpus && typeof body.corpus === "object" && body.corpus.models) {
        corpus = body.corpus as Corpus;
      }
      if (typeof body.targetModel === "string" && body.targetModel.trim()) {
        targetModel = body.targetModel.trim();
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const corpusSummary = corpus ? summarizeCorpus(corpus) : null;
  const { system, user } = buildPlaybookPrompt({
    corpusSummary,
    fableModel: corpus?.fableModel ?? null,
    baselineModel: corpus?.baselineModel ?? null,
    targetModel,
  });

  try {
    const result = await runPersona(system, user, 8000);
    if (!result) {
      return NextResponse.json(
        { error: "No LLM provider is configured — set ANTHROPIC_API_KEY (or OpenRouter/MiniMax) in env" },
        { status: 503 },
      );
    }
    return NextResponse.json({
      playbook: result.text,
      grounded: Boolean(corpusSummary),
      fableModel: corpus?.fableModel ?? null,
      baselineModel: corpus?.baselineModel ?? null,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

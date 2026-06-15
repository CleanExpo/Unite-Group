import { NextResponse } from "next/server";
import { runPersona } from "@/lib/llm";

export const maxDuration = 60;

const CLARIFY_PROMPT = `You are the intake step of The Fable System. The user
is about to spend one full engine run turning a plain-English vision into a
build-ready spec. Your job: ask the 3-4 questions whose answers would most
improve that single run.

Rules:
- Every item MUST be a genuine question the user can answer — it MUST end
  with a question mark. NEVER restate or echo fragments of the vision back.
- Ask only what cannot be inferred from the vision text itself.
- Each question must be concrete and answerable in one short sentence
  (finish line, audience, constraints, what's explicitly out of scope,
  existing assets, budget/timeline).
- Each question is one single line — no sub-bullets, no multi-line items.
- Never ask more than 4. If the vision is already fully specified, ask fewer.
- Output ONLY the questions as a numbered list, one per line. No preamble,
  no commentary.`;

// Pre-run questionnaire: 3-4 clarifying questions about a vision so the
// engine's one shot lands as close as possible. Optional — the run proceeds
// fine without answers.
export async function POST(request: Request) {
  let vision: string;
  try {
    const body = await request.json();
    if (typeof body.vision !== "string" || body.vision.trim().length === 0) {
      return NextResponse.json({ error: "vision is required" }, { status: 400 });
    }
    vision = body.vision;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await runPersona(CLARIFY_PROMPT, `The vision:\n\n${vision}`, 1000);
    if (!result) return NextResponse.json({ questions: [] });

    const parsed = result.text
      .split("\n")
      .map((line) => line.match(/^\s*\d+[.)]\s*(.+)$/)?.[1]?.trim())
      .filter((q): q is string => Boolean(q))
      .slice(0, 4);
    // Statement echoes are worse than no questions: keep only real questions,
    // and if the model produced none, skip the step (run proceeds directly).
    const questions = parsed.filter((q) => q.endsWith("?"));
    return NextResponse.json({ questions });
  } catch (error) {
    // Clarify is best-effort: a failure must never block the run.
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ questions: [], error: message });
  }
}

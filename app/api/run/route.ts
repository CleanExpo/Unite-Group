import { describeEngine, runEngineStream, describeCritic, runCritic } from "@/lib/llm";
import { saveRun, saveCritique, saveFindings } from "@/lib/supabase";
import { searchKnowledge } from "@/lib/knowledge";
import { webResearch } from "@/lib/research";
import { extractClaims, summarizeEvidence } from "@/lib/evidence";
import { buildSystemPrompt } from "@/lib/engine-prompt";

export const maxDuration = 300;

interface Clarification {
  question: string;
  answer: string;
}

// Streams the run as Server-Sent Events so the cockpit can light up live:
//   meta → delta* → engine_done → saved|save_skipped|save_error
//   → critic_start → critique | critic_error | critic_skipped → done
//
// Three ways in:
//   { vision }                                    — plain one-shot run
//   { vision, clarifications }                    — run with pre-run Q&A attached
//   { vision, refinement, previousSpec }          — revise an earlier spec
export async function POST(request: Request) {
  let vision: string;
  let clarifications: Clarification[] = [];
  let refinement = "";
  let previousSpec = "";
  let previousSpecId = "";
  try {
    const body = await request.json();
    if (typeof body.vision !== "string" || body.vision.trim().length === 0) {
      return Response.json({ error: "vision is required" }, { status: 400 });
    }
    vision = body.vision;
    if (Array.isArray(body.clarifications)) {
      clarifications = body.clarifications
        .filter(
          (c: unknown): c is Clarification =>
            typeof (c as Clarification)?.question === "string" &&
            typeof (c as Clarification)?.answer === "string" &&
            (c as Clarification).answer.trim().length > 0,
        )
        .slice(0, 6);
    }
    if (typeof body.refinement === "string") refinement = body.refinement.trim();
    if (typeof body.previousSpec === "string") previousSpec = body.previousSpec;
    if (typeof body.previousSpecId === "string") previousSpecId = body.previousSpecId;
    if (refinement && !previousSpec) {
      return Response.json({ error: "refinement needs previousSpec" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // What the engine sees as its task, and what we record as the request.
  let brief = vision;
  if (clarifications.length > 0) {
    brief += `\n\n## Clarifications (answered by the user before this run)\n${clarifications
      .map((c) => `- Q: ${c.question}\n  A: ${c.answer}`)
      .join("\n")}`;
  }
  if (refinement) {
    brief += `\n\n## Requested changes to the previous spec\n${refinement}`;
  }
  const engineTask = refinement
    ? `${brief}\n\n## Previous spec (revise it per the requested changes; output the complete updated spec)\n\n${previousSpec}`
    : brief;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

      try {
        const engine = describeEngine();
        send({ type: "meta", provider: engine.provider, models: engine.models });

        // Obsidian channel: retrieve relevant vault notes for this vision
        // (brief includes clarifications/refinement, sharpening the search)
        let knowledge: Awaited<ReturnType<typeof searchKnowledge>> = [];
        try {
          knowledge = await searchKnowledge(brief);
        } catch {
          // engine runs without vault material rather than failing the run
        }
        send({
          type: "knowledge",
          count: knowledge.length,
          paths: knowledge.map((hit) => hit.path),
        });

        // Web channel: live research for fresh sources (articles, papers,
        // videos). Best-effort — without TAVILY_API_KEY or on failure the
        // channel skips honestly, same as before.
        let web: Awaited<ReturnType<typeof webResearch>> = [];
        try {
          web = await webResearch(brief);
        } catch {
          // engine runs without web material rather than failing the run
        }
        send({ type: "web", count: web.length, urls: web.map((s) => s.url) });

        const result = await runEngineStream(
          engineTask,
          (text) => send({ type: "delta", text }),
          (failedModel, nextModels) =>
            send({ type: "engine_retry", failedModel, nextModels }),
          buildSystemPrompt(knowledge, web),
        );
        send({ type: "engine_done", model: result.model, stopReason: result.stopReason });

        let specId: string | null = null;
        let visionId: string | null = null;
        try {
          // brief (not engineTask) so visions.raw_text records the request
          // without duplicating the whole previous spec.
          const saved = await saveRun(brief, result.text, previousSpecId || undefined);
          if (saved) {
            specId = saved.specId;
            visionId = saved.visionId;
            send({ type: "saved", visionId: saved.visionId, specId: saved.specId });
          } else {
            send({ type: "save_skipped" });
          }
        } catch (e) {
          send({ type: "save_error", error: errorText(e) });
        }

        // Evidence Ledger: extract tagged claims into findings and report
        // the verified / inference / unconfirmed balance.
        try {
          const claims = extractClaims(result.text);
          if (visionId) await saveFindings(visionId, claims);
          send({ type: "evidence", ...summarizeEvidence(claims) });
        } catch (e) {
          send({ type: "evidence_error", error: errorText(e) });
        }

        const critic = describeCritic();
        if (critic) {
          send({ type: "critic_start", provider: critic.provider, model: critic.model });
          try {
            const critique = await runCritic(result.text);
            if (critique) {
              if (specId) {
                try {
                  await saveCritique(specId, critique.text, `${critique.provider}:${critique.model}`);
                } catch {
                  // critique still reaches the user via the event below
                }
              }
              send({
                type: "critique",
                text: critique.text,
                provider: critique.provider,
                model: critique.model,
              });
            } else {
              send({ type: "critic_skipped" });
            }
          } catch (e) {
            send({ type: "critic_error", error: errorText(e) });
          }
        } else {
          send({ type: "critic_skipped" });
        }

        send({ type: "done" });
      } catch (e) {
        send({ type: "error", error: errorText(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

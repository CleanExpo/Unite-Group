import { describeEngine, runEngineStream, describeCritic, runCritic } from "@/lib/llm";
import { saveRun, saveCritique } from "@/lib/supabase";

export const maxDuration = 300;

// Streams the run as Server-Sent Events so the cockpit can light up live:
//   meta → delta* → engine_done → saved|save_skipped|save_error
//   → critic_start → critique | critic_error | critic_skipped → done
export async function POST(request: Request) {
  let vision: string;
  try {
    const body = await request.json();
    if (typeof body.vision !== "string" || body.vision.trim().length === 0) {
      return Response.json({ error: "vision is required" }, { status: 400 });
    }
    vision = body.vision;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

      try {
        const engine = describeEngine();
        send({ type: "meta", provider: engine.provider, models: engine.models });

        const result = await runEngineStream(vision, (text) =>
          send({ type: "delta", text }),
        );
        send({ type: "engine_done", model: result.model, stopReason: result.stopReason });

        let specId: string | null = null;
        try {
          const saved = await saveRun(vision, result.text);
          if (saved) {
            specId = saved.specId;
            send({ type: "saved", visionId: saved.visionId, specId: saved.specId });
          } else {
            send({ type: "save_skipped" });
          }
        } catch (e) {
          send({ type: "save_error", error: errorText(e) });
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

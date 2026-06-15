import { runPersona, describeCritic } from "@/lib/llm";
import { getSupabase } from "@/lib/supabase";
import {
  loadBoardSeats,
  ensureBoardMembers,
  personaPrompt,
  parseFindings,
  SYNTHESIS_PROMPT,
} from "@/lib/board";
import { stripThinking } from "@/lib/findings";

export const maxDuration = 300;

// Ask the Board (Phase 3): runs every advisor seat's persona critique over a
// finished spec, stores each in board_responses, and streams progress as SSE:
//   meta → seat_start/seat_done* → synthesis → done
// Board output is a lens, never truth — the human approval gate still applies.
export async function POST(request: Request) {
  let specId: string;
  try {
    const body = await request.json();
    if (typeof body.specId !== "string" || body.specId.length === 0) {
      return Response.json({ error: "specId is required" }, { status: 400 });
    }
    specId = body.specId;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  }
  if (!describeCritic()) {
    return Response.json({ error: "No persona model configured (CRITIC_PROVIDER)" }, { status: 500 });
  }

  const seats = loadBoardSeats();
  if (seats.length === 0) {
    return Response.json(
      { error: "The board is empty — no profiles in knowledge/board/" },
      { status: 409 },
    );
  }

  const { data: spec, error: specError } = await supabase
    .from("specs")
    .select("content")
    .eq("id", specId)
    .single();
  if (specError || !spec) {
    return Response.json({ error: `spec not found: ${specError?.message}` }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

      try {
        const memberIds = await ensureBoardMembers(supabase, seats);
        send({ type: "meta", seats: seats.map((s) => ({ name: s.name, seat: s.seat })) });

        const critiques: { name: string; seat: string; critique: string }[] = [];
        for (const seat of seats) {
          send({ type: "seat_start", name: seat.name });
          try {
            const result = await runPersona(
              personaPrompt(seat),
              `Critique this spec in ${seat.name}'s lens:\n\n${spec.content}`,
            );
            if (!result) throw new Error("no persona model configured");
            const critique = stripThinking(result.text);
            critiques.push({ name: seat.name, seat: seat.seat, critique });

            const memberId = memberIds.get(seat.name);
            if (memberId) {
              const { error: saveError } = await supabase
                .from("board_responses")
                .insert({ spec_id: specId, member_id: memberId, critique });
              if (saveError) send({ type: "seat_save_error", name: seat.name, error: saveError.message });
            }
            send({
              type: "seat_done",
              name: seat.name,
              seat: seat.seat,
              critique,
              findings: parseFindings(critique),
            });
          } catch (e) {
            send({ type: "seat_error", name: seat.name, error: errorText(e) });
          }
        }

        if (critiques.length > 1) {
          try {
            const combined = critiques
              .map((c) => `## ${c.name} — ${c.seat}\n\n${c.critique}`)
              .join("\n\n---\n\n");
            const synthesis = await runPersona(
              SYNTHESIS_PROMPT,
              `Combine these board critiques:\n\n${combined}`,
              4000,
            );
            if (synthesis) send({ type: "synthesis", text: stripThinking(synthesis.text) });
          } catch (e) {
            send({ type: "synthesis_error", error: errorText(e) });
          }
        }

        send({ type: "done", responded: critiques.length, total: seats.length });
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

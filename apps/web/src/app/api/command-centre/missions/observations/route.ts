import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { getTaskById } from "@/lib/command-centre/tasks";
import { readDeliveryMetadata } from "@/lib/command-centre/delivery-types";
import { getDeliveryProjectByName } from "@/lib/command-centre/delivery-projects";
import { observeDelivery } from "@/lib/command-centre/delivery-observations";

export const dynamic = "force-dynamic";
const requestSchema = z.object({ taskId: z.string().uuid() }).strict();
const headers = { "Cache-Control": "no-store" };

/** Read-only refresh: identity only. No browser verdict, URLs or provider writes. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401, headers },
    );
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Provide a valid taskId only." },
      { status: 400, headers },
    );
  try {
    const input = { founderId: user.id, taskId: parsed.data.taskId };
    const task = await getTaskById(input);
    if (!task || task.founder_id !== user.id || task.id !== input.taskId)
      return NextResponse.json(
        { error: "Mission not found" },
        { status: 404, headers },
      );
    const metadata = readDeliveryMetadata(task);
    if (!metadata)
      return NextResponse.json(
        { error: "Mission delivery record is unavailable." },
        { status: 409, headers },
      );
    const project = metadata.projectKey
      ? await getDeliveryProjectByName(metadata.projectKey)
      : undefined;
    const observations = await observeDelivery(task, project, {
      token: process.env.GITHUB_TOKEN,
    });
    // Reject output if another request edits or replaces the mission while GitHub is read.
    const current = await getTaskById(input);
    if (
      !current ||
      current.founder_id !== user.id ||
      current.id !== task.id ||
      current.updated_at !== task.updated_at ||
      current.project_key !== task.project_key ||
      JSON.stringify(current.metadata.delivery) !==
        JSON.stringify(task.metadata.delivery)
    ) {
      return NextResponse.json(
        {
          error:
            "The mission changed during refresh. Refresh the mission and try again.",
        },
        { status: 409, headers },
      );
    }
    return NextResponse.json(observations, { headers });
  } catch {
    return NextResponse.json(
      { error: "Mission evidence could not be read. Try again later." },
      { status: 500, headers },
    );
  }
}

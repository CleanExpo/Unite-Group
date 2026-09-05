import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { listTasks } from "@/lib/command-centre/tasks";
import {
  deliveryRequestSchema,
  isDeliveryMission,
} from "@/lib/command-centre/delivery-types";
import {
  DELIVERY_PRESETS,
  resolveDeliveryPresets,
} from "@/lib/command-centre/delivery-presets";
import {
  prepareDeliveryMission,
  DeliveryPreparationFailure,
} from "@/lib/command-centre/delivery-prepare";
import {
  DeliveryConflict,
  DeliveryNotFound,
} from "@/lib/command-centre/delivery-store";
import { toDeliveryMissionView } from "@/lib/command-centre/delivery-view";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    const tasks = await listTasks({ founderId: user.id, limit: 100 });
    return NextResponse.json({
      missions: tasks
        .filter(isDeliveryMission)
        .map((task) => toDeliveryMissionView(task)),
      presets: DELIVERY_PRESETS,
      source: "supabase",
      coverage: "Latest 100 founder tasks; older missions may not be included.",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Saved missions are temporarily unavailable. Retry shortly.",
        source: "error",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = deliveryRequestSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Please provide a valid mission request.",
        fields: parsed.error.issues.map((issue) => issue.path.join(".")),
      },
      { status: 400 },
    );
  if (parsed.data.action === "prepare") {
    try {
      resolveDeliveryPresets(parsed.data.presetIds);
    } catch {
      return NextResponse.json(
        {
          error:
            "One of the selected capabilities is unavailable. Refresh the options.",
        },
        { status: 400 },
      );
    }
  }
  try {
    const { task, deduplicated } = await prepareDeliveryMission(
      user.id,
      parsed.data,
    );
    return NextResponse.json(
      { mission: toDeliveryMissionView(task), deduplicated },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof DeliveryPreparationFailure)
      return NextResponse.json(
        { error: error.message, mission: toDeliveryMissionView(error.task) },
        { status: 502 },
      );
    if (error instanceof DeliveryNotFound)
      return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof DeliveryConflict)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(
      {
        error:
          "The mission could not be saved or confirmed. Refresh your saved missions before retrying.",
      },
      { status: 503 },
    );
  }
}

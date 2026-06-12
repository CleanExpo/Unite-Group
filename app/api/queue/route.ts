import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Max-plan bridge, step 1: queue a vision instead of running it on metered
// API credit. A local worker (scripts/max-worker.mjs) running under a
// Claude Max login picks it up, generates the spec, and writes it back —
// the app stays the front-end, the subscription does the heavy lifting.
export async function POST(request: Request) {
  let vision: string;
  try {
    const body = await request.json();
    if (typeof body.vision !== "string" || body.vision.trim().length === 0) {
      return NextResponse.json({ error: "vision is required" }, { status: 400 });
    }
    vision = body.vision.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("visions")
    .insert({ raw_text: vision, status: "queued" })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ queued: true, visionId: data.id });
}

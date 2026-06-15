import { NextResponse } from "next/server";
import { approveSpec } from "@/lib/supabase";

// The human approval gate: nothing is final until this is called.
export async function POST(request: Request) {
  let specId: unknown;
  try {
    ({ specId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof specId !== "string" || specId.length === 0) {
    return NextResponse.json({ error: "specId is required" }, { status: 400 });
  }
  try {
    await approveSpec(specId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ approved: true });
}

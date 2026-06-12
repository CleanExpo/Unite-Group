import { NextResponse } from "next/server";
import { listSpecs, getSpec } from "@/lib/supabase";

// The Spec Library: list past runs, or fetch one in full (spec + critique +
// board responses + evidence counts) via ?id=.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  try {
    if (id) {
      const spec = await getSpec(id);
      if (!spec) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json(spec, { headers: { "Cache-Control": "no-store" } });
    }
    const specs = await listSpecs();
    return NextResponse.json({ specs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  runCleanup,
  type CleanupBatch,
} from "@/lib/command-centre/cleanup-loop";

// UNI-2150 — Founder-auth, assessment-only cleanup planning. The route has no
// Linear mutation dependency and can never close or comment on a scope.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let batch: CleanupBatch;
  try {
    const body = (await request.json()) as {
      batch?: CleanupBatch;
    } & Partial<CleanupBatch>;
    batch = body.batch ?? (body as CleanupBatch);
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!batch || !batch.scopeId || !Array.isArray(batch.issues)) {
    return NextResponse.json({ error: "batch_required" }, { status: 400 });
  }

  const result = await runCleanup(batch);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

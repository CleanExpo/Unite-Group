import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUser, createClient } from "@/lib/supabase/server";
import { createMargotReadStore, type MargotLiveDatabase } from "@/lib/weekly-tasks/margot-private-storage";
import { resolveMargotMedia } from "@/lib/weekly-tasks/margot-media-access";
import { signPrivateMargotMedia } from "@/lib/weekly-tasks/margot-content-review.server";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401, headers });
  try {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].length !== new Set(params.keys()).size) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
    const body = Object.fromEntries(params); const version = Number(body.version);
    const client = await createClient();
    const result = await resolveMargotMedia({ ownerId: user.id, collectionId: process.env.MARGOT_WEEKLY_COLLECTION_ID,
      store: createMargotReadStore(client as unknown as SupabaseClient<MargotLiveDatabase>), request: { ...body, version }, sign: signPrivateMargotMedia });
    if (result.status === "available") return new NextResponse(null, { status: 307, headers: { ...headers, Location: result.url } });
    return NextResponse.json({ error: result.status === "stale" ? "This packet changed. Reload the current version." : "Verified video unavailable. Please return to the review packet." }, { status: result.status === "stale" ? 409 : result.status === "invalid" ? 400 : 503, headers });
  } catch { return NextResponse.json({ error: "Verified video unavailable" }, { status: 503, headers }); }
}

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUser, createClient } from "@/lib/supabase/server";
import type { MargotLiveDatabase } from "@/lib/weekly-tasks/margot-private-storage";
import { saveMargotContentReview } from "@/lib/weekly-tasks/margot-content-review";
import { createContentReviewStore, signPrivateMargotMedia } from "@/lib/weekly-tasks/margot-content-review.server";
import { ownedMediaAsset } from "@/lib/weekly-tasks/margot-media-access";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ status: "unauthorised" }, { status: 401, headers });
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ status: "invalid" }, { status: 403, headers });
    const text = await request.text();
    if (text.length > 16000) return NextResponse.json({ status: "invalid" }, { status: 400, headers });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ status: "invalid" }, { status: 400, headers }); }
    const client = await createClient();
    const result = await saveMargotContentReview({ ownerId: user.id, collectionId: process.env.MARGOT_WEEKLY_COLLECTION_ID,
      store: createContentReviewStore(client as unknown as SupabaseClient<MargotLiveDatabase>), body,
      canPlay: async (episode, owner) => { const asset = ownedMediaAsset(episode, owner); return Boolean(asset && await signPrivateMargotMedia(asset.bucket, asset.objectPath)); },
    });
    const status = result.status === "saved" ? 200 : result.status === "invalid" ? 400 : ["stale", "conflict", "media_unavailable"].includes(result.status) ? 409 : 503;
    return NextResponse.json(result, { status, headers });
  } catch { return NextResponse.json({ status: "unavailable" }, { status: 503, headers }); }
}

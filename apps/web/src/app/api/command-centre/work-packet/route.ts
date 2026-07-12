import { NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import {
  buildWorkPacket,
  parseWorkPacketRequest,
  planPacketLinearProjection,
} from "@/lib/command-centre/work-packet";
import {
  saveWorkPacket,
  listWorkPackets,
  type ListWorkPacketsFilter,
} from "@/lib/command-centre/work-packet-store";
import type { PacketStatus } from "@/lib/command-centre/work-packet";
import type { SupabaseLike } from "@/lib/command-centre/tasks";

// UNI-2147 — Mission Control work generator. Founder-auth. Builds an execution
// packet from a plain request, persists it (so it survives a restart / approval
// round-trip), and returns it + a plan-only Linear projection input. This route
// has no Linear write dependency.
// GET lists the founder's durable packets.
export const dynamic = "force-dynamic";

const PACKET_STATUSES: PacketStatus[] = [
  "draft",
  "routed",
  "running",
  "blocked",
  "awaiting_approval",
  "completed",
];

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = parseWorkPacketRequest(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const packet = buildWorkPacket(parsed.value, { now: new Date().toISOString() });
  const result = planPacketLinearProjection(packet);

  // Persist the (possibly Linear-stamped) packet so it is durable. Read back
  // through the store so the response reflects exactly what was stored.
  const db = (await createClient()) as unknown as SupabaseLike;
  const saved = await saveWorkPacket(db, user.id, result.packet);

  return NextResponse.json(
    { ...result, packet: saved },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const projectKey = url.searchParams.get("projectKey") ?? undefined;
  const limitParam = url.searchParams.get("limit");

  const filter: ListWorkPacketsFilter = {};
  if (statusParam && PACKET_STATUSES.includes(statusParam as PacketStatus)) {
    filter.status = statusParam as PacketStatus;
  }
  if (projectKey) filter.projectKey = projectKey;
  if (limitParam) {
    const limit = Number.parseInt(limitParam, 10);
    if (Number.isFinite(limit)) filter.limit = limit;
  }

  const db = (await createClient()) as unknown as SupabaseLike;
  const packets = await listWorkPackets(db, user.id, filter);

  return NextResponse.json(
    { packets },
    { headers: { "Cache-Control": "no-store" } },
  );
}

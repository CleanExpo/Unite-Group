// GET /api/command-centre/project-integrations/work-packets
// Founder-auth, dry-run RANA work packets generated from project manifest gaps.

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/command-centre/registry";
import { loadProjectIntegrationStatuses } from "@/lib/command-centre/project-integrations";
import {
  buildEndpointMissingWorkPackets,
  buildProjectIntegrationWorkPackets,
} from "@/lib/command-centre/project-integration-work-packets";
import {
  planPacketLinearProjection,
  type PacketProjectionPlan,
  type WorkPacket,
} from "@/lib/command-centre/work-packet";
import { saveWorkPacketOnce } from "@/lib/command-centre/work-packet-store";
import type { SupabaseLike } from "@/lib/command-centre/tasks";

export const dynamic = "force-dynamic";

interface CreateWorkPacketsRequest {
  live?: boolean;
  queue?: boolean;
}

async function loadGapPackets() {
  const projects = await getProjects();
  const now = new Date().toISOString();

  const integrations = await loadProjectIntegrationStatuses(projects);
  const connectionGapPackets = buildProjectIntegrationWorkPackets(
    integrations,
    { now },
  );

  // Projects with an integration status URL are covered by the connection-gap
  // pass above; only projects WITHOUT one (silently dropped by
  // loadProjectIntegrationStatuses) need an endpoint-missing packet. The builder
  // itself excludes any project with a non-empty integration_status_url, so the
  // two passes never overlap.
  const endpointMissingPackets = buildEndpointMissingWorkPackets(projects, {
    now,
  });

  return [...connectionGapPackets, ...endpointMissingPackets];
}

function stablePacket(packet: WorkPacket): WorkPacket {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        projectKey: packet.projectKey,
        outcome: packet.outcome.trim().toLowerCase(),
        lane: packet.lane,
      }),
    )
    .digest("hex");
  return { ...packet, id: `project-integration-gap:${digest}` };
}

async function persistQueuedResults(
  db: SupabaseLike,
  founderId: string,
  results: PacketProjectionPlan[],
) {
  const queued: WorkPacket[] = [];
  const skipped: WorkPacket[] = [];

  for (const result of results) {
    const saved = await saveWorkPacketOnce(db, founderId, result.packet);
    if (saved.created) queued.push(saved.packet);
    else skipped.push(saved.packet);
  }

  return { queued, skipped };
}

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const packets = await loadGapPackets();

    return NextResponse.json({
      source: "command-centre:project-integration-work-packets",
      count: packets.length,
      packets,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build project integration work packets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: CreateWorkPacketsRequest = {};
  try {
    body = (await request.json()) as CreateWorkPacketsRequest;
  } catch {
    body = {};
  }

  if (body.live === true) {
    return NextResponse.json(
      { error: "legacy_linear_execution_retired", authority: "crm-ownest" },
      { status: 409 },
    );
  }

  try {
    const packets = await loadGapPackets();
    const results = packets.map(({ packet }) =>
      planPacketLinearProjection(stablePacket(packet)),
    );
    const queue = body.queue !== false;
    const persistence = queue
      ? await persistQueuedResults(
          (await createClient()) as unknown as SupabaseLike,
          user.id,
          results,
        )
      : { queued: [], skipped: [] };

    return NextResponse.json(
      {
        source: "command-centre:project-integration-work-packets:queue-crm",
        mode: "plan-only",
        queue,
        count: results.length,
        queuedCount: persistence.queued.length,
        skippedExistingCount: persistence.skipped.length,
        results,
        queued: persistence.queued,
        skippedExisting: persistence.skipped,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create project integration work packets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

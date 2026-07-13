// GET /api/cron/linear-queue-health
//
// Authenticated, read-only inventory for legacy autonomous-labelled Linear
// projections. It never describes the retired executor as healthy/stale or
// exposes a next action that another daemon could claim.

import { sanitiseError } from "@/lib/error-reporting";
import { NextResponse } from "next/server";
import {
  fetchClaimCandidates,
  type LinearClaimCandidateRaw,
} from "@/lib/integrations/linear";
import {
  AUTONOMOUS_LABELS,
  type ClaimCandidate,
  type LinearStateType,
} from "@/lib/command-centre/linear-claim";
import {
  buildConfigReadiness,
  computeQueueHealth,
} from "@/lib/command-centre/linear-queue-health";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TEAM_KEY = "UNI";
const PROJECT_NAME = "Unite-Group";

function toCandidate(raw: LinearClaimCandidateRaw): ClaimCandidate {
  return {
    id: raw.id,
    identifier: raw.identifier,
    title: raw.title,
    priority: raw.priority,
    description: raw.description,
    createdAt: raw.createdAt,
    url: raw.url,
    stateName: raw.state.name,
    stateType: raw.state.type as LinearStateType,
    labels: raw.labels.nodes.map((label) => label.name),
    blockedByOpenCount: 0,
  };
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (
    request.headers.get("authorization") !==
    `Bearer ${process.env.CRON_SECRET.trim()}`
  ) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const config = buildConfigReadiness({
    linearKey: process.env.LINEAR_API_KEY,
    teamKey: TEAM_KEY,
    projectName: PROJECT_NAME,
  });

  if (!config.inventoryConfigured) {
    return NextResponse.json(computeQueueHealth({ config, candidates: [] }));
  }

  try {
    const raw = await fetchClaimCandidates({
      teamKey: TEAM_KEY,
      projectName: PROJECT_NAME,
      labelNames: [...AUTONOMOUS_LABELS],
    });
    return NextResponse.json(
      computeQueueHealth({ config, candidates: raw.map(toCandidate) }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, "Linear projection inventory failed") },
      { status: 500 },
    );
  }
}

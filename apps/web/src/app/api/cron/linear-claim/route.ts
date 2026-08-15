// GET /api/cron/linear-claim
//
// Permanent retirement boundary for the legacy Linear-authoritative execution
// lane. CRM `cc_tasks` is authoritative and the Nexus Runner (UNI-2383) is the
// only live execution path — it claims approved `cc_tasks` via
// POST /api/agents/runner/claim. The OWNEST host worker this tombstone used to
// name is itself permanently retired (UNI-2143), so pointing callers at it sent
// them to a lane with nothing running.
//
// Keeping an authenticated 410 tombstone makes old callers fail loudly without
// listing, claiming, updating, or commenting on Linear issues.

import { NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;

  return NextResponse.json(
    {
      ok: false,
      retired: true,
      source: "command-centre:linear-claim",
      error:
        "Legacy Linear autonomous claim is permanently retired. Approved CRM `cc_tasks` claimed by the Nexus Runner are authoritative.",
      next_action: "use_cc_tasks_queue",
    },
    { status: 410 },
  );
}

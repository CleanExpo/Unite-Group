// GET /api/cron/linear-claim
//
// Permanent retirement boundary for the legacy Linear-authoritative execution
// lane. CRM `cc_tasks` is authoritative and OWNEST is the only eligible
// execution path. Keeping an authenticated 410 tombstone makes old callers fail
// loudly without listing, claiming, updating, or commenting on Linear issues.

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
        "Legacy Linear autonomous claim is permanently retired. CRM OWNEST is authoritative.",
      next_action: "use_crm_ownest",
    },
    { status: 410 },
  );
}

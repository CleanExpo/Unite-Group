// GET /api/cron/linear-handoff
//
// Permanent retirement boundary for the legacy hosted Linear author/publisher.
// CRM `cc_tasks` is authoritative and OWNEST is the only eligible execution
// path. This authenticated tombstone returns no execution packet and performs
// no Linear, filesystem, Git, subprocess, credential, or network work.

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
      source: "command-centre:linear-handoff",
      error:
        "Legacy Linear autonomous handoff is permanently retired. CRM OWNEST is authoritative.",
      next_action: "use_crm_ownest",
    },
    { status: 410 },
  );
}

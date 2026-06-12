import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncRailway } from "@/lib/integrations/railway/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type RailwayFailure = { projectId: string; error: string };

export const GET = withSyncLifecycle<RailwayFailure>(
  {
    integration: "railway",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.projectId}: ${f.error}`,
  },
  syncRailway,
);

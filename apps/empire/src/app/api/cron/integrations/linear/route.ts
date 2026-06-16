import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncLinear } from "@/lib/integrations/linear/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type LinearFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<LinearFailure>(
  {
    integration: "linear",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncLinear,
);

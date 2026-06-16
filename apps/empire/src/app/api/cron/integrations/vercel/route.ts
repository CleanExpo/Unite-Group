import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncVercel } from "@/lib/integrations/vercel/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type VercelFailure = { project: string; error: string };

export const GET = withSyncLifecycle<VercelFailure>(
  {
    integration: "vercel",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.project}: ${f.error}`,
  },
  syncVercel,
);

import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncComposio } from "@/lib/integrations/composio/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type ComposioFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<ComposioFailure>(
  {
    integration: "composio",
    cadenceMs: 60 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncComposio,
);

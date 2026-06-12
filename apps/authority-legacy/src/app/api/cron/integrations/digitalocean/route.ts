import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncDigitalOcean } from "@/lib/integrations/digitalocean/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

type DOFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<DOFailure>(
  {
    integration: "digitalocean",
    cadenceMs: 15 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncDigitalOcean,
);

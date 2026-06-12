import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncStripe } from "@/lib/integrations/stripe/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type StripeFailure = { entity: string; error: string };

export const GET = withSyncLifecycle<StripeFailure>(
  {
    integration: "stripe",
    cadenceMs: 15 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.entity}: ${f.error}`,
  },
  syncStripe,
);

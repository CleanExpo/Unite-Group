import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncSupabase } from "@/lib/integrations/supabase/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type SupabaseFailure = { project: string; error: string };

export const GET = withSyncLifecycle<SupabaseFailure>(
  {
    integration: "supabase",
    cadenceMs: 60 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.project}: ${f.error}`,
  },
  syncSupabase,
);

// NOTE: this route is NOT registered in vercel.json. The 1Password sync
// uses the `op` CLI which doesn't exist in Vercel serverless. It runs
// instead from a Hermes cron on the Mac mini (where `op` is installed).
// Follow-up: /Users/phill-mac/Pi-CEO/scripts/sync_1password_to_supabase.py + Hermes cron
// "Unite-Group 1Password sync" at daily 04:00 AEST.
//
// This route is kept so the 1Password Connect path (when OP_CONNECT_HOST
// + OP_CONNECT_TOKEN are configured) can be triggered manually via
// authenticated POST. It will not auto-fire from Vercel.
import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncOnePassword } from "@/lib/integrations/onepassword/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type OnePasswordFailure = { vault: string; error: string };

export const GET = withSyncLifecycle<OnePasswordFailure>(
  {
    integration: "onepassword",
    cadenceMs: 24 * 60 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.vault}: ${f.error}`,
  },
  syncOnePassword,
);

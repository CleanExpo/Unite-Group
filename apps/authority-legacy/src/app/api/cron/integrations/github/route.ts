import { withSyncLifecycle } from "@/lib/runtime/sync-lifecycle";
import { syncGitHub } from "@/lib/integrations/github/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

type GitHubFailure = { repo: string; error: string };

export const GET = withSyncLifecycle<GitHubFailure>(
  {
    integration: "github",
    cadenceMs: 5 * 60_000,
    partialIfFailed: true,
    formatFailure: (f) => `${f.repo}: ${f.error}`,
  },
  syncGitHub,
);

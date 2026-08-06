import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(process.cwd(), "../..");

describe("automation control-plane configuration", () => {
  it("keeps Brand Video GHA manual-only without an unattended schedule", () => {
    const workflow = readFileSync(
      join(repoRoot, ".github/workflows/brand-video-render.yml"),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("repository_dispatch:");
    expect(workflow).not.toMatch(/^\s*schedule:/m);
    expect(workflow).not.toMatch(/^\s*- cron:/m);
  });

  it("registers the Brand Video Vercel cron dispatcher (UNI-2373 P5)", () => {
    const vercel = readFileSync(
      join(repoRoot, "apps/web/vercel.json"),
      "utf8",
    );
    expect(vercel).toContain('/api/cron/brand-video-dispatch');
  });

  it("registers experiment_results ingest after analytics-sync (UNI-2373 P4)", () => {
    const vercel = readFileSync(
      join(repoRoot, "apps/web/vercel.json"),
      "utf8",
    );
    expect(vercel).toContain('/api/cron/experiment-results-ingest');
    expect(vercel).toContain('/api/cron/analytics-sync');
  });

  it("keeps the superseded operator queue service permanently retired", () => {
    const installer = readFileSync(
      join(
        repoRoot,
        "apps/autopilot-runner/scripts/install-operator-jobs-service.sh",
      ),
      "utf8",
    );

    expect(installer).toContain(
      "operator_jobs service installation is permanently retired",
    );
    expect(installer).toContain("exit 78");
    expect(installer).not.toMatch(/StartInterval|launchctl|SUPABASE|\.env/);
  });
});

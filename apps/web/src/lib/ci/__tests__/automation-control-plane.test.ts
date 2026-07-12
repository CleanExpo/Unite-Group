import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(process.cwd(), "../..");

describe("automation control-plane configuration", () => {
  it("keeps Brand Video manual-only without an unattended schedule", () => {
    const workflow = readFileSync(
      join(repoRoot, ".github/workflows/brand-video-render.yml"),
      "utf8",
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("repository_dispatch:");
    expect(workflow).not.toMatch(/^\s*schedule:/m);
    expect(workflow).not.toMatch(/^\s*- cron:/m);
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

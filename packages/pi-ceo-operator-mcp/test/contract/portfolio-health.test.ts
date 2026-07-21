import { describe, expect, test } from "vitest";
import { makeFakeGh, recordCase } from "../fixtures/fake-gh.mjs";

async function runtime() { return import("../../src/runtime.js"); }
const repos = ["Pi-Dev-Ops", "Disaster-Recovery", "DR-NRPG", "ATO", "RestoreAssist", "CARSI", "Unite-Group", "Synthex", "CCW-CRM"];
const success = { runs: [{ conclusion: "success", html_url: "https://example.invalid/run/1", name: "CI" }, { conclusion: "failure", html_url: "https://example.invalid/run/0", name: "CI" }] };

describe("portfolio health", () => {
  test("PH-01 queries nine repos with exact hermetic gh argv and truthful metrics", async () => {
    const { getPortfolioHealth } = await runtime();
    const ledger: string[][] = [];
    const result = await getPortfolioHealth({ execFile: makeFakeGh(Object.fromEntries(repos.map((repo) => [repo, success])), ledger), now: () => new Date("2026-07-22T00:00:00Z") });
    expect(result.repos).toHaveLength(9);
    expect(result.total_fails).toBe(9);
    expect(result.timestamp).toBe("2026-07-22T00:00:00.000Z");
    expect(ledger).toHaveLength(9);
    expect(ledger.every((argv) => argv[0] === "gh" && argv[1] === "api" && argv.at(-2) === "--jq")).toBe(true);
    await recordCase("PH-01", { assertions: 5 });
  });

  test("PH-02 rejects unknown input before gh execution", async () => {
    const { validatePortfolioInput } = await runtime();
    const ledger: string[][] = [];
    expect(() => validatePortfolioInput({ unexpected: true })).toThrow();
    expect(ledger).toHaveLength(0);
    await recordCase("PH-02", { assertions: 2 });
  });

  test("PH-03 total gh failure returns nine redacted unknown rows and remains bounded", async () => {
    const { getPortfolioHealth } = await runtime();
    const marker = "Bearer secret-suffix-123";
    const fixtures = Object.fromEntries(repos.map((repo) => [repo, new Error(`\u001b[31m${marker}\u001b[0m`)]));
    const result = await getPortfolioHealth({ execFile: makeFakeGh(fixtures) });
    expect(result.repos).toHaveLength(9);
    expect(result.repos.every((repo: { latest_conclusion: string; error?: string }) => repo.latest_conclusion === "unknown" && repo.error === "External command failed (redacted).")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret-suffix-123");
    await recordCase("PH-03", { assertions: 3 });
  });

  test("PH-04 preserves healthy rows during one redacted partial failure", async () => {
    const { getPortfolioHealth } = await runtime();
    const fixtures = Object.fromEntries(repos.map((repo) => [repo, success]));
    fixtures.CARSI = new Error("https://user:provider-token@example.invalid/private");
    const result = await getPortfolioHealth({ execFile: makeFakeGh(fixtures) });
    expect(result.repos_with_errors).toBe(1);
    expect(result.repos.find((repo: { repo: string }) => repo.repo === "Pi-Dev-Ops")?.latest_conclusion).toBe("success");
    expect(result.total_fails).toBe(8);
    expect(JSON.stringify(result)).not.toContain("provider-token");
    await recordCase("PH-04", { assertions: 4 });
  });
});

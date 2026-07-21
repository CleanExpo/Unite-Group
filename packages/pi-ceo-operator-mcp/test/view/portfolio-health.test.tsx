import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { recordCase } from "../fixtures/fake-gh.mjs";

const { useToolInfo } = vi.hoisted(() => ({ useToolInfo: vi.fn() }));
vi.mock("../../src/helpers.js", () => ({ useToolInfo }));
import PortfolioHealth from "../../src/views/portfolio-health.js";

const base = {
  total_fails: 1,
  timestamp: "2026-07-22T00:00:00Z",
  repos_with_errors: 0,
  repos: [{ repo: "Pi-Dev-Ops", latest_conclusion: "success", fail_count_last_10: 1 }],
};

beforeEach(() => useToolInfo.mockReset());

describe("portfolio health view", () => {
  test("VIEW-01 renders deterministic pending DOM without cards or console output", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    useToolInfo.mockReturnValue({ output: undefined, isPending: true });
    const html = renderToStaticMarkup(<PortfolioHealth />);
    expect(html).toContain("Loading portfolio snapshot");
    expect(html).not.toContain("repo-card");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    await recordCase("VIEW-01", { assertions: 3 });
  });

  test("VIEW-02 renders deterministic empty DOM", async () => {
    useToolInfo.mockReturnValue({ output: undefined, isPending: false });
    const html = renderToStaticMarkup(<PortfolioHealth />);
    expect(html).toContain("No data yet.");
    expect(html).not.toContain("repo-card");
    await recordCase("VIEW-02", { assertions: 2 });
  });

  test("VIEW-03 renders every conclusion glyph and exact summary", async () => {
    const conclusions = ["success", "failure", "cancelled", "skipped", "unknown"];
    useToolInfo.mockReturnValue({
      isPending: false,
      output: { ...base, repos: conclusions.map((latest_conclusion, index) => ({ repo: `Repo-${index}`, latest_conclusion, fail_count_last_10: index })), total_fails: 10 },
    });
    const html = renderToStaticMarkup(<PortfolioHealth />);
    for (const token of ["✓", "✗", "○", "—", "?", "10</strong> fails / 5 repos"]) expect(html).toContain(token);
    expect(html).toContain("repo-card__status--success");
    expect(html).toContain("repo-card__status--failure");
    await recordCase("VIEW-03", { assertions: 8 });
  });

  test("VIEW-04 preserves healthy cards while credential-shaped errors are fully redacted", async () => {
    const { redactRepoResults } = await import("../../src/runtime.js");
    const output = {
      ...base,
      repos_with_errors: 1,
      repos: [base.repos[0], { repo: "CARSI", latest_conclusion: "unknown", fail_count_last_10: 0, error: "Bearer secret-suffix-123 https://user:provider-token@example.invalid" }],
    };
    useToolInfo.mockReturnValue({ output: redactRepoResults(output), isPending: false });
    const html = renderToStaticMarkup(<PortfolioHealth />);
    expect(html).toContain("Pi-Dev-Ops");
    expect(html).toContain("CARSI");
    expect(html).toContain("External command failed (redacted).");
    expect(html).not.toContain("secret-suffix-123");
    expect(html).not.toContain("provider-token");
    await recordCase("VIEW-04", { assertions: 5 });
  });
});

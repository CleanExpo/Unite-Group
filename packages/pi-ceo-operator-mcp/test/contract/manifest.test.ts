import { describe, expect, test, vi } from "vitest";
import { recordCase } from "../fixtures/fake-gh.mjs";

describe("production manifest", () => {
  test("MAN-01 imports and applies the compiled Vite manifest without starting the server", async () => {
    const { applyProductionManifest, createOperatorServer } = await import("../../src/runtime.js");
    const server = createOperatorServer();
    const manifest = { "portfolio-health": { file: "assets/portfolio-health.js" } };
    const setViteManifest = vi.spyOn(server, "setViteManifest");
    await applyProductionManifest(server, async () => ({ default: manifest }));
    expect(setViteManifest).toHaveBeenCalledWith(manifest);
    expect(setViteManifest).toHaveBeenCalledTimes(1);
    await recordCase("MAN-01", { assertions: 2 });
  });
});

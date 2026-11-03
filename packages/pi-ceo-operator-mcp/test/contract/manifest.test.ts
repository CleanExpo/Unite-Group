import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { __setBuildManifest } from "skybridge/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { recordCase } from "../fixtures/fake-gh.mjs";

afterEach(() => { vi.unstubAllEnvs(); });

describe("production manifest", () => {
  test("MAN-01 serves the view from the compiled Vite manifest without starting the server", async () => {
    // `skybridge build` emits dist/__entry.js, which hands the compiled manifest to
    // __setBuildManifest and only then imports dist/index.js. Same order here, and
    // run() is never called, so no port is opened.
    vi.stubEnv("NODE_ENV", "production");
    const manifest = { "src/views/portfolio-health.tsx": { file: "assets/portfolio-health-MAN01.js", name: "portfolio-health", isEntry: true } };
    __setBuildManifest(manifest);
    const { createOperatorServer } = await import("../../src/runtime.js");
    const app = createOperatorServer();
    const client = new Client({ name: "manifest-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await app.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const view = (await client.listResources()).resources.find((resource) => resource.uri.includes("portfolio-health"));
      expect(view).toBeDefined();
      const contents = (await client.readResource({ uri: view!.uri })).contents[0];
      const html = "text" in contents ? contents.text : "";
      expect(html).toContain("assets/portfolio-health-MAN01.js");
    } finally {
      await client.close();
      await serverTransport.close();
    }
    await recordCase("MAN-01", { assertions: 2 });
  });
});

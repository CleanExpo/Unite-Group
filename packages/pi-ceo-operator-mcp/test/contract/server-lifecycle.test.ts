import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { recordCase } from "../fixtures/fake-gh.mjs";

const roots = { package: resolve(import.meta.dirname, "../.."), repo: resolve(import.meta.dirname, "../../../..") };
const closers: Array<() => Promise<void>> = [];
afterEach(async () => { while (closers.length) await closers.pop()?.(); });

async function runtime() { return import("../../src/runtime.js"); }

describe("runtime prerequisites and lifecycle", () => {
  test("PRE-01 exact base and branch contract are frozen", async () => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    const [{ stdout: main }, { stdout: mergeBase }, { stdout: branch }] = await Promise.all([
      exec("git", ["rev-parse", "origin/main"], { cwd: roots.repo }),
      exec("git", ["merge-base", "HEAD", "origin/main"], { cwd: roots.repo }),
      exec("git", ["branch", "--show-current"], { cwd: roots.repo }),
    ]);
    expect(main.trim()).toBe("8e30cabe2811ba270777076a16dc817f6aaa3efd");
    expect(mergeBase.trim()).toBe("8e30cabe2811ba270777076a16dc817f6aaa3efd");
    expect(branch.trim()).toBe("fix/pi-ceo-mcp-runtime-contract-8e30cabe");
    await recordCase("PRE-01", { assertions: 3 });
  });

  test("ENV-01 declares the approved Node and npm install contract", async () => {
    const pkg = JSON.parse(await readFile(resolve(roots.package, "package.json"), "utf8"));
    expect(pkg.engines.node).toBe(">=24.14.1 <25");
    expect(pkg.scripts["test:contract"]).toContain("vitest run");
    expect(pkg.scripts.deploy).toBe("alpic deploy");
    await recordCase("ENV-01", { assertions: 3, argv: ["npm", "ci"] });
  });

  test("SRV-01 exposes bounded loopback readiness without uncaught errors", async () => {
    const { createOperatorServer } = await runtime();
    const app = createOperatorServer({ now: () => new Date("2026-07-22T00:00:00Z") }).express;
    const http = createHttpServer(app);
    await new Promise<void>((resolveReady, reject) => {
      http.once("error", reject);
      http.listen(0, "127.0.0.1", resolveReady);
    });
    closers.push(() => new Promise((resolveClose, reject) => http.close((error) => error ? reject(error) : resolveClose())));
    const address = http.address();
    expect(address && typeof address === "object").toBeTruthy();
    const response = await fetch(`http://127.0.0.1:${(address as { port: number }).port}/healthz`, { signal: AbortSignal.timeout(2000) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready", service: "pi-ceo-operator" });
    await recordCase("SRV-01", { assertions: 3 });
  });

  test("SRV-02 closes within five seconds and releases its port", async () => {
    const { createOperatorServer } = await runtime();
    const http = createHttpServer(createOperatorServer().express);
    await new Promise<void>((resolveReady) => http.listen(0, "127.0.0.1", resolveReady));
    const address = http.address() as { port: number };
    await Promise.race([
      new Promise<void>((resolveClose, reject) => http.close((error) => error ? reject(error) : resolveClose())),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("shutdown timeout")), 5000)),
    ]);
    await expect(fetch(`http://127.0.0.1:${address.port}/healthz`, { signal: AbortSignal.timeout(250) })).rejects.toThrow();
    await recordCase("SRV-02", { assertions: 2 });
  });
});

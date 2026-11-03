import { afterEach, describe, expect, test, vi } from "vitest";
import { configureSkybridgePort } from "../../src/port-env.js";

describe("direct production entry port selection", () => {
  test("maps platform PORT to Skybridge's internal __PORT", () => {
    const env: NodeJS.ProcessEnv = { PORT: "49393" };
    configureSkybridgePort(env);
    expect(env.__PORT).toBe("49393");
  });

  test("does not override the Skybridge CLI-selected port", () => {
    const env: NodeJS.ProcessEnv = { PORT: "49393", __PORT: "31000" };
    configureSkybridgePort(env);
    expect(env.__PORT).toBe("31000");
  });

  test.each(["", "0", "-1", "65536", "abc", "3.2"])("does not map invalid port %j", (value) => {
    const env: NodeJS.ProcessEnv = { PORT: value };
    configureSkybridgePort(env);
    expect(env.__PORT).toBeUndefined();
  });

  test("does not invent a port when unset", () => {
    const env: NodeJS.ProcessEnv = {};
    configureSkybridgePort(env);
    expect(env.__PORT).toBeUndefined();
  });
});

// The helper alone proves nothing if src/index.ts stops calling it: Docker runs
// dist/__entry.js, which imports index.ts, so the wiring is what ships.
const entry = vi.hoisted(() => ({ portAtRun: undefined as string | undefined, runs: 0 }));

vi.mock("../../src/server.js", () => ({
  app: {
    run: async () => {
      entry.runs += 1;
      entry.portAtRun = process.env.__PORT;
    },
  },
}));

describe("production entry wiring", () => {
  const saved = { PORT: process.env.PORT, __PORT: process.env.__PORT };

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test("index.ts sets __PORT from a PORT-only host before app.run()", async () => {
    process.env.PORT = "49393";
    delete process.env.__PORT;
    await import("../../src/index.js");
    expect(entry.runs).toBe(1);
    expect(entry.portAtRun).toBe("49393");
  });
});

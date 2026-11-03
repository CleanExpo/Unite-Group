import { describe, expect, test } from "vitest";
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

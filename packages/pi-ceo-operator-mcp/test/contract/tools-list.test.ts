import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";
import { recordCase, sha256 } from "../fixtures/fake-gh.mjs";

async function listOnce() {
  const { createOperatorServer } = await import("../../src/runtime.js");
  const server = createOperatorServer({ execFile: async () => ({ stdout: "{\"runs\":[]}", stderr: "" }) });
  const client = new Client({ name: "catalogue-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const result = await client.listTools();
  await client.close();
  await server.close();
  return result.tools;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

describe("tool discovery", () => {
  test("LIST-01 exposes exactly two strict read-only descriptors", async () => {
    const tools = await listOnce();
    expect(tools.map((tool) => tool.name)).toEqual(["get-portfolio-health", "get-pilot-v1-outcomes"]);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false)).toBe(true);
    const portfolio = tools[0];
    expect(portfolio.inputSchema).toMatchObject({ type: "object", additionalProperties: false });
    expect(portfolio._meta).toBeDefined();
    await recordCase("LIST-01", { assertions: 4 });
  });

  test("LIST-02 returns deterministic order and canonical schemas across restarts", async () => {
    const first = await listOnce();
    const second = await listOnce();
    const third = await listOnce();
    const hashes = [first, second, third].map((tools) => sha256(canonical(tools)));
    expect(new Set(hashes).size).toBe(1);
    await recordCase("LIST-02", { assertions: 1 });
  });
});

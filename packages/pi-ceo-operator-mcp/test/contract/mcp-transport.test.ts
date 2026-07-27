import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, test } from "vitest";
import { recordCase } from "../fixtures/fake-gh.mjs";

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { while (closers.length) await closers.pop()?.(); });
async function runtime() { return import("../../src/runtime.js"); }

async function harness() {
  const { createOperatorServer } = await runtime();
  const server = createOperatorServer({
    execFile: async () => ({ stdout: JSON.stringify({ runs: [] }), stderr: "" }),
    readFile: async () => "",
    homedir: () => "/tmp/hermetic-home",
    now: () => new Date("2026-07-22T00:00:00Z"),
  });
  const client = new Client({ name: "contract-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  closers.push(async () => { await client.close(); await server.close(); });
  return { client, clientTransport };
}

describe("MCP transport", () => {
  test("RPC-01 negotiates initialise with exact serverInfo", async () => {
    const { client } = await harness();
    expect(client.getServerVersion()).toEqual({ name: "pi-ceo-operator", version: "0.1.0" });
    expect(client.getServerCapabilities()).toHaveProperty("tools");
    await recordCase("RPC-01", { assertions: 2 });
  });

  test("RPC-02 preserves unique request IDs and clean object framing", async () => {
    const { client, clientTransport } = await harness();
    const sent: unknown[] = [];
    const original = clientTransport.send.bind(clientTransport);
    clientTransport.send = async (message, options) => { sent.push(message); await original(message, options); };
    const [first, second] = await Promise.all([client.listTools(), client.listTools()]);
    expect(first.tools).toHaveLength(2);
    expect(second.tools).toHaveLength(2);
    const ids = sent.flatMap((message) => typeof message === "object" && message && "id" in message ? [(message as { id: unknown }).id] : []);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sent.every((message) => typeof message === "object" && message !== null)).toBe(true);
    await recordCase("RPC-02", { assertions: 4 });
  });

  test("RPC-03 rejects malformed tool input and remains usable", async () => {
    const { client } = await harness();
    const invalid = await client.callTool({ name: "get-portfolio-health", arguments: { unexpected: true } });
    expect(invalid.isError).toBe(true);
    expect(JSON.stringify(invalid)).toContain("Unrecognized key");
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([
      "get-portfolio-health", "get-pilot-v1-outcomes",
    ]);
    await recordCase("RPC-03", { assertions: 3 });
  });
});

import { describe, expect, test } from "vitest";
import { recordCase } from "../fixtures/fake-gh.mjs";

async function runtime() { return import("../../src/runtime.js"); }
const logPath = "/tmp/hermetic-home/.hermes/logs/pilot_v1_scheduler.log";

describe("Pilot V1 outcomes", () => {
  test("PV-01 returns the newest five valid fixtures with exact path and counts", async () => {
    const { getPilotV1Outcomes } = await runtime();
    const lines = Array.from({ length: 7 }, (_, index) => JSON.stringify({ outcome: index % 2 ? "sent" : "paused", ts: `2026-07-22T00:00:0${index}Z` })).join("\n");
    const result = await getPilotV1Outcomes(5, { homedir: () => "/tmp/hermetic-home", readFile: async () => lines });
    expect(result.log_path).toBe(logPath);
    expect(result.outcomes).toHaveLength(5);
    expect(result.outcomes[0].ts).toBe("2026-07-22T00:00:06Z");
    await recordCase("PV-01", { assertions: 3 });
  });

  test("PV-02 skips noise, scalars and objects without outcome", async () => {
    const { getPilotV1Outcomes } = await runtime();
    const contents = ["noise", "null", "42", "{}", "{\"ts\":\"x\"}", "{\"outcome\":\"sent\",\"ts\":\"ok\",\"error\":\"Bearer pilot-secret\",\"private\":\"pilot-secret\"}"].join("\n");
    const result = await getPilotV1Outcomes(10, { homedir: () => "/tmp/hermetic-home", readFile: async () => contents });
    expect(result.outcomes).toEqual([{ outcome: "sent", ts: "ok", error: "Scheduler outcome error (redacted)." }]);
    expect(JSON.stringify(result)).not.toContain("pilot-secret");
    await recordCase("PV-02", { assertions: 2 });
  });

  test("PV-03 rejects zero and negative limits before filesystem access", async () => {
    const { getPilotV1Outcomes } = await runtime();
    let reads = 0;
    const deps = { readFile: async () => { reads += 1; return ""; } };
    await expect(getPilotV1Outcomes(0, deps)).rejects.toThrow();
    await expect(getPilotV1Outcomes(-1, deps)).rejects.toThrow();
    expect(reads).toBe(0);
    await recordCase("PV-03", { assertions: 3 });
  });

  test("PV-04 enforces upper, integer and type bounds with absent-only default", async () => {
    const { validatePilotInput } = await runtime();
    for (const value of [51, 1.5, "5", null]) expect(() => validatePilotInput({ limit: value })).toThrow();
    expect(validatePilotInput({})).toEqual({ limit: 10 });
    expect(validatePilotInput({ limit: 5 })).toEqual({ limit: 5 });
    await recordCase("PV-04", { assertions: 6 });
  });

  test("PV-05 fails soft on missing file with bounded redaction", async () => {
    const { getPilotV1Outcomes } = await runtime();
    const result = await getPilotV1Outcomes(5, { homedir: () => "/tmp/hermetic-home", readFile: async () => { throw new Error("Basic c2VjcmV0OnN1ZmZpeA=="); } });
    expect(result.outcomes).toEqual([]);
    expect(result.log_path).toBe(logPath);
    expect(result.error).toBe("Local outcome log unavailable (redacted).");
    expect(JSON.stringify(result)).not.toContain("c2VjcmV0");
    await recordCase("PV-05", { assertions: 4 });
  });
});

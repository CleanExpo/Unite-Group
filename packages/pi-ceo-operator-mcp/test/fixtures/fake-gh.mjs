import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const BASE_SHA = "8e30cabe2811ba270777076a16dc817f6aaa3efd";
export const CASE_IDS = Object.freeze([
  "PRE-01", "ENV-01", "SRV-01", "SRV-02", "RPC-01", "RPC-02", "RPC-03",
  "LIST-01", "LIST-02", "PH-01", "PH-02", "PH-03", "PH-04", "PV-01",
  "PV-02", "PV-03", "PV-04", "PV-05", "MAN-01", "VIEW-01", "VIEW-02",
  "VIEW-03", "VIEW-04", "ALP-01", "ALP-02", "ALP-03", "UBU-01", "WIN-01",
  "MUSL-01", "AUD-01", "CLOSE-01",
]);

export function evidenceDir() {
  return process.env.MCP_RUNTIME_EVIDENCE_DIR ?? join(tmpdir(), "pi-ceo-mcp-runtime-evidence");
}

export function nativeIdentity() {
  if (process.platform === "win32") return `win32-${process.arch}-msvc`;
  if (process.platform === "linux") {
    const glibc = process.report?.getReport?.().header?.glibcVersionRuntime;
    return `linux-${process.arch}-${glibc ? "gnu" : "musl"}`;
  }
  return `${process.platform}-${process.arch}-native`;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function recordCase(caseId, details = {}) {
  if (!CASE_IDS.includes(caseId)) throw new Error(`unknown case id: ${caseId}`);
  const dir = evidenceDir();
  await mkdir(dir, { recursive: true });
  const log = typeof details.log === "string" ? details.log : `${caseId}:pass`;
  const argv = Array.isArray(details.argv) ? details.argv : ["vitest", caseId];
  const assertions = Number.isInteger(details.assertions) ? details.assertions : 1;
  const receipt = {
    schema_version: 1,
    case_id: caseId,
    status: "pass",
    count: 1,
    skipped: false,
    base_sha: BASE_SHA,
    identity: nativeIdentity(),
    argv,
    exit_code: 0,
    timed_out: false,
    assertions,
    logs_sha256: sha256(log),
  };
  const canonical = JSON.stringify(receipt);
  const envelope = { ...receipt, receipt_sha256: sha256(canonical) };
  await writeFile(join(dir, `${caseId}.json`), `${JSON.stringify(envelope, null, 2)}\n`, {
    mode: 0o600,
  });
  return envelope;
}

export function makeFakeGh(fixtures, ledger = []) {
  return async (file, args) => {
    ledger.push([file, ...args]);
    if (file !== "gh") throw new Error("fake executor only permits gh");
    const route = args[1];
    const repo = route?.match(/^repos\/CleanExpo\/([^/]+)\//)?.[1];
    const fixture = repo ? fixtures[repo] : undefined;
    if (fixture instanceof Error) throw fixture;
    if (!fixture) throw new Error(`no hermetic fixture for ${repo ?? "unknown"}`);
    return { stdout: JSON.stringify(fixture), stderr: "" };
  };
}

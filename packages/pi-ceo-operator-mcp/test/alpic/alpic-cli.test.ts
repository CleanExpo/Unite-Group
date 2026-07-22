import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { describe, expect, test } from "vitest";
import { BASE_SHA, CASE_IDS, recordCase, sha256 } from "../fixtures/fake-gh.mjs";
import {
  BASE_SHA as VERIFIER_BASE_SHA,
  CASE_IDS as VERIFIER_CASE_IDS,
  verifyEvidence,
} from "../../scripts/verify-runtime-evidence.mjs";

const exec = promisify(execFile);
const packageRoot = resolve(import.meta.dirname, "../..");
const repoRoot = resolve(packageRoot, "../..");

async function runtime() { return import("../../src/runtime.js"); }
async function workflow() { return readFile(resolve(repoRoot, ".github/workflows/ci.yml"), "utf8"); }

describe("Alpic, platform and closure contracts", () => {
  test("ALP-01 permits only the no-credential version probe with clean telemetry", async () => {
    const { allowedAlpicArgv } = await runtime();
    const argv = allowedAlpicArgv("version");
    expect(argv).toEqual(["--version"]);
    const result = await exec(resolve(packageRoot, "node_modules/.bin/alpic"), argv, {
      cwd: packageRoot,
      timeout: 5000,
      env: { PATH: process.env.PATH ?? "", HOME: await mkdtemp(join(tmpdir(), "alpic-version-")), NO_COLOR: "1" },
    });
    expect(result.stdout.trim()).toMatch(/^alpic\/1\./);
    expect(`${result.stdout}${result.stderr}`).not.toMatch(/sentry|opentelemetry|posthog.*error/i);
    await recordCase("ALP-01", { assertions: 3, argv: ["alpic", ...argv] });
  });

  test("ALP-02 permits only the no-credential help probe with clean exit", async () => {
    const { allowedAlpicArgv } = await runtime();
    const argv = allowedAlpicArgv("help");
    expect(argv).toEqual(["--help"]);
    const result = await exec(resolve(packageRoot, "node_modules/.bin/alpic"), argv, {
      cwd: packageRoot,
      timeout: 5000,
      env: { PATH: process.env.PATH ?? "", HOME: await mkdtemp(join(tmpdir(), "alpic-help-")), NO_COLOR: "1" },
    });
    expect(result.stdout).toContain("USAGE");
    expect(`${result.stdout}${result.stderr}`).not.toMatch(/sentry|opentelemetry|posthog.*error/i);
    await recordCase("ALP-02", { assertions: 3, argv: ["alpic", ...argv] });
  });

  test("ALP-03 fails closed without vendor proof and cannot construct deploy argv", async () => {
    const { allowedAlpicArgv } = await runtime();
    expect(() => allowedAlpicArgv("validate")).toThrow(/EVIDENCE_INCOMPLETE/);
    expect(() => allowedAlpicArgv("deploy")).toThrow();
    expect(JSON.stringify([allowedAlpicArgv("version"), allowedAlpicArgv("help")])).not.toContain("deploy");
    const marker = "RAW_SECRET_MARKER_912";
    const receipt = await recordCase("ALP-03", {
      assertions: 3,
      status: "fail",
      case_id: "PV-01",
      base_sha: "0".repeat(40),
      logs_sha256: "attacker-controlled-hash",
      log: marker,
    });
    expect(receipt).not.toHaveProperty("log");
    expect(receipt).toMatchObject({ case_id: "ALP-03", status: "pass", base_sha: BASE_SHA });
    expect(receipt.logs_sha256).toBe(sha256(marker));
    expect(JSON.stringify(receipt)).not.toContain(marker);
  });

  test("UBU-01 required Ubuntu context executes every phase and records gnu identity", async () => {
    const text = await workflow();
    expect(text).toMatch(/mcp:\s*[\s\S]*runs-on: ubuntu-[\w.-]+/);
    for (const command of ["test:contract", "test:view-contract", "test:alpic-contract", "verify:mcp-runtime-evidence", "npm run build"]) expect(text).toContain(command);
    expect(text).toContain("linux-x64-gnu");
    await recordCase("UBU-01", { assertions: 7 });
  });

  test("WIN-01 has a real x64 lane with canonical fail-fast PowerShell", async () => {
    const text = await workflow();
    const lane = text.match(/  mcp-windows:\n([\s\S]*?)\n  mcp-musl:/)?.[1] ?? "";
    expect(text).toContain("mcp-windows:");
    expect(text).toContain("runs-on: windows-2025");
    expect(text).toContain("win32-x64-msvc");
    expect(lane).toMatch(/actions\/checkout@[a-f0-9]+[\s\S]*persist-credentials:\s*false/);
    expect(text).toContain("$ErrorActionPreference = 'Stop'; npm ci; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run test:contract; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run test:view-contract; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; exit 0");
    await recordCase("WIN-01", { assertions: 5 });
  });

  test("MUSL-01 uses digest-pinned Alpine x64 and records musl identity", async () => {
    const text = await workflow();
    const lane = text.match(/  mcp-musl:\n([\s\S]*?)\n  mcp:/)?.[1] ?? "";
    expect(text).toContain("mcp-musl:");
    expect(text).toMatch(/node:24\.18-alpine@sha256:[a-f0-9]{64}/);
    expect(text).toContain("linux-x64-musl");
    expect(text).toContain("--platform linux/amd64");
    expect(lane).toMatch(/actions\/checkout@[a-f0-9]+[\s\S]*persist-credentials:\s*false/);
    await recordCase("MUSL-01", { assertions: 5 });
  });

  test("AUD-01 keeps the package audit independent from the portfolio audit", async () => {
    const pkg = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
    expect(pkg.scripts["audit:package"]).toBe("npm audit --audit-level high");
    expect(await workflow()).toContain("npm run audit:package");
    await recordCase("AUD-01", { assertions: 2, argv: ["npm", "audit", "--audit-level", "high"] });
  });

  test("CLOSE-01 rejects missing, failed, stale, skipped, duplicate and zero-count receipts", async () => {
    expect(VERIFIER_BASE_SHA).toBe(BASE_SHA);
    expect(VERIFIER_CASE_IDS).toBe(CASE_IDS);
    const actualDir = process.env.MCP_RUNTIME_EVIDENCE_DIR ?? join(tmpdir(), "pi-ceo-mcp-runtime-evidence");
    const before = await verifyEvidence({ dir: actualDir, beforeClose: true });
    expect(before.count).toBe(30);
    const firstSum = (await readFile(join(actualDir, "SHA256SUMS"), "utf8")).trim().split("\n")[0];
    const [recordedHash, receiptName] = firstSum.split(/\s+/);
    expect(recordedHash).toBe(sha256(await readFile(join(actualDir, receiptName), "utf8")));
    const template = { schema_version: 1, status: "pass", count: 1, skipped: false, base_sha: BASE_SHA, identity: "test-x64-native", argv: ["vitest"], exit_code: 0, timed_out: false, assertions: 1, logs_sha256: sha256("pass") };
    for (const mutation of ["missing", "failed", "stale", "skipped", "duplicate", "zero", "corrupt"] as const) {
      const dir = await mkdtemp(join(tmpdir(), `close-${mutation}-`));
      try {
        const ids = CASE_IDS.filter((id) => id !== "CLOSE-01");
        for (const id of ids) {
          const body = { ...template, case_id: id };
          if (mutation === "failed" && id === "PRE-01") body.status = "fail";
          if (mutation === "stale" && id === "PRE-01") body.base_sha = "0".repeat(40);
          if (mutation === "skipped" && id === "PRE-01") body.skipped = true;
          if (mutation === "zero" && id === "PRE-01") body.count = 0;
          const receipt = { ...body, receipt_sha256: sha256(JSON.stringify(body)) };
          await writeFile(join(dir, `${id}.json`), JSON.stringify(receipt));
        }
        if (mutation === "missing") await rm(join(dir, "PRE-01.json"));
        if (mutation === "duplicate") await writeFile(join(dir, "duplicate.json"), await readFile(join(dir, "PRE-01.json")));
        if (mutation === "corrupt") await writeFile(join(dir, "PRE-01.json"), "{");
        await expect(verifyEvidence({ dir, beforeClose: true })).rejects.toThrow();
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
    await recordCase("CLOSE-01", { assertions: 11 });
  });
});

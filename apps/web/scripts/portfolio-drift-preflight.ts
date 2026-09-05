#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  collectRepositoryObservation,
  createRepositoryOnlyManifest,
  loadPortfolioControlPlaneRegistry,
  writeImmutablePortfolioBaseline,
  type RepositoryWorktreeBinding,
} from "../src/lib/command-centre/portfolio-drift-collector";
import {
  buildPortfolioBaselinePayload,
  buildPortfolioControlPlaneProjection,
  signControlPlaneRecord,
  verifyPortfolioBaselineEnvelope,
} from "../src/lib/command-centre/portfolio-control-plane";

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

async function main(): Promise<void> {
  const deviceId = argument("--device");
  const bindingsPath = argument("--bindings");
  const baselineId = argument("--freeze-baseline");
  if (!deviceId || !bindingsPath) {
    fail(
      "Usage: pnpm portfolio:drift:preflight -- --device <registered-device> --bindings <absolute-json-file> [--out <absolute-json-file>] [--freeze-baseline <id>]",
    );
  }
  if (!path.isAbsolute(bindingsPath)) fail("Bindings path must be absolute.");

  const registry = await loadPortfolioControlPlaneRegistry();
  const device = registry.devices.find((item) => item.deviceId === deviceId);
  if (!device) fail(`Device is not registered: ${deviceId}`);

  let bindings: RepositoryWorktreeBinding[];
  try {
    const value = JSON.parse(await readFile(bindingsPath, "utf8")) as unknown;
    if (!Array.isArray(value) || value.length === 0)
      throw new Error("bindings must be a non-empty array");
    bindings = value as RepositoryWorktreeBinding[];
  } catch (error) {
    fail(
      `Bindings are missing or malformed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  const duplicateProjects = bindings.filter(
    (binding, index) =>
      bindings.findIndex((item) => item.projectId === binding.projectId) !==
      index,
  );
  if (duplicateProjects.length > 0)
    fail(
      `Duplicate project bindings are not allowed: ${duplicateProjects.map((item) => item.projectId).join(", ")}`,
    );

  const signingKey = process.env[device.attestationKeyRef]?.trim() || null;
  const observations = bindings.map((binding) =>
    collectRepositoryObservation({ registry, binding, deviceId, signingKey }),
  );
  const worktreeBindings = bindings
    .map((binding) => binding.attestation)
    .filter((binding) => binding !== null && binding !== undefined);
  let manifest = createRepositoryOnlyManifest({
    registry,
    observations,
    worktreeBindings,
  });
  const runtimeRoot = path.resolve(
    process.cwd(),
    "..",
    "..",
    ".nexus",
    "runtime",
    "portfolio-drift",
  );
  const output = argument("--out") ?? path.join(runtimeRoot, "current.json");
  if (!path.isAbsolute(output)) fail("Output path must be absolute.");
  const relativeOutput = path.relative(runtimeRoot, path.resolve(output));
  if (
    relativeOutput.startsWith("..") ||
    path.isAbsolute(relativeOutput) ||
    path.extname(output) !== ".json"
  )
    fail(
      "Output must be a JSON receipt inside the local portfolio runtime root.",
    );
  let baselinePath: string | null = null;
  let controlKey: string | null = null;
  if (baselineId) {
    controlKey =
      process.env[registry.controlPlaneAttestationKeyRef]?.trim() || null;
    if (!controlKey)
      fail(
        `FREEZE/BASELINE requires the approved ${registry.controlPlaneAttestationKeyRef} runtime binding; no remote worker was stopped.`,
      );
    const baselinePayload = buildPortfolioBaselinePayload({
      baselineId,
      registryVersion: registry.registryVersion,
      recordedAt: manifest.generatedAt,
      evidence: manifest,
    });
    const baseline = signControlPlaneRecord(
      baselinePayload,
      "mission-control",
      controlKey,
    );
    const verification = verifyPortfolioBaselineEnvelope({
      envelope: baseline,
      registry,
      keyResolver: (signerId) =>
        signerId === "mission-control" ? controlKey : null,
      nowMs: Date.parse(manifest.generatedAt),
    });
    if (!verification.valid) fail(`Baseline rejected: ${verification.reason}`);
    const written = await writeImmutablePortfolioBaseline({
      directory: path.join(path.dirname(output), "baselines"),
      baseline,
    });
    baselinePath = written.path;
    manifest = createRepositoryOnlyManifest({
      registry,
      observations,
      worktreeBindings,
      baselines: [baseline],
      nowMs: Date.parse(manifest.generatedAt),
    });
  }
  await mkdir(path.dirname(output), { recursive: true });
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  try {
    await writeFile(output, manifestContent, { mode: 0o600, flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      fail(
        "Output receipt already exists; choose a new in-root receipt name so prior evidence is preserved.",
      );
    throw error;
  }
  if ((await readFile(output, "utf8")) !== manifestContent)
    fail("Manifest read-back did not match written bytes.");

  const keys = new Map<string, string>();
  if (signingKey) keys.set(deviceId, signingKey);
  if (controlKey) keys.set("mission-control", controlKey);
  const projection = buildPortfolioControlPlaneProjection({
    registry,
    manifest,
    keyResolver: (signerId) => keys.get(signerId) ?? null,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        schema: manifest.schema,
        registryVersion: manifest.registryVersion,
        manifestHash: manifest.manifestHash,
        output: "local_runtime_receipt",
        baseline: baselinePath ? projection.baseline : null,
        signed: signingKey !== null,
        summary: projection.summary,
        nextSafeAction: projection.nextSafeAction,
      },
      null,
      2,
    )}\n`,
  );
}

void main().catch((error: unknown) => {
  fail(
    `Portfolio drift preflight failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
});

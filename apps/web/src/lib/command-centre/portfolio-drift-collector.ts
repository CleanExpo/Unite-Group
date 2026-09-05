import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  REPOSITORY_OBSERVATION_SCHEMA,
  buildPortfolioDriftManifest,
  canonicalHash,
  parsePortfolioControlPlaneRegistry,
  repositoryContentManifestHash,
  signControlPlaneRecord,
  type PortfolioControlPlaneRegistry,
  type PortfolioDriftManifest,
  type RepositoryObservationPayload,
  type SignedRepositoryObservation,
  type SignedPortfolioBaseline,
  type SignedWorktreeBinding,
} from "./portfolio-control-plane";

export const PORTFOLIO_DRIFT_COLLECTOR_ID = "unite-group-git-readback";
export const PORTFOLIO_DRIFT_COLLECTOR_VERSION = "1.0.0";

export interface RepositoryWorktreeBinding {
  projectId: string;
  path: string;
  role: "canonical_root" | "isolated_worktree" | "audit_clone";
  ownerId?: string | null;
  leaseId?: string | null;
  attestation?: SignedWorktreeBinding | null;
}

interface GitResult {
  ok: boolean;
  stdout: string;
}

function git(cwd: string, args: string[]): GitResult {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    shell: false,
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    stdout: result.status === 0 ? result.stdout.trim() : "",
  };
}

function normaliseRemote(value: string): string | null {
  const trimmed = value.trim().replace(/\.git$/, "");
  const https = /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i.exec(trimmed);
  if (https) return `${https[1]}/${https[2]}`;
  const ssh = /^git@github\.com:([^/]+)\/([^/]+)$/i.exec(trimmed);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  return null;
}

function parseStatus(raw: string): {
  classification: RepositoryObservationPayload["workingTree"]["classification"];
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
} {
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  const conflicted: string[] = [];
  const lines = raw ? raw.split("\n").filter(Boolean) : [];
  const conflictCodes = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);
  for (const line of lines) {
    const code = line.slice(0, 2);
    const file = line.slice(3).trim();
    if (!file) continue;
    if (code === "??") untracked.push(file);
    else {
      if (conflictCodes.has(code)) conflicted.push(file);
      if (code[0] !== " " && code[0] !== "?") staged.push(file);
      if (code[1] !== " " && code[1] !== "?") unstaged.push(file);
    }
  }
  const tracked = staged.length > 0 || unstaged.length > 0;
  const classification =
    conflicted.length > 0
      ? "conflicted"
      : tracked && untracked.length > 0
        ? "mixed"
        : tracked
          ? "tracked_changes"
          : untracked.length > 0
            ? "untracked_only"
            : "clean";
  return {
    classification,
    staged: staged.sort(),
    unstaged: unstaged.sort(),
    untracked: untracked.sort(),
    conflicted: conflicted.sort(),
  };
}

const GENERATED_PATTERNS = [
  /^\.handoff-logs\//,
  /^\.readiness-/,
  /^reviewer-report\.json$/,
  /^apps\/web\/data\/command-centre\//,
  /^(?:test-results|playwright-report|coverage)\//,
  /(?:^|\/)vitest-report\.json$/,
];

function classifyGeneratedResidue(
  status: ReturnType<typeof parseStatus>,
): RepositoryObservationPayload["generatedResidue"] {
  const dirtyPaths = [
    ...status.staged,
    ...status.unstaged,
    ...status.untracked,
    ...status.conflicted,
  ];
  const generated = dirtyPaths.filter((entry) =>
    GENERATED_PATTERNS.some((pattern) => pattern.test(entry)),
  );
  if (generated.length === 0) return { classification: "none", paths: [] };
  return {
    classification:
      generated.length === dirtyPaths.length
        ? "known_generated"
        : "mixed_or_unknown",
    paths: generated.sort(),
  };
}

function parseAheadBehind(
  value: string,
): { ahead: number; behind: number } | null {
  const match = /^(\d+)\s+(\d+)$/.exec(value.trim());
  if (!match) return null;
  return { ahead: Number(match[1]), behind: Number(match[2]) };
}

function reflogTimestamp(cwd: string, upstream: string): string | null {
  const result = git(cwd, [
    "reflog",
    "show",
    "-1",
    "--date=iso-strict",
    "--format=%gd",
    upstream,
  ]);
  if (!result.ok) return null;
  const match = /@\{(.+)\}$/.exec(result.stdout);
  if (!match || !Number.isFinite(Date.parse(match[1]))) return null;
  return new Date(Date.parse(match[1])).toISOString();
}

export function collectRepositoryObservation(input: {
  registry: PortfolioControlPlaneRegistry;
  binding: RepositoryWorktreeBinding;
  deviceId: string;
  signingKey: string | null;
  nowMs?: number;
}): SignedRepositoryObservation {
  const nowMs = input.nowMs ?? Date.now();
  const observedAt = new Date(nowMs).toISOString();
  const registered = input.registry.repositories.find(
    (item) => item.projectId === input.binding.projectId,
  );
  if (!registered)
    throw new Error(`Unregistered project binding: ${input.binding.projectId}`);
  if (!path.isAbsolute(input.binding.path))
    throw new Error(
      `Worktree path must be absolute: ${input.binding.projectId}`,
    );
  const top = git(input.binding.path, ["rev-parse", "--show-toplevel"]);
  const head = git(input.binding.path, ["rev-parse", "HEAD"]);
  const common = git(input.binding.path, ["rev-parse", "--git-common-dir"]);
  const remote = git(input.binding.path, [
    "config",
    "--get",
    "remote.origin.url",
  ]);
  if (!top.ok || !head.ok || !common.ok || !remote.ok)
    throw new Error(`Git read-back failed for ${input.binding.projectId}`);
  const observedRepository = normaliseRemote(remote.stdout);
  const repositoryId = observedRepository ?? "unrecognised/remote";
  const branchResult = git(input.binding.path, [
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD",
  ]);
  const upstreamResult = git(input.binding.path, [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}",
  ]);
  const upstreamRevisionResult = upstreamResult.ok
    ? git(input.binding.path, ["rev-parse", upstreamResult.stdout])
    : { ok: false, stdout: "" };
  const baseResult = upstreamResult.ok
    ? git(input.binding.path, ["merge-base", "HEAD", upstreamResult.stdout])
    : { ok: false, stdout: "" };
  const countsResult = upstreamResult.ok
    ? git(input.binding.path, [
        "rev-list",
        "--left-right",
        "--count",
        `HEAD...${upstreamResult.stdout}`,
      ])
    : { ok: false, stdout: "" };
  const counts = countsResult.ok ? parseAheadBehind(countsResult.stdout) : null;
  const fetchedAt = upstreamResult.ok
    ? reflogTimestamp(input.binding.path, upstreamResult.stdout)
    : null;
  const fetchAge = fetchedAt
    ? nowMs - Date.parse(fetchedAt)
    : Number.POSITIVE_INFINITY;
  const upstreamFreshness: RepositoryObservationPayload["upstream"]["freshness"] =
    !upstreamResult.ok
      ? "missing"
      : !fetchedAt || fetchAge < 0
        ? "unproven"
        : fetchAge <= input.registry.freshness.fetchFreshForMs
          ? "fresh"
          : "stale";
  const statusResult = git(input.binding.path, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  const workingTree = statusResult.ok
    ? parseStatus(statusResult.stdout)
    : {
        classification: "unproven" as const,
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      };
  const generatedResidue = classifyGeneratedResidue(workingTree);
  const unsigned: Omit<RepositoryObservationPayload, "contentManifestHash"> = {
    schema: REPOSITORY_OBSERVATION_SCHEMA,
    observationId: canonicalHash({
      projectId: input.binding.projectId,
      path: top.stdout,
      head: head.stdout,
      observedAt,
    }),
    registryVersion: input.registry.registryVersion,
    projectId: input.binding.projectId,
    repositoryId,
    deviceId: input.deviceId,
    observedAt,
    collector: {
      id: PORTFOLIO_DRIFT_COLLECTOR_ID,
      version: PORTFOLIO_DRIFT_COLLECTOR_VERSION,
      source: "local_git_readback",
    },
    worktree: {
      worktreeId: canonicalHash({
        repositoryId,
        top: top.stdout,
        common: path.resolve(input.binding.path, common.stdout),
      }),
      pathHash: canonicalHash({ path: top.stdout }),
      path: top.stdout,
      role: input.binding.role,
      branch: branchResult.ok ? branchResult.stdout : null,
      detached: !branchResult.ok,
    },
    baseRevision: baseResult.ok ? baseResult.stdout : null,
    observedRevision: head.stdout,
    upstream: {
      ref: upstreamResult.ok ? upstreamResult.stdout : null,
      revision: upstreamRevisionResult.ok
        ? upstreamRevisionResult.stdout
        : null,
      fetchedAt,
      freshness: upstreamFreshness,
      ahead: counts?.ahead ?? null,
      behind: counts?.behind ?? null,
    },
    workingTree,
    generatedResidue,
    declaredOwner: {
      bindingId: input.binding.attestation?.payload.bindingId ?? null,
      ownerId:
        input.binding.attestation?.payload.ownerId ??
        input.binding.ownerId ??
        null,
      leaseId: input.binding.leaseId ?? null,
      state: input.binding.leaseId
        ? "leased"
        : input.binding.ownerId
          ? "declared"
          : "unclaimed",
    },
  };
  const payload = {
    ...unsigned,
    contentManifestHash: repositoryContentManifestHash(unsigned),
  };
  return signControlPlaneRecord(
    payload,
    input.deviceId,
    input.signingKey ?? "unavailable-local-attestation-key",
  );
}

export function createRepositoryOnlyManifest(input: {
  registry: PortfolioControlPlaneRegistry;
  observations: SignedRepositoryObservation[];
  worktreeBindings?: SignedWorktreeBinding[];
  baselines?: SignedPortfolioBaseline[];
  nowMs?: number;
}): PortfolioDriftManifest {
  return buildPortfolioDriftManifest({
    registryVersion: input.registry.registryVersion,
    generatedAt: new Date(input.nowMs ?? Date.now()).toISOString(),
    repositoryObservations: input.observations,
    worktreeBindings: input.worktreeBindings ?? [],
    deviceEnrolments: [],
    deviceHeartbeats: [],
    leases: [],
    checkpoints: [],
    jobs: [],
    baselines: input.baselines ?? [],
  });
}

export function selectPortfolioControlPlaneRegistry(input: {
  canonical: unknown | null;
  generated: unknown | null;
}): PortfolioControlPlaneRegistry {
  if (input.canonical !== null) {
    const canonical = parsePortfolioControlPlaneRegistry(input.canonical);
    if (input.generated !== null) {
      const generated = parsePortfolioControlPlaneRegistry(input.generated);
      if (canonicalHash(canonical) !== canonicalHash(generated))
        throw new Error(
          "Generated control-plane registry conflicts with canonical authority.",
        );
    }
    return canonical;
  }
  if (input.generated !== null)
    return parsePortfolioControlPlaneRegistry(input.generated);
  throw new Error(
    "Canonical and generated control-plane registries are unavailable.",
  );
}

export async function loadPortfolioControlPlaneRegistry(): Promise<PortfolioControlPlaneRegistry> {
  const canonicalPath = path.join(
    process.cwd(),
    "..",
    "..",
    ".portfolio",
    "CONTROL-PLANE.v1.json",
  );
  const generatedPath = path.join(
    process.cwd(),
    "data",
    "command-centre",
    "control-plane.v1.json",
  );
  const readJson = async (candidate: string): Promise<unknown | null> => {
    try {
      return JSON.parse(await readFile(candidate, "utf8"));
    } catch {
      return null;
    }
  };
  return selectPortfolioControlPlaneRegistry({
    canonical: await readJson(canonicalPath),
    generated: await readJson(generatedPath),
  });
}

export async function loadLocalPortfolioManifest(): Promise<unknown | null> {
  const file = path.join(
    process.cwd(),
    "..",
    "..",
    ".nexus",
    "runtime",
    "portfolio-drift",
    "current.json",
  );
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export async function writeImmutablePortfolioBaseline(input: {
  directory: string;
  baseline: SignedPortfolioBaseline;
}): Promise<{ disposition: "created" | "existing"; path: string }> {
  if (!path.isAbsolute(input.directory))
    throw new Error("Baseline directory must be absolute.");
  const safeId = input.baseline.payload.baselineId;
  if (!/^[A-Za-z0-9._-]+$/.test(safeId))
    throw new Error("Baseline identity contains unsafe path characters.");
  const output = path.join(input.directory, `${safeId}.json`);
  const content = `${JSON.stringify(input.baseline, null, 2)}\n`;
  await mkdir(input.directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(output, content, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(output, "utf8");
    if (existing !== content)
      throw new Error(
        "Baseline identity already exists with different immutable evidence.",
      );
    return { disposition: "existing", path: output };
  }
  const readback = await readFile(output, "utf8");
  if (readback !== content)
    throw new Error(
      "Immutable baseline read-back did not match written bytes.",
    );
  return { disposition: "created", path: output };
}

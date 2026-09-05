import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectRepositoryObservation,
  selectPortfolioControlPlaneRegistry,
  writeImmutablePortfolioBaseline,
} from "../portfolio-drift-collector";
import {
  buildPortfolioBaselinePayload,
  buildPortfolioDriftManifest,
  parsePortfolioControlPlaneRegistry,
  signControlPlaneRecord,
} from "../portfolio-control-plane";

const registrySource = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../../.portfolio/CONTROL-PLANE.v1.json"),
    "utf8",
  ),
);

const temporary: string[] = [];
afterEach(() => {
  while (temporary.length > 0)
    rmSync(temporary.pop()!, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();
}

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "nexus-drift-"));
  temporary.push(root);
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "user.name", "Nexus test");
  writeFileSync(join(root, "README.md"), "# Test\n");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "initial");
  git(
    root,
    "remote",
    "add",
    "origin",
    "https://github.com/CleanExpo/Unite-Group.git",
  );
  git(
    root,
    "update-ref",
    "--create-reflog",
    "refs/remotes/origin/main",
    "HEAD",
  );
  git(root, "branch", "--set-upstream-to=origin/main", "main");
  return root;
}

describe("portfolio drift Git collector", () => {
  it("gives the canonical registry precedence and rejects a conflicting generated copy", () => {
    expect(
      selectPortfolioControlPlaneRegistry({
        canonical: registrySource,
        generated: registrySource,
      }).registryVersion,
    ).toBe(registrySource.registryVersion);
    expect(() =>
      selectPortfolioControlPlaneRegistry({
        canonical: registrySource,
        generated: { ...registrySource, registryVersion: "forged-copy" },
      }),
    ).toThrow(/conflicts with canonical authority/);
  });
  it("reads an exact clean worktree without executing a shell or mutating Git", () => {
    const root = repository();
    const registry = parsePortfolioControlPlaneRegistry(registrySource);
    const before = git(root, "status", "--porcelain=v1");
    const result = collectRepositoryObservation({
      registry,
      binding: {
        projectId: "unite-group",
        path: root,
        role: "isolated_worktree",
      },
      deviceId: "macbook",
      signingKey: "test-key",
    });
    expect(result.payload).toMatchObject({
      repositoryId: "CleanExpo/Unite-Group",
      baseRevision: result.payload.observedRevision,
      upstream: { ref: "origin/main", ahead: 0, behind: 0 },
      workingTree: { classification: "clean" },
      generatedResidue: { classification: "none" },
    });
    expect(git(root, "status", "--porcelain=v1")).toBe(before);
  });

  it("keeps Git left/right counts mapped to ahead/behind", () => {
    const registry = parsePortfolioControlPlaneRegistry(registrySource);
    const aheadRoot = repository();
    writeFileSync(join(aheadRoot, "ahead.txt"), "ahead\n");
    git(aheadRoot, "add", "ahead.txt");
    git(aheadRoot, "commit", "-m", "ahead");
    const ahead = collectRepositoryObservation({
      registry,
      binding: {
        projectId: "unite-group",
        path: aheadRoot,
        role: "isolated_worktree",
      },
      deviceId: "macbook",
      signingKey: "test-key",
    });
    expect(ahead.payload.upstream).toMatchObject({ ahead: 1, behind: 0 });

    const behindRoot = repository();
    git(behindRoot, "checkout", "-b", "remote-next");
    writeFileSync(join(behindRoot, "remote.txt"), "remote\n");
    git(behindRoot, "add", "remote.txt");
    git(behindRoot, "commit", "-m", "remote");
    git(
      behindRoot,
      "update-ref",
      "refs/remotes/origin/main",
      git(behindRoot, "rev-parse", "HEAD"),
    );
    git(behindRoot, "checkout", "main");
    const behind = collectRepositoryObservation({
      registry,
      binding: {
        projectId: "unite-group",
        path: behindRoot,
        role: "isolated_worktree",
      },
      deviceId: "macbook",
      signingKey: "test-key",
    });
    expect(behind.payload.upstream).toMatchObject({ ahead: 0, behind: 1 });
  });

  it("classifies generated residue separately and binds it into the content hash", () => {
    const root = repository();
    const registry = parsePortfolioControlPlaneRegistry(registrySource);
    writeFileSync(join(root, ".readiness-manifest.json"), "{}\n");
    const result = collectRepositoryObservation({
      registry,
      binding: {
        projectId: "unite-group",
        path: root,
        role: "canonical_root",
        ownerId: "founder",
      },
      deviceId: "macbook",
      signingKey: "test-key",
    });
    expect(result.payload.workingTree).toMatchObject({
      classification: "untracked_only",
      untracked: [".readiness-manifest.json"],
    });
    expect(result.payload.generatedResidue).toEqual({
      classification: "known_generated",
      paths: [".readiness-manifest.json"],
    });
    expect(result.payload.contentManifestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("records a mismatched Git remote as observed evidence instead of substituting the registry identity", () => {
    const root = repository();
    git(
      root,
      "remote",
      "set-url",
      "origin",
      "https://github.com/CleanExpo/CARSI.git",
    );
    const result = collectRepositoryObservation({
      registry: parsePortfolioControlPlaneRegistry(registrySource),
      binding: {
        projectId: "unite-group",
        path: root,
        role: "isolated_worktree",
      },
      deviceId: "macbook",
      signingKey: "test-key",
    });
    expect(result.payload.repositoryId).toBe("CleanExpo/CARSI");
  });

  it("rejects unregistered projects and relative worktree paths", () => {
    const registry = parsePortfolioControlPlaneRegistry(registrySource);
    expect(() =>
      collectRepositoryObservation({
        registry,
        binding: {
          projectId: "unknown",
          path: "/tmp/missing",
          role: "audit_clone",
        },
        deviceId: "macbook",
        signingKey: null,
      }),
    ).toThrow(/Unregistered/);
    expect(() =>
      collectRepositoryObservation({
        registry,
        binding: {
          projectId: "unite-group",
          path: "relative",
          role: "audit_clone",
        },
        deviceId: "macbook",
        signingKey: null,
      }),
    ).toThrow(/absolute/);
  });

  it("creates an immutable baseline, permits identical replay and rejects conflicting overwrite", async () => {
    const directory = mkdtempSync(join(tmpdir(), "nexus-baseline-"));
    temporary.push(directory);
    const registry = parsePortfolioControlPlaneRegistry(registrySource);
    const evidence = buildPortfolioDriftManifest({
      registryVersion: registry.registryVersion,
      generatedAt: "2026-09-06T06:10:00.000Z",
      repositoryObservations: [],
      worktreeBindings: [],
      deviceEnrolments: [],
      deviceHeartbeats: [],
      leases: [],
      checkpoints: [],
      jobs: [],
      baselines: [],
    });
    const payload = buildPortfolioBaselinePayload({
      baselineId: "baseline-1",
      registryVersion: registry.registryVersion,
      recordedAt: "2026-09-06T06:10:00.000Z",
      evidence,
    });
    const signed = signControlPlaneRecord(
      payload,
      "mission-control",
      "synthetic-control-key",
    );
    await expect(
      writeImmutablePortfolioBaseline({ directory, baseline: signed }),
    ).resolves.toMatchObject({ disposition: "created" });
    await expect(
      writeImmutablePortfolioBaseline({ directory, baseline: signed }),
    ).resolves.toMatchObject({ disposition: "existing" });

    const changed = signControlPlaneRecord(
      { ...payload, recordedAt: "2026-09-06T06:10:01.000Z" },
      "mission-control",
      "synthetic-control-key",
    );
    await expect(
      writeImmutablePortfolioBaseline({ directory, baseline: changed }),
    ).rejects.toThrow(/different immutable evidence/);
    expect(
      JSON.parse(readFileSync(join(directory, "baseline-1.json"), "utf8"))
        .signature.recordHash,
    ).toBe(signed.signature.recordHash);
  });
});

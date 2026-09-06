import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEVICE_CHECKPOINT_SCHEMA,
  DEVICE_ENROLMENT_SCHEMA,
  DEVICE_HEARTBEAT_SCHEMA,
  DURABLE_JOB_SCHEMA,
  EXECUTION_LEASE_SCHEMA,
  REPOSITORY_OBSERVATION_SCHEMA,
  PORTFOLIO_BASELINE_SCHEMA,
  WORKTREE_BINDING_SCHEMA,
  buildPortfolioControlPlaneProjection,
  buildPortfolioBaselinePayload,
  buildPortfolioDriftManifest,
  parsePortfolioControlPlaneRegistry,
  repositoryContentManifestHash,
  signControlPlaneRecord,
  assessNewExecutionAdmission,
  type PortfolioControlPlaneRegistry,
  type RepositoryObservationPayload,
} from "../portfolio-control-plane";

const NOW = Date.parse("2026-09-06T06:10:00.000Z");
const DEVICE_KEY = "test-device-key-not-a-runtime-secret";
const CONTROL_KEY = "test-control-key-not-a-runtime-secret";

function registry(): PortfolioControlPlaneRegistry {
  return parsePortfolioControlPlaneRegistry(
    JSON.parse(
      readFileSync(
        resolve(process.cwd(), "../../.portfolio/CONTROL-PLANE.v1.json"),
        "utf8",
      ),
    ),
  );
}

const keys = (signerId: string) =>
  signerId === "macbook"
    ? DEVICE_KEY
    : signerId === "mission-control"
      ? CONTROL_KEY
      : null;

function observation(overrides: Partial<RepositoryObservationPayload> = {}) {
  const base: Omit<RepositoryObservationPayload, "contentManifestHash"> = {
    schema: REPOSITORY_OBSERVATION_SCHEMA,
    observationId: "observation-1",
    registryVersion: registry().registryVersion,
    projectId: "unite-group",
    repositoryId: "CleanExpo/Unite-Group",
    deviceId: "macbook",
    observedAt: "2026-09-06T06:09:00.000Z",
    collector: {
      id: "collector",
      version: "1.0.0",
      source: "local_git_readback",
    },
    worktree: {
      worktreeId: "1".repeat(64),
      pathHash: "2".repeat(64),
      path: "/tmp/unite",
      role: "isolated_worktree",
      branch: "main",
      detached: false,
    },
    baseRevision: "a".repeat(40),
    observedRevision: "a".repeat(40),
    upstream: {
      ref: "origin/main",
      revision: "a".repeat(40),
      fetchedAt: "2026-09-06T06:08:00.000Z",
      freshness: "fresh",
      ahead: 0,
      behind: 0,
    },
    workingTree: {
      classification: "clean",
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
    },
    generatedResidue: { classification: "none", paths: [] },
    declaredOwner: {
      bindingId: "binding-1",
      ownerId: "codex-owner",
      leaseId: null,
      state: "declared",
    },
  };
  const merged = { ...base, ...overrides } as Omit<
    RepositoryObservationPayload,
    "contentManifestHash"
  >;
  const payload = {
    ...merged,
    contentManifestHash: repositoryContentManifestHash(merged),
  };
  return signControlPlaneRecord(payload, "macbook", DEVICE_KEY);
}

function worktreeBinding(overrides: Record<string, unknown> = {}) {
  return signControlPlaneRecord(
    {
      schema: WORKTREE_BINDING_SCHEMA,
      bindingId: "binding-1",
      registryVersion: registry().registryVersion,
      projectId: "unite-group",
      repositoryId: "CleanExpo/Unite-Group",
      deviceId: "macbook",
      worktreeId: "1".repeat(64),
      pathHash: "2".repeat(64),
      role: "isolated_worktree" as const,
      ownerId: "codex-owner",
      issuedAt: "2026-09-06T06:00:00.000Z",
      expiresAt: "2026-09-06T07:00:00.000Z",
      ...overrides,
    },
    "mission-control",
    CONTROL_KEY,
  );
}

function manifest(
  parts: Partial<Parameters<typeof buildPortfolioDriftManifest>[0]> = {},
) {
  return buildPortfolioDriftManifest({
    registryVersion: registry().registryVersion,
    generatedAt: "2026-09-06T06:10:00.000Z",
    repositoryObservations: [],
    worktreeBindings: [worktreeBinding()],
    deviceEnrolments: [],
    deviceHeartbeats: [],
    leases: [],
    checkpoints: [],
    jobs: [],
    baselines: [],
    ...parts,
  });
}

function project(value: unknown) {
  return buildPortfolioControlPlaneProjection({
    registry: registry(),
    manifest: value,
    keyResolver: keys,
    nowMs: NOW,
  });
}

function manifestWithBaseline(
  parts: Partial<Parameters<typeof buildPortfolioDriftManifest>[0]> = {},
) {
  const draft = manifest(parts);
  const payload = buildPortfolioBaselinePayload({
    baselineId: "baseline-2026-09-06",
    registryVersion: registry().registryVersion,
    recordedAt: "2026-09-06T06:10:00.000Z",
    evidence: draft,
  });
  expect(payload.schema).toBe(PORTFOLIO_BASELINE_SCHEMA);
  return manifest({
    ...parts,
    baselines: [
      signControlPlaneRecord(payload, "mission-control", CONTROL_KEY),
    ],
  });
}

describe("portfolio control-plane registry and drift projection", () => {
  it("rejects malformed and duplicate canonical identities", () => {
    const value = registry();
    expect(() =>
      parsePortfolioControlPlaneRegistry({ ...value, schema: "green" }),
    ).toThrow();
    expect(() =>
      parsePortfolioControlPlaneRegistry({
        ...value,
        repositories: [...value.repositories, value.repositories[0]],
      }),
    ).toThrow(/duplicate/);
    expect(() =>
      parsePortfolioControlPlaneRegistry({
        ...value,
        devices: [...value.devices, value.devices[0]],
      }),
    ).toThrow(/duplicate/);
  });

  it("tracks official model names without claiming runtime capability", () => {
    expect(registry().modelCapabilities).toEqual([
      expect.objectContaining({
        officialName: "GPT-6 Astra",
        modelId: "gpt-6-astra",
        state: "unverified",
        effectiveRuntimeProbe: null,
        entitlement: "unverified",
        cost: "unverified",
        quota: "unverified",
      }),
      expect.objectContaining({
        officialName: "Claude Fable 5.1",
        modelId: "claude-fable-5-1",
        state: "unverified",
        effectiveRuntimeProbe: null,
      }),
    ]);
  });

  it("keeps every registered repository and device unproven without observations", () => {
    const result = project(null);
    expect(result.repositories).toHaveLength(9);
    expect(result.repositories.every((item) => item.state === "unproven")).toBe(
      true,
    );
    expect(result.devices).toHaveLength(3);
    expect(result.devices.every((item) => item.state === "unproven")).toBe(
      true,
    );
    expect(result.remoteDispatchEnabled).toBe(false);
    expect(result.repositoryReconciliationEnabled).toBe(false);
  });

  it("admits only a current, signed, internally consistent clean observation", () => {
    const result = project(
      manifest({ repositoryObservations: [observation()] }),
    );
    expect(
      result.repositories.find((item) => item.projectId === "unite-group"),
    ).toMatchObject({
      state: "observed",
      drift: "clean_at_observed_revision",
      evidenceFreshness: "fresh",
    });
    expect(
      result.repositories
        .filter((item) => item.projectId !== "unite-group")
        .every((item) => item.state === "unproven"),
    ).toBe(true);
  });

  it.each([
    [
      "forged signature",
      () => ({
        ...observation(),
        signature: { ...observation().signature, value: "0".repeat(64) },
      }),
    ],
    [
      "mismatched repository",
      () => observation({ repositoryId: "CleanExpo/CARSI" }),
    ],
    [
      "generated residue",
      () =>
        observation({
          generatedResidue: {
            classification: "known_generated",
            paths: [".readiness-manifest.json"],
          },
          workingTree: {
            classification: "untracked_only",
            staged: [],
            unstaged: [],
            untracked: [".readiness-manifest.json"],
            conflicted: [],
          },
        }),
    ],
    [
      "diverged revision",
      () =>
        observation({
          upstream: { ...observation().payload.upstream, ahead: 2, behind: 1 },
        }),
    ],
  ])("quarantines %s", (_label, build) => {
    const result = project(manifest({ repositoryObservations: [build()] }));
    expect(
      result.repositories.find((item) => item.projectId === "unite-group")
        ?.state,
    ).toBe("quarantined");
  });

  it("quarantines a mismatched worktree binding even with a valid device signature", () => {
    const source = observation().payload;
    const changed = {
      ...source,
      worktree: { ...source.worktree, role: "audit_clone" as const },
    };
    const { contentManifestHash: _oldHash, ...material } = changed;
    const payload = {
      ...material,
      contentManifestHash: repositoryContentManifestHash(material),
    };
    const signed = signControlPlaneRecord(payload, "macbook", DEVICE_KEY);
    const alteredRegistry = {
      ...registry(),
      repositories: registry().repositories.map((item) =>
        item.projectId === "unite-group"
          ? { ...item, allowedWorktreeRoles: ["isolated_worktree" as const] }
          : item,
      ),
    };
    const result = buildPortfolioControlPlaneProjection({
      registry: alteredRegistry,
      manifest: manifest({ repositoryObservations: [signed] }),
      keyResolver: keys,
      nowMs: NOW,
    });
    expect(
      result.repositories.find((item) => item.projectId === "unite-group")
        ?.drift,
    ).toBe("identity_or_manifest_mismatch");
  });

  it("rejects a control-plane binding for the wrong owner or worktree hash", () => {
    const wrongOwner = project(
      manifest({
        repositoryObservations: [observation()],
        worktreeBindings: [worktreeBinding({ ownerId: "another-owner" })],
      }),
    );
    expect(
      wrongOwner.repositories.find((item) => item.projectId === "unite-group"),
    ).toMatchObject({
      state: "quarantined",
      drift: "worktree_binding_rejected",
    });

    const wrongPath = project(
      manifest({
        repositoryObservations: [observation()],
        worktreeBindings: [worktreeBinding({ pathHash: "3".repeat(64) })],
      }),
    );
    expect(
      wrongPath.repositories.find((item) => item.projectId === "unite-group"),
    ).toMatchObject({
      state: "quarantined",
      drift: "worktree_binding_rejected",
    });
  });

  it("quarantines competing current owners even when each binding has a different valid ID", () => {
    const competing = worktreeBinding({
      bindingId: "binding-competing-owner",
      ownerId: "another-owner",
    });
    const result = project(
      manifest({
        repositoryObservations: [observation()],
        worktreeBindings: [worktreeBinding(), competing],
      }),
    );
    expect(
      result.repositories.find((item) => item.projectId === "unite-group"),
    ).toMatchObject({
      state: "quarantined",
      drift: "worktree_binding_conflict",
    });
  });

  it("marks old signed evidence stale and rejects future evidence", () => {
    const stale = project(
      manifest({
        repositoryObservations: [
          observation({ observedAt: "2026-09-06T05:00:00.000Z" }),
        ],
      }),
    );
    expect(
      stale.repositories.find((item) => item.projectId === "unite-group")
        ?.state,
    ).toBe("stale");
    const future = project(
      manifest({
        repositoryObservations: [
          observation({ observedAt: "2026-09-06T07:00:00.000Z" }),
        ],
      }),
    );
    expect(
      future.repositories.find((item) => item.projectId === "unite-group")
        ?.state,
    ).toBe("quarantined");
  });

  it("rejects fake green claims rather than treating them as an observation", () => {
    const fake = {
      payload: { ...observation().payload, status: "green" },
      signature: observation().signature,
    };
    const result = project(
      manifest({ repositoryObservations: [fake as never] }),
    );
    expect(
      result.repositories.find((item) => item.projectId === "unite-group"),
    ).toMatchObject({ state: "quarantined", drift: "malformed_observation" });
  });

  it("quarantines a changed manifest even when its embedded records still verify", () => {
    const valid = manifest({ repositoryObservations: [observation()] });
    const tampered = { ...valid, generatedAt: "2026-09-06T06:09:59.000Z" };
    const result = project(tampered);
    expect(
      result.repositories.every((item) => item.state === "quarantined"),
    ).toBe(true);
    expect(result.devices.every((item) => item.state === "quarantined")).toBe(
      true,
    );
  });
});

function workerRecords() {
  const heartbeat = signControlPlaneRecord(
    {
      schema: DEVICE_HEARTBEAT_SCHEMA,
      heartbeatId: "heartbeat-7",
      registryVersion: registry().registryVersion,
      deviceId: "macbook",
      sequence: 7,
      observedAt: "2026-09-06T06:09:30.000Z",
      expiresAt: "2026-09-06T06:10:30.000Z",
      worker: {
        workerId: "codex-1",
        modelProvider: "openai",
        modelId: "verified-model",
        harness: "codex",
        harnessVersion: "1.0.0",
      },
      source: {
        adapterId: "native-codex-runtime",
        adapterVersion: "1.0.0",
        kind: "device_runtime" as const,
        identityBinding: "device_attestation" as const,
      },
      activeJobId: "job-1",
      lastCheckpointId: "checkpoint-1",
    },
    "macbook",
    DEVICE_KEY,
  );
  const lease = signControlPlaneRecord(
    {
      schema: EXECUTION_LEASE_SCHEMA,
      leaseId: "lease-1",
      registryVersion: registry().registryVersion,
      jobId: "job-1",
      deviceId: "macbook",
      workerId: "codex-1",
      acquiredAt: "2026-09-06T06:05:00.000Z",
      expiresAt: "2026-09-06T06:15:00.000Z",
      fencingToken: 4,
    },
    "mission-control",
    CONTROL_KEY,
  );
  const checkpoint = signControlPlaneRecord(
    {
      schema: DEVICE_CHECKPOINT_SCHEMA,
      checkpointId: "checkpoint-1",
      registryVersion: registry().registryVersion,
      jobId: "job-1",
      deviceId: "macbook",
      workerId: "codex-1",
      leaseId: "lease-1",
      fencingToken: 4,
      recordedAt: "2026-09-06T06:09:20.000Z",
      stage: "verify",
      currentWork: "Run adversarial tests",
      evidenceRefs: ["receipt:test-1"],
      nextAction: "Request independent review",
    },
    "macbook",
    DEVICE_KEY,
  );
  const job = signControlPlaneRecord(
    {
      schema: DURABLE_JOB_SCHEMA,
      jobId: "job-1",
      registryVersion: registry().registryVersion,
      projectId: "unite-group",
      objective: "Build truthful drift visibility",
      state: "running" as const,
      assignedDeviceId: "macbook",
      assignedWorkerId: "codex-1",
      leaseId: "lease-1",
      checkpointId: "checkpoint-1",
      latestEvidenceRefs: ["receipt:test-1"],
      blocker: null,
      nextAction: "Request independent review",
      updatedAt: "2026-09-06T06:09:20.000Z",
    },
    "mission-control",
    CONTROL_KEY,
  );
  const enrolment = signControlPlaneRecord(
    {
      schema: DEVICE_ENROLMENT_SCHEMA,
      enrolmentId: "enrolment-macbook-codex-1",
      registryVersion: registry().registryVersion,
      deviceId: "macbook",
      workerId: "codex-1",
      harness: "codex",
      harnessVersion: "1.0.0",
      issuedAt: "2026-09-06T06:00:00.000Z",
      expiresAt: "2026-09-06T07:00:00.000Z",
      state: "enrolled" as const,
    },
    "mission-control",
    CONTROL_KEY,
  );
  return { heartbeat, enrolment, lease, checkpoint, job };
}

describe("independent worker contract", () => {
  it("projects a signed current worker, fenced lease and checkpoint without enabling dispatch", () => {
    const records = workerRecords();
    const result = project(
      manifest({
        deviceEnrolments: [records.enrolment],
        deviceHeartbeats: [records.heartbeat],
        leases: [records.lease],
        checkpoints: [records.checkpoint],
        jobs: [records.job],
      }),
    );
    const device = result.devices.find((item) => item.deviceId === "macbook");
    expect(device).toMatchObject({
      state: "observed",
      operatingStatus: "active",
      enrolmentState: "enrolled",
      newExecutionEligible: true,
      leaseState: "current",
      worker: { workerId: "codex-1", harness: "codex" },
    });
    expect(device?.durableJob?.checkpoint).toMatchObject({
      stage: "verify",
      evidenceRefs: ["receipt:test-1"],
    });
    expect(result.remoteDispatchEnabled).toBe(false);
  });

  it("keeps the durable job and checkpoint visible after the device becomes offline and the lease expires", () => {
    const records = workerRecords();
    const result = buildPortfolioControlPlaneProjection({
      registry: registry(),
      manifest: manifest({
        deviceEnrolments: [records.enrolment],
        deviceHeartbeats: [records.heartbeat],
        leases: [records.lease],
        checkpoints: [records.checkpoint],
        jobs: [records.job],
      }),
      keyResolver: keys,
      nowMs: Date.parse("2026-09-06T06:20:00.000Z"),
    });
    const device = result.devices.find((item) => item.deviceId === "macbook");
    expect(device).toMatchObject({ state: "offline", leaseState: "expired" });
    expect(device?.durableJob).toMatchObject({
      jobId: "job-1",
      state: "paused_offline",
    });
    expect(device?.durableJob?.checkpoint?.currentWork).toBe(
      "Run adversarial tests",
    );
    expect(device?.durableJob?.nextAction).toContain("new fenced lease");
  });

  it("rejects forged heartbeats and conflicting sequence reuse", () => {
    const records = workerRecords();
    const forged = {
      ...records.heartbeat,
      signature: { ...records.heartbeat.signature, value: "0".repeat(64) },
    };
    let result = project(manifest({ deviceHeartbeats: [forged] }));
    expect(
      result.devices.find((item) => item.deviceId === "macbook")?.state,
    ).toBe("quarantined");

    const conflict = signControlPlaneRecord(
      { ...records.heartbeat.payload, heartbeatId: "heartbeat-conflict" },
      "macbook",
      DEVICE_KEY,
    );
    result = project(
      manifest({ deviceHeartbeats: [records.heartbeat, conflict] }),
    );
    expect(
      result.devices.find((item) => item.deviceId === "macbook"),
    ).toMatchObject({
      state: "quarantined",
      reason: expect.stringContaining("sequence"),
    });
  });

  it("rejects a heartbeat signed by a different registered device", () => {
    const records = workerRecords();
    const mismatched = signControlPlaneRecord(
      records.heartbeat.payload,
      "pc",
      "test-pc-key",
    );
    const result = buildPortfolioControlPlaneProjection({
      registry: registry(),
      manifest: manifest({ deviceHeartbeats: [mismatched] }),
      keyResolver: (signerId) =>
        signerId === "macbook"
          ? DEVICE_KEY
          : signerId === "pc"
            ? "test-pc-key"
            : signerId === "mission-control"
              ? CONTROL_KEY
              : null,
      nowMs: NOW,
    });
    expect(
      result.devices.find((item) => item.deviceId === "macbook")?.state,
    ).toBe("quarantined");
  });

  it("keeps the Mac Mini mesh heartbeat diagnostic-only until device identity is attested", () => {
    const diagnostic = signControlPlaneRecord(
      {
        ...workerRecords().heartbeat.payload,
        heartbeatId: "mesh-heartbeat-1",
        deviceId: "mac-mini",
        source: {
          adapterId: "pi-dev-ops-mesh-heartbeat",
          adapterVersion: "observed-local-adapter",
          kind: "pi_dev_ops_mesh_heartbeat_adapter" as const,
          identityBinding: "unverified_transport" as const,
        },
      },
      "mac-mini",
      "synthetic-mac-mini-key",
    );
    const result = buildPortfolioControlPlaneProjection({
      registry: registry(),
      manifest: manifest({ deviceHeartbeats: [diagnostic] }),
      keyResolver: (signerId) =>
        signerId === "mac-mini"
          ? "synthetic-mac-mini-key"
          : signerId === "mission-control"
            ? CONTROL_KEY
            : null,
      nowMs: NOW,
    });
    expect(
      result.devices.find((item) => item.deviceId === "mac-mini"),
    ).toMatchObject({
      state: "unproven",
      operatingStatus: "unknown",
      newExecutionEligible: false,
      reason: expect.stringContaining("without authenticated device identity"),
    });
  });

  it("denies a diagnostic-only adapter that claims device attestation", () => {
    const records = workerRecords();
    const claimedAttestation = signControlPlaneRecord(
      {
        ...records.heartbeat.payload,
        heartbeatId: "mesh-heartbeat-spoofed-attestation",
        deviceId: "mac-mini",
        activeJobId: null,
        lastCheckpointId: null,
        source: {
          adapterId: "pi-dev-ops-mesh-heartbeat",
          adapterVersion: "observed-local-adapter",
          kind: "pi_dev_ops_mesh_heartbeat_adapter" as const,
          identityBinding: "device_attestation" as const,
        },
      },
      "mac-mini",
      "synthetic-mac-mini-key",
    );
    const enrolment = signControlPlaneRecord(
      {
        ...records.enrolment.payload,
        enrolmentId: "enrolment-mac-mini-codex-1",
        deviceId: "mac-mini",
      },
      "mission-control",
      CONTROL_KEY,
    );
    const evidence = manifestWithBaseline({
      deviceEnrolments: [enrolment],
      deviceHeartbeats: [claimedAttestation],
    });
    const keyResolver = (signerId: string) =>
      signerId === "mac-mini"
        ? "synthetic-mac-mini-key"
        : signerId === "mission-control"
          ? CONTROL_KEY
          : null;
    const projection = buildPortfolioControlPlaneProjection({
      registry: registry(),
      manifest: evidence,
      keyResolver,
      nowMs: NOW,
    });
    expect(
      projection.devices.find((item) => item.deviceId === "mac-mini"),
    ).toMatchObject({
      state: "unproven",
      newExecutionEligible: false,
      reason: expect.stringContaining("registry-limited to diagnostic"),
    });
    expect(
      assessNewExecutionAdmission({
        registry: registry(),
        manifest: evidence,
        keyResolver,
        deviceId: "mac-mini",
        workerId: "codex-1",
        nowMs: NOW,
      }),
    ).toMatchObject({ allowed: false, disposition: "denied" });
  });

  it("rejects mismatched lease and checkpoint fencing while retaining the signed durable job", () => {
    const records = workerRecords();
    const wrongCheckpoint = signControlPlaneRecord(
      { ...records.checkpoint.payload, fencingToken: 5 },
      "macbook",
      DEVICE_KEY,
    );
    const result = project(
      manifest({
        deviceEnrolments: [records.enrolment],
        deviceHeartbeats: [records.heartbeat],
        leases: [records.lease],
        checkpoints: [wrongCheckpoint],
        jobs: [records.job],
      }),
    );
    const device = result.devices.find((item) => item.deviceId === "macbook");
    expect(device?.leaseState).toBe("rejected");
    expect(device?.durableJob?.jobId).toBe("job-1");
    expect(device?.durableJob?.checkpoint).toBeNull();
    expect(device?.durableJob?.blocker).toContain("rejected");
  });

  it("keeps signed records unproven when the approved key binding is unavailable", () => {
    const records = workerRecords();
    const result = buildPortfolioControlPlaneProjection({
      registry: registry(),
      manifest: manifest({
        deviceEnrolments: [records.enrolment],
        deviceHeartbeats: [records.heartbeat],
        jobs: [records.job],
      }),
      keyResolver: () => null,
      nowMs: NOW,
    });
    expect(
      result.devices.find((item) => item.deviceId === "macbook")?.state,
    ).toBe("unproven");
    expect(result.repositories.every((item) => item.state === "unproven")).toBe(
      true,
    );
  });

  it("denies new work for an unenrolled worker even when its device heartbeat is current", () => {
    const records = workerRecords();
    const evidence = manifestWithBaseline({
      deviceHeartbeats: [records.heartbeat],
    });
    const result = assessNewExecutionAdmission({
      registry: registry(),
      manifest: evidence,
      keyResolver: keys,
      deviceId: "macbook",
      workerId: "codex-1",
      nowMs: NOW,
    });
    expect(result).toMatchObject({ allowed: false, disposition: "denied" });
    expect(result.reason).toMatch(/unenrolled|unknown/);
  });

  it("denies an enrolled heartbeat whose active job/checkpoint have no durable records", () => {
    const records = workerRecords();
    const evidence = manifestWithBaseline({
      deviceEnrolments: [records.enrolment],
      deviceHeartbeats: [records.heartbeat],
    });
    const admission = assessNewExecutionAdmission({
      registry: registry(),
      manifest: evidence,
      keyResolver: keys,
      deviceId: "macbook",
      workerId: "codex-1",
      nowMs: NOW,
    });
    const projection = project(evidence);
    expect(admission.allowed).toBe(false);
    expect(projection.unknownWork).toEqual([
      expect.objectContaining({
        state: "unknown",
        reason: expect.stringContaining("no durable job record"),
      }),
    ]);
  });

  it("denies new work for a stale worker and preserves its durable checkpoint", () => {
    const records = workerRecords();
    const evidence = manifestWithBaseline({
      deviceEnrolments: [records.enrolment],
      deviceHeartbeats: [records.heartbeat],
      leases: [records.lease],
      checkpoints: [records.checkpoint],
      jobs: [records.job],
    });
    const later = Date.parse("2026-09-06T06:12:00.000Z");
    const admission = assessNewExecutionAdmission({
      registry: registry(),
      manifest: evidence,
      keyResolver: keys,
      deviceId: "macbook",
      workerId: "codex-1",
      nowMs: later,
    });
    const projection = buildPortfolioControlPlaneProjection({
      registry: registry(),
      manifest: evidence,
      keyResolver: keys,
      nowMs: later,
    });
    expect(admission.allowed).toBe(false);
    expect(
      projection.devices.find((item) => item.deviceId === "macbook"),
    ).toMatchObject({
      operatingStatus: "stale",
      newExecutionEligible: false,
      durableJob: {
        jobId: "job-1",
        checkpoint: { currentWork: "Run adversarial tests" },
      },
    });
  });

  it("allows local admission only for the exact freshly enrolled worker under a verified baseline", () => {
    const records = workerRecords();
    const idleHeartbeat = signControlPlaneRecord(
      {
        ...records.heartbeat.payload,
        heartbeatId: "heartbeat-idle",
        activeJobId: null,
        lastCheckpointId: null,
      },
      "macbook",
      DEVICE_KEY,
    );
    const evidence = manifestWithBaseline({
      deviceEnrolments: [records.enrolment],
      deviceHeartbeats: [idleHeartbeat],
    });
    expect(
      assessNewExecutionAdmission({
        registry: registry(),
        manifest: evidence,
        keyResolver: keys,
        deviceId: "macbook",
        workerId: "codex-1",
        nowMs: NOW,
      }),
    ).toMatchObject({ allowed: true, disposition: "eligible" });
    expect(
      assessNewExecutionAdmission({
        registry: registry(),
        manifest: evidence,
        keyResolver: keys,
        deviceId: "unknown-device",
        workerId: "codex-1",
        nowMs: NOW,
      }).allowed,
    ).toBe(false);
  });

  it("quarantines a rewritten baseline even when the outer manifest hash is recomputed", () => {
    const valid = manifestWithBaseline();
    const baseline = valid.baselines[0];
    const tamperedBaseline = {
      ...baseline,
      payload: {
        ...baseline.payload,
        recordedAt: "2026-09-06T06:09:59.000Z",
      },
    };
    const result = project(manifest({ baselines: [tamperedBaseline] }));
    expect(result.baseline).toMatchObject({ state: "quarantined" });
  });

  it("invalidates a baseline when the current signed evidence set changes", () => {
    const valid = manifestWithBaseline();
    const changed = manifest({
      deviceHeartbeats: [workerRecords().heartbeat],
      baselines: valid.baselines,
    });
    expect(project(changed).baseline.state).toBe("quarantined");
  });

  it("keeps unassigned signed work visible as unknown", () => {
    const records = workerRecords();
    const unassigned = signControlPlaneRecord(
      {
        ...records.job.payload,
        jobId: "job-unassigned",
        assignedDeviceId: null,
        assignedWorkerId: null,
        leaseId: null,
        checkpointId: null,
      },
      "mission-control",
      CONTROL_KEY,
    );
    const result = project(manifest({ jobs: [unassigned] }));
    expect(result.unknownWork).toEqual([
      expect.objectContaining({ state: "unknown" }),
    ]);
  });
});

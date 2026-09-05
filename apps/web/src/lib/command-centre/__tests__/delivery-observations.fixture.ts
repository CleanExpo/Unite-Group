import type { CommandCentreTask } from "../tasks";
import type { CommandCentreProject } from "../registry";
import type { DeliveryMetadata } from "../delivery-types";

export const taskId = "00000000-0000-4000-8000-000000000001";
export const headSha = "a".repeat(40);
export function observationFixture() {
  const delivery: DeliveryMetadata = {
    schemaVersion: 1,
    kind: "software_delivery",
    lane: "software",
    revision: 1,
    inputHash: "b".repeat(64),
    projectKey: "Unite-Group",
    originalIdea: "Build a customer portal",
    presetIds: [],
    recipeVersions: {},
    answers: {},
    questions: [],
    phase: "ready",
    spec: {
      title: "Portal",
      summary: "Customer portal",
      requirements: ["Portal"],
      acceptanceCriteria: ["User signs in"],
      steps: ["Build"],
      presetIds: [],
    },
    specVersion: "c".repeat(64),
    harness: [],
    sourceRefs: [],
    board: null,
    lease: null,
    approval: null,
    build: {
      status: "awaiting_review",
      prRef: "https://github.com/CleanExpo/Unite-Group/pull/42",
      runnerId: "runner-1",
      specRevision: 1,
      specFingerprint: "c".repeat(64),
      completedAt: "2026-09-05T00:00:00Z",
    },
    error: null,
    scope: "branch_preview_only",
  };
  const task = {
    id: taskId,
    founder_id: "founder-1",
    external_ref: `delivery:${taskId}`,
    project_key: "Unite-Group",
    metadata: { delivery },
    updated_at: "2026-09-05T00:00:00Z",
  } as unknown as CommandCentreTask;
  const project = {
    name: "Unite-Group",
    github_repo: "CleanExpo/Unite-Group",
  } as CommandCentreProject;
  return { task, project, delivery };
}

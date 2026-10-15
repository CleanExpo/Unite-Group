import { describe, expect, it } from "vitest";
import { toDeliveryMissionView } from "../delivery-view";
import { deliveryFingerprint } from "../delivery-store";
import { observationFixture } from "./delivery-observations.fixture";
import { applyLifecycleCommand, createIdeaLifecycle, type LifecycleBriefInput } from "../idea-lifecycle";

function blockedSigningMission() {
  const { task, delivery } = observationFixture();
  delete delivery.build;
  delivery.error = { code: "approval_signing_unavailable", message: "Build authorisation needs an operator repair." };
  delivery.board = { verdict: "HOLD", rationale: "Review only; do not start a build.", decisionId: "board-1" };
  delivery.specVersion = deliveryFingerprint(delivery);
  task.status = "proposed";
  task.objective = delivery.originalIdea;
  return { task, delivery };
}

describe("delivery signing failure projection", () => {
  it("assigns the missing connection to an operator rather than inviting repeated approval", () => {
    const { task } = blockedSigningMission();
    const view = toDeliveryMissionView(task);
    expect(view.stage).toBe("failed");
    expect(view.nextAction).toMatchObject({ kind: "connect", owner: "Delivery operator" });
    expect(view.blockers).toContainEqual(expect.objectContaining({ code: "approval_signing_unavailable" }));
  });

  it("rechecks restored readiness without changing the saved error, consent, Board or queue", () => {
    const { task } = blockedSigningMission();
    const before = structuredClone(task);
    const view = toDeliveryMissionView(task, Date.now(), { approvalSigningAvailable: true });
    expect(view.stage).toBe("ready_for_review");
    expect(view.nextAction.kind).toBe("approve");
    expect(view.blockers).toContainEqual(expect.objectContaining({ code: "board_concern" }));
    expect(view.blockers.some(b => b.code === "approval_signing_unavailable")).toBe(false);
    expect(task).toEqual(before);
    expect(task.status).toBe("proposed");
  });

  it.each(["fingerprint", "lane", "target", "lease", "blocked", "other_error", "phase", "project_mismatch", "objective_mismatch"])("restoring the signer cannot bypass %s", guard => {
    const { task, delivery } = blockedSigningMission();
    if (guard === "fingerprint") delivery.specVersion = "f".repeat(64);
    if (guard === "lane") delivery.lane = "content";
    if (guard === "target") { delivery.projectKey = "CARSI"; task.project_key = "CARSI"; }
    if (guard === "lease") delivery.lease = { token: "00000000-0000-4000-8000-000000000009", phase: "approve", revision: 1, expiresAt: "2099-01-01T00:00:00Z" };
    if (guard === "blocked") task.status = "blocked";
    if (guard === "phase") delivery.phase = "board";
    if (guard === "project_mismatch") task.project_key = "CARSI";
    if (guard === "objective_mismatch") task.objective = "Changed objective";
    if (guard === "other_error") delivery.error = { code: "unsupported_lane", message: "Unsupported" };
    if (guard !== "fingerprint") delivery.specVersion = deliveryFingerprint(delivery);
    expect(toDeliveryMissionView(task, Date.now(), { approvalSigningAvailable: true }).nextAction.kind).not.toBe("approve");
  });
});

describe("research-bound current build result", () => {
  it("hides an old PR across material research edits and fresh preparation, then shows only the new matching receipt", () => {
    const { task, delivery } = observationFixture();
    const actorId = "b0000000-0000-4000-8000-000000000001";
    const context = { actorId, now: "2026-10-15T00:00:00.000Z" };
    const brief: LifecycleBriefInput = { objective: "Reviewed portal", user: "Customer", payer: "Owner", nonGoals: [],
      acceptanceCriteria: [{ id: "a1", criterion: "Only owned data", validation: "Isolation test" }],
      outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: "included", content: `Output ${index + 1}` })),
      design: { summary: "Reuse the application", sourceIds: [] }, target: { repository: "CleanExpo/Unite-Group", baseBranch: "main" }, risks: [], openDecisions: [] };
    let lifecycle = createIdeaLifecycle({ title: "Portal", rawIdea: "Research the portal", requestId: task.id }, context);
    lifecycle = applyLifecycleCommand(lifecycle, { action: "propose_brief", taskId: task.id, expectedRevision: 1, brief }, context);
    task.metadata.lifecycle = lifecycle;
    task.preview_url = "https://github.com/CleanExpo/Unite-Group/pull/1";
    delivery.sourceRefs = [{ reference: `idea-brief:${lifecycle.brief!.hash}`, label: "Reviewed brief" }];
    delivery.specVersion = deliveryFingerprint(delivery);
    delivery.build = { ...delivery.build!, prRef: task.preview_url, specFingerprint: delivery.specVersion };
    expect(toDeliveryMissionView(task).previewUrl).toBe(task.preview_url);
    lifecycle = applyLifecycleCommand(lifecycle, { action: "checkpoint", taskId: task.id, expectedRevision: lifecycle.revision,
      checkpoint: { status: "partial", summary: "Revised research", nextStep: "Review the new brief", blockers: [] } }, context);
    task.metadata.lifecycle = lifecycle;
    expect(toDeliveryMissionView(task).previewUrl).toBeNull();
    expect(toDeliveryMissionView(task).receipts).toEqual([]);
    lifecycle = applyLifecycleCommand(lifecycle, { action: "propose_brief", taskId: task.id, expectedRevision: lifecycle.revision, brief }, context);
    lifecycle = applyLifecycleCommand(lifecycle, { action: "approve_brief", taskId: task.id, expectedRevision: lifecycle.revision, briefHash: lifecycle.brief!.hash }, context);
    task.metadata.lifecycle = lifecycle;
    expect(toDeliveryMissionView(task).previewUrl).toBeNull();
    delivery.revision++;
    delivery.sourceRefs = [{ reference: `idea-brief:${lifecycle.brief!.hash}`, label: "New reviewed brief" }];
    delete delivery.build;
    delivery.specVersion = deliveryFingerprint(delivery);
    expect(toDeliveryMissionView(task).previewUrl).toBeNull();
    delivery.build = { status: "awaiting_review", prRef: "https://github.com/CleanExpo/Unite-Group/pull/2", runnerId: "runner", specRevision: delivery.revision, specFingerprint: delivery.specVersion, completedAt: context.now };
    expect(toDeliveryMissionView(task).previewUrl).toBe(delivery.build.prRef);
    expect(toDeliveryMissionView(task).receipts[0].reference).toBe(delivery.build.prRef);
    delivery.build.specRevision--;
    expect(toDeliveryMissionView(task).previewUrl).toBeNull();
  });
  it("preserves the legacy preview fallback and refuses a damaged research marker", () => {
    const { task, delivery } = observationFixture();
    delete delivery.build;
    task.preview_url = "https://example.test/existing-preview";
    expect(toDeliveryMissionView(task).previewUrl).toBe(task.preview_url);
    task.external_ref = `delivery:research:${task.id}`;
    expect(toDeliveryMissionView(task).previewUrl).toBeNull();
  });
});

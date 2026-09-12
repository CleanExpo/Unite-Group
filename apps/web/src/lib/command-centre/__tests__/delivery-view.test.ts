import { describe, expect, it } from "vitest";
import { toDeliveryMissionView } from "../delivery-view";
import { deliveryFingerprint } from "../delivery-store";
import { observationFixture } from "./delivery-observations.fixture";

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

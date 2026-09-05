import type { CommandCentreTask } from "./tasks";
import {
  readDeliveryMetadata,
  type DeliveryMissionView,
  type DeliveryStage,
} from "./delivery-types";

/** Queue state is observed, never invented from a model's words. No source here can prove live delivery. */
export function toDeliveryMissionView(
  task: CommandCentreTask,
  now = Date.now(),
): DeliveryMissionView {
  const d = readDeliveryMetadata(task);
  let stage: DeliveryStage = "captured";
  if (task.status === "running") stage = "building";
  else if (task.status === "queued") stage = "queued";
  else if (d?.build) stage = "review";
  else if (task.status === "done") stage = "release_blocked";
  else if (
    d?.error ||
    !d ||
    task.status === "failed" ||
    task.status === "blocked"
  )
    stage = "failed";
  else if (d.lease && Date.parse(d.lease.expiresAt) > now) stage = "preparing";
  else if (d.phase === "awaiting_answers") stage = "needs_clarification";
  else if (d.phase === "ready") stage = "ready_for_review";

  const blockers = [] as DeliveryMissionView["blockers"];
  if (!d)
    blockers.push({
      code: "invalid_mission",
      message: "This saved mission needs repair before it can continue.",
    });
  if (d?.error) blockers.push(d.error);
  if (task.status === "blocked")
    blockers.push({
      code: "paused",
      message:
        "This mission is paused. Continue to prepare a fresh build decision; it will not restart automatically.",
    });
  if (d?.board?.verdict === "HOLD" || d?.board?.verdict === "REJECTED")
    blockers.push({ code: "board_concern", message: d.board.rationale });
  if (d?.projectKey && d.projectKey.toLowerCase() !== "unite-group")
    blockers.push({
      code: "target_unavailable",
      message:
        "This business is captured. Its delivery runner still needs to be connected; the current runner serves Unite-Group.",
    });
  blockers.push({
    code: "delivery_spm_unassigned",
    message:
      "Full delivery ownership through release still needs an SPM assignment. An accepted build assignment covers the branch and review only.",
  });
  if (stage === "queued")
    blockers.push({
      code: "runner_pending",
      message:
        "Waiting for a permitted runner to accept this build. Queueing does not confirm a connected worker.",
    });
  if (stage === "review" || stage === "release_blocked")
    blockers.push({
      code: "live_verification_missing",
      message:
        "Independent review, authorised release and an authenticated live user check are still required.",
    });
  let nextAction: DeliveryMissionView["nextAction"] = {
    kind: "resume",
    owner: "Margot",
    label: "Continue preparation",
  };
  if (stage === "needs_clarification")
    nextAction = {
      kind: "answer",
      owner: "You",
      label: "Answer the business questions",
    };
  else if (stage === "ready_for_review")
    nextAction =
      d?.projectKey?.toLowerCase() === "unite-group"
        ? {
            kind: "approve",
            owner: "You",
            label: "Approve this specification for a branch build",
          }
        : {
            kind: "connect",
            owner: "Delivery operator",
            label: "Connect the project’s build runner",
          };
  else if (stage === "queued" || stage === "building" || stage === "preparing")
    nextAction = {
      kind: "wait",
      owner: stage === "preparing" ? "Margot" : "Build runner",
      label:
        stage === "queued"
          ? "Waiting for build acceptance"
          : "Refresh progress",
    };
  else if (stage === "review" || stage === "release_blocked")
    nextAction = {
      kind: "connect",
      owner: "SPM",
      label: "Arrange independent review and release",
    };
  else if (d?.error?.code === "unsupported_lane")
    nextAction = {
      kind: "connect",
      owner: "SPM",
      label: "Connect the appropriate specialist workflow",
    };
  if (
    d?.error?.code === "approval_signing_unavailable" &&
    d.phase === "ready" &&
    ["proposed", "awaiting_approval"].includes(task.status)
  ) {
    nextAction = {
      kind: "approve",
      owner: "You",
      label: "Retry this specification’s build authorisation",
    };
  }

  const assignment = d?.executionAssignment;
  const validAssignment =
    !!assignment &&
    assignment.specRevision === d?.revision &&
    assignment.specFingerprint === d.specVersion;
  return {
    taskId: task.id,
    title: d?.spec?.title ?? task.title,
    objective: task.objective,
    projectKey: task.project_key,
    status: task.status,
    stage,
    lane: d?.lane ?? "unknown",
    summary: d?.spec?.summary ?? task.objective,
    specVersion: d?.specVersion ?? null,
    spec: d?.spec ?? null,
    questions: d?.questions ?? [],
    answers: d?.answers ?? {},
    harness: d?.harness ?? [],
    owner: { label: "SPM", status: "required" },
    buildOwner: validAssignment
      ? {
          label: assignment.runnerId,
          scope: assignment.scope,
          acceptedAt: assignment.acceptedAt,
        }
      : null,
    nextAction,
    blockers,
    previewUrl: d?.build?.prRef ?? task.preview_url,
    updatedAt: task.updated_at,
    sourceRefs: d?.sourceRefs ?? [],
    knowledgeContext: d?.knowledgeContext,
    receipts: d?.build
      ? [
          {
            kind: "builder_report",
            label:
              "Draft PR reported by build runner; independent verification pending",
            reference: d.build.prRef,
          },
        ]
      : [],
  };
}

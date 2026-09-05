import { z } from "zod";
import type { CommandCentreTask, TaskStatus } from "./tasks";

export const DELIVERY_EXTERNAL_REF_PREFIX = "delivery:";
export const DELIVERY_SCOPE = "branch_preview_only" as const;
/** Labels accepted by the single configured runner; catalogue visibility grants no execution scope. */
export function isCanonicalDeliveryTarget(
  projectKey: string | null | undefined,
): boolean {
  return ["unite-group", "cleanexpo/unite-group"].includes(
    projectKey?.toLowerCase() ?? "",
  );
}
export type DeliveryStage =
  | "captured"
  | "needs_clarification"
  | "preparing"
  | "ready_for_review"
  | "queued"
  | "building"
  | "review"
  | "release_blocked"
  | "failed";
export interface DeliveryPreset {
  id: string;
  version: number;
  label: string;
  description: string;
  requirements: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  availability: "ready_to_reuse" | "needs_connection" | "new_work";
  implementationRef: string;
}
const boundedText = z.string().trim().min(1).max(12000);
const questionSchema = z.object({
  id: z.string().min(1).max(80),
  label: boundedText,
});
const roleSchema = z.object({
  id: z.string().min(1).max(80),
  label: boundedText,
  purpose: boundedText,
  status: z.literal("recommended"),
  assignmentRef: z.null(),
});
const specSchema = z.object({
  title: boundedText,
  summary: boundedText,
  requirements: z.array(boundedText).max(50),
  acceptanceCriteria: z.array(boundedText).min(1).max(50),
  steps: z.array(boundedText).min(1).max(30),
  presetIds: z.array(z.string()).max(20),
});
export const deliveryMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("software_delivery"),
  lane: z.enum(["software", "content", "marketing", "unknown"]),
  revision: z.number().int().positive(),
  inputHash: z.string().length(64),
  projectKey: z.string().max(140).nullable(),
  originalIdea: boundedText,
  presetIds: z.array(z.string()).max(20),
  recipeVersions: z.record(z.string(), z.number().int().positive()),
  answers: z.record(z.string(), z.string().max(4000)),
  questions: z.array(questionSchema).max(4),
  phase: z.enum([
    "captured",
    "clarify",
    "awaiting_answers",
    "plan",
    "board",
    "ready",
    "failed",
  ]),
  spec: specSchema.nullable(),
  specVersion: z.string().length(64).nullable(),
  harness: z.array(roleSchema).max(12),
  sourceRefs: z
    .array(z.object({ reference: z.string(), label: z.string() }))
    .max(30),
  knowledgeContext: z
    .object({
      state: z.enum(["available", "partial", "empty", "unavailable"]),
      observedAt: z.string().datetime(),
      coverage: z.string(),
    })
    .optional(),
  board: z
    .object({
      verdict: z.enum(["APPROVED", "HOLD", "REJECTED"]),
      rationale: z.string(),
      decisionId: z.string(),
    })
    .nullable(),
  lease: z
    .object({
      token: z.string().uuid(),
      phase: z.string(),
      expiresAt: z.string().datetime(),
      revision: z.number().int().positive(),
    })
    .nullable(),
  approval: z
    .object({
      id: z.string(),
      founderId: z.string(),
      specVersion: z.string().length(64),
      revision: z.number().int().positive(),
      scope: z.literal(DELIVERY_SCOPE),
      approvedAt: z.string().datetime(),
      signature: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    })
    .nullable(),
  build: z
    .object({
      status: z.literal("awaiting_review"),
      prRef: z.string(),
      runnerId: z.string(),
      specRevision: z.number().int().positive(),
      specFingerprint: z.string().length(64),
      completedAt: z.string().datetime(),
    })
    .optional(),
  executionAssignment: z
    .object({
      role: z.literal("build_spm"),
      runnerId: z.string(),
      specRevision: z.number().int().positive(),
      specFingerprint: z.string().length(64),
      scope: z.literal(DELIVERY_SCOPE),
      acceptedAt: z.string().datetime(),
    })
    .optional(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  scope: z.literal(DELIVERY_SCOPE),
});
export type DeliveryMetadata = z.infer<typeof deliveryMetadataSchema>;
export type DeliverySpec = z.infer<typeof specSchema>;
export interface DeliveryMissionView {
  taskId: string;
  title: string;
  objective: string;
  projectKey: string | null;
  status: TaskStatus;
  stage: DeliveryStage;
  summary: string;
  lane: "software" | "content" | "marketing" | "unknown";
  specVersion: string | null;
  spec: DeliverySpec | null;
  questions: Array<{ id: string; label: string }>;
  answers: Record<string, string>;
  harness: DeliveryMetadata["harness"];
  owner: { label: "SPM"; status: "required" };
  buildOwner: {
    label: string;
    scope: "branch_preview_only";
    acceptedAt: string;
  } | null;
  nextAction: {
    kind: "answer" | "approve" | "resume" | "wait" | "connect";
    owner: string;
    label: string;
  };
  blockers: Array<{ code: string; message: string }>;
  previewUrl: string | null;
  updatedAt: string;
  receipts: Array<{ kind: string; label: string; reference: string }>;
  sourceRefs: DeliveryMetadata["sourceRefs"];
  knowledgeContext?: DeliveryMetadata["knowledgeContext"];
}

/** The durable external identity also marks damaged envelopes; deleting metadata cannot downgrade one. */
export function isDeliveryMission(
  task: Pick<CommandCentreTask, "external_ref" | "metadata">,
): boolean {
  return (
    task.external_ref?.startsWith(DELIVERY_EXTERNAL_REF_PREFIX) === true ||
    (task.metadata?.delivery as { kind?: unknown } | undefined)?.kind ===
      "software_delivery"
  );
}
export function readDeliveryMetadata(
  task: Pick<CommandCentreTask, "metadata">,
): DeliveryMetadata | null {
  const parsed = deliveryMetadataSchema.safeParse(task.metadata?.delivery);
  return parsed.success ? parsed.data : null;
}

const answersSchema = z.record(
  z.string().min(1).max(80),
  z.string().trim().max(4000),
);
export const deliveryRequestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("prepare"),
      clientRequestId: z.string().uuid(),
      idea: boundedText,
      projectKey: z.string().trim().min(1).max(140).optional(),
      presetIds: z.array(z.string().max(80)).max(20).default([]),
    })
    .strict(),
  z
    .object({
      action: z.literal("resume"),
      taskId: z.string().uuid(),
      answers: answersSchema.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("approve"),
      taskId: z.string().uuid(),
      specVersion: z.string().length(64),
    })
    .strict(),
]);
export type DeliveryRequest = z.infer<typeof deliveryRequestSchema>;

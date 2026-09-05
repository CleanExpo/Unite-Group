import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { listApprovalsForTask } from "./approvals";
import {
  getTaskById,
  type CommandCentreTask,
  type SupabaseLike,
  type TaskStatus,
} from "./tasks";
import {
  DELIVERY_SCOPE,
  readDeliveryMetadata,
  type DeliveryMetadata,
} from "./delivery-types";
import { MISSION_PROVENANCE_SECRET_ENV } from "./voice-mission-bridge";

export class DeliveryConflict extends Error {
  constructor(message = "This mission changed. Reload it before continuing.") {
    super(message);
    this.name = "DeliveryConflict";
  }
}
export class DeliveryNotFound extends Error {
  constructor() {
    super("Mission not found");
    this.name = "DeliveryNotFound";
  }
}
export function hashDeliveryInput(value: unknown): string {
  function canonical(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object")
      return Object.fromEntries(
        Object.entries(input)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => [key, canonical(val)]),
      );
    return input;
  }
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
/** Only material, ordered inputs contribute. Lease, provider error and observation timestamps do not. */
export function deliveryFingerprint(delivery: DeliveryMetadata): string {
  return hashDeliveryInput({
    revision: delivery.revision,
    idea: delivery.originalIdea,
    project: delivery.projectKey,
    lane: delivery.lane,
    recipes: Object.entries(delivery.recipeVersions).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    answers: Object.entries(delivery.answers).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    spec: delivery.spec,
    sourceRefs: delivery.sourceRefs,
    harness: delivery.harness,
    scope: delivery.scope,
    repository: "CleanExpo/Unite-Group",
  });
}

export interface ApprovedDelivery {
  repository: "CleanExpo/Unite-Group";
  revision: number;
  specVersion: string;
  projectKey: string | null;
  scope: typeof DELIVERY_SCOPE;
  spec: NonNullable<DeliveryMetadata["spec"]>;
  harness: DeliveryMetadata["harness"];
  sourceRefs: DeliveryMetadata["sourceRefs"];
  approval: NonNullable<DeliveryMetadata["approval"]>;
}
/** Existing mission provenance key, domain-separated from voice envelopes. No fallback to an unkeyed hash. */
export function signDeliveryApproval(
  task: CommandCentreTask,
  approval: NonNullable<DeliveryMetadata["approval"]>,
): string | null {
  const key = process.env[MISSION_PROVENANCE_SECRET_ENV]?.trim();
  if (!key) return null;
  return createHmac("sha256", key)
    .update("unite-group:delivery-approval:v1:")
    .update(
      hashDeliveryInput({
        taskId: task.id,
        founderId: task.founder_id,
        externalRef: task.external_ref,
        projectKey: task.project_key,
        approvalId: approval.id,
        specVersion: approval.specVersion,
        revision: approval.revision,
        scope: approval.scope,
        approvedAt: approval.approvedAt,
      }),
    )
    .digest("hex");
}
/** Validates a frozen packet; receipt authenticity is checked separately by verifyDeliveryApproval. */
export function getApprovedDelivery(
  task: CommandCentreTask,
): ApprovedDelivery | null {
  const d = readDeliveryMetadata(task);
  if (
    !d ||
    d.projectKey?.toLowerCase() !== "unite-group" ||
    d.lane !== "software" ||
    !d.spec ||
    !d.specVersion ||
    !d.approval ||
    d.phase !== "ready" ||
    d.lease
  )
    return null;
  const a = d.approval;
  const expectedSignature = signDeliveryApproval(task, a);
  if (
    !expectedSignature ||
    !a.signature ||
    !/^[a-f0-9]{64}$/.test(a.signature) ||
    !timingSafeEqual(Buffer.from(a.signature), Buffer.from(expectedSignature))
  )
    return null;
  if (
    d.specVersion !== deliveryFingerprint(d) ||
    a.specVersion !== d.specVersion ||
    a.revision !== d.revision ||
    a.founderId !== task.founder_id ||
    a.scope !== d.scope ||
    d.projectKey !== task.project_key ||
    d.originalIdea !== task.objective
  )
    return null;
  return {
    repository: "CleanExpo/Unite-Group",
    revision: d.revision,
    specVersion: d.specVersion,
    projectKey: d.projectKey,
    scope: d.scope,
    spec: d.spec,
    harness: d.harness,
    sourceRefs: d.sourceRefs,
    approval: a,
  };
}

export async function verifyDeliveryApproval(
  task: CommandCentreTask,
  client?: SupabaseLike,
): Promise<boolean> {
  const packet = getApprovedDelivery(task);
  if (!packet) return false;
  try {
    const latest = (
      await listApprovalsForTask(
        { founderId: task.founder_id, taskId: task.id, limit: 1 },
        client,
      )
    )[0];
    return (
      !!latest &&
      latest.id === packet.approval.id &&
      latest.task_id === task.id &&
      latest.founder_id === task.founder_id &&
      latest.decision === "approve" &&
      latest.approver === "founder" &&
      latest.note === `delivery:${packet.specVersion}:${packet.scope}`
    );
  } catch {
    return false;
  }
}

interface MutationResult {
  data: unknown;
  error: { message: string } | null;
}
interface MutationFilter {
  eq(column: string, value: unknown): MutationFilter;
  select(columns: string): Promise<MutationResult>;
}
export interface DeliveryMutationClient {
  from(table: string): {
    update(values: Record<string, unknown>): MutationFilter;
  };
}
export type DeliveryStoreClient = SupabaseLike & DeliveryMutationClient;

/** Atomic compare-and-swap. No retry against changed state: caller must re-read and reconcile deliberately. */
export async function saveDelivery(
  task: CommandCentreTask,
  delivery: DeliveryMetadata,
  options: {
    status?: TaskStatus;
    expectedLease?: string;
    clearClaim?: boolean;
    client?: DeliveryStoreClient;
  } = {},
): Promise<CommandCentreTask> {
  const old = readDeliveryMetadata(task);
  if (!old)
    throw new DeliveryConflict("The saved mission contract is invalid.");
  if (options.expectedLease && old.lease?.token !== options.expectedLease)
    throw new DeliveryConflict("Preparation ownership changed.");
  const db =
    options.client ??
    ((await createClient()) as unknown as DeliveryStoreClient);
  // Explicit timestamp also protects stores without a timestamp trigger. Greater than prior value.
  const updatedAt = new Date(
    Math.max(Date.now(), Date.parse(task.updated_at) + 1),
  ).toISOString();
  let query = (db as DeliveryMutationClient)
    .from("cc_tasks")
    .update({
      metadata: { ...task.metadata, delivery },
      updated_at: updatedAt,
      project_key: delivery.projectKey,
      ...(options.status ? { status: options.status } : {}),
      ...(options.clearClaim ? { claimed_by: null, claimed_at: null } : {}),
    })
    .eq("founder_id", task.founder_id)
    .eq("id", task.id)
    .eq("status", task.status)
    .eq("updated_at", task.updated_at)
    .eq("metadata->delivery->>revision", String(old.revision));
  if (options.expectedLease)
    query = query.eq(
      "metadata->delivery->lease->>token",
      options.expectedLease,
    );
  const { data, error } = await query.select("*");
  if (error) throw new Error(`Mission persistence failed: ${error.message}`);
  if (!Array.isArray(data) || data.length !== 1) throw new DeliveryConflict();
  const returned = data[0] as CommandCentreTask;
  // Confirm the authoritative write with a separate founder-scoped read.
  const confirmed = await getTaskById(
    { founderId: task.founder_id, taskId: task.id },
    db,
  );
  if (
    !confirmed ||
    confirmed.updated_at !== returned.updated_at ||
    hashDeliveryInput(confirmed.metadata.delivery) !==
      hashDeliveryInput(delivery) ||
    confirmed.status !== returned.status
  ) {
    throw new DeliveryConflict(
      "The saved mission could not be confirmed; reload before continuing.",
    );
  }
  return confirmed;
}

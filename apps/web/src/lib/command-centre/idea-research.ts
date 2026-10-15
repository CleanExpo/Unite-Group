// Pure public-research state on the existing mission, independent of build consent.
import { z } from "zod";
import { canonicalHash } from "./portfolio-control-plane";
import {
  lifecycleSourceSchema,
  lifecycleClaimSchema,
  lifecycleBriefInputSchema,
  type IdeaLifecycle,
} from "./idea-lifecycle";
import { redactVoiceText } from "./voice-mission-bridge";

const id = z.string().trim().min(1).max(100);
const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(4000);
const texts = z.array(text).max(30);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.string().datetime();
const byteSize = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;
const domain = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)
  .refine(
    (value) => !/(?:^|\.)(?:localhost|local|internal)$/.test(value),
    "A public domain is required.",
  );
const safeUrl = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  });
export const RESEARCH_MAX_RESULT_BYTES = 128 * 1024;
export const RESEARCH_MAX_STATE_BYTES = 256 * 1024;
export const RESEARCH_LEASE_MS = 90_000;
export const researchLimitsSchema = z
  .object({
    maximumSources: z.number().int().min(1).max(25),
    timeLimitMinutes: z.number().int().min(1).max(30),
    maxTurns: z.number().int().min(1).max(12),
    concurrency: z.literal(1),
  })
  .strict();
export const researchStartSchema = z
  .object({
    action: z.literal("start"),
    taskId: uuid,
    expectedRevision: z.number().int().positive(),
    requestId: uuid,
    allowedDomains: z.array(domain).min(1).max(20),
    limits: researchLimitsSchema,
  })
  .strict();
export const researchCancelSchema = z
  .object({
    action: z.literal("cancel"),
    taskId: uuid,
    expectedRevision: z.number().int().positive(),
    runId: uuid,
  })
  .strict();
export const researchRetrySchema = researchCancelSchema.extend({
  action: z.literal("retry"),
});
export const researchCheckpointSchema = z
  .object({
    sequence: z.number().int().positive(),
    summary: text,
    nextStep: text,
    sourceIds: z.array(id).max(25),
    toolCalls: z.number().int().min(0).max(100),
    turnsUsed: z.number().int().min(0).max(12),
    usageFinal: z.boolean().optional(),
  })
  .strict();
export const researchToolObservationSchema = z
  .object({
    toolUseId: id,
    tool: z.enum(["WebFetch", "WebSearch"]),
    url: safeUrl.optional(),
    observedAt: timestamp,
    status: z.enum(["success", "error"]),
  })
  .strict();
export const researchResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("untrusted_research_proposal"),
    summary: text,
    sources: z.array(lifecycleSourceSchema).max(25),
    claims: z
      .array(
        lifecycleClaimSchema.extend({
          classification: z.enum(["hypothesis", "assumption"]),
        }),
      )
      .max(100),
    openDecisions: texts,
    options: z
      .array(z.object({ title: text, benefits: texts, risks: texts }).strict())
      .max(10),
    proposedBrief: lifecycleBriefInputSchema.nullable(),
  })
  .strict()
  .refine(
    (value) => byteSize(value) <= RESEARCH_MAX_RESULT_BYTES,
    "Research proposal exceeds 128 KiB; use source references.",
  );
const authoritySchema = z
  .object({
    runId: uuid,
    taskId: uuid,
    founderId: uuid,
    actorId: uuid,
    lifecycleRevision: z.number().int().positive(),
    inputHash: hash,
    mandateHash: hash,
    approvedAt: timestamp,
    expiresAt: timestamp,
    scope: z.literal("public_research_only"),
    limits: researchLimitsSchema,
    allowedDomains: z.array(domain).min(1).max(20),
    paidApiAllowed: z.literal(false),
    subscriptionCredits: z.literal("unknown"),
  })
  .strict();
export const researchRunSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: uuid,
    requestId: uuid,
    taskId: uuid,
    founderId: uuid,
    state: z.enum([
      "queued",
      "running",
      "partial",
      "blocked",
      "completed",
      "cancelled",
    ]),
    authority: authoritySchema,
    authorityHash: hash,
    lease: z
      .object({ token: uuid, runnerId: id, expiresAt: timestamp })
      .strict()
      .nullable(),
    startedAt: timestamp.nullable(),
    deadlineAt: timestamp.nullable(),
    attempts: z.number().int().min(0).max(20),
    turnsReserved: z.number().int().min(0).max(12),
    checkpoint: researchCheckpointSchema.nullable(),
    result: researchResultSchema.nullable(),
    toolObservations: z.array(researchToolObservationSchema).max(100),
    error: z.object({ code: id, message: text }).strict().nullable(),
    history: z
      .array(z.object({ action: id, at: timestamp, actor: id }).strict())
      .max(60),
  })
  .strict()
  .refine(
    (value) => byteSize(value) <= RESEARCH_MAX_STATE_BYTES,
    "Research run exceeds 256 KiB.",
  );
export type ResearchRun = z.infer<typeof researchRunSchema>;
export type ResearchStart = z.infer<typeof researchStartSchema>;
export type ResearchCheckpoint = z.infer<typeof researchCheckpointSchema>;
export type ResearchResult = z.infer<typeof researchResultSchema>;
export type ResearchToolObservation = z.infer<
  typeof researchToolObservationSchema
>;
export interface ResearchContext {
  taskId: string;
  founderId: string;
  actorId: string;
  now: string;
}
export interface ResearchWorkerContext {
  taskId: string;
  founderId: string;
  runnerId: string;
  leaseToken: string;
  now: string;
}
export class ResearchConflict extends Error {}

function clock(now: string): number {
  timestamp.parse(now);
  return Date.parse(now);
}
function ownerContext(run: ResearchRun, context: ResearchContext): void {
  uuid.parse(context.actorId);
  clock(context.now);
  if (
    run.taskId !== context.taskId ||
    run.founderId !== context.founderId ||
    context.actorId !== context.founderId
  )
    throw new ResearchConflict("Research belongs to another owner or mission.");
}
function history(
  run: ResearchRun,
  action: string,
  now: string,
  actor: string,
): ResearchRun {
  run.history = [...run.history, { action, at: now, actor }].slice(-60);
  return researchRunSchema.parse(run);
}
export function researchInputBinding(lifecycle: IdeaLifecycle): {
  lifecycleRevision: number;
  inputHash: string;
  mandateHash: string;
} {
  if (!lifecycle.mandate)
    throw new ResearchConflict("Save a bounded research mandate first.");
  return {
    lifecycleRevision: lifecycle.revision,
    inputHash: canonicalHash({
      title: lifecycle.title,
      rawIdea: lifecycle.rawIdea,
      sources: lifecycle.sources,
      claims: lifecycle.claims,
      openDecisions: lifecycle.openDecisions,
    }),
    mandateHash: canonicalHash(lifecycle.mandate),
  };
}
export function readResearchRun(metadata: unknown): ResearchRun | null {
  if (!metadata || typeof metadata !== "object") return null;
  const parsed = researchRunSchema.safeParse(
    (metadata as Record<string, unknown>).research,
  );
  if (!parsed.success) return null;
  const run = parsed.data;
  if (
    run.authorityHash !== canonicalHash(run.authority) ||
    run.id !== run.authority.runId ||
    run.taskId !== run.authority.taskId ||
    run.founderId !== run.authority.founderId ||
    run.authority.actorId !== run.founderId
  )
    return null;
  if (
    (run.state === "running") !== !!run.lease ||
    (run.state === "completed" && !run.result)
  )
    return null;
  return run;
}
export function createResearchRun(
  lifecycle: IdeaLifecycle,
  input: ResearchStart,
  context: ResearchContext & { runId: string },
): ResearchRun {
  const request = researchStartSchema.parse(input);
  uuid.parse(context.runId);
  uuid.parse(context.founderId);
  clock(context.now);
  if (
    context.actorId !== context.founderId ||
    context.taskId !== request.taskId ||
    request.expectedRevision !== lifecycle.revision
  )
    throw new ResearchConflict(
      "Research approval must match the current owner, mission and revision.",
    );
  const binding = researchInputBinding(lifecycle);
  if (
    request.limits.maximumSources > lifecycle.mandate!.maximumSources ||
    (lifecycle.mandate!.timeLimitMinutes &&
      request.limits.timeLimitMinutes > lifecycle.mandate!.timeLimitMinutes)
  )
    throw new ResearchConflict("Requested research exceeds the saved mandate.");
  const authority = authoritySchema.parse({
    runId: context.runId,
    taskId: context.taskId,
    founderId: context.founderId,
    actorId: context.actorId,
    ...binding,
    approvedAt: context.now,
    expiresAt: new Date(clock(context.now) + 24 * 60 * 60 * 1000).toISOString(),
    scope: "public_research_only",
    limits: request.limits,
    allowedDomains: [...new Set(request.allowedDomains)].sort(),
    paidApiAllowed: false,
    subscriptionCredits: "unknown",
  });
  return researchRunSchema.parse({
    schemaVersion: 1,
    id: context.runId,
    requestId: request.requestId,
    taskId: context.taskId,
    founderId: context.founderId,
    state: "queued",
    authority,
    authorityHash: canonicalHash(authority),
    lease: null,
    startedAt: null,
    deadlineAt: null,
    attempts: 0,
    turnsReserved: 0,
    checkpoint: null,
    result: null,
    toolObservations: [],
    error: null,
    history: [{ action: "requested", at: context.now, actor: context.actorId }],
  });
}
export function researchRequestMatches(
  run: ResearchRun,
  input: ResearchStart,
): boolean {
  const parsed = researchStartSchema.safeParse(input);
  return (
    parsed.success &&
    run.requestId === parsed.data.requestId &&
    run.taskId === parsed.data.taskId &&
    run.authority.lifecycleRevision === parsed.data.expectedRevision &&
    canonicalHash(run.authority.limits) === canonicalHash(parsed.data.limits) &&
    canonicalHash(run.authority.allowedDomains) ===
      canonicalHash([...new Set(parsed.data.allowedDomains)].sort())
  );
}
export function researchAuthorityHolds(
  lifecycle: IdeaLifecycle,
  run: ResearchRun,
  context: { taskId: string; founderId: string; now: string },
): boolean {
  try {
    const parsed = readResearchRun({ research: run });
    if (
      !parsed ||
      run.taskId !== context.taskId ||
      run.founderId !== context.founderId ||
      run.state === "cancelled" ||
      clock(context.now) >= Date.parse(run.authority.expiresAt)
    )
      return false;
    const binding = researchInputBinding(lifecycle);
    return (
      binding.lifecycleRevision === run.authority.lifecycleRevision &&
      binding.inputHash === run.authority.inputHash &&
      binding.mandateHash === run.authority.mandateHash
    );
  } catch {
    return false;
  }
}
function assertAuthority(
  lifecycle: IdeaLifecycle,
  run: ResearchRun,
  context: { taskId: string; founderId: string; now: string },
): void {
  if (!researchAuthorityHolds(lifecycle, run, context))
    throw new ResearchConflict(
      "Research authority expired or its idea/mandate changed. Request fresh research approval.",
    );
  if (run.deadlineAt && clock(context.now) >= Date.parse(run.deadlineAt))
    throw new ResearchConflict(
      "Research time allowance exhausted; the original deadline cannot be extended.",
    );
}
function assertWorker(
  lifecycle: IdeaLifecycle,
  run: ResearchRun,
  context: ResearchWorkerContext,
): void {
  assertAuthority(lifecycle, run, context);
  if (
    run.state !== "running" ||
    !run.lease ||
    run.lease.runnerId !== context.runnerId ||
    run.lease.token !== context.leaseToken ||
    clock(context.now) >= Date.parse(run.lease.expiresAt)
  )
    throw new ResearchConflict(
      "Research lease is absent, expired or belongs to another runner.",
    );
}
function renewedLease(
  run: ResearchRun,
  context: ResearchWorkerContext,
): NonNullable<ResearchRun["lease"]> {
  return {
    token: context.leaseToken,
    runnerId: context.runnerId,
    expiresAt: new Date(
      Math.min(
        clock(context.now) + RESEARCH_LEASE_MS,
        Date.parse(run.deadlineAt!),
        Date.parse(run.authority.expiresAt),
      ),
    ).toISOString(),
  };
}
export function claimResearchRun(
  lifecycle: IdeaLifecycle,
  input: ResearchRun,
  context: ResearchWorkerContext,
): ResearchRun {
  const run = researchRunSchema.parse(input);
  assertAuthority(lifecycle, run, context);
  uuid.parse(context.leaseToken);
  id.parse(context.runnerId);
  if (run.state !== "queued")
    throw new ResearchConflict(
      "Only queued research can be claimed. Recover an interrupted run explicitly.",
    );
  if (
    run.attempts >= 3 ||
    Math.max(run.turnsReserved, run.checkpoint?.turnsUsed ?? 0) >=
      run.authority.limits.maxTurns
  )
    throw new ResearchConflict("Research attempt or turn allowance exhausted.");
  run.startedAt ??= context.now;
  run.deadlineAt ??= new Date(
    clock(run.startedAt) + run.authority.limits.timeLimitMinutes * 60_000,
  ).toISOString();
  run.state = "running";
  if (run.checkpoint) run.checkpoint.usageFinal = false;
  run.attempts++;
  run.error = null;
  run.turnsReserved = run.authority.limits.maxTurns;
  run.lease = renewedLease(run, context);
  return history(run, "claimed", context.now, context.runnerId);
}
export function heartbeatResearchRun(
  lifecycle: IdeaLifecycle,
  input: ResearchRun,
  context: ResearchWorkerContext,
): ResearchRun {
  const run = researchRunSchema.parse(input);
  assertWorker(lifecycle, run, context);
  run.lease = renewedLease(run, context);
  return researchRunSchema.parse(run);
}
export function checkpointResearchRun(
  lifecycle: IdeaLifecycle,
  input: ResearchRun,
  checkpoint: ResearchCheckpoint,
  context: ResearchWorkerContext,
): ResearchRun {
  const run = researchRunSchema.parse(input);
  assertWorker(lifecycle, run, context);
  const next = researchCheckpointSchema.parse(checkpoint);
  next.sourceIds = [
    ...new Set([...(run.checkpoint?.sourceIds ?? []), ...next.sourceIds]),
  ];
  if (
    run.checkpoint?.sequence === next.sequence &&
    canonicalHash(run.checkpoint) === canonicalHash(next)
  )
    return run;
  if (run.checkpoint?.usageFinal)
    throw new ResearchConflict(
      "Final provider usage is already checkpointed for this attempt.",
    );
  if (
    next.sequence !== (run.checkpoint?.sequence ?? 0) + 1 ||
    next.turnsUsed < (run.checkpoint?.turnsUsed ?? 0) ||
    next.toolCalls < (run.checkpoint?.toolCalls ?? 0)
  )
    throw new ResearchConflict(
      "Checkpoint sequence and usage must advance monotonically.",
    );
  const sourceIds = [
    ...new Set([...(run.checkpoint?.sourceIds ?? []), ...next.sourceIds]),
  ];
  if (
    sourceIds.length > run.authority.limits.maximumSources ||
    next.turnsUsed > run.authority.limits.maxTurns
  )
    throw new ResearchConflict(
      "Research source admission or turn allowance exhausted.",
    );
  run.checkpoint = { ...next, sourceIds };
  run.lease = renewedLease(run, context);
  return history(run, "checkpointed", context.now, context.runnerId);
}
function allowedReference(reference: string, domains: string[]): boolean {
  const hostname = new URL(reference).hostname.toLowerCase();
  return domains.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
  );
}
export function completeResearchRun(
  lifecycle: IdeaLifecycle,
  input: ResearchRun,
  result: ResearchResult,
  context: ResearchWorkerContext,
  toolObservations: ResearchToolObservation[] = [],
): ResearchRun {
  const run = researchRunSchema.parse(input);
  assertWorker(lifecycle, run, context);
  if (!run.checkpoint?.usageFinal)
    throw new ResearchConflict(
      "A final usage checkpoint is required before accepting a research result.",
    );
  const proposal = researchResultSchema.parse(result);
  const observations = z
    .array(researchToolObservationSchema)
    .max(100)
    .parse(toolObservations);
  const sourceIds = new Set(proposal.sources.map((source) => source.id));
  if (
    sourceIds.size !== proposal.sources.length ||
    new Set([...sourceIds, ...(run.checkpoint?.sourceIds ?? [])]).size >
      run.authority.limits.maximumSources
  )
    throw new ResearchConflict(
      "Research source admission allowance exhausted or IDs duplicated.",
    );
  for (const source of proposal.sources)
    if (!allowedReference(source.reference, run.authority.allowedDomains))
      throw new ResearchConflict(
        "Proposed source is outside the approved public domains.",
      );
  for (const claim of proposal.claims)
    if (
      [...claim.sourceIds, ...claim.counterEvidenceIds].some(
        (sourceId) => !sourceIds.has(sourceId),
      )
    )
      throw new ResearchConflict(
        "Proposed claims must reference their proposed evidence.",
      );
  if (
    new Set(observations.map((observation) => observation.toolUseId)).size !==
    observations.length
  )
    throw new ResearchConflict("Tool observation IDs must be unique.");
  for (const observation of observations) {
    if (
      observation.url &&
      !allowedReference(observation.url, run.authority.allowedDomains)
    )
      throw new ResearchConflict(
        "Tool observation is outside the approved public domains.",
      );
    if (
      Date.parse(observation.observedAt) < Date.parse(run.startedAt!) ||
      Date.parse(observation.observedAt) > clock(context.now)
    )
      throw new ResearchConflict(
        "Tool observation time is outside the current research run.",
      );
  }
  run.result = proposal;
  run.toolObservations = observations;
  run.state = "completed";
  run.lease = null;
  run.error = null;
  return history(run, "completed_proposal", context.now, context.runnerId);
}
export function blockResearchRun(
  lifecycle: IdeaLifecycle,
  input: ResearchRun,
  reason: { code: string; message: string },
  context: ResearchWorkerContext,
  usageReconciled = false,
): ResearchRun {
  const run = researchRunSchema.parse(input);
  // Cleanup may close the same lease after expiry/staleness. It cannot grant
  // another operation or overwrite a cancellation/new worker's lease.
  if (
    run.taskId !== context.taskId ||
    run.founderId !== context.founderId ||
    run.state !== "running" ||
    run.lease?.runnerId !== context.runnerId ||
    run.lease.token !== context.leaseToken
  )
    throw new ResearchConflict(
      "Only the current research worker can record its interruption.",
    );
  const authorityCurrent = researchAuthorityHolds(lifecycle, run, context);
  run.error = {
    code: id.parse(reason.code),
    message: text.parse(redactVoiceText(reason.message)),
  };
  if (!authorityCurrent)
    run.error = {
      code: "authority_stale",
      message:
        "Research stopped because its approval expired or its idea/mandate changed.",
    };
  if (usageReconciled && !run.checkpoint?.usageFinal)
    throw new ResearchConflict(
      "A final usage checkpoint is required before releasing reserved turns.",
    );
  if (usageReconciled) run.turnsReserved = run.checkpoint!.turnsUsed;
  run.state = run.checkpoint ? "partial" : "blocked";
  run.lease = null;
  return history(run, "blocked", context.now, context.runnerId);
}
export function cancelResearchRun(
  _lifecycle: IdeaLifecycle,
  input: ResearchRun,
  context: ResearchContext,
): ResearchRun {
  const run = researchRunSchema.parse(input);
  ownerContext(run, context);
  if (run.state === "cancelled") return run;
  if (run.state === "completed")
    throw new ResearchConflict(
      "Completed proposals are retained; start a new research request instead.",
    );
  run.state = "cancelled";
  run.lease = null;
  run.error = null;
  return history(run, "cancelled", context.now, context.actorId);
}
export function recoverResearchRun(
  lifecycle: IdeaLifecycle,
  input: ResearchRun,
  context: ResearchContext,
): ResearchRun {
  const run = researchRunSchema.parse(input);
  ownerContext(run, context);
  assertAuthority(lifecycle, run, context);
  if (run.state === "queued") return run;
  if (["completed", "cancelled"].includes(run.state))
    throw new ResearchConflict(
      "Finished or cancelled research requires a new request.",
    );
  if (run.lease && clock(context.now) < Date.parse(run.lease.expiresAt))
    throw new ResearchConflict("Research still has an active worker lease.");
  // The worker may stop after its final usage checkpoint was confirmed but
  // before its terminal write. That durable acknowledgement is sufficient to
  // reconcile this attempt; a partial checkpoint never releases its reserve.
  if (run.checkpoint?.usageFinal) run.turnsReserved = run.checkpoint.turnsUsed;
  if (run.turnsReserved > (run.checkpoint?.turnsUsed ?? 0)) {
    run.state = "blocked";
    run.lease = null;
    run.error = {
      code: "usage_unknown",
      message:
        "Interrupted provider turn usage is unknown. Request new bounded research authority; the old allowance cannot be replenished.",
    };
    return history(run, "usage_unknown", context.now, context.actorId);
  }
  run.state = "queued";
  run.lease = null;
  run.error = null;
  return history(run, "recovered", context.now, context.actorId);
}
export function researchSourceProvenance(
  run: ResearchRun,
  sourceId: string,
): "tool_observed" | "discovered" | "unverified" {
  const source = run.result?.sources.find(
    (candidate) => candidate.id === sourceId,
  );
  if (!source) return "unverified";
  const observations = run.toolObservations.filter(
    (observation) =>
      observation.status === "success" && observation.url === source.reference,
  );
  return observations.some((observation) => observation.tool === "WebFetch")
    ? "tool_observed"
    : observations.length
      ? "discovered"
      : "unverified";
}

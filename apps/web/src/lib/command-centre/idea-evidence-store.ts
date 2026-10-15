import { createHash } from "node:crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import {
  canonicalArtifactJson,
  canonicalEvidenceJson,
  hashIdeaEvidence,
  ideaEvidenceEnvelopeSchema,
  ideaEvidenceGrantSchema,
  ideaEvidenceSourceRegistrationSchema,
  verifyExternalIdeaEvidence,
  type IdeaEvidenceEnvelope,
  type IdeaEvidenceGrant,
  type IdeaEvidenceSourceRegistration,
} from "./idea-evidence-contracts";
import type { CommandCentreTask } from "./tasks";

type DbError = { code?: string };
type Result = { data: unknown; error: DbError | null };
interface Query extends PromiseLike<Result> {
  select(columns: string): Query;
  eq(column: string, value: unknown): Query;
  limit(count: number): Query;
  order(column: string, options: { ascending: boolean }): Query;
  maybeSingle(): PromiseLike<Result>;
}
export interface IdeaEvidenceClient {
  from(table: string): Query;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<Result>;
}
type Options = { client?: IdeaEvidenceClient };
export class IdeaEvidenceError extends Error {
  constructor(
    public readonly kind:
      "invalid" | "unauthorized" | "conflict" | "unavailable",
  ) {
    super(`Idea evidence ${kind}`);
  }
}
const registrationRow = z
  .object({
    registration: z.unknown(),
    canonical_registration: z.string(),
    registration_hash: z.string().regex(/^[a-f0-9]{64}$/),
    revoked_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const eventRow = z.object({
  id: z.string().uuid(),
  source_id: z.string(),
  source_version: z.number().int(),
  event_id: z.string(),
  grant_id: z.string().uuid(),
  grant_version: z.number().int(),
  founder_id: z.string().uuid(),
  task_id: z.string().uuid(),
  record_kind: z.enum(["evidence", "withdrawal"]),
  withdrawal_of: z.string().uuid().nullable(),
  envelope: z.unknown(),
  canonical_envelope: z.string(),
  payload_hash: z.string(),
  signature: z.string().nullable(),
  occurred_at: z.string().datetime({ offset: true }),
  admitted_at: z.string().datetime({ offset: true }),
});
export type StoredIdeaEvidence = z.infer<typeof eventRow>;
function db(options: Options): IdeaEvidenceClient {
  return (
    options.client ?? (createServiceClient() as unknown as IdeaEvidenceClient)
  );
}
function fail(error: DbError): never {
  if (error.code === "23505" || error.code === "40001")
    throw new IdeaEvidenceError("conflict");
  if (error.code === "22023") throw new IdeaEvidenceError("invalid");
  if (error.code === "P0002") throw new IdeaEvidenceError("unauthorized");
  throw new IdeaEvidenceError("unavailable");
}
async function result(operation: PromiseLike<Result>): Promise<unknown> {
  const value = await operation;
  if (value.error) fail(value.error);
  if (value.data === null || value.data === undefined)
    throw new IdeaEvidenceError("unavailable");
  return value.data;
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new IdeaEvidenceError("invalid");
  return parsed.data;
}
async function registration(
  client: IdeaEvidenceClient,
  table: string,
  key: string,
  id: string,
  version: number,
) {
  const response = await client
    .from(table)
    .select("*")
    .eq(key, id)
    .eq("version", version)
    .limit(1)
    .maybeSingle();
  if (response.error) fail(response.error);
  if (!response.data) throw new IdeaEvidenceError("unauthorized");
  const row = parse(registrationRow, response.data);
  if (
    row[key] !== id ||
    row.version !== version ||
    canonicalEvidenceJson(row.registration) !== row.canonical_registration ||
    hashIdeaEvidence(row.registration) !== row.registration_hash
  ) {
    throw new IdeaEvidenceError("unavailable");
  }
  return row;
}
async function enroll(
  registration: IdeaEvidenceSourceRegistration | IdeaEvidenceGrant,
  kind: "source" | "grant",
  options: Options,
) {
  const client = db(options);
  const canonical = canonicalEvidenceJson(registration);
  const returned = await result(
    client.rpc(`cc_idea_evidence_enroll_${kind}_v1`, {
      p_registration: registration,
      p_canonical: canonical,
    }),
  );
  const key = kind === "source" ? "source_id" : "grant_id";
  const id =
    kind === "source"
      ? (registration as IdeaEvidenceSourceRegistration).source_id
      : (registration as IdeaEvidenceGrant).grant_id;
  const confirmed = await registrationReadback(
    client,
    kind,
    key,
    id,
    registration.version,
  );
  if (
    canonicalEvidenceJson(returned) !== canonicalEvidenceJson(confirmed) ||
    confirmed.canonical_registration !== canonical
  )
    throw new IdeaEvidenceError("unavailable");
  return confirmed;
}
const registrationReadback = (
  client: IdeaEvidenceClient,
  kind: "source" | "grant",
  key: string,
  id: string,
  version: number,
) => registration(client, `cc_idea_evidence_${kind}s`, key, id, version);

/** Service-owned operational entry points. There is deliberately no enrollment HTTP route. */
export function enrollIdeaEvidenceSource(
  input: unknown,
  options: Options = {},
) {
  return enroll(
    parse(ideaEvidenceSourceRegistrationSchema, input),
    "source",
    options,
  );
}
export function enrollIdeaEvidenceGrant(input: unknown, options: Options = {}) {
  return enroll(parse(ideaEvidenceGrantSchema, input), "grant", options);
}
async function revoke(
  kind: "source" | "grant",
  id: string,
  version: number,
  reason: string,
  options: Options,
) {
  parse(
    z.object({
      id: z.string().min(1).max(200),
      version: z.number().int().positive(),
      reason: z.string().min(1).max(2000),
    }),
    { id, version, reason },
  );
  const client = db(options);
  const key = kind === "source" ? "source_id" : "grant_id";
  const returned = await result(
    client.rpc(`cc_idea_evidence_revoke_${kind}_v1`, {
      [`p_${key}`]: id,
      [`p_${kind}_version`]: version,
      p_reason: reason,
    }),
  );
  const confirmed = await registrationReadback(client, kind, key, id, version);
  if (
    !confirmed.revoked_at ||
    canonicalEvidenceJson(returned) !== canonicalEvidenceJson(confirmed)
  )
    throw new IdeaEvidenceError("unavailable");
  return confirmed;
}
export const revokeIdeaEvidenceSource = (
  id: string,
  version: number,
  reason: string,
  options: Options = {},
) => revoke("source", id, version, reason, options);
export const revokeIdeaEvidenceGrant = (
  id: string,
  version: number,
  reason: string,
  options: Options = {},
) => revoke("grant", id, version, reason, options);

async function authority(
  client: IdeaEvidenceClient,
  envelope: IdeaEvidenceEnvelope,
) {
  const source = await getIdeaEvidenceSource(
    envelope.source_id,
    envelope.source_version,
    { client },
  );
  const grant = await getIdeaEvidenceGrant(
    envelope.grant_id,
    envelope.grant_version,
    { client },
  );
  return { source, grant, grantValue: grant.registration };
}

/** Revoked registrations remain readable so exact historical retries retain their original authority. */
export async function getIdeaEvidenceSource(
  id: string,
  version: number,
  options: Options = {},
) {
  const row = await registration(
    db(options),
    "cc_idea_evidence_sources",
    "source_id",
    id,
    version,
  );
  const value = parse(ideaEvidenceSourceRegistrationSchema, row.registration);
  if (value.source_id !== id || value.version !== version)
    throw new IdeaEvidenceError("unavailable");
  return { ...row, registration: value };
}
export async function getIdeaEvidenceGrant(
  id: string,
  version: number,
  options: Options = {},
) {
  const grant = await registration(
    db(options),
    "cc_idea_evidence_grants",
    "grant_id",
    id,
    version,
  );
  const grantValue = parse(ideaEvidenceGrantSchema, grant.registration);
  if (
    grantValue.grant_id !== id ||
    grantValue.version !== version ||
    grant.founder_id !== grantValue.founder_id ||
    grant.task_id !== grantValue.task_id ||
    grant.source_id !== grantValue.source_id ||
    grant.source_version !== grantValue.source_version
  )
    throw new IdeaEvidenceError("unavailable");
  return { ...grant, registration: grantValue };
}
async function confirmEvent(
  client: IdeaEvidenceClient,
  returned: unknown,
  envelope: IdeaEvidenceEnvelope,
  signature: string | null,
) {
  const row = parse(eventRow, returned);
  const confirmed = parse(
    eventRow,
    await result(
      client
        .from("cc_idea_evidence_events")
        .select("*")
        .eq("id", row.id)
        .eq("founder_id", envelope.founder_id)
        .eq("task_id", envelope.task_id)
        .limit(1)
        .maybeSingle(),
    ),
  );
  if (
    canonicalEvidenceJson(row) !== canonicalEvidenceJson(confirmed) ||
    row.record_kind !== "evidence" ||
    row.withdrawal_of !== null ||
    row.canonical_envelope !== canonicalEvidenceJson(envelope) ||
    canonicalEvidenceJson(row.envelope) !== row.canonical_envelope ||
    row.payload_hash !== hashIdeaEvidence(envelope) ||
    row.signature !== signature ||
    row.source_id !== envelope.source_id ||
    row.source_version !== envelope.source_version ||
    row.grant_id !== envelope.grant_id ||
    row.grant_version !== envelope.grant_version ||
    row.event_id !== envelope.event_id ||
    row.founder_id !== envelope.founder_id ||
    row.task_id !== envelope.task_id ||
    Date.parse(row.occurred_at) !== Date.parse(envelope.occurred_at)
  ) {
    throw new IdeaEvidenceError("unavailable");
  }
  return confirmed;
}
export async function admitExternalIdeaEvidence(
  input: { envelope: unknown; signature: string },
  options: Options = {},
) {
  const envelope = parse(ideaEvidenceEnvelopeSchema, input.envelope);
  const client = db(options);
  const enrolled = await authority(client, envelope);
  try {
    verifyExternalIdeaEvidence({
      ...input,
      source: enrolled.source,
      grant: enrolled.grant,
      expected: {
        founder_id: enrolled.grantValue.founder_id,
        task_id: enrolled.grantValue.task_id,
      },
    });
  } catch {
    throw new IdeaEvidenceError("unauthorized");
  }
  const returned = await result(
    client.rpc("cc_idea_evidence_admit_v1", {
      p_envelope: envelope,
      p_canonical: canonicalEvidenceJson(envelope),
      p_signature: input.signature,
      p_verified_source_hash: enrolled.source.registration_hash,
      p_verified_grant_hash: enrolled.grant.registration_hash,
    }),
  );
  return confirmEvent(client, returned, envelope, input.signature);
}

/** Includes withdrawal history. Consumers must use active rather than projecting quarantined evidence. */
export async function listTaskIdeaEvidence(
  founderId: string,
  taskId: string,
  options: Options = {},
) {
  parse(z.object({ founderId: z.string().uuid(), taskId: z.string().uuid() }), {
    founderId,
    taskId,
  });
  const rows = parse(
    z.array(eventRow).max(500),
    await result(
      db(options)
        .from("cc_idea_evidence_events")
        .select("*")
        .eq("founder_id", founderId)
        .eq("task_id", taskId)
        .order("admitted_at", { ascending: true })
        .limit(501),
    ),
  );
  if (
    rows.some((row) => row.founder_id !== founderId || row.task_id !== taskId)
  )
    throw new IdeaEvidenceError("unavailable");
  for (const row of rows) {
    let document: unknown;
    try {
      document = JSON.parse(row.canonical_envelope);
    } catch {
      throw new IdeaEvidenceError("unavailable");
    }
    if (
      canonicalEvidenceJson(document) !== canonicalEvidenceJson(row.envelope) ||
      createHash("sha256")
        .update(row.canonical_envelope, "utf8")
        .digest("hex") !== row.payload_hash
    )
      throw new IdeaEvidenceError("unavailable");
    if (row.record_kind === "evidence") {
      const envelope = parse(ideaEvidenceEnvelopeSchema, row.envelope);
      if (
        row.canonical_envelope !== canonicalEvidenceJson(envelope) ||
        row.withdrawal_of !== null ||
        row.source_id !== envelope.source_id ||
        row.source_version !== envelope.source_version ||
        row.grant_id !== envelope.grant_id ||
        row.grant_version !== envelope.grant_version ||
        row.event_id !== envelope.event_id ||
        envelope.founder_id !== founderId ||
        envelope.task_id !== taskId
      )
        throw new IdeaEvidenceError("unavailable");
    } else {
      const withdrawal = parse(
        z
          .object({
            withdrawal_of: z.string().uuid(),
            reason: z.string().min(1),
          })
          .strict(),
        row.envelope,
      );
      const target = rows.find(
        (item) =>
          item.id === withdrawal.withdrawal_of &&
          item.record_kind === "evidence",
      );
      if (
        !target ||
        row.withdrawal_of !== target.id ||
        row.source_id !== target.source_id ||
        row.grant_id !== target.grant_id ||
        row.grant_version !== target.grant_version ||
        row.source_version !== target.source_version
      )
        throw new IdeaEvidenceError("unavailable");
    }
  }
  const withdrawn = new Set(
    rows
      .filter((row) => row.record_kind === "withdrawal")
      .map((row) => row.withdrawal_of),
  );
  return {
    history: rows,
    active: rows.filter(
      (row) => row.record_kind === "evidence" && !withdrawn.has(row.id),
    ),
  };
}
export async function withdrawIdeaEvidence(
  eventId: string,
  withdrawalId: string,
  reason: string,
  options: Options = {},
) {
  parse(
    z.object({
      eventId: z.string().uuid(),
      withdrawalId: z.string().min(1).max(200),
      reason: z.string().min(1).max(2000),
    }),
    { eventId, withdrawalId, reason },
  );
  const client = db(options);
  const row = parse(
    eventRow,
    await result(
      client.rpc("cc_idea_evidence_withdraw_v1", {
        p_event_id: eventId,
        p_withdrawal_id: withdrawalId,
        p_reason: reason,
      }),
    ),
  );
  const confirmed = parse(
    eventRow,
    await result(
      client
        .from("cc_idea_evidence_events")
        .select("*")
        .eq("id", row.id)
        .limit(1)
        .maybeSingle(),
    ),
  );
  let canonicalDocument: unknown;
  try {
    canonicalDocument = JSON.parse(row.canonical_envelope);
  } catch {
    throw new IdeaEvidenceError("unavailable");
  }
  if (
    row.record_kind !== "withdrawal" ||
    row.withdrawal_of !== eventId ||
    row.event_id !== withdrawalId ||
    canonicalEvidenceJson(row.envelope) !==
      canonicalEvidenceJson({ withdrawal_of: eventId, reason }) ||
    canonicalEvidenceJson(canonicalDocument) !==
      canonicalEvidenceJson(row.envelope) ||
    createHash("sha256")
      .update(row.canonical_envelope, "utf8")
      .digest("hex") !== row.payload_hash ||
    canonicalEvidenceJson(row) !== canonicalEvidenceJson(confirmed)
  )
    throw new IdeaEvidenceError("unavailable");
  return confirmed;
}
export async function persistReviewedHandoff(
  input: {
    envelope: unknown;
    expectedMetadata: Record<string, unknown>;
    expectedUpdatedAt: string;
    expectedRevision: number;
    nextLifecycle: Record<string, unknown>;
    handoff: unknown;
  },
  options: Options = {},
): Promise<{ event: StoredIdeaEvidence; task: CommandCentreTask }> {
  const envelope = parse(ideaEvidenceEnvelopeSchema, input.envelope);
  if (envelope.event_kind !== "reviewed_handoff_persisted")
    throw new IdeaEvidenceError("invalid");
  const client = db(options);
  const enrolled = await authority(client, envelope);
  const source = parse(
    ideaEvidenceSourceRegistrationSchema,
    enrolled.source.registration,
  );
  const grant = enrolled.grantValue;
  const scope = [
    "founder_id",
    "task_id",
    "lifecycle_revision",
    "brief_hash",
    "outcome_hash",
    "repository",
    "product_id",
    "release_id",
    "environment",
    "subject",
    "event_name",
    "contract_hash",
  ] as const;
  if (
    source.kind !== "builtin_factory" ||
    source.event_kind !== envelope.event_kind ||
    source.source_id !== envelope.source_id ||
    source.version !== envelope.source_version ||
    grant.source_id !== source.source_id ||
    grant.source_version !== source.version ||
    grant.grant_id !== envelope.grant_id ||
    grant.version !== envelope.grant_version ||
    source.repository !== envelope.repository ||
    source.product_id !== envelope.product_id ||
    source.environment !== envelope.environment ||
    scope.some(
      (key) =>
        canonicalEvidenceJson(envelope[key]) !==
        canonicalEvidenceJson(grant[key]),
    )
  )
    throw new IdeaEvidenceError("unauthorized");
  const metadata = {
    ...input.expectedMetadata,
    lifecycle: input.nextLifecycle,
  };
  const returned = parse(
    z.object({
      event: z.unknown(),
      task: z
        .object({
          id: z.string(),
          founder_id: z.string(),
          metadata: z.record(z.string(), z.unknown()),
        })
        .passthrough(),
    }),
    await result(
      client.rpc("cc_idea_evidence_persist_handoff_v1", {
        p_envelope: envelope,
        p_canonical: canonicalEvidenceJson(envelope),
        p_verified_source_hash: enrolled.source.registration_hash,
        p_verified_grant_hash: enrolled.grant.registration_hash,
        p_expected_metadata: input.expectedMetadata,
        p_expected_updated_at: input.expectedUpdatedAt,
        p_expected_revision: input.expectedRevision,
        p_next_lifecycle: input.nextLifecycle,
        p_handoff_canonical: canonicalArtifactJson(input.handoff),
        p_next_metadata_canonical: canonicalArtifactJson(metadata),
      }),
    ),
  );
  const event = await confirmEvent(client, returned.event, envelope, null);
  const taskReadback = await result(
    client
      .from("cc_tasks")
      .select("*")
      .eq("id", envelope.task_id)
      .eq("founder_id", envelope.founder_id)
      .limit(1)
      .maybeSingle(),
  );
  // Exact historical retries return current task state while preserving the old event.
  // SQL alone owns the atomic next-metadata CAS; the readback confirms its returned truth.
  if (
    returned.task.id !== envelope.task_id ||
    returned.task.founder_id !== envelope.founder_id ||
    canonicalArtifactJson(returned.task) !== canonicalArtifactJson(taskReadback)
  )
    throw new IdeaEvidenceError("unavailable");
  return { event, task: returned.task as unknown as CommandCentreTask };
}

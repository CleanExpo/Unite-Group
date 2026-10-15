import {
  canonicalEvidenceJson,
  hashIdeaEvidence,
  ideaEvidenceEnvelopeSchema,
  verifyExternalIdeaEvidence,
  type IdeaEvidenceGrantRow,
  type IdeaEvidenceSourceRow,
  type IdeaEvidenceAcceptanceTask,
} from "./idea-evidence-contracts";
import {
  getIdeaEvidenceGrant,
  getIdeaEvidenceSource,
  listTaskIdeaEvidence,
  type StoredIdeaEvidence,
} from "./idea-evidence-store";
import {
  ideaLifecycleApprovalHolds,
  readIdeaLifecycle,
  type CommercialOutcome,
  type LifecycleObservations,
} from "./idea-lifecycle";
import { canonicalHash } from "./portfolio-control-plane";
import { registeredPullRequest } from "./delivery-observations";
import { readDeliveryMetadata } from "./delivery-types";
import type { CommandCentreProject } from "./registry";
import {
  getTaskById,
  type CommandCentreTask,
  type SupabaseLike,
} from "./tasks";
import { createServiceClient } from "@/lib/supabase/service";

export interface EnrolledIdeaEvidence {
  record: StoredIdeaEvidence;
  source: IdeaEvidenceSourceRow;
  grant: IdeaEvidenceGrantRow;
}
export interface EnrolledObservationDeps {
  /** Unit-test seam only. Production always uses service-owned enrollment reads. */
  loadEvidence?: (
    founderId: string,
    taskId: string,
  ) => Promise<EnrolledIdeaEvidence[]>;
  /** Unit-test seam only. Production reads the current founder-scoped task using a service client. */
  loadAcceptanceTask?: (
    founderId: string,
    taskId: string,
  ) => Promise<CommandCentreTask | null>;
}

function acceptanceTaskHolds(
  current: CommandCentreTask | null | undefined,
  binding: IdeaEvidenceAcceptanceTask,
  primary: CommandCentreTask,
  repository: string,
): boolean {
  if (
    !current ||
    current.id !== binding.task_id ||
    current.id === primary.id ||
    current.founder_id !== primary.founder_id ||
    (current.project_key !== null &&
      current.project_key !== primary.project_key)
  )
    return false;
  const lifecycle = readIdeaLifecycle(current.metadata);
  return !!(
    lifecycle &&
    ideaLifecycleApprovalHolds(lifecycle) &&
    lifecycle.approval?.actorId === primary.founder_id &&
    lifecycle.revision === binding.lifecycle_revision &&
    lifecycle.brief?.hash === binding.brief_hash &&
    lifecycle.outcome === null &&
    binding.outcome_hash === null &&
    lifecycle.brief.snapshot.brief.target.repository === repository &&
    lifecycle.brief.snapshot.brief.target.baseBranch === "main"
  );
}

async function loadEvidence(founderId: string, taskId: string) {
  const { active } = await listTaskIdeaEvidence(founderId, taskId);
  const external = active.filter(
    (record) =>
      ideaEvidenceEnvelopeSchema.parse(record.envelope).event_kind !==
      "reviewed_handoff_persisted",
  );
  const sources = new Map<string, ReturnType<typeof getIdeaEvidenceSource>>();
  const grants = new Map<string, ReturnType<typeof getIdeaEvidenceGrant>>();
  return Promise.all(
    external.map(async (record) => {
      const sourceKey = `${record.source_id}:${record.source_version}`;
      const grantKey = `${record.grant_id}:${record.grant_version}`;
      if (!sources.has(sourceKey))
        sources.set(
          sourceKey,
          getIdeaEvidenceSource(record.source_id, record.source_version),
        );
      if (!grants.has(grantKey))
        grants.set(
          grantKey,
          getIdeaEvidenceGrant(record.grant_id, record.grant_version),
        );
      const [source, grant] = await Promise.all([
        sources.get(sourceKey)!,
        grants.get(grantKey)!,
      ]);
      return { record, source, grant };
    }),
  );
}

/** Adds only independently enrolled service observations; it never changes GitHub CI/merge facts. */
export async function projectEnrolledIdeaEvidence(
  task: CommandCentreTask,
  project: CommandCentreProject | undefined,
  outcome: CommercialOutcome | null,
  observations: LifecycleObservations,
  deps: EnrolledObservationDeps = {},
): Promise<void> {
  if (process.env.IDEA_EVIDENCE_ENABLED !== "1") return;
  const lifecycle = readIdeaLifecycle(task.metadata);
  const target = lifecycle?.brief?.snapshot.brief.target;
  if (
    !lifecycle ||
    !ideaLifecycleApprovalHolds(lifecycle) ||
    lifecycle.approval?.actorId !== task.founder_id ||
    !target ||
    task.project_key !== project?.name ||
    !project?.github_repo ||
    project.github_repo !== target.repository ||
    canonicalHash(outcome) !== canonicalHash(lifecycle.outcome)
  )
    return;
  const now = Date.parse(observations.observedAt);
  if (!Number.isFinite(now)) return;
  observations.release = undefined;
  observations.activations = [];
  if (observations.engineering) observations.engineering.reviewApproved = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let readsActive = true;
  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        readsActive = false;
        reject(new Error("Evidence read deadline"));
      }, 8_000);
    });
    const records = await Promise.race([
      (process.env.NODE_ENV === "test" && deps.loadEvidence
        ? deps.loadEvidence
        : loadEvidence)(task.founder_id, task.id),
      deadline,
    ]);
    // Preserve the authoritative store's bound even when using test fixtures.
    if (records.length > 500) throw new Error("Evidence read limit");
    const accepted = records
      .map(({ record, source, grant }) => {
        if (
          ideaEvidenceEnvelopeSchema.parse(record.envelope).event_kind ===
          "reviewed_handoff_persisted"
        )
          return null;
        // Withdrawals are excluded by the authoritative loader; reject them even in a test seam.
        if (
          record.record_kind !== "evidence" ||
          record.withdrawal_of !== null ||
          !record.signature
        )
          return null;
        const verified = verifyExternalIdeaEvidence({
          envelope: record.envelope,
          signature: record.signature,
          source,
          grant,
          expected: { founder_id: task.founder_id, task_id: task.id },
        });
        const event = verified.envelope;
        const occurred = Date.parse(event.occurred_at);
        const admitted = Date.parse(record.admitted_at);
        if (
          record.payload_hash !== hashIdeaEvidence(event) ||
          record.canonical_envelope !== canonicalEvidenceJson(event) ||
          record.founder_id !== task.founder_id ||
          record.task_id !== task.id ||
          record.source_id !== event.source_id ||
          record.source_version !== event.source_version ||
          record.grant_id !== event.grant_id ||
          record.grant_version !== event.grant_version ||
          record.event_id !== event.event_id ||
          Date.parse(record.occurred_at) !== occurred ||
          !Number.isFinite(admitted) ||
          occurred > admitted ||
          admitted > now ||
          occurred < Date.parse(verified.grant.valid_from) ||
          occurred > Date.parse(verified.grant.valid_until) ||
          event.lifecycle_revision !== lifecycle.revision ||
          event.brief_hash !== lifecycle.brief!.hash ||
          event.outcome_hash !== observations.outcomeHash ||
          canonicalHash(JSON.parse(verified.grant.outcome_canonical)) !==
            canonicalHash(outcome) ||
          event.repository !== target.repository ||
          (outcome && event.product_id !== outcome.productId)
        )
          return null;
        return { ...verified, occurred };
      })
      .filter((value) => value !== null);
    const acceptanceIds = [
      ...new Set(
        accepted.flatMap(({ envelope }) =>
          envelope.event_kind === "production_journey_verified" &&
          envelope.payload.acceptance_task
            ? [envelope.payload.acceptance_task.task_id]
            : [],
        ),
      ),
    ];
    const acceptanceTasks = new Map<string, CommandCentreTask | null>();
    let nextAcceptance = 0;
    let serviceClient: SupabaseLike | undefined;
    const readAcceptance =
      process.env.NODE_ENV === "test" && deps.loadAcceptanceTask
        ? deps.loadAcceptanceTask
        : (founderId: string, taskId: string) => {
            // getTaskById defaults to a session client; this authoritative read must not.
            serviceClient ??= createServiceClient() as unknown as SupabaseLike;
            return getTaskById({ founderId, taskId }, serviceClient);
          };
    await Promise.race([
      Promise.all(
        Array.from({ length: Math.min(4, acceptanceIds.length) }, async () => {
          while (readsActive && nextAcceptance < acceptanceIds.length) {
            const id = acceptanceIds[nextAcceptance++];
            const current = await readAcceptance(task.founder_id, id);
            // A late read cannot start queued work or mutate projected observations.
            if (!readsActive) return;
            acceptanceTasks.set(id, current);
          }
        }),
      ),
      deadline,
    ]);
    const engineering =
      observations.sources.github === "connected"
        ? observations.engineering
        : undefined;
    const pr = registeredPullRequest(
      readDeliveryMetadata(task)?.build?.prRef ?? "",
      project.github_repo,
    );
    for (const { envelope: event, source } of accepted) {
      if (
        event.event_kind !== "independent_review_verified" ||
        !engineering ||
        !pr
      )
        continue;
      const payload = event.payload;
      const policy = source.review_policy;
      if (
        engineering.repository === target.repository &&
        engineering.baseBranch === "main" &&
        engineering.prUrl === pr.reference &&
        payload.pull_request === pr.number &&
        payload.head_sha === engineering.headSha &&
        event.release_id === engineering.headSha &&
        policy &&
        payload.verifier_digest === policy.verifier_digest &&
        payload.collector_policy_digest === policy.collector_policy_digest &&
        payload.reviewer.vendor.toLowerCase() !==
          policy.implementer_vendor.toLowerCase()
      ) {
        engineering.reviewApproved = true;
      }
    }
    const identity = project.production_deployment;
    let origin: string | null = null;
    if (project.production_url) {
      const url = new URL(project.production_url);
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        !url.search &&
        !url.hash &&
        url.pathname === "/"
      )
        origin = url.origin;
    }
    const journeys = accepted
      .filter(
        ({ envelope: event, occurred }) =>
          event.event_kind === "production_journey_verified" &&
          (!event.payload.acceptance_task ||
            acceptanceTaskHolds(
              acceptanceTasks.get(event.payload.acceptance_task.task_id),
              event.payload.acceptance_task,
              task,
              target.repository,
            )) &&
          engineering?.merged &&
          engineering.repository === target.repository &&
          pr?.reference === engineering.prUrl &&
          engineering.baseBranch === "main" &&
          engineering.mergeSha &&
          identity?.projectId &&
          identity.teamId &&
          origin &&
          event.environment === "production" &&
          event.payload.canonical_origin === origin &&
          event.payload.provider_project_id === identity.projectId &&
          event.payload.provider_team_id === identity.teamId &&
          event.payload.merge_sha === engineering.mergeSha &&
          event.payload.deployment_id === event.release_id &&
          event.subject.namespace === "founder" &&
          event.subject.id === task.founder_id &&
          event.payload.authenticated_subject.namespace === "founder" &&
          event.payload.authenticated_subject.id === task.founder_id &&
          Date.parse(event.payload.alias_end.observed_at) <= occurred &&
          now - Date.parse(event.payload.alias_start.observed_at) >= 0 &&
          now - Date.parse(event.payload.alias_start.observed_at) <=
            15 * 60_000 &&
          now - occurred >= 0 &&
          now - occurred <= 15 * 60_000,
      )
      .sort((a, b) => b.occurred - a.occurred);
    const journey = journeys[0];
    if (journey?.envelope.event_kind === "production_journey_verified") {
      const event = journey.envelope;
      observations.release = {
        repository: event.repository,
        commitSha: event.payload.merge_sha,
        releaseId: event.release_id,
        url: event.payload.canonical_origin,
        live: true,
        journeyPassed: true,
      };
      observations.sources.deployment = "connected";
      // Refreshing provider facts cannot renew the signed journey's original freshness.
      observations.observedAt = new Date(
        Math.min(
          now,
          journey.occurred,
          Date.parse(event.payload.alias_end.observed_at),
        ),
      ).toISOString();
    }
    for (const { envelope: event, grant, occurred } of accepted) {
      if (
        event.event_kind !== "customer_value_achieved" ||
        !outcome ||
        !observations.release ||
        event.release_id !== observations.release.releaseId ||
        event.environment !== "production" ||
        event.subject.namespace !== "stripe_customer" ||
        event.event_name !== outcome.activationEvent ||
        event.payload.action_name !== outcome.activationEvent ||
        event.payload.stripe_binding.account_id !== outcome.stripeAccountId ||
        event.payload.stripe_binding.product_id !== outcome.productId ||
        event.payload.stripe_binding.customer_id !== event.subject.id ||
        !grant.stripe_binding ||
        Date.parse(grant.stripe_binding.verified_at) > occurred ||
        occurred < Date.parse(outcome.windowStart) ||
        occurred > Date.parse(outcome.windowEnd)
      )
        continue;
      observations.sources.activation = "connected";
      observations.activations.push({
        customerId: event.subject.id,
        productId: event.product_id,
        releaseId: event.release_id,
        event: event.event_name,
        occurredAt: event.occurred_at,
      });
    }
    if (!journey)
      observations.limitations.push(
        "No fresh enrolled journey proves the registered canonical production release for this approved brief.",
      );
    if (observations.sources.activation !== "connected")
      observations.limitations.push(
        "No admitted external customer value action matches this idea's current product, release and Stripe association.",
      );
  } catch {
    // A failed enrollment/readback must not retain partial positives from this batch.
    if (observations.engineering)
      observations.engineering.reviewApproved = false;
    observations.release = undefined;
    observations.activations = [];
    observations.sources.activation = "error";
    observations.sources.deployment = "error";
    observations.limitations.push(
      "Enrolled evidence could not be verified from service-owned storage; review, journey and activation remain unverified.",
    );
  } finally {
    readsActive = false;
    if (timer) clearTimeout(timer);
  }
}

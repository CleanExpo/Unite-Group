import { withRls } from './client.js';
import { trace } from './observability.js';
import { toVectorLiteral } from './internal.js';
import type {
  RlsContext, UUID, Organization, Person, Lead, Job, Customer,
  TrainingCredential, EvidenceMatch,
} from '../types/database.js';

// ── Identity ─────────────────────────────────────────────────────────────────
export async function myOrg(ctx: RlsContext): Promise<Organization | null> {
  return withRls(ctx, async (tx) => {
    const rows = await tx<Organization[]>`select * from core.organization where party_id = ${ctx.orgId}`;
    return rows[0] ?? null;
  });
}

// Persons the caller may see — RLS (core.party_visible) decides; a member only sees
// people tied to them via membership, a routed lead, a customer, or evidence.
export async function visiblePersons(ctx: RlsContext): Promise<Person[]> {
  return withRls(ctx, (tx) => tx<Person[]>`select * from core.person`);
}

// ── Leads (Disaster Recovery → routed members) ───────────────────────────────
export async function listVisibleLeads(ctx: RlsContext): Promise<Lead[]> {
  return withRls(ctx, (tx) => tx<Lead[]>`select * from leadgen.lead order by created_at desc`);
}

// ── Field (RestoreAssist) ────────────────────────────────────────────────────
export async function listJobs(ctx: RlsContext): Promise<Job[]> {
  return withRls(ctx, (tx) => tx<Job[]>`select * from field.job order by created_at desc`);
}

export async function createCustomerFromLead(ctx: RlsContext, leadId: UUID, name: string): Promise<UUID> {
  return withRls(ctx, async (tx) => {
    const rows = await tx<Pick<Customer, 'id'>[]>`
      insert into field.customer (org_id, name, source_lead_id)
      values (${ctx.orgId}, ${name}, ${leadId})
      returning id`;
    return rows[0]!.id;
  });
}

// ── CARSI credentials (portable, person-bound) ───────────────────────────────
export async function credentialsForPerson(ctx: RlsContext, personId: UUID): Promise<TrainingCredential[]> {
  return withRls(ctx, (tx) =>
    tx<TrainingCredential[]>`select * from carsi.training_credential where person_party_id = ${personId}`);
}

// ── Semantic recall (condition 3: match RPC sets hnsw.iterative_scan internally,
//     so filtered results are COMPLETE; RLS still scopes to the caller's org) ──
export async function matchEvidence(
  ctx: RlsContext,
  queryEmbedding: number[],
  opts: { threshold?: number; count?: number } = {},
): Promise<EvidenceMatch[]> {
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  return trace('spine.matchEvidence', { orgId: ctx.orgId, dims: queryEmbedding.length }, () =>
    withRls(ctx, (tx) => tx<EvidenceMatch[]>`
      select * from field.match_evidence(
        ${vectorLiteral}::public.vector(384),
        ${opts.threshold ?? 0.5},
        ${opts.count ?? 20},
        ${ctx.orgId}::uuid)`),
  );
}

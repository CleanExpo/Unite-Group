import { createHash } from "node:crypto";
import type { Tables, TablesInsert } from "@/types/database";
import type { createClient } from "@/lib/supabase/server";
import { SynthexImportBundleSchema, type ImportProject } from "./import-schema";
import {
  associationConflictReason,
  SynthexImportAssociationSchema,
} from "./import-association";

type Opportunity = Tables<"crm_opportunities">;
type OpportunityInsert = TablesInsert<"crm_opportunities">;

export class OpportunityImportError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 409,
  ) {
    super(message);
  }
}

export interface OpportunityImportStore {
  insertIgnoringDuplicate(row: OpportunityInsert): Promise<void>;
  findScoped(id: string, founderId: string): Promise<Opportunity | null>;
}

export function createOpportunityImportStore(
  client: Awaited<ReturnType<typeof createClient>>,
): OpportunityImportStore {
  return {
    async insertIgnoringDuplicate(row) {
      // A single ON CONFLICT DO NOTHING closes the concurrent retry race.
      const { error } = await client
        .from("crm_opportunities")
        .upsert(row, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    },
    async findScoped(id, founderId) {
      const { data, error } = await client
        .from("crm_opportunities")
        .select("*")
        .eq("founder_id", founderId)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function opportunityId(founderId: string, packetId: string): string {
  const bytes = createHash("sha256")
    .update(`synthex-review\0${founderId}\0${packetId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function previewSynthexOpportunity(
  input: unknown,
  targetRepository: string,
  projects: ImportProject[],
) {
  const parsed = SynthexImportBundleSchema.safeParse(input);
  if (!parsed.success)
    throw new OpportunityImportError(
      "Invalid accepted, blocked Synthex proposal bundle",
      400,
    );
  const bundle = parsed.data;
  const project = projects.find((item) => item.repository === targetRepository);
  if (
    !project ||
    project.repository !== bundle.proposal.targetProject.repository
  ) {
    throw new OpportunityImportError(
      "Target repository must match the proposal and local portfolio registry",
      400,
    );
  }
  const digest = hash(canonical(bundle));
  const association = SynthexImportAssociationSchema.safeParse({
    version: 1,
    projectId: project.name,
    repository: project.repository,
    packetId: bundle.packetId,
    revision: bundle.revision,
    digest,
    executionBlocked: true,
  });
  if (!association.success)
    throw new OpportunityImportError(
      "Invalid or oversized Synthex project association",
      400,
    );
  const sourceDetail = `Synthex proposal ${bundle.packetId} revision ${bundle.revision}; target ${project.repository}; sha256 ${digest}; execution blocked; zero-spend AUD; demand and revenue unvalidated.`;
  if (sourceDetail.length > 500)
    throw new OpportunityImportError(
      "Proposal provenance exceeds the existing source detail limit",
      400,
    );
  return {
    packetId: bundle.packetId,
    revision: bundle.revision,
    project,
    proposal: bundle.proposal,
    executionBlocked: true as const,
    opportunity: {
      name: bundle.proposal.title,
      stage: "blocked_review",
      status: "blocked_review",
      source: "synthex",
      source_detail: sourceDetail,
      next_action: bundle.proposal.nextValidationStep
        .slice(0, 500)
        .replace(/[\uD800-\uDBFF]$/, ""),
      owner: bundle.proposal.suggestedOwner,
      value_amount: null,
      value_currency: null,
      probability: null,
      linked_lead_id: null,
      linked_contact_id: null,
      linked_client_id: null,
      linked_business_id: null,
      approval_required: true,
      approval_status: "requested",
      additional_data: { synthexImport: association.data },
    },
  };
}

export type OpportunityImportPreview = ReturnType<
  typeof previewSynthexOpportunity
>;

export async function importSynthexOpportunity(input: {
  bundle: unknown;
  targetRepository: string;
  projects: ImportProject[];
  founderId: string;
  store: OpportunityImportStore;
}) {
  if (!input.founderId.trim())
    throw new OpportunityImportError("Founder identity is required", 400);
  const preview = previewSynthexOpportunity(
    input.bundle,
    input.targetRepository,
    input.projects,
  );
  const row: OpportunityInsert = {
    ...preview.opportunity,
    id: opportunityId(input.founderId, preview.packetId),
    founder_id: input.founderId,
  };
  await input.store.insertIgnoringDuplicate(row);
  const persisted = await input.store.findScoped(row.id!, input.founderId);
  if (
    !persisted ||
    persisted.founder_id !== input.founderId ||
    persisted.id !== row.id
  )
    throw new Error("Import read-back failed");
  const associationReason = associationConflictReason(
    persisted.additional_data,
    preview.opportunity.additional_data.synthexImport,
  );
  if (associationReason) {
    console.warn({
      event: "synthex_import_association_conflict",
      opportunityId: row.id!,
      reason: associationReason,
    });
    throw new OpportunityImportError(
      "The stored Synthex project association conflicts with this import",
      409,
    );
  }
  if (
    persisted.source !== "synthex" ||
    persisted.source_detail !== row.source_detail
  ) {
    throw new OpportunityImportError(
      "This packet was already imported with a different revision or content",
      409,
    );
  }
  if (
    Object.entries(preview.opportunity)
      .filter(([key]) => key !== "additional_data")
      .some(([key, value]) => persisted[key as keyof Opportunity] !== value)
  ) {
    throw new OpportunityImportError(
      "The existing opportunity changed after import; review it explicitly",
      409,
    );
  }
  return { opportunity: persisted, executionBlocked: true as const };
}

import { z } from "zod";
import { MAX_BUNDLE_BYTES, MAX_PROPOSAL_BYTES } from "./import-limits";

// Independent validation of an untrusted v1 export; the file is not signed authority.
const text = (max = 2000) => z.string().trim().min(1).max(max);
const timestamp = z.string().datetime({ offset: true });
const sourceUrl = text()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use an HTTP or HTTPS source URL without credentials");

export const SynthexImportBundleSchema = z
  .object({
    version: z.literal(1),
    packetId: text(100),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    executionBlocked: z.literal(true),
    review: z.object({ state: z.literal("accepted") }).strict(),
    proposal: z
      .object({
        title: text(200),
        targetProject: z
          .object({
            name: text(200),
            repository: text(200).regex(/^[\w.-]+\/[\w.-]+$/),
          })
          .strict(),
        targetBusiness: text(200),
        customerProblemHypothesis: text(),
        sources: z
          .array(
            z
              .object({
                url: sourceUrl,
                capturedAt: timestamp,
                publishedAt: timestamp.optional(),
                claims: z.array(text()).min(1).max(20),
              })
              .strict(),
          )
          .min(1)
          .max(20),
        uniteEvidence: z
          .array(
            z
              .object({
                reference: text(500),
                observation: text(),
                capturedAt: timestamp,
              })
              .strict(),
          )
          .min(1)
          .max(50),
        confidence: z.number().finite().min(0).max(1),
        assumptions: z.array(text()).min(1).max(20),
        uncertainties: z.array(text()).min(1).max(20),
        suggestedOwner: text(200),
        kpi: z
          .object({
            name: text(200),
            unit: text(100),
            baselineRequirement: text(),
          })
          .strict(),
        successCriteria: text(),
        stopCriteria: text(),
        nextValidationStep: text(),
        spendBoundary: z
          .object({ currency: z.literal("AUD"), maxSpend: z.literal(0) })
          .strict(),
        demandValidated: z.literal(false),
        revenueValidated: z.literal(false),
      })
      .strict(),
    opportunity: z
      .object({
        name: text(200),
        stage: z.literal("blocked_review"),
        status: z.literal("blocked_review"),
        source: z.literal("synthex"),
        source_detail: text(1000),
        next_action: text(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new TextEncoder().encode(JSON.stringify(value.proposal)).byteLength >
        MAX_PROPOSAL_BYTES ||
      new TextEncoder().encode(JSON.stringify(value)).byteLength >
        MAX_BUNDLE_BYTES
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Proposal export exceeds the v1 UTF-8 size limit",
      });
    }
    if (
      value.opportunity.name !== value.proposal.title ||
      value.opportunity.next_action !== value.proposal.nextValidationStep
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Opportunity summary disagrees with proposal",
      });
    }
  });

export const SynthexImportRequestSchema = z
  .object({
    bundle: SynthexImportBundleSchema,
    targetRepository: text(200),
    previewOnly: z.boolean(),
  })
  .strict();

export type SynthexImportBundle = z.infer<typeof SynthexImportBundleSchema>;
export interface ImportProject {
  name: string;
  repository: string;
}

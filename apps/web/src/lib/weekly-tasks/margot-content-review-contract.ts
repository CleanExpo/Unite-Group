import { z } from "zod";
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const reviewRequestSchema = z.object({
  operationId: z.string().uuid(), episodeId: z.string().min(1).max(160),
  batchId: z.string().min(1).max(160), version: z.number().int().positive(),
  packetSHA256: digest, action: z.enum(["approve", "request_changes"]),
  feedback: z.string().trim().max(4000),
}).strict().refine(v => v.action !== "request_changes" || v.feedback.length > 0);
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export const contentEventSchema = z.object({
  kind: z.literal("margot-content-review-event"), schemaVersion: z.literal(1),
  operationId: z.string().uuid(), episodeId: z.string(), batchId: z.string(),
  version: z.number().int().positive(), packetSHA256: digest, episodeSHA256: digest,
  scriptSHA256: digest, mediaSHA256: digest.nullable(), videoId: z.string().nullable(),
  action: z.enum(["approve", "request_changes"]), feedback: z.string().max(4000),
  recordedAt: z.string().datetime(), publicationApproved: z.literal(false),
}).strict();
export type ContentEvent = z.infer<typeof contentEventSchema>;

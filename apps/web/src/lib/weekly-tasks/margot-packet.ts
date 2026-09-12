import { createHash } from "node:crypto";
import { z } from "zod";

const text = z.string().trim().min(1).max(20000);
const date = z.string().datetime({ offset: true });
const episode = z
  .object({
    id: z.string().min(1).max(160),
    title: text,
    slot: date,
    timezone: z.literal("Australia/Brisbane"),
    script: text,
    caption: text,
    resourceTitle: text,
    resourceText: text,
    productionStatus: z.enum([
      "existing-owner-approved-master",
      "script-draft-not-rendered",
    ]),
    scriptApproval: z.enum(["approved", "pending"]),
    releaseApproval: z.literal("pending"),
    videoId: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.productionStatus === "existing-owner-approved-master") ===
      Boolean(value.videoId),
    "Media status and reference disagree",
  );

// This contract describes a local editorial preview, never publication consent.
const commonShape = {
  schemaVersion: z.literal(1),
  weekStartsAt: date,
  reviewDueAt: date,
  timezone: z.literal("Australia/Brisbane"),
  scheduleStatus: z.literal("proposed-not-scheduled"),
  reviewTimeStatus: z.literal("proposed"),
  distributionSystem: z.literal("Synthex"),
  primarySite: z.literal("NRPG"),
  optionalContextualSite: z.literal("CARSI"),
  sourceDocument: text,
  episodes: z.array(episode).length(5),
};
function checkCalendar(
  packet: {
    weekStartsAt: string;
    reviewDueAt: string;
    episodes: Array<{ id: string; slot: string }>;
  },
  ctx: z.RefinementCtx,
) {
  const start = Date.parse(packet.weekStartsAt);
  const review = Date.parse(packet.reviewDueAt);
  const localStart = new Date(start + 10 * 3600000);
  const localReview = new Date(review + 10 * 3600000);
  if (
    localStart.getUTCDay() !== 4 ||
    localStart.getUTCHours() !== 16 ||
    localStart.getUTCMinutes() !== 0 ||
    localStart.getUTCSeconds() !== 0 ||
    localStart.getUTCMilliseconds() !== 0
  )
    ctx.addIssue({
      code: "custom",
      message: "Week must start Thursday at 16:00 Brisbane",
      path: ["weekStartsAt"],
    });
  if (
    localReview.getUTCDay() !== 1 ||
    review >= start ||
    start - review > 7 * 86400000
  )
    ctx.addIssue({
      code: "custom",
      message: "Review must precede this Thursday batch on Monday",
      path: ["reviewDueAt"],
    });
  if (
    new Set(packet.episodes.map((item) => item.id)).size !==
    packet.episodes.length
  )
    ctx.addIssue({
      code: "custom",
      message: "Episode identities must be unique",
      path: ["episodes"],
    });
  if (
    packet.episodes.some(
      (item) =>
        Date.parse(item.slot) < start ||
        Date.parse(item.slot) >= start + 7 * 86400000,
    )
  )
    ctx.addIssue({
      code: "custom",
      message: "Proposed slots must belong to this Thursday week",
      path: ["episodes"],
    });
}
const schema = z.object(commonShape).strict().superRefine(checkCalendar);

export type MargotWeeklyPacket = z.infer<typeof schema>;
export function parseMargotWeeklyPacket(input: unknown) {
  return schema.safeParse(input);
}

// Private review content carries no consent or execution authority. Preserve wording.
const displayText = z
  .string()
  .min(1)
  .max(20000)
  .refine((value) => value.trim().length > 0);
const media = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("approved_reference"),
      videoId: z.string().regex(/^[a-f0-9]{32}$/),
    })
    .strict(),
  z
    .object({
      kind: z.literal("generated_draft"),
      videoId: z.string().regex(/^[a-f0-9]{32}$/),
    })
    .strict(),
  z.object({ kind: z.literal("awaiting_render") }).strict(),
]);
const privateEpisode = z
  .object({
    id: z.string().min(1).max(160),
    title: displayText,
    slot: date,
    timezone: z.literal("Australia/Brisbane"),
    script: displayText,
    caption: displayText,
    resourceTitle: displayText,
    resourceText: displayText,
    scriptApproval: z.enum(["approved", "pending"]),
    releaseApproval: z.literal("pending"),
    media,
  })
  .strict()
  .refine(
    (value) =>
      value.media.kind === "approved_reference"
        ? value.scriptApproval === "approved"
        : value.scriptApproval === "pending",
    "Media and script review disagree",
  );
const privateSchema = z
  .object({
    ...commonShape,
    schemaVersion: z.literal(2),
    sourceDocument: displayText,
    releaseEligible: z.literal(false),
    episodes: z.array(privateEpisode).length(5),
  })
  .strict()
  .superRefine(checkCalendar)
  .refine(
    (value) => Buffer.byteLength(canonicalPacketJSON(value)) <= 512000,
    "Packet exceeds byte limit",
  );
export type MargotPrivatePacket = z.infer<typeof privateSchema>;
export function parseMargotPrivatePacket(input: unknown) {
  return privateSchema.safeParse(input);
}

// Deterministic JSON for this bounded JSON DTO, not a signature or consent token.
export function canonicalPacketJSON(value: unknown): string {
  function canonical(input: unknown): unknown {
    if (
      input === null ||
      typeof input === "string" ||
      typeof input === "boolean"
    )
      return input;
    if (typeof input === "number" && Number.isFinite(input)) return input;
    if (Array.isArray(input)) return input.map(canonical);
    if (typeof input === "object" && input !== null) {
      const result: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(input).sort())
        result[key] = canonical((input as Record<string, unknown>)[key]);
      return result;
    }
    throw new Error("Unsupported packet value");
  }
  return JSON.stringify(canonical(value));
}
export function packetDigest(value: unknown): string {
  return createHash("sha256").update(canonicalPacketJSON(value)).digest("hex");
}

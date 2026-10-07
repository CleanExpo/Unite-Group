import { z } from "zod";

export const MAX_IMPORT_ASSOCIATION_BYTES = 1024;

// A registry planning reference. This namespace grants no execution authority.
export const SynthexImportAssociationSchema = z
  .object({
    version: z.literal(1),
    projectId: z
      .string()
      .max(MAX_IMPORT_ASSOCIATION_BYTES)
      .regex(/^[a-z0-9][a-z0-9-]*$/),
    repository: z
      .string()
      .max(200)
      .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    packetId: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => value.trim().length > 0),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    executionBlocked: z.literal(true),
  })
  .strict()
  .refine(
    (value) =>
      new TextEncoder().encode(JSON.stringify(value)).byteLength <=
      MAX_IMPORT_ASSOCIATION_BYTES,
    "Synthex association exceeds its UTF-8 byte limit",
  );

export type SynthexImportAssociation = z.infer<
  typeof SynthexImportAssociationSchema
>;
export type AssociationConflictReason =
  "association_missing" | "association_invalid" | "association_mismatch";

export function associationConflictReason(
  metadata: unknown,
  expected: SynthexImportAssociation,
): AssociationConflictReason | null {
  if (metadata === undefined) return "association_missing";
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  )
    return "association_invalid";
  if (!Object.prototype.hasOwnProperty.call(metadata, "synthexImport"))
    return "association_missing";
  const parsed = SynthexImportAssociationSchema.safeParse(
    (metadata as Record<string, unknown>).synthexImport,
  );
  if (!parsed.success) return "association_invalid";
  return Object.entries(expected).some(
    ([key, value]) =>
      parsed.data[key as keyof SynthexImportAssociation] !== value,
  )
    ? "association_mismatch"
    : null;
}

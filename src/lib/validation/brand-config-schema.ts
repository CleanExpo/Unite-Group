// src/lib/validation/brand-config-schema.ts
// UNI-1991: Zod schema mirroring the DB CHECK constraint in
// supabase/migrations/20260513160000_add_brand_config_schema.sql
// and the TS types in src/types/brand-config.ts.
//
// Permissive shape — every typed key is optional, and unknown keys are
// passed through (via .passthrough()) so legacy keys on existing rows
// remain valid through the round-trip.

import { z } from 'zod';
import { FONT_FAMILIES, VOICE_TONES } from '@/types/brand-config';

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be hex '#RRGGBB'")
  .nullable();

export const brandConfigSchema = z
  .object({
    logo_url: z.string().nullable().optional(),
    primary_color: hexColor.optional(),
    accent_color: hexColor.optional(),
    font_family: z.enum(FONT_FAMILIES).optional(),
    voice_tone: z.enum(VOICE_TONES).optional(),
    tagline: z.string().max(200).nullable().optional(),
  })
  .passthrough();

export type BrandConfigInput = z.input<typeof brandConfigSchema>;
export type BrandConfigOutput = z.output<typeof brandConfigSchema>;

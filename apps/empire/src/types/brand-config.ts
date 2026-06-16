// src/types/brand-config.ts
// UNI-1991: Typed brand_config schema for nexus_clients.
//
// Mirrors the CHECK constraint in
// supabase/migrations/20260513160000_add_brand_config_schema.sql.
// Every typed key is optional. Legacy keys (e.g. working_name, candidates
// on Duncan Perkins' row) are preserved by the index signature and by
// normalizeBrandConfig.

import { isHttpUrlOrNullish } from '@/lib/security/http-url';

export const FONT_FAMILIES = ['Inter', 'Syne', 'JetBrains'] as const;
export const VOICE_TONES = ['formal', 'casual', 'technical'] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];
export type VoiceTone = (typeof VOICE_TONES)[number];

export interface BrandConfig {
  logo_url?: string | null;
  primary_color?: string | null; // hex #RRGGBB
  accent_color?: string | null;  // hex #RRGGBB
  font_family?: FontFamily;
  voice_tone?: VoiceTone;
  tagline?: string | null;       // max 200 chars

  // Legacy keys that may exist on older rows — preserved, not removed.
  // Typed as `unknown` so callers must narrow before use.
  [key: string]: unknown;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const TAGLINE_MAX = 200;

// Legacy keys preserved by normalizeBrandConfig. Anything outside the typed
// schema AND this allow-list is stripped on normalise. Extend cautiously.
const LEGACY_KEYS_ALLOWED = new Set(['working_name', 'candidates']);

const TYPED_KEYS = new Set([
  'logo_url',
  'primary_color',
  'accent_color',
  'font_family',
  'voice_tone',
  'tagline',
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNullableString(v: unknown): v is string | null | undefined {
  return v === undefined || v === null || typeof v === 'string';
}

function isHexOrNullish(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  return typeof v === 'string' && HEX_RE.test(v);
}

/**
 * Type-guard. Returns true iff every PRESENT typed key validates.
 * Legacy / unknown keys are ignored — they don't cause a false return.
 */
export function isValidBrandConfig(input: unknown): input is BrandConfig {
  if (input === null || input === undefined) return false;
  if (!isPlainObject(input)) return false;

  if ('logo_url' in input && !isHttpUrlOrNullish(input.logo_url)) return false;

  if ('primary_color' in input && !isHexOrNullish(input.primary_color)) return false;
  if ('accent_color' in input && !isHexOrNullish(input.accent_color)) return false;

  if ('font_family' in input) {
    if (!FONT_FAMILIES.includes(input.font_family as FontFamily)) return false;
  }

  if ('voice_tone' in input) {
    if (!VOICE_TONES.includes(input.voice_tone as VoiceTone)) return false;
  }

  if ('tagline' in input) {
    const t = input.tagline;
    if (t !== null && t !== undefined) {
      if (typeof t !== 'string') return false;
      if (t.length > TAGLINE_MAX) return false;
    }
  }

  return true;
}

/**
 * Strips unknown keys EXCEPT the legacy allow-list, validates hex colours,
 * coerces enums (drops invalid enum values rather than throwing), and
 * returns a clean BrandConfig. Never throws — best-effort clean-up.
 */
export function normalizeBrandConfig(input: unknown): BrandConfig {
  if (!isPlainObject(input)) return {};

  const out: BrandConfig = {};

  for (const [key, value] of Object.entries(input)) {
    if (TYPED_KEYS.has(key)) {
      // Validate per-key on the way in; drop invalid values silently.
      switch (key) {
        case 'logo_url':
          if (isNullableString(value)) out.logo_url = (value ?? null) as string | null;
          break;
        case 'primary_color':
          if (isHexOrNullish(value)) {
            out.primary_color = value == null ? null : (value as string);
          }
          break;
        case 'accent_color':
          if (isHexOrNullish(value)) {
            out.accent_color = value == null ? null : (value as string);
          }
          break;
        case 'font_family':
          if (FONT_FAMILIES.includes(value as FontFamily)) {
            out.font_family = value as FontFamily;
          }
          break;
        case 'voice_tone':
          if (VOICE_TONES.includes(value as VoiceTone)) {
            out.voice_tone = value as VoiceTone;
          }
          break;
        case 'tagline':
          if (value === null || value === undefined) {
            out.tagline = null;
          } else if (typeof value === 'string' && value.length <= TAGLINE_MAX) {
            out.tagline = value;
          }
          break;
      }
      continue;
    }

    if (LEGACY_KEYS_ALLOWED.has(key)) {
      out[key] = value;
    }
    // Anything else: stripped.
  }

  return out;
}

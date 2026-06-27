// Brand Video Studio — style registry.
//
// Mirror of `.claude/skills/brand-video/styles.json` (the /brand-video skill's
// machine-readable look registry). Kept inline here so the dashboard dropdown
// and the generate API can share one source of truth without a build-time file
// read. If a look is added to styles.json, append it here too.

export interface BrandVideoStyle {
  key: string;
  label: string;
}

export const BRAND_VIDEO_STYLES: readonly BrandVideoStyle[] = [
  { key: 'flat-line', label: 'Flat-line Explainer' },
  { key: 'hand-doodle', label: 'Hand-drawn Doodle' },
  { key: 'bold-kinetic', label: 'Bold Kinetic' },
  { key: 'cinematic-photoreal', label: 'Cinematic Photoreal' },
  { key: 'minimal-corporate', label: 'Minimal Corporate' },
  { key: 'retro-print', label: 'Retro Print' },
] as const;

export const DEFAULT_BRAND_VIDEO_STYLE = 'flat-line';

export const BRAND_VIDEO_STYLE_KEYS = BRAND_VIDEO_STYLES.map((s) => s.key);

export function isBrandVideoStyle(key: string): boolean {
  return BRAND_VIDEO_STYLE_KEYS.includes(key);
}

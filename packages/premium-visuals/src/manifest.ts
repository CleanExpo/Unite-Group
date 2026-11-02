/** Every image/video/render shipped on a page MUST have an entry here (media.manifest.json). */
export type MediaSource = 'client' | 'stock' | 'generated' | 'blender';
export interface MediaEntry {
  /** Public path, e.g. /media/hero/water-damage.avif */
  src: string;
  kind: 'image' | 'video' | 'render';
  source: MediaSource;
  /** Required: photographer/licence, "Higgsfield SOUL V2 – generated", or client name. */
  credit: string;
  alt: string;
  /** Prompt id from media.prompts.json when source === 'generated'. */
  promptId?: string;
  poster?: string;
  width?: number;
  height?: number;
}
export interface MediaManifest { version: 1; entries: MediaEntry[] }

export function validateManifest(m: MediaManifest): string[] {
  const errs: string[] = [];
  const ok: MediaSource[] = ['client', 'stock', 'generated', 'blender'];
  for (const e of m.entries ?? []) {
    if (!e.src) errs.push('entry missing src');
    if (!ok.includes(e.source)) errs.push(`${e.src}: source must be client|stock|generated|blender`);
    if (!e.credit?.trim()) errs.push(`${e.src}: credit is required`);
    if (!e.alt?.trim()) errs.push(`${e.src}: alt is required`);
    if (e.kind === 'video' && !e.poster) errs.push(`${e.src}: video needs a poster image`);
  }
  return errs;
}

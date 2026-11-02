#!/usr/bin/env node
/**
 * generate-media — Higgsfield photoreal image/video generator from a prompt manifest.
 *
 *   generate-media --prompts media.prompts.json [--preset presets/restoration.json] [--only id] [--go]
 *
 * Without --go it is a DRY RUN (prints the prompts it would send, costs nothing).
 * Credentials: HF_API_KEY_ID + HF_API_KEY_SECRET (or HIGGSFIELD_API_KEY="id:secret") from env. Never printed.
 * Video endpoint: HIGGSFIELD_VIDEO_ENDPOINT (account-specific model path, e.g. an image-to-video model).
 * Downloads to public/media/<dir>/<id>.<ext>, converts images to AVIF+WebP (ffmpeg), videos to AV1 MP4 + VP9 WebM + H.264 MP4,
 * writes a poster, and upserts media.manifest.json with source:"generated" + credit.
 *
 * media.prompts.json: { "preset": "cinematic-au-restoration", "items": [
 *   { "id": "hero-water-damage", "kind": "image"|"video", "dir": "hero", "alt": "...", "prompt": "technician ...", "aspect_ratio": "16:9", "fromImage": "hero-water-damage" } ] }
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const go = args.includes('--go');
const here = path.dirname(fileURLToPath(import.meta.url));
const prompts = JSON.parse(fs.readFileSync(opt('--prompts', 'media.prompts.json'), 'utf8'));
const preset = JSON.parse(fs.readFileSync(opt('--preset', path.join(here, '../presets/restoration.json')), 'utf8'));
const only = opt('--only');
const outRoot = opt('--out', 'public/media');
const manifestPath = opt('--manifest', 'media.manifest.json');
const BASE = process.env.HIGGSFIELD_API_BASE || 'https://api.higgsfield.ai';

function auth() {
  const pair = process.env.HIGGSFIELD_API_KEY || (process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET ? `${process.env.HF_API_KEY_ID}:${process.env.HF_API_KEY_SECRET}` : '');
  if (!pair) { console.error('Missing Higgsfield credentials in env (HF_API_KEY_ID/HF_API_KEY_SECRET). Not printing anything else.'); process.exit(2); }
  return `Key ${pair}`;
}
const fullPrompt = (it) => [preset.prefix, it.prompt, preset.subject_rules, it.kind === 'video' ? preset.video.motion : '', preset.suffix].filter(Boolean).join(' ');

async function call(url, init) {
  const r = await fetch(url, init);
  const body = await r.text();
  if (!r.ok) throw new Error(`${r.status} from ${new URL(url).pathname}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}
async function submit(it, A) {
  const ep = it.kind === 'video' ? (process.env.HIGGSFIELD_VIDEO_ENDPOINT || '') : preset.image.endpoint;
  if (!ep) throw new Error('Set HIGGSFIELD_VIDEO_ENDPOINT for video items');
  const body = it.kind === 'video'
    ? { prompt: fullPrompt(it), duration: it.duration || preset.video.duration, aspect_ratio: it.aspect_ratio || '16:9', ...(it.imageUrl ? { image_url: it.imageUrl } : {}) }
    : { prompt: fullPrompt(it), negative_prompt: preset.negative, resolution: preset.image.resolution, aspect_ratio: it.aspect_ratio || preset.image.aspect_ratio, batch_size: 1 };
  const res = await call(BASE + ep, { method: 'POST', headers: { Authorization: A, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify(body) });
  for (let i = 0; i < 180; i++) {
    await new Promise((s) => setTimeout(s, 5000));
    const st = await call(res.status_url, { headers: { Authorization: A } });
    if (st.status === 'completed') return st.images?.[0]?.url || st.video?.url || st.videos?.[0]?.url;
    if (['failed', 'nsfw', 'cancelled'].includes(st.status)) throw new Error(`${it.id}: ${st.status}`);
  }
  throw new Error(`${it.id}: timed out`);
}
const ff = (a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });

export function encodeImage(src, base) {
  ff(['-i', src, '-vf', "scale='min(2400,iw)':-2", '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '30', base + '.avif']);
  ff(['-i', src, '-vf', "scale='min(2400,iw)':-2", '-c:v', 'libwebp', '-quality', '80', base + '.webp']);
}
export function encodeVideo(src, base) {
  ff(['-i', src, '-an', '-vf', "scale='min(1920,iw)':-2,fps=30", '-c:v', 'libaom-av1', '-crf', '36', '-b:v', '0', '-cpu-used', '6', '-movflags', '+faststart', base + '.av1.mp4']);
  ff(['-i', src, '-an', '-vf', "scale='min(1920,iw)':-2,fps=30", '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', base + '.webm']);
  ff(['-i', src, '-an', '-vf', "scale='min(1920,iw)':-2,fps=30", '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', base + '.mp4']);
  ff(['-i', src, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', base + '.poster.webp']);
}
export function upsert(entry) {
  const m = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { version: 1, entries: [] };
  m.entries = m.entries.filter((e) => e.src !== entry.src).concat(entry);
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n');
}

const items = prompts.items.filter((i) => !only || i.id === only);
if (!go) {
  console.log(`DRY RUN — ${items.length} item(s). Re-run with --go to generate (uses Higgsfield credits on the existing plan).`);
  for (const it of items) console.log(`\n[${it.kind}] ${it.id}\n  ${fullPrompt(it)}`);
  process.exit(0);
}
const A = auth();
for (const it of items) {
  const dir = path.join(outRoot, it.dir || it.kind); fs.mkdirSync(dir, { recursive: true });
  console.log(`generating ${it.kind} ${it.id} ...`);
  const url = await submit(it, A);
  const raw = path.join(dir, `${it.id}.raw${it.kind === 'video' ? '.mp4' : '.png'}`);
  fs.writeFileSync(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));
  const base = path.join(dir, it.id);
  const pub = '/' + path.relative('public', base).split(path.sep).join('/');
  if (it.kind === 'video') { encodeVideo(raw, base); upsert({ src: pub + '.mp4', kind: 'video', source: 'generated', credit: 'Generated with Higgsfield', alt: it.alt, promptId: it.id, poster: pub + '.poster.webp' }); upsert({ src: pub + '.poster.webp', kind: 'image', source: 'generated', credit: 'Generated with Higgsfield', alt: it.alt, promptId: it.id }); }
  else { encodeImage(raw, base); for (const ext of ['.avif', '.webp']) upsert({ src: pub + ext, kind: 'image', source: 'generated', credit: 'Generated with Higgsfield', alt: it.alt, promptId: it.id }); }
  fs.unlinkSync(raw);
  console.log(`  -> ${pub}`);
}

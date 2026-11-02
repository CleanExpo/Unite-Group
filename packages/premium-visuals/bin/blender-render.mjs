#!/usr/bin/env node
/**
 * blender-render — offline Blender turntable → optimised AV1/WebM/H.264 loop + poster + manifest entry.
 *   blender-render <model.glb> --id product-dehumidifier [--frames 120] [--res 1920] [--credit "Blender render — CleanExpo"]
 * Requires `blender` and `ffmpeg` on PATH (render on the box or a workstation; never at runtime).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const model = args[0];
const id = opt('--id', path.basename(model || 'render', path.extname(model || '')));
if (!model) { console.error('usage: blender-render <model> --id <id>'); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-blender-'));
execFileSync('blender', ['-b', '-P', path.join(here, '../blender/turntable.py'), '--', path.resolve(model), tmp, opt('--frames', '120'), opt('--res', '1920')], { stdio: 'inherit' });
const outDir = path.join('public/media/renders'); fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, id);
const seq = path.join(tmp, 'frame_%04d.png');
const ff = (a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', seq, ...a], { stdio: 'inherit' });
ff(['-c:v', 'libaom-av1', '-crf', '34', '-b:v', '0', '-cpu-used', '6', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', base + '.av1.mp4']);
ff(['-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', base + '.webm']);
ff(['-c:v', 'libx264', '-crf', '22', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', base + '.mp4']);
ff(['-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', base + '.poster.webp']);
const pub = '/media/renders/' + id;
const mp = 'media.manifest.json';
const m = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : { version: 1, entries: [] };
const credit = opt('--credit', 'Blender render — CleanExpo');
m.entries = m.entries.filter((e) => !e.src.startsWith(pub)).concat(
  { src: pub + '.mp4', kind: 'render', source: 'blender', credit, alt: opt('--alt', id.replace(/-/g, ' ')), poster: pub + '.poster.webp' },
  { src: pub + '.poster.webp', kind: 'image', source: 'blender', credit, alt: opt('--alt', id.replace(/-/g, ' ')) });
fs.writeFileSync(mp, JSON.stringify(m, null, 2) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`rendered ${pub}.{av1.mp4,webm,mp4,poster.webp}`);

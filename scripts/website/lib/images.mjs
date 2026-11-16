// Client image intake. Only images the operator names are copied into the public site source,
// with location and camera metadata stripped, keyed by content hash, under a size cap.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, appendFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import {
  INCOMING_RESERVED, MAX_ASSET_BYTES, ToolError, freeName, isoDate, personalContactIn, requireWorkspace, writeFileAtomic, writeJsonAtomic,
} from './common.mjs';

const JPEG = new Set(['.jpg', '.jpeg']);
const PNG = new Set(['.png']);
const REFUSED = new Set(['.webp', '.avif', '.gif', '.heic', '.heif', '.tif', '.tiff', '.svg', '.bmp']);
export const IMAGE_EXTENSIONS = new Set([...JPEG, ...PNG, ...REFUSED]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// PNG chunks that carry metadata rather than pixels.
const PNG_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);
// JPEG segments: APP1 (EXIF, XMP), APP13 (IPTC/Photoshop), COM (comments).
const JPEG_METADATA_MARKERS = new Set([0xe1, 0xed, 0xfe]);

function walkJpeg(buf, onSegment) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new ToolError('not a valid JPEG (no start marker)');
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new ToolError('JPEG structure is damaged; re-export the image');
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      onSegment(marker, i, i + 2);
      i += 2;
      continue;
    }
    if (marker === 0xd9) {
      onSegment(marker, i, i + 2);
      return buf.length;
    }
    const len = buf.readUInt16BE(i + 2);
    const end = i + 2 + len;
    if (end > buf.length) throw new ToolError('JPEG segment runs past the end of the file; re-export the image');
    if (marker === 0xda) {
      // Start of scan: the compressed image data runs to the end of the file.
      onSegment(marker, i, buf.length);
      return buf.length;
    }
    onSegment(marker, i, end);
    i = end;
  }
  return buf.length;
}

function walkPng(buf, onChunk) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new ToolError('not a valid PNG (bad signature)');
  let i = 8;
  while (i < buf.length) {
    if (i + 8 > buf.length) throw new ToolError('PNG structure is damaged; re-export the image');
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) throw new ToolError('PNG chunk runs past the end of the file; re-export the image');
    onChunk(type, i, end);
    i = end;
    if (type === 'IEND') break;
  }
}

export function stripMetadata(buf, ext) {
  const e = ext.toLowerCase();
  const parts = [];
  if (JPEG.has(e)) {
    parts.push(buf.subarray(0, 2));
    walkJpeg(buf, (marker, start, end) => {
      if (marker === 0xd8) return;
      if (!JPEG_METADATA_MARKERS.has(marker)) parts.push(buf.subarray(start, end));
    });
    return Buffer.concat(parts);
  }
  if (PNG.has(e)) {
    parts.push(PNG_SIGNATURE);
    walkPng(buf, (type, start, end) => {
      if (!PNG_METADATA_CHUNKS.has(type)) parts.push(buf.subarray(start, end));
    });
    return Buffer.concat(parts);
  }
  throw new ToolError(`${e} images cannot be checked for location data here; export as JPEG or PNG first`);
}

export function findMetadata(buf, ext) {
  const e = ext.toLowerCase();
  const found = [];
  if (JPEG.has(e)) {
    walkJpeg(buf, (marker) => {
      if (JPEG_METADATA_MARKERS.has(marker)) found.push(`JPEG segment 0x${marker.toString(16)}`);
    });
  } else if (PNG.has(e)) {
    walkPng(buf, (type) => {
      if (PNG_METADATA_CHUNKS.has(type)) found.push(`PNG chunk ${type}`);
    });
  } else {
    found.push(`${e} cannot be inspected; only JPEG and PNG are allowed`);
  }
  return found;
}

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function listIncomingImages(incoming) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = relative(incoming, full).split(sep).join('/');
      if (entry.isDirectory()) {
        if (dir === incoming && INCOMING_RESERVED.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        out.push(rel);
      }
    }
  };
  if (existsSync(incoming)) walk(incoming);
  return out.sort();
}

export function manifestPath(sitesDir, slug) {
  return join(sitesDir, slug, 'src', 'assets', 'client', 'manifest.json');
}

export function readManifest(path) {
  if (!existsSync(path)) return { schema: 1, assets: [] };
  const m = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(m.assets)) throw new ToolError(`${path} has no assets list`);
  return m;
}

// ingest: with no selection, list candidates and change nothing.
export function ingest(ctx, { slug, select = null, approvedBy = null, now = new Date() }) {
  const ws = requireWorkspace(ctx, slug);
  const site = join(ctx.sitesDir, slug);
  if (!existsSync(site)) throw new ToolError(`site folder ${site} does not exist; run new first`);
  const incoming = join(ws, 'incoming');
  const candidates = listIncomingImages(incoming);
  if (!select || select.length === 0) return { listed: candidates, ingested: [], skipped: [] };
  if (!approvedBy || !approvedBy.trim()) throw new ToolError('name who approved these images for publication with --approved-by', 2);
  if (personalContactIn(approvedBy)) {
    throw new ToolError('--approved-by is published in the public manifest: give a role (e.g. "client owner") or a reference into the private name log, never an email address or phone number', 2);
  }

  // Validate every selected file before writing anything.
  const prepared = [];
  for (const rel of select) {
    if (!candidates.includes(rel)) {
      throw new ToolError(`"${rel}" is not an image waiting in incoming/ (reference, done, wordpress and changes are never published)`, 2);
    }
    const ext = extname(rel).toLowerCase();
    if (REFUSED.has(ext)) throw new ToolError(`${rel}: ${ext} is not accepted; export it as JPEG or PNG first`);
    const original = readFileSync(join(incoming, rel));
    const clean = stripMetadata(original, ext);
    const left = findMetadata(clean, ext);
    if (left.length) throw new ToolError(`${rel}: metadata remains after stripping (${left.join(', ')})`);
    if (clean.length > MAX_ASSET_BYTES) {
      throw new ToolError(`${rel} is ${(clean.length / 1048576).toFixed(1)} MB; resize to about 2400 px wide and under 1 MB first (macOS: sips -Z 2400 <file>)`);
    }
    const hash = sha256(clean);
    const outExt = JPEG.has(ext) ? '.jpg' : '.png';
    prepared.push({ rel, clean, hash, file: `img-${hash.slice(0, 12)}${outExt}` });
  }

  const mPath = manifestPath(ctx.sitesDir, slug);
  const manifest = readManifest(mPath);
  const known = new Set(manifest.assets.map((a) => a.sha256));
  const assetDir = join(site, 'src', 'assets', 'client');
  const ingested = [];
  const skipped = [];

  // 1. copy the cleaned files (each written atomically)
  for (const p of prepared) {
    if (known.has(p.hash) && existsSync(join(assetDir, p.file))) {
      skipped.push(p.rel);
      continue;
    }
    writeFileAtomic(join(assetDir, p.file), p.clean);
  }
  // 2. record provenance (atomic); no original filename, no path, no sender
  const day = isoDate(now);
  for (const p of prepared) {
    if (known.has(p.hash)) continue;
    known.add(p.hash);
    manifest.assets.push({
      id: p.file, sha256: p.hash, source: 'client-supplied', approved_by: approvedBy.trim(), approved_at: day, credit: '', alt: '',
    });
    ingested.push({ from: p.rel, file: p.file });
  }
  writeJsonAtomic(mPath, manifest);
  // 3. file the originals privately, with a private log of the name mapping
  const doneDir = join(incoming, 'done', day);
  mkdirSync(doneDir, { recursive: true });
  for (const p of prepared) {
    const src = join(incoming, p.rel);
    if (!existsSync(src)) continue;
    const ext = extname(p.rel);
    const base = p.rel.slice(0, -ext.length).split('/').join('__');
    const dest = freeName(doneDir, base, ext);
    renameSync(src, dest);
    appendFileSync(join(doneDir, 'INGEST-LOG.md'), `- ${p.rel} -> sites/${slug}/src/assets/client/${p.file}\n`);
  }
  return { listed: candidates, ingested, skipped };
}

// Problems with committed client assets: unlisted files, hash drift, metadata, oversize.
export function auditClientAssets(sitesDir, slug) {
  const problems = [];
  const assetDir = join(sitesDir, slug, 'src', 'assets', 'client');
  if (!existsSync(assetDir)) return problems;
  const manifest = readManifest(manifestPath(sitesDir, slug));
  const byId = new Map(manifest.assets.map((a) => [a.id, a]));
  for (const entry of readdirSync(assetDir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === 'manifest.json') continue;
    const full = join(assetDir, entry.name);
    const rec = byId.get(entry.name);
    if (!rec) {
      problems.push(`[asset] ${entry.name} has no provenance entry in manifest.json; add it with ingest`);
      continue;
    }
    const buf = readFileSync(full);
    if (sha256(buf) !== rec.sha256) problems.push(`[asset] ${entry.name} does not match its manifest hash`);
    for (const m of findMetadata(buf, extname(entry.name))) problems.push(`[asset] ${entry.name} still carries metadata: ${m}`);
    if (statSync(full).size > MAX_ASSET_BYTES) problems.push(`[asset] ${entry.name} is over 1 MB`);
  }
  for (const a of manifest.assets) {
    if (!existsSync(join(assetDir, a.id))) problems.push(`[asset] manifest lists ${a.id} but the file is missing`);
    if (personalContactIn(a.approved_by)) problems.push(`[asset] manifest entry ${a.id} has an email address or phone number in approved_by`);
  }
  return problems;
}

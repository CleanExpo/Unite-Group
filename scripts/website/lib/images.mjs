// Client image intake. Only images the operator names are copied into the public site source,
// with location and camera metadata stripped, keyed by content hash, under a size cap.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, appendFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import {
  INCOMING_RESERVED, MAX_ASSET_BYTES, ToolError, APPROVER_ROLES, approverRole, freeName, isoDate, requireWorkspace, writeFileAtomic, writeJsonAtomic,
} from './common.mjs';

const JPEG = new Set(['.jpg', '.jpeg']);
const PNG = new Set(['.png']);
const REFUSED = new Set(['.webp', '.avif', '.gif', '.heic', '.heif', '.tif', '.tiff', '.svg', '.bmp']);
export const IMAGE_EXTENSIONS = new Set([...JPEG, ...PNG, ...REFUSED]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// What a published image may contain is an ALLOW-LIST of pixel-structure segments and chunks. Anything
// not named here is dropped by stripMetadata and reported by findMetadata, and both read the one
// classification below, so a segment type nobody thought of cannot be kept by one and missed by the
// other. (UNI-3433: a deny-list of EXIF/XMP/IPTC/comment markers let an APP2 ICC profile through.)
//
// JPEG kept: DQT, DHT, every SOF, SOS (with its entropy-coded data), DRI, RSTn, EOI, DNL of its fixed
// size, APP0 JFIF of its fixed size with no thumbnail, APP14 Adobe of its fixed size. Everything else
// is dropped (all other APPn including the ICC profile, COM, JPGn), and so is anything after EOI.
// Dropping the ICC profile means a wide-gamut photo is shown as sRGB.
const JPEG_PIXEL_MARKERS = new Set([
  0xdb, 0xc4, 0xda, 0xdd,
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const JFIF_LENGTH = 16;
const ADOBE_LENGTH = 14;
const DNL_LENGTH = 4;

// PNG kept: the critical chunks, tRNS, and sRGB and gAMA at their fixed sizes. Everything else, and
// anything after IEND, is dropped.
const PNG_PIXEL_CHUNKS = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS']);
const PNG_FIXED_CHUNKS = new Map([['sRGB', 1], ['gAMA', 4]]);

function jpegSegmentKept(buf, marker, start, end) {
  if (JPEG_PIXEL_MARKERS.has(marker)) return true;
  const len = end - start - 2;
  if (marker === 0xe0) return len === JFIF_LENGTH && buf.toString('latin1', start + 4, start + 9) === 'JFIF\0' && buf[start + 16] === 0 && buf[start + 17] === 0;
  if (marker === 0xee) return len === ADOBE_LENGTH && buf.toString('latin1', start + 4, start + 9) === 'Adobe';
  if (marker === 0xdc) return len === DNL_LENGTH;
  return false;
}

// Splits a JPEG into the pieces to keep and a list of what is dropped.
function classifyJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new ToolError('not a valid JPEG (no start marker)');
  const kept = [buf.subarray(0, 2)];
  const dropped = [];
  let i = 2;
  let ended = false;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new ToolError('JPEG structure is damaged; re-export the image');
    const marker = buf[i + 1];
    if (marker === 0xd9) {
      kept.push(buf.subarray(i, i + 2));
      if (i + 2 < buf.length) dropped.push(`${buf.length - i - 2} bytes after the end of the JPEG`);
      ended = true;
      break;
    }
    if (marker === 0xd8) throw new ToolError('JPEG structure is damaged; re-export the image');
    if (marker === 0xff) {
      i += 1; // a fill byte before a marker
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) throw new ToolError('JPEG structure is damaged; re-export the image');
    const len = buf.readUInt16BE(i + 2);
    let end = i + 2 + len;
    if (len < 2 || end > buf.length) throw new ToolError('JPEG segment runs past the end of the file; re-export the image');
    if (marker === 0xda) {
      // Entropy-coded data follows the scan header. A 0xff in it is followed by 0x00 (stuffing), a
      // restart marker or a fill 0xff; the first 0xff followed by anything else is the next marker.
      let j = end;
      while (j < buf.length) {
        if (buf[j] === 0xff && j + 1 < buf.length && buf[j + 1] !== 0x00 && buf[j + 1] !== 0xff && !(buf[j + 1] >= 0xd0 && buf[j + 1] <= 0xd7)) break;
        j += 1;
      }
      end = j;
    }
    if (jpegSegmentKept(buf, marker, i, marker === 0xda ? i + 2 + len : end)) kept.push(buf.subarray(i, end));
    else dropped.push(`JPEG segment 0x${marker.toString(16)}`);
    i = end;
  }
  if (!ended) throw new ToolError('JPEG has no end marker; re-export the image');
  return { kept, dropped };
}

function classifyPng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new ToolError('not a valid PNG (bad signature)');
  const kept = [PNG_SIGNATURE];
  const dropped = [];
  let i = 8;
  while (i < buf.length) {
    if (i + 8 > buf.length) throw new ToolError('PNG structure is damaged; re-export the image');
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (end > buf.length) throw new ToolError('PNG chunk runs past the end of the file; re-export the image');
    // An animated PNG keeps its extra frames in chunks the allow-list does not name; dropping them would
    // publish a one-frame picture that looks valid. Refuse it instead, and say what to do.
    if (type === 'acTL') throw new ToolError('animated PNG (APNG); animation is not supported, export a still image (one frame) as PNG or JPEG first');
    if (PNG_PIXEL_CHUNKS.has(type) || PNG_FIXED_CHUNKS.get(type) === len) kept.push(buf.subarray(i, end));
    else dropped.push(`PNG chunk ${type}`);
    i = end;
    if (type === 'IEND') {
      if (i < buf.length) dropped.push(`${buf.length - i} bytes after the end of the PNG`);
      break;
    }
  }
  return { kept, dropped };
}

function classify(buf, ext) {
  const e = ext.toLowerCase();
  if (JPEG.has(e)) return classifyJpeg(buf);
  if (PNG.has(e)) return classifyPng(buf);
  return null;
}

export function stripMetadata(buf, ext) {
  const parts = classify(buf, ext);
  if (!parts) throw new ToolError(`${ext.toLowerCase()} images cannot be checked for location data here; export as JPEG or PNG first`);
  return Buffer.concat(parts.kept);
}

export function findMetadata(buf, ext) {
  const parts = classify(buf, ext);
  if (!parts) return [`${ext.toLowerCase()} cannot be inspected; only JPEG and PNG are allowed`];
  return parts.dropped;
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
  if (m.assets.some((a) => !a || typeof a !== 'object' || Array.isArray(a))) throw new ToolError(`${path} has an asset entry that is not an object`);
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
  const role = approverRole(approvedBy);
  if (!role) {
    throw new ToolError(`--approved-by is published in the public manifest, so it must be one of: ${APPROVER_ROLES.join(', ')} (never a name, email address or phone number)`, 2);
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
    let clean;
    let left;
    try {
      clean = stripMetadata(original, ext);
      left = findMetadata(clean, ext);
    } catch (err) {
      if (err instanceof ToolError) throw new ToolError(`${rel}: ${err.message}`, err.code);
      throw err;
    }
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
      id: p.file, sha256: p.hash, source: 'client-supplied', approved_by: role, approved_at: day, credit: '', alt: '',
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

// The manifest is published, so every key and every value shape is allow-listed. credit and alt stay
// free text (a photographer credit and a description are published on purpose) and are a named limit:
// they are reviewed in the pull request like any page copy.
export const MANIFEST_TOP_KEYS = Object.freeze(['schema', 'assets']);
export const MANIFEST_ENTRY_KEYS = Object.freeze(['id', 'sha256', 'source', 'approved_by', 'approved_at', 'credit', 'alt']);
const MANIFEST_ID = /^img-[0-9a-f]{12}\.(jpg|png)$/;
// The day this tool first ingested anything; an earlier approved_at was not written by it.
const FIRST_INGEST_DAY = '2026-11-16';

function auditManifestShape(manifest) {
  const problems = [];
  for (const k of Object.keys(manifest)) {
    if (!MANIFEST_TOP_KEYS.includes(k)) problems.push(`[asset] manifest has a field not in the fixed set: ${k}`);
  }
  if (manifest.schema !== 1) problems.push('[asset] manifest schema must be 1');
  manifest.assets.forEach((a, i) => {
    const label = `manifest entry ${typeof a.id === 'string' && MANIFEST_ID.test(a.id) ? a.id : `#${i + 1}`}`;
    for (const k of Object.keys(a)) {
      if (!MANIFEST_ENTRY_KEYS.includes(k)) problems.push(`[asset] ${label} has a field not in the fixed set: ${k}`);
    }
    for (const k of MANIFEST_ENTRY_KEYS) {
      if (!(k in a)) problems.push(`[asset] ${label} is missing field: ${k}`);
    }
    const shaOk = typeof a.sha256 === 'string' && /^[0-9a-f]{64}$/.test(a.sha256);
    if (typeof a.id !== 'string' || !MANIFEST_ID.test(a.id)) problems.push(`[asset] ${label}: id must be img-<12 hex>.jpg or .png`);
    else if (shaOk && a.id.slice(4, 16) !== a.sha256.slice(0, 12)) problems.push(`[asset] ${label}: id must be img- plus the first 12 characters of its sha256`);
    if (!shaOk) problems.push(`[asset] ${label}: sha256 must be 64 lower-case hex characters`);
    if (a.source !== 'client-supplied') problems.push(`[asset] ${label}: source must be client-supplied`);
    if (typeof a.approved_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.approved_at)) {
      problems.push(`[asset] ${label}: approved_at must be a YYYY-MM-DD date`);
    } else {
      const d = new Date(`${a.approved_at}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== a.approved_at) problems.push(`[asset] ${label}: approved_at must be a real YYYY-MM-DD date`);
      else if (a.approved_at < FIRST_INGEST_DAY || d.getTime() > Date.now() + 86400000) problems.push(`[asset] ${label}: approved_at must fall between ${FIRST_INGEST_DAY} and today`);
    }
    if (typeof a.credit !== 'string' || typeof a.alt !== 'string') problems.push(`[asset] ${label}: credit and alt must be text`);
  });
  return problems;
}

// Problems with committed client assets: unlisted files, hash drift, metadata, oversize, and any
// manifest key or value outside the fixed shape.
export function auditClientAssets(sitesDir, slug) {
  const problems = [];
  const assetDir = join(sitesDir, slug, 'src', 'assets', 'client');
  if (!existsSync(assetDir)) return problems;
  const mPath = manifestPath(sitesDir, slug);
  const manifest = readManifest(mPath);
  // The repo publishes bytes, not the parsed object: JSON.parse drops all but the last of a
  // duplicated key, so anything the parser did not keep must fail here.
  if (existsSync(mPath) && !readFileSync(mPath).equals(Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'))) {
    problems.push('[asset] manifest.json is not exactly what the tool writes (a duplicated key, extra text or hand formatting); restore it from git or re-run ingest');
  }
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
    try {
      for (const m of findMetadata(buf, extname(entry.name))) problems.push(`[asset] ${entry.name} still carries metadata: ${m}`);
    } catch (err) {
      if (!(err instanceof ToolError)) throw err;
      problems.push(`[asset] ${entry.name} cannot be published: ${err.message}`);
    }
    if (statSync(full).size > MAX_ASSET_BYTES) problems.push(`[asset] ${entry.name} is over 1 MB`);
  }
  problems.push(...auditManifestShape(manifest));
  for (const a of manifest.assets) {
    if (typeof a.id !== 'string' || !MANIFEST_ID.test(a.id)) continue;
    if (!existsSync(join(assetDir, a.id))) problems.push(`[asset] manifest lists ${a.id} but the file is missing`);
    if (!APPROVER_ROLES.includes(a.approved_by)) problems.push(`[asset] manifest entry ${a.id}: approved_by is not one of the fixed roles (${APPROVER_ROLES.join(', ')})`);
  }
  return problems;
}

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { run } from '../website/client-site.mjs';
import {
  ToolError, ensureEncryptedRoot, resolveClientRoot, systemEncryptionProbe,
} from '../website/lib/common.mjs';
import { findMetadata, ingest, stripMetadata } from '../website/lib/images.mjs';
import { VERCEL_MAX_REDIRECTS, applyRedirects, wpExport } from '../website/lib/wordpress.mjs';
import {
  checkProject, draftEmail, jsStringLiteral, liveCheck, newProject, note, offboard, renderTokens, status,
} from '../website/lib/workspace.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NOW = new Date('2026-11-16T01:00:00Z');
const QUIET = { log() {}, error() {} };
// The CLI checks the client projects folder is on an encrypted volume before any command. Tests
// inject the answer so they run the same on a FileVault Mac and a Linux CI runner.
const ENCRYPTED = () => ({ encrypted: true, volume: '/dev/test', reason: 'test' });

function sandbox() {
  const base = mkdtempSync(join(tmpdir(), 'client-site-'));
  const ctx = { clientRoot: join(base, 'client-projects'), sitesDir: join(base, 'sites') };
  mkdirSync(ctx.sitesDir);
  return { base, ctx, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

function scaffold(ctx, slug = 'sample-cafe') {
  return newProject(ctx, { slug, name: 'Sample Cafe', domain: 'samplecafe.com.au', host: 'vercel', contactName: 'Alex', now: NOW });
}

// A minimal JPEG: SOI, APP1 "Exif" (the metadata to strip), DQT, SOS with two data bytes, EOI.
function jpegWithExif(seed = 0x11) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xe1, 0x00, 0x0c, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, 0x53, 0x21,
    0xff, 0xdb, 0x00, 0x04, 0x01, 0x02,
    0xff, 0xda, 0x00, 0x04, 0x03, 0x04, seed, 0x22,
    0xff, 0xd9,
  ]);
}

function chunk(type, data = Buffer.alloc(0)) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
}

function pngWithText() {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', Buffer.alloc(13)), chunk('tEXt', Buffer.from('Author\0Jane')), chunk('IDAT', Buffer.from([1, 2, 3])), chunk('IEND'),
  ]);
}

// WordPress REST responses shaped like core's: X-WP-Total, X-WP-TotalPages, JSON content type.
// Fixture shape follows the WordPress REST API handbook for /wp/v2/pages and /wp/v2/posts (16/11/2026).
function wpResponse(items, { total = items.length, totalPages = 1, status = 200, type = 'application/json; charset=UTF-8', body } = {}) {
  return new Response(body ?? JSON.stringify(items), {
    status, headers: { 'content-type': type, 'x-wp-total': String(total), 'x-wp-totalpages': String(totalPages) },
  });
}

function wpSite({ pages = 150, posts = 1, override = {} } = {}) {
  const pageItems = Array.from({ length: pages }, (_, i) => ({ id: i + 1, slug: `page-${i + 1}`, link: `https://old.example/page-${i + 1}/`, title: { rendered: `Page ${i + 1}` }, type: 'page' }));
  const postItems = Array.from({ length: posts }, (_, i) => ({ id: 1000 + i, slug: `news-${i}`, link: `https://old.example/2019/05/news-${i}/`, title: { rendered: `News ${i}` }, type: 'post' }));
  const all = { pages: pageItems, posts: postItems, media: [] };
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const u = new URL(url);
    const name = u.pathname.split('/').pop();
    const page = Number(u.searchParams.get('page'));
    const key = `${name}:${page}`;
    if (override[key]) return override[key]();
    const items = all[name];
    const totalPages = Math.max(1, Math.ceil(items.length / 100));
    return wpResponse(items.slice((page - 1) * 100, page * 100), { total: items.length, totalPages });
  };
  return { fetchImpl, calls };
}

function exportDirs(ctx, slug) {
  const root = join(ctx.clientRoot, slug, 'incoming', 'wordpress');
  return existsSync(root) ? readdirSync(root).filter((n) => !n.startsWith('.')) : [];
}

// ---------- new ----------

test('new creates a private workspace and a public site from the template', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const r = scaffold(ctx);
    const ws = r.workspace;
    for (const d of ['incoming/reference', 'incoming/changes', 'incoming/done', 'outgoing/emails/sent']) assert.ok(existsSync(join(ws, d)), d);
    const project = JSON.parse(readFileSync(join(ws, 'project.json'), 'utf8'));
    assert.equal(project.slug, 'sample-cafe');
    assert.equal(project.client_status, 'active');
    assert.match(readFileSync(join(ws, 'NOTES.md'), 'utf8'), /^# Sample Cafe - project notes/);
    const site = r.site;
    assert.ok(existsSync(join(site, 'package-lock.json')));
    assert.match(readFileSync(join(site, '.npmrc'), 'utf8'), /^ignore-scripts=true$/m);
    assert.equal(JSON.parse(readFileSync(join(site, 'vercel.json'), 'utf8')).installCommand, 'npm ci');
    assert.match(readFileSync(join(site, 'astro.config.mjs'), 'utf8'), /site: 'https:\/\/samplecafe\.com\.au'/);
    assert.doesNotMatch(readFileSync(join(site, 'src/layouts/Base.astro'), 'utf8'), /\{\{NAME\}\}/);
    assert.ok(!existsSync(join(site, 'incoming')) && !existsSync(join(site, 'project.json')));
  } finally {
    cleanup();
  }
});

test('new refuses an existing slug and changes nothing', () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const before = readFileSync(join(ctx.clientRoot, 'sample-cafe', 'NOTES.md'), 'utf8');
    writeFileSync(join(ctx.clientRoot, 'sample-cafe', 'NOTES.md'), `${before}\nkeep me\n`);
    assert.throws(() => scaffold(ctx), /already exists/);
    assert.match(readFileSync(join(ctx.clientRoot, 'sample-cafe', 'NOTES.md'), 'utf8'), /keep me/);
  } finally {
    cleanup();
  }
});

test('new names the missing half when only one target exists', () => {
  const { ctx, cleanup } = sandbox();
  try {
    mkdirSync(join(ctx.sitesDir, 'sample-cafe'));
    assert.throws(() => scaffold(ctx), /site folder .* exists but the workspace .* does not/);
  } finally {
    cleanup();
  }
});

test('new refuses a bad slug, a www domain and the cloudflare host', () => {
  const { ctx, cleanup } = sandbox();
  try {
    assert.throws(() => newProject(ctx, { slug: 'Bad.Slug', name: 'X', domain: 'x.com.au' }), /invalid slug/);
    assert.throws(() => newProject(ctx, { slug: 'ok-slug', name: 'X', domain: 'www.x.com.au' }), /bare domain/);
    assert.throws(() => newProject(ctx, { slug: 'ok-slug', name: 'X', domain: 'x.com.au', host: 'cloudflare' }), /no verified Cloudflare account/);
    assert.ok(!existsSync(ctx.clientRoot) || readdirSync(ctx.clientRoot).length === 0);
  } finally {
    cleanup();
  }
});

test('a failed new keeps nothing: no workspace left when the site cannot be written', { skip: process.getuid?.() === 0 }, () => {
  const { ctx, cleanup } = sandbox();
  try {
    chmodSync(ctx.sitesDir, 0o555);
    assert.throws(() => scaffold(ctx), /new stopped, nothing kept/);
    assert.ok(!existsSync(join(ctx.clientRoot, 'sample-cafe')));
    assert.deepEqual(readdirSync(ctx.clientRoot).filter((n) => n.includes('sample-cafe')), []);
  } finally {
    chmodSync(ctx.sitesDir, 0o755);
    cleanup();
  }
});

test('the client projects folder may not sit inside a git work tree', () => {
  const { base, cleanup } = sandbox();
  try {
    mkdirSync(join(base, 'repo', '.git'), { recursive: true });
    assert.throws(() => resolveClientRoot({ clientRoot: join(base, 'repo', 'clients') }), /inside the git work tree/);
    assert.throws(() => resolveClientRoot({ clientRoot: 'relative/path' }), /absolute path/);
    assert.equal(resolveClientRoot({ clientRoot: join(base, 'elsewhere') }), join(realpathSync(base), 'elsewhere'));
  } finally {
    cleanup();
  }
});

test('commands on a workspace that is not on this machine fail instead of looking empty', () => {
  const { ctx, cleanup } = sandbox();
  try {
    assert.throws(() => status(ctx, { slug: 'nobody' }), /not on this machine/);
    assert.throws(() => note(ctx, { slug: 'nobody', done: 'a', next: 'b' }), /not on this machine/);
    assert.throws(() => ingest(ctx, { slug: 'nobody' }), /not on this machine/);
  } finally {
    cleanup();
  }
});

// ---------- wp-export ----------

test('wp-export follows X-WP-TotalPages and writes a complete export with a redirect map', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const { fetchImpl, calls } = wpSite({ pages: 150, posts: 1 });
    const lines = [];
    const r = await wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example/', fetchImpl, now: NOW, log: (l) => lines.push(l) });
    assert.ok(calls.some((u) => u.includes('/pages?') && u.includes('page=2')), 'fetched page 2');
    assert.ok(calls.every((u) => !u.includes('_embed') && !u.includes('/users')));
    const pages = JSON.parse(readFileSync(join(r.dir, 'pages.json'), 'utf8'));
    assert.equal(pages.length, 150);
    const summary = JSON.parse(readFileSync(join(r.dir, 'export-summary.json'), 'utf8'));
    assert.deepEqual([summary.endpoints.pages.expected, summary.endpoints.pages.received, summary.endpoints.pages.result], [150, 150, 'complete']);
    assert.deepEqual(lines, ['pages 150/150', 'posts 1/1', 'media 0/0']);
    const { redirects } = JSON.parse(readFileSync(join(r.dir, 'redirects.json'), 'utf8'));
    assert.deepEqual(redirects, [{ from: '/2019/05/news-0/', to: '/blog/news-0/' }]);
  } finally {
    cleanup();
  }
});

test('wp-export writes nothing when page 2 fails after page 1 succeeded', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const { fetchImpl } = wpSite({ pages: 150, override: { 'pages:2': () => wpResponse([], { status: 503 }) } });
    await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), /nothing written: .*returned 503/);
    assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
  } finally {
    cleanup();
  }
});

test('wp-export treats a short count as partial and writes nothing', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const { fetchImpl } = wpSite({ pages: 2, override: { 'pages:1': () => wpResponse([{ id: 1, slug: 'a', link: 'https://old.example/a/' }], { total: 2 }) } });
    await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), /received 1 of 2/);
    assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
  } finally {
    cleanup();
  }
});

test('wp-export records media WordPress hides from anonymous readers as visible-only and still writes', async () => {
  // Real case, wordpress.org/news 16/11/2026: X-WP-Total 1735, 1698 listed. Core counts before it
  // drops attachments whose parent is a draft or private post.
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const media = [{ id: 7, slug: 'cup', source_url: 'https://old.example/cup.jpg' }];
    const { fetchImpl } = wpSite({ pages: 2, override: { 'media:1': () => wpResponse(media, { total: 3 }) } });
    const lines = [];
    const r = await wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW, log: (l) => lines.push(l) });
    assert.equal(r.summary.endpoints.media.result, 'visible-only');
    assert.equal(r.summary.endpoints.media.hidden, 2);
    assert.equal(r.summary.endpoints.pages.result, 'complete');
    assert.ok(lines.some((l) => /^WARNING: media: 2 item\(s\) counted by WordPress but hidden/.test(l)), lines.join('\n'));
    const written = JSON.parse(readFileSync(join(r.dir, 'export-summary.json'), 'utf8'));
    assert.equal(written.endpoints.media.hidden, 2);
  } finally {
    cleanup();
  }
});

test('wp-export still stops on a short post list, a list longer than its total, or an item listed twice', async () => {
  const cases = [
    // A non-empty short list, so only the exact-count rule can stop it (independent review, acb94f0f2:
    // a 0-of-1 case was also caught by the zero-listed rule, so it could not prove the exact count).
    [{ 'posts:1': () => wpResponse([{ id: 1000, slug: 'news-0', link: 'https://old.example/2019/05/news-0/' }], { total: 2 }) }, /posts: received 1 of 2/],
    [{ 'media:1': () => wpResponse([{ id: 1 }, { id: 2 }], { total: 1 }) }, /media: received 2 of 1/],
    [{ 'media:1': () => wpResponse([{ id: 1 }, { id: 1 }], { total: 2 }) }, /media: 1 item\(s\) came back twice/],
  ];
  for (const [override, message] of cases) {
    const { ctx, cleanup } = sandbox();
    try {
      scaffold(ctx);
      const { fetchImpl } = wpSite({ pages: 2, override });
      await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), message);
      assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
    } finally {
      cleanup();
    }
  }
});

test('wp-export stops when a later page reports a different total, so a deletion mid-read is never taken for hidden media', async () => {
  // Bench R3 ruling: an item deleted between page 1 and page 2 shifts the rest up one place, so one is
  // skipped and nothing repeats. Only the changed total on the later page shows it.
  const media = Array.from({ length: 150 }, (_, i) => ({ id: 5000 + i, slug: `m${i}`, source_url: `https://old.example/m${i}.jpg` }));
  const cases = [
    { 'media:1': () => wpResponse(media.slice(0, 100), { total: 151, totalPages: 2 }),
      'media:2': () => wpResponse(media.slice(100), { total: 150, totalPages: 2 }) },
    { 'pages:1': () => wpResponse(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, slug: `p${i}`, link: `https://old.example/p${i}/` })), { total: 150, totalPages: 2 }),
      'pages:2': () => wpResponse(Array.from({ length: 50 }, (_, i) => ({ id: 200 + i, slug: `q${i}`, link: `https://old.example/q${i}/` })), { total: 150, totalPages: 3 }) },
  ];
  for (const override of cases) {
    const { ctx, cleanup } = sandbox();
    try {
      scaffold(ctx);
      const { fetchImpl } = wpSite({ pages: 2, override });
      await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), /page 2 reported .* page 1 reported .*the list changed while it was read/);
      assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
    } finally {
      cleanup();
    }
  }
});

test('wp-export treats media that lists nothing against a non-zero total as blocked', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const { fetchImpl } = wpSite({ pages: 2, override: { 'media:1': () => wpResponse([], { total: 40 }) } });
    await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), /media: listed 0 of 40/);
    assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
  } finally {
    cleanup();
  }
});

test('wp-export treats a 401 JSON body, an HTML page and a fetch error as blocked', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const cases = [
      [() => wpResponse([], { status: 401, body: JSON.stringify({ code: 'rest_login_required' }) }), /returned 401/],
      [() => wpResponse([], { type: 'text/html', body: '<html>challenge</html>' }), /not JSON/],
      [() => wpResponse([], { body: JSON.stringify({ code: 'rest_no_route' }) }), /did not return a list/],
      [() => { throw new TypeError('network down'); }, /could not be read/],
    ];
    for (const [respond, pattern] of cases) {
      const { fetchImpl } = wpSite({ override: { 'pages:1': respond } });
      await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), pattern);
    }
    assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
  } finally {
    cleanup();
  }
});

test('wp-export refuses 0 pages unless --allow-empty', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const { fetchImpl } = wpSite({ pages: 0, posts: 0 });
    await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), /reports 0 pages/);
    assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
    const r = await wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, allowEmpty: true, now: NOW });
    assert.ok(existsSync(r.dir));
  } finally {
    cleanup();
  }
});

test('redirects writes the map into vercel.json and check fails until it does', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const { fetchImpl } = wpSite({ pages: 1, posts: 2 });
    await wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW });
    assert.match(checkProject(ctx, { slug: 'sample-cafe' }).problems.join('\n'), /\[redirect\] \/2019\/05\/news-0\/ -> \/blog\/news-0\//);
    assert.equal(applyRedirects(ctx, { slug: 'sample-cafe' }).applied, 2);
    const cfg = JSON.parse(readFileSync(join(ctx.sitesDir, 'sample-cafe', 'vercel.json'), 'utf8'));
    assert.deepEqual(cfg.redirects[0], { source: '/2019/05/news-0/', destination: '/blog/news-0/', permanent: true });
    assert.deepEqual(checkProject(ctx, { slug: 'sample-cafe' }).problems, []);
  } finally {
    cleanup();
  }
});

// ---------- images ----------

test('metadata stripping removes JPEG APP1 and PNG text chunks and keeps the image data', () => {
  const jpeg = jpegWithExif();
  assert.deepEqual(findMetadata(jpeg, '.jpg'), ['JPEG segment 0xe1']);
  const clean = stripMetadata(jpeg, '.jpg');
  assert.deepEqual(findMetadata(clean, '.jpg'), []);
  assert.equal(clean.indexOf(Buffer.from('Exif')), -1);
  assert.ok(clean.includes(Buffer.from([0x11, 0x22, 0xff, 0xd9])));
  const png = stripMetadata(pngWithText(), '.png');
  assert.deepEqual(findMetadata(png, '.png'), []);
  assert.equal(png.indexOf(Buffer.from('Jane')), -1);
  assert.ok(png.includes(Buffer.from('IDAT')));
});

// Kind: "private client bytes reach the published image". Seen twice (UNI-3433 review rounds 1 and 3):
// a fullwidth `@` past the approver deny-list, then APP2 (ICC profile) past the JPEG marker deny-list.
// Design: what a published image may contain is an ALLOW-LIST of pixel-structure segments and chunks,
// and stripping and inspecting both read that one list, so a segment type nobody named is dropped.
const PRIVATE = Buffer.from('PRIVATE-CLIENT-MATERIAL');

function jpegSegment(marker, payload) {
  const len = Buffer.alloc(2);
  len.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), len, payload]);
}

function jpegWith(marker, payload, tail = Buffer.alloc(0)) {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    jpegSegment(marker, payload),
    jpegSegment(0xdb, Buffer.from([0x01, 0x02])),
    jpegSegment(0xda, Buffer.from([0x03, 0x04])),
    Buffer.from([0x11, 0xff, 0x00, 0x22, 0xff, 0xd9]),
    tail,
  ]);
}

test('JPEG: every segment outside the pixel-structure allow-list is dropped, whatever its marker', () => {
  const markers = [];
  for (let m = 0xe1; m <= 0xef; m += 1) markers.push(m); // APP1 to APP15 (APP2 is the ICC profile)
  markers.push(0xfe, 0xf0, 0xf5, 0xfd, 0xc8, 0xdc, 0xdf); // COM, JPGn, JPG, DNL, EXP
  for (const marker of markers) {
    const dirty = jpegWith(marker, Buffer.concat([Buffer.from('ICC_PROFILE\0'), PRIVATE]));
    assert.notDeepEqual(findMetadata(dirty, '.jpg'), [], `marker 0x${marker.toString(16)} must be reported`);
    const clean = stripMetadata(dirty, '.jpg');
    assert.equal(clean.indexOf(PRIVATE), -1, `marker 0x${marker.toString(16)} bytes survived stripping`);
    assert.deepEqual(findMetadata(clean, '.jpg'), [], `marker 0x${marker.toString(16)}: clean output still reported`);
    assert.ok(clean.includes(Buffer.from([0x11, 0xff, 0x00, 0x22, 0xff, 0xd9])), 'pixel data kept');
  }
});

test('JPEG: APP0 JFIF and APP14 Adobe are kept only in their fixed, thumbnail-free form', () => {
  const jfif = Buffer.concat([Buffer.from('JFIF\0'), Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0])]);
  assert.deepEqual(findMetadata(jpegWith(0xe0, jfif), '.jpg'), []);
  const withThumb = Buffer.concat([jfif.subarray(0, 12), Buffer.from([2, 2]), PRIVATE]);
  assert.notDeepEqual(findMetadata(jpegWith(0xe0, withThumb), '.jpg'), []);
  assert.equal(stripMetadata(jpegWith(0xe0, withThumb), '.jpg').indexOf(PRIVATE), -1);
  const adobe = Buffer.concat([Buffer.from('Adobe'), Buffer.from([0, 100, 0, 0, 0, 0, 1])]);
  assert.deepEqual(findMetadata(jpegWith(0xee, adobe), '.jpg'), []);
  assert.notDeepEqual(findMetadata(jpegWith(0xee, Buffer.concat([Buffer.from('Adobe'), PRIVATE])), '.jpg'), []);
});

test('JPEG: bytes after the end-of-image marker are reported and removed', () => {
  const dirty = jpegWith(0xdb, Buffer.from([0x01, 0x02]), PRIVATE);
  assert.notDeepEqual(findMetadata(dirty, '.jpg'), []);
  const clean = stripMetadata(dirty, '.jpg');
  assert.equal(clean.indexOf(PRIVATE), -1);
  assert.deepEqual(findMetadata(clean, '.jpg'), []);
});

test('PNG: only critical chunks, tRNS, sRGB and gAMA survive; unknown chunks and trailing bytes do not', () => {
  const head = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const type of ['iCCP', 'eXIf', 'prVt', 'zzZz', 'bKGD', 'sPLT', 'pHYs', 'tEXt']) {
    const dirty = Buffer.concat([head, chunk('IHDR', Buffer.alloc(13)), chunk(type, PRIVATE), chunk('IDAT', Buffer.from([1, 2, 3])), chunk('IEND')]);
    assert.notDeepEqual(findMetadata(dirty, '.png'), [], `chunk ${type} must be reported`);
    const clean = stripMetadata(dirty, '.png');
    assert.equal(clean.indexOf(PRIVATE), -1, `chunk ${type} bytes survived stripping`);
    assert.deepEqual(findMetadata(clean, '.png'), []);
  }
  const kept = Buffer.concat([head, chunk('IHDR', Buffer.alloc(13)), chunk('gAMA', Buffer.alloc(4)), chunk('sRGB', Buffer.alloc(1)), chunk('IDAT', Buffer.from([1])), chunk('IEND')]);
  assert.deepEqual(findMetadata(kept, '.png'), []);
  const trailing = Buffer.concat([kept, PRIVATE]);
  assert.notDeepEqual(findMetadata(trailing, '.png'), []);
  assert.equal(stripMetadata(trailing, '.png').indexOf(PRIVATE), -1);
  const wide = Buffer.concat([head, chunk('IHDR', Buffer.alloc(13)), chunk('gAMA', PRIVATE), chunk('IDAT', Buffer.from([1])), chunk('IEND')]);
  assert.notDeepEqual(findMetadata(wide, '.png'), [], 'a gAMA chunk of the wrong size can carry bytes');
});

test('ingest publishes a JPEG with a private APP2 segment clean, and the project check agrees', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace, site } = scaffold(ctx);
    writeFileSync(join(workspace, 'incoming', 'logo.jpg'), jpegWith(0xe2, Buffer.concat([Buffer.from('ICC_PROFILE\0'), PRIVATE])));
    const r = ingest(ctx, { slug: 'sample-cafe', select: ['logo.jpg'], approvedBy: 'operator', now: NOW });
    const published = readFileSync(join(site, 'src', 'assets', 'client', r.ingested[0].file));
    assert.equal(published.indexOf(PRIVATE), -1);
    assert.deepEqual(checkProject(ctx, { slug: 'sample-cafe' }).problems, []);
  } finally {
    cleanup();
  }
});

// Kind: "private material is written inside a git work tree". Design: one function owns the rule and
// it judges the CANONICAL path (symlinks resolved, including through a path that does not exist yet).
test('a client projects folder reached through a symlink into a git work tree is refused', () => {
  const { base, cleanup } = sandbox();
  try {
    mkdirSync(join(base, 'repo', '.git'), { recursive: true });
    mkdirSync(join(base, 'repo', 'clients'));
    symlinkSync(join(base, 'repo', 'clients'), join(base, 'link'));
    assert.throws(() => resolveClientRoot({ clientRoot: join(base, 'link') }), /inside the git work tree/);
    assert.throws(() => resolveClientRoot({ clientRoot: join(base, 'link', 'not-yet') }), /inside the git work tree/);
    symlinkSync(join(base, 'repo'), join(base, 'link2'));
    assert.throws(() => resolveClientRoot({ clientRoot: join(base, 'link2', 'deep', 'er') }), /inside the git work tree/);
    assert.equal(resolveClientRoot({ clientRoot: join(base, 'elsewhere') }), realpathSync(base) + '/elsewhere');
  } finally {
    cleanup();
  }
});

test('a project folder that is a symlink into a git work tree is refused before anything is written', () => {
  const { base, ctx, cleanup } = sandbox();
  try {
    mkdirSync(join(base, 'repo', '.git'), { recursive: true });
    mkdirSync(ctx.clientRoot, { recursive: true });
    symlinkSync(join(base, 'repo'), join(ctx.clientRoot, 'sample-cafe'));
    assert.throws(() => scaffold(ctx), /inside the git work tree/);
    assert.deepEqual(readdirSync(join(base, 'repo')), ['.git']);
  } finally {
    cleanup();
  }
});

test('ingest lists without copying, then copies only approved images, stripped and hash-named', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace, site } = scaffold(ctx);
    const incoming = join(workspace, 'incoming');
    writeFileSync(join(incoming, 'jane-smith-house.jpg'), jpegWithExif(0x11));
    writeFileSync(join(incoming, 'not-approved.jpg'), jpegWithExif(0x33));
    writeFileSync(join(incoming, 'reference', 'competitor.png'), pngWithText());
    const listed = ingest(ctx, { slug: 'sample-cafe', now: NOW });
    assert.deepEqual(listed.listed, ['jane-smith-house.jpg', 'not-approved.jpg']);
    assert.ok(!existsSync(join(site, 'src', 'assets', 'client')));
    assert.throws(() => ingest(ctx, { slug: 'sample-cafe', select: ['jane-smith-house.jpg'], now: NOW }), /--approved-by/);
    assert.throws(() => ingest(ctx, { slug: 'sample-cafe', select: ['reference/competitor.png'], approvedBy: 'operator', now: NOW }), /never published/);

    const r = ingest(ctx, { slug: 'sample-cafe', select: ['jane-smith-house.jpg'], approvedBy: 'operator', now: NOW });
    assert.equal(r.ingested.length, 1);
    const assetDir = join(site, 'src', 'assets', 'client');
    const file = r.ingested[0].file;
    assert.match(file, /^img-[0-9a-f]{12}\.jpg$/);
    assert.deepEqual(findMetadata(readFileSync(join(assetDir, file)), '.jpg'), []);
    const manifest = JSON.parse(readFileSync(join(assetDir, 'manifest.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.assets[0]).sort(), ['alt', 'approved_at', 'approved_by', 'credit', 'id', 'sha256', 'source']);
    assert.doesNotMatch(JSON.stringify(manifest), /jane|smith|incoming/i);
    assert.ok(existsSync(join(incoming, 'not-approved.jpg')), 'unselected image stays private');
    assert.ok(!existsSync(join(incoming, 'jane-smith-house.jpg')));
    assert.match(readFileSync(join(incoming, 'done', '2026-11-16', 'INGEST-LOG.md'), 'utf8'), /jane-smith-house\.jpg -> /);
    assert.equal(readdirSync(assetDir).length, 2);
  } finally {
    cleanup();
  }
});

test('two different photos with the same name become two assets; the same photo twice is one', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace, site } = scaffold(ctx);
    const incoming = join(workspace, 'incoming');
    writeFileSync(join(incoming, 'IMG_0001.jpg'), jpegWithExif(0x11));
    ingest(ctx, { slug: 'sample-cafe', select: ['IMG_0001.jpg'], approvedBy: 'operator', now: NOW });
    writeFileSync(join(incoming, 'IMG_0001.jpg'), jpegWithExif(0x44));
    ingest(ctx, { slug: 'sample-cafe', select: ['IMG_0001.jpg'], approvedBy: 'operator', now: NOW });
    writeFileSync(join(incoming, 'IMG_0001.jpg'), jpegWithExif(0x44));
    const again = ingest(ctx, { slug: 'sample-cafe', select: ['IMG_0001.jpg'], approvedBy: 'operator', now: NOW });
    assert.deepEqual(again.skipped, ['IMG_0001.jpg']);
    const manifest = JSON.parse(readFileSync(join(site, 'src', 'assets', 'client', 'manifest.json'), 'utf8'));
    assert.equal(manifest.assets.length, 2);
    assert.equal(new Set(manifest.assets.map((a) => a.sha256)).size, 2);
  } finally {
    cleanup();
  }
});

test('ingest refuses formats it cannot inspect and images over 1 MB', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace } = scaffold(ctx);
    const incoming = join(workspace, 'incoming');
    writeFileSync(join(incoming, 'photo.heic'), Buffer.from('heic'));
    const big = Buffer.concat([jpegWithExif().subarray(0, 30), Buffer.alloc(1024 * 1024 + 10, 0x55), Buffer.from([0xff, 0xd9])]);
    writeFileSync(join(incoming, 'big.jpg'), big);
    assert.throws(() => ingest(ctx, { slug: 'sample-cafe', select: ['photo.heic'], approvedBy: 'operator' }), /export it as JPEG or PNG/);
    assert.throws(() => ingest(ctx, { slug: 'sample-cafe', select: ['big.jpg'], approvedBy: 'operator' }), /under 1 MB/);
    assert.ok(existsSync(join(incoming, 'big.jpg')));
  } finally {
    cleanup();
  }
});

// ---------- check ----------

test('check passes a fresh scaffold', () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    assert.deepEqual(checkProject(ctx, { slug: 'sample-cafe' }).problems, []);
  } finally {
    cleanup();
  }
});

const BREACHES = [
  ['a private folder inside the site', (site) => mkdirSync(join(site, 'incoming')), /\[private\] incoming/],
  ['a hand-copied photo still carrying EXIF', (site) => {
    mkdirSync(join(site, 'src/assets/client'), { recursive: true });
    writeFileSync(join(site, 'src/assets/client/x.jpg'), jpegWithExif());
  }, /\[asset\] x\.jpg has no provenance entry/],
  ['a missing lockfile', (site) => rmSync(join(site, 'package-lock.json')), /\[deps\] package-lock\.json is missing/],
  ['a range version', (site) => {
    const pkg = JSON.parse(readFileSync(join(site, 'package.json'), 'utf8'));
    pkg.dependencies.astro = `^${pkg.dependencies.astro}`;
    writeFileSync(join(site, 'package.json'), JSON.stringify(pkg));
  }, /\[deps\] astro@\^.* is not an exact version/],
  ['install scripts switched on', (site) => writeFileSync(join(site, '.npmrc'), ''), /ignore-scripts=true/],
  ['npm install on the host', (site) => writeFileSync(join(site, 'vercel.json'), JSON.stringify({ installCommand: 'npm install' })), /installCommand must be "npm ci"/],
];

for (const [name, breach, pattern] of BREACHES) {
  test(`check fails on ${name}`, () => {
    const { ctx, cleanup } = sandbox();
    try {
      const { site } = scaffold(ctx);
      breach(site);
      assert.match(checkProject(ctx, { slug: 'sample-cafe' }).problems.join('\n'), pattern);
    } finally {
      cleanup();
    }
  });
}

test('check without the workspace fails unless --site-only, which reports UNKNOWN', () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const other = { ...ctx, clientRoot: join(ctx.clientRoot, '..', 'elsewhere') };
    assert.match(checkProject(other, { slug: 'sample-cafe' }).problems.join('\n'), /not on this machine/);
    const r = checkProject(other, { slug: 'sample-cafe', siteOnly: true });
    assert.deepEqual(r.problems, []);
    assert.match(r.notes.join('\n'), /^UNKNOWN: private workspace not on this machine/m);
  } finally {
    cleanup();
  }
});

// ---------- notes, status, email, live, offboard ----------

test('note appends a dated entry and needs both done and next', () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    assert.throws(() => note(ctx, { slug: 'sample-cafe', done: 'x' }), /--done and --next/);
    note(ctx, { slug: 'sample-cafe', done: 'Home page built', next: 'About page', now: NOW });
    const text = readFileSync(join(ctx.clientRoot, 'sample-cafe', 'NOTES.md'), 'utf8');
    assert.match(text, /## 16\/11\/2026 12:00\n\n- Done: Home page built\n- Next: About page/);
    assert.equal(status(ctx, { slug: 'sample-cafe', now: NOW }).projects[0].last_note, '16/11/2026 12:00');
  } finally {
    cleanup();
  }
});

test('status flags change requests older than the limit, unsent drafts and exits 3 through the CLI', async () => {
  const { ctx, base, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const change = join(ctx.clientRoot, 'sample-cafe', 'incoming', 'changes', 'new-hours.md');
    writeFileSync(change, 'Please change the hours');
    const fresh = status(ctx, { slug: 'sample-cafe', now: new Date() }).projects[0];
    assert.equal(fresh.changes_waiting, 1);
    assert.deepEqual(fresh.attention, []);
    const old = new Date(Date.now() - 30 * 3600000);
    utimesSync(change, old, old);
    const stale = status(ctx, { slug: 'sample-cafe', now: new Date(), maxChangeHours: 24 }).projects[0];
    assert.match(stale.attention.join('\n'), /1 change request\(s\) waiting, oldest 30 h/);
    const code = await run(['status', '--all', '--root', ctx.clientRoot, '--sites', ctx.sitesDir], { log: QUIET, encryptionProbe: ENCRYPTED });
    assert.equal(code, 3);
    void base;
  } finally {
    cleanup();
  }
});

test('email writes a draft, never overwrites, and refuses change-live without a passing live check', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const a = draftEmail(ctx, { slug: 'sample-cafe', kind: 'change-preview', summary: 'New opening hours', url: 'https://preview.example/', now: NOW });
    const b = draftEmail(ctx, { slug: 'sample-cafe', kind: 'change-preview', summary: 'New opening hours', url: 'https://preview.example/', now: NOW });
    assert.notEqual(a.file, b.file);
    const text = readFileSync(a.file, 'utf8');
    assert.match(text, /^DRAFT - not sent\./);
    assert.match(text, /Hello Alex,/);
    assert.match(text, /Preview link: https:\/\/preview\.example\//);
    assert.throws(() => draftEmail(ctx, { slug: 'sample-cafe', kind: 'change-live', summary: 'x', url: 'https://samplecafe.com.au/', now: NOW }), /no passing live check/);
    const live = await liveCheck(ctx, { slug: 'sample-cafe', now: NOW, fetchImpl: liveFetch({ sha: 'b'.repeat(40) }), git: liveGit({ contains: true }) });
    assert.equal(live.ok, true, live.problems.join('; '));
    assert.ok(existsSync(draftEmail(ctx, { slug: 'sample-cafe', kind: 'change-live', summary: 'x', url: 'https://samplecafe.com.au/', now: NOW }).file));
    assert.equal(status(ctx, { slug: 'sample-cafe', now: NOW }).projects[0].drafts_waiting, 3);
  } finally {
    cleanup();
  }
});

function liveFetch({ sha, wwwStatus = 301, location = 'https://samplecafe.com.au/' }) {
  return async (url) => {
    if (url.endsWith('/version.json')) return new Response(JSON.stringify({ sha }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(null, { status: wwwStatus, headers: wwwStatus >= 300 && wwwStatus < 400 ? { location } : {} });
  };
}

function liveGit({ contains }) {
  return (args) => {
    if (args[0] === 'log') return 'a'.repeat(40);
    if (args[0] === 'merge-base') {
      if (!contains) throw new Error('not ancestor');
      return '';
    }
    throw new Error(`unexpected git ${args.join(' ')}`);
  };
}

test('live fails when the live build is older than the latest site commit or www does not redirect', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const stale = await liveCheck(ctx, { slug: 'sample-cafe', now: NOW, fetchImpl: liveFetch({ sha: 'c'.repeat(40) }), git: liveGit({ contains: false }) });
    assert.equal(stale.ok, false);
    assert.match(stale.problems.join('\n'), /does not contain the latest site commit/);
    const noRedirect = await liveCheck(ctx, { slug: 'sample-cafe', now: NOW, fetchImpl: liveFetch({ sha: 'b'.repeat(40), wwwStatus: 200 }), git: liveGit({ contains: true }) });
    assert.match(noRedirect.problems.join('\n'), /expected a permanent redirect/);
  } finally {
    cleanup();
  }
});

test('offboard records the date and status warns past retention', () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    offboard(ctx, { slug: 'sample-cafe', now: new Date('2026-01-01T00:00:00Z') });
    const p = status(ctx, { slug: 'sample-cafe', now: NOW, retentionDays: 90 }).projects[0];
    assert.equal(p.status, 'offboarded');
    assert.match(p.attention.join('\n'), /past the 90-day retention/);
  } finally {
    cleanup();
  }
});

// ---------- CLI and repo guards ----------

test('the CLI returns 2 for usage errors and surfaces the cloudflare blocker', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    assert.equal(await run([], { log: QUIET, encryptionProbe: ENCRYPTED }), 2);
    await assert.rejects(run(['new', 'x-y', '--name', 'X', '--domain', 'x.com.au', '--host', 'cloudflare', '--root', ctx.clientRoot, '--sites', ctx.sitesDir], { log: QUIET, encryptionProbe: ENCRYPTED }),
      (err) => err instanceof ToolError && err.code === 2 && /Cloudflare/.test(err.message));
    await assert.rejects(run(['frobnicate', '--root', ctx.clientRoot], { log: QUIET, encryptionProbe: ENCRYPTED }), /unknown command/);
  } finally {
    cleanup();
  }
});

test('the repo ignores private client folders under sites/ but still tracks site source', () => {
  const check = (p) => spawnSync('git', ['check-ignore', '-q', '--no-index', p], { cwd: REPO_ROOT }).status;
  assert.equal(check('sites/anything/incoming/x.jpg'), 0);
  assert.equal(check('sites/anything/outgoing/x.md'), 0);
  assert.equal(check('sites/anything/src/pages/index.astro'), 1);
  assert.equal(check('sites/anything/package.json'), 1);
  assert.equal(check('sites/anything/src/assets/client/img-0123456789ab.jpg'), 1);
  // The root ignores stray package-lock.json files; a client site's lockfile must still be committed.
  assert.equal(check('sites/anything/package-lock.json'), 1);
  assert.equal(check('scripts/website/template/astro/package-lock.json'), 1);
});

// ---------- R2: encrypted storage, approver, redirect limit, headers, ancestry ----------

test('every command refuses a client projects folder that is not encrypted, or whose encryption cannot be read', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    const answers = [
      [() => ({ encrypted: false, volume: '/dev/disk7s1', reason: 'no' }), /is not encrypted/],
      [() => { throw new Error('diskutil: no such disk'); }, /cannot tell whether .* encrypted storage \(the encryption check failed: diskutil: no such disk\)/],
      [() => ({ encrypted: null, volume: null, reason: 'unknown system' }), /cannot tell whether .*unknown system/],
    ];
    for (const [probe, pattern] of answers) {
      for (const argv of [['status', '--all'], ['new', 'sample-cafe', '--name', 'Sample Cafe', '--domain', 'samplecafe.com.au'], ['check', 'sample-cafe']]) {
        await assert.rejects(run([...argv, '--root', ctx.clientRoot, '--sites', ctx.sitesDir], { log: QUIET, encryptionProbe: probe }),
          (err) => err instanceof ToolError && err.code === 2 && pattern.test(err.message), `${argv[0]} with ${pattern}`);
      }
    }
    assert.ok(!existsSync(ctx.clientRoot), 'a refused new wrote nothing');
    assert.equal(ensureEncryptedRoot(ctx.clientRoot, ENCRYPTED).encrypted, true);
  } finally {
    cleanup();
  }
});

test('the system probe reads diskutil and refuses to guess on other systems', () => {
  const fake = (fileVault, encryption) => (cmd) => {
    if (cmd === '/bin/df') return 'Filesystem 512-blocks Used Available Capacity Mounted on\n/dev/disk9s1 1 1 1 1% /Volumes/Some Drive\n';
    const key = (k, v) => (v === undefined ? '' : `<key>${k}</key>\n\t<${v}/>\n`);
    return `<plist><dict>${key('FileVault', fileVault)}${key('Encryption', encryption)}</dict></plist>`;
  };
  assert.equal(systemEncryptionProbe('/x', { platform: 'darwin', exec: fake('true', 'false') }).encrypted, true);
  assert.equal(systemEncryptionProbe('/x', { platform: 'darwin', exec: fake('false', 'false') }).encrypted, false);
  assert.equal(systemEncryptionProbe('/x', { platform: 'darwin', exec: fake(undefined, undefined) }).encrypted, null);
  assert.equal(systemEncryptionProbe('/x', { platform: 'darwin', exec: fake('false', 'false') }).volume, '/dev/disk9s1');
  assert.equal(systemEncryptionProbe('/x', { platform: 'linux' }).encrypted, null);
});

// Independent review of acb94f0f2 got 'jane＠example.com' (fullwidth @) past a deny-list into the
// public manifest. The approver is now one of a fixed set of roles, so no free text about a person
// can reach the public repo however it is spelled.
const NOT_A_ROLE = [
  'jane@example.com', 'jane＠example.com', 'jane﹫example.com', 'jane [at] example [dot] com',
  'jane at example dot com', '0412 345 678', '０４１２ 345 678', 'Jane Smith', 'Phill',
];

test('the approver must be one of the fixed roles, so no email, phone or name in any spelling reaches the manifest', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace, site } = scaffold(ctx);
    writeFileSync(join(workspace, 'incoming', 'shopfront.jpg'), jpegWithExif());
    for (const who of NOT_A_ROLE) {
      assert.throws(() => ingest(ctx, { slug: 'sample-cafe', select: ['shopfront.jpg'], approvedBy: who, now: NOW }), /must be one of: client owner, client manager, client staff, operator/, who);
    }
    assert.ok(!existsSync(join(site, 'src', 'assets', 'client', 'manifest.json')));
    ingest(ctx, { slug: 'sample-cafe', select: ['shopfront.jpg'], approvedBy: ' Client Owner ', now: NOW });
    const path = join(site, 'src', 'assets', 'client', 'manifest.json');
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(manifest.assets[0].approved_by, 'client owner');
    assert.deepEqual(checkProject(ctx, { slug: 'sample-cafe' }).problems, []);
    for (const who of NOT_A_ROLE) {
      manifest.assets[0].approved_by = who;
      writeFileSync(path, JSON.stringify(manifest));
      assert.match(checkProject(ctx, { slug: 'sample-cafe' }).problems.join('\n'), /approved_by is not one of the fixed roles/, who);
    }
  } finally {
    cleanup();
  }
});

// Bench chair, same day: checking approved_by alone left the rest of the entry open, so a hand edit
// could add a contact field. The whole manifest is now an allow-list of keys and value shapes.
test('check fails on any manifest key outside the fixed set, a source other than client-supplied, or a malformed id, hash or date', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace, site } = scaffold(ctx);
    writeFileSync(join(workspace, 'incoming', 'shopfront.jpg'), jpegWithExif());
    ingest(ctx, { slug: 'sample-cafe', select: ['shopfront.jpg'], approvedBy: 'client owner', now: NOW });
    const path = join(site, 'src', 'assets', 'client', 'manifest.json');
    const good = readFileSync(path, 'utf8');
    assert.deepEqual(checkProject(ctx, { slug: 'sample-cafe' }).problems, []);
    const cases = [
      [(m) => { m.assets[0].approver_contact = 'jane＠example.com'; }, /has a field not in the fixed set: approver_contact/],
      [(m) => { m.owner_email = 'jane@example.com'; }, /manifest has a field not in the fixed set: owner_email/],
      [(m) => { m.assets[0].source = 'jane@example.com'; }, /source must be client-supplied/],
      [(m) => { m.assets[0].approved_at = '16/11/2026 Jane'; }, /approved_at must be a YYYY-MM-DD date/],
      [(m) => { m.assets[0].sha256 = '0412345678'; }, /sha256 must be 64 lower-case hex characters/],
      [(m) => { delete m.assets[0].credit; }, /is missing field: credit/],
      [(m) => { m.assets[0].id = 'jane-smith-0412345678.jpg'; }, /id must be img-<12 hex>\.jpg or \.png/],
    ];
    for (const [plant, expected] of cases) {
      const m = JSON.parse(good);
      plant(m);
      writeFileSync(path, JSON.stringify(m));
      assert.match(checkProject(ctx, { slug: 'sample-cafe' }).problems.join('\n'), expected, String(expected));
    }
    writeFileSync(path, JSON.stringify({ schema: 1, assets: [null] }));
    assert.throws(() => checkProject(ctx, { slug: 'sample-cafe' }), /asset entry that is not an object/);
  } finally {
    cleanup();
  }
});

// Bench chair round 2: the repo publishes the file's bytes, and JSON.parse keeps only the last of a
// duplicated key, so a decoy can hide behind a valid value (a merge conflict resolved by keeping
// both sides does exactly this). check now compares the bytes with the tool's own serialisation,
// and every value is from a fixed set or derived from the image itself.
test('check compares the published manifest byte for byte, ties each id to its hash and needs a real date', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace, site } = scaffold(ctx);
    writeFileSync(join(workspace, 'incoming', 'shopfront.jpg'), jpegWithExif());
    ingest(ctx, { slug: 'sample-cafe', select: ['shopfront.jpg'], approvedBy: 'client owner', now: NOW });
    const path = join(site, 'src', 'assets', 'client', 'manifest.json');
    const good = readFileSync(path, 'utf8');
    const entry = JSON.stringify(JSON.parse(good).assets[0]);
    const problemsFor = (text) => {
      writeFileSync(path, text);
      return checkProject(ctx, { slug: 'sample-cafe' }).problems.join('\n');
    };
    assert.equal(problemsFor(good), '');
    const duplicateEntryKey = good.replace('"approved_by": "client owner"', '"approved_by": "jane＠example.com",\n      "approved_by": "client owner"');
    assert.notEqual(duplicateEntryKey, good);
    assert.match(problemsFor(duplicateEntryKey), /manifest\.json is not exactly what the tool writes/);
    assert.match(problemsFor(`{"schema":1,"assets":[{"note":"Jane 0412 345 678"}],"assets":[${entry}]}`), /manifest\.json is not exactly what the tool writes/);
    const m = JSON.parse(good);
    const realId = m.assets[0].id;
    m.assets[0].id = `img-041234567800${realId.slice(-4)}`;
    assert.match(problemsFor(`${JSON.stringify(m, null, 2)}\n`), /id must be img- plus the first 12 characters of its sha256/);
    m.assets[0].id = realId;
    m.assets[0].approved_at = '0412-34-56';
    assert.match(problemsFor(`${JSON.stringify(m, null, 2)}\n`), /approved_at must be a real YYYY-MM-DD date/);
    m.assets[0].approved_at = '0412-03-05';
    assert.match(problemsFor(`${JSON.stringify(m, null, 2)}\n`), /approved_at must fall between 2026-11-16 and today/);
    m.assets[0].approved_at = '2099-01-01';
    assert.match(problemsFor(`${JSON.stringify(m, null, 2)}\n`), /approved_at must fall between 2026-11-16 and today/);
    // Invalid UTF-8 decodes to U+FFFD on both sides of a text comparison, so the bytes are compared.
    const bad = Buffer.concat([Buffer.from(good.slice(0, good.indexOf('"alt": ""') + 8)), Buffer.from([0xff]), Buffer.from(good.slice(good.indexOf('"alt": ""') + 8))]);
    writeFileSync(path, bad);
    assert.match(checkProject(ctx, { slug: 'sample-cafe' }).problems.join('\n'), /manifest\.json is not exactly what the tool writes/);
  } finally {
    cleanup();
  }
});

test('redirects refuses a map larger than Vercel accepts and writes nothing', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const { fetchImpl } = wpSite({ pages: 1, posts: VERCEL_MAX_REDIRECTS + 1 });
    await wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW });
    const before = readFileSync(join(ctx.sitesDir, 'sample-cafe', 'vercel.json'), 'utf8');
    assert.throws(() => applyRedirects(ctx, { slug: 'sample-cafe' }), /2049 entries; Vercel accepts at most 2048/);
    assert.equal(readFileSync(join(ctx.sitesDir, 'sample-cafe', 'vercel.json'), 'utf8'), before);
  } finally {
    cleanup();
  }
});

test('wp-export treats a response without X-WP-Total or X-WP-TotalPages as blocked', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const noHeaders = () => new Response(JSON.stringify([{ id: 1, slug: 'a', link: 'https://old.example/a/' }]), { status: 200, headers: { 'content-type': 'application/json' } });
    const { fetchImpl } = wpSite({ pages: 1, override: { 'pages:1': noHeaders } });
    await assert.rejects(wpExport(ctx, { slug: 'sample-cafe', url: 'https://old.example', fetchImpl, now: NOW }), /X-WP-Total/);
    assert.deepEqual(exportDirs(ctx, 'sample-cafe'), []);
  } finally {
    cleanup();
  }
});

test('live compares commits by ancestry: a later unrelated main commit passes, an older build fails', async () => {
  const { ctx, cleanup } = sandbox();
  try {
    scaffold(ctx);
    const calls = [];
    const git = (args) => {
      calls.push(args);
      if (args[0] === 'log') return 'a'.repeat(40);
      if (args[0] === 'merge-base') {
        if (args[3] === 'd'.repeat(40)) return '';
        throw new Error('not an ancestor');
      }
      throw new Error(`unexpected git ${args.join(' ')}`);
    };
    const later = await liveCheck(ctx, { slug: 'sample-cafe', now: NOW, fetchImpl: liveFetch({ sha: 'd'.repeat(40) }), git });
    assert.equal(later.ok, true, later.problems.join('; '));
    assert.deepEqual(calls.find((a) => a[0] === 'merge-base'), ['merge-base', '--is-ancestor', 'a'.repeat(40), 'd'.repeat(40)]);
    const older = await liveCheck(ctx, { slug: 'sample-cafe', now: NOW, fetchImpl: liveFetch({ sha: 'e'.repeat(40) }), git });
    assert.equal(older.ok, false);
  } finally {
    cleanup();
  }
});


// UNI-3433, review round 5: the tool's own output must be correct for ordinary input.
test('a business name with quotes, a backslash or markup scaffolds source that reads back as the same name', async () => {
  const names = ["O'Brien Plumbing", 'Back\\slash "Quote" & <b>Co</b>', 'Smith & Sons \u2028 ${x} `tick`'];
  for (const [n, name] of names.entries()) {
    const { ctx, cleanup } = sandbox();
    try {
      const slug = `quoted-${n}`;
      const { site } = newProject(ctx, { slug, name, domain: 'quoted.com.au', host: 'vercel', now: NOW });
      const mod = await import(`${pathToFileURL(join(site, 'src', 'site.mjs')).href}?n=${n}`);
      assert.equal(mod.business, name);
      for (const f of ['layouts/Base.astro', 'pages/index.astro', 'pages/404.astro', 'pages/about/index.astro', 'pages/contact/index.astro', 'pages/privacy/index.astro']) {
        const text = readFileSync(join(site, 'src', f), 'utf8');
        assert.ok(!text.includes(name), `${f} must not carry the raw name`);
        assert.ok(!text.includes('{{'), `${f} has an unfilled token`);
      }
    } finally {
      cleanup();
    }
  }
});

test('renderTokens refuses the raw business name in source code and any unknown token', () => {
  const v = { name: "O'Brien", domain: 'a.com.au', slug: 'ob' };
  assert.equal(renderTokens('# {{NAME}}', 'README.md', v), "# O'Brien");
  assert.throws(() => renderTokens("const b = '{{NAME}}';", 'Base.astro', v), /use \{\{NAME_JS\}\}/);
  assert.throws(() => renderTokens('{{SURPRISE}}', 'x.astro', v), /unknown token/);
  assert.equal(renderTokens('{{NAME_JS}}', 'site.mjs', v), '"O\'Brien"');
  assert.equal(jsStringLiteral('</script>'), '"\\u003c/script\\u003e"');
});

function animatedPng() {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', Buffer.alloc(13)), chunk('acTL', Buffer.alloc(8)), chunk('fcTL', Buffer.alloc(26)), chunk('IDAT', Buffer.from([1, 2, 3])),
    chunk('fcTL', Buffer.alloc(26)), chunk('fdAT', Buffer.from([0, 0, 0, 1, 4])), chunk('IEND'),
  ]);
}

test('an animated PNG is refused by name, never published as a one-frame picture', () => {
  const { ctx, cleanup } = sandbox();
  try {
    const { workspace, site } = scaffold(ctx);
    writeFileSync(join(workspace, 'incoming', 'spinner.png'), animatedPng());
    writeFileSync(join(workspace, 'incoming', 'logo.png'), pngWithText());
    assert.throws(
      () => ingest(ctx, { slug: 'sample-cafe', select: ['logo.png', 'spinner.png'], approvedBy: 'operator', now: NOW }),
      (err) => err instanceof ToolError && /^spinner\.png: animated PNG/.test(err.message) && /still image/.test(err.message),
    );
    const assetDir = join(site, 'src', 'assets', 'client');
    assert.deepEqual(existsSync(assetDir) ? readdirSync(assetDir).filter((f) => f !== 'manifest.json') : [], [], 'nothing from a refused batch is published');
    assert.throws(() => stripMetadata(animatedPng(), '.png'), /animated PNG/);
    assert.throws(() => findMetadata(animatedPng(), '.png'), /animated PNG/);
    // A hand-placed animated PNG that is already in the public folder is reported, not crashed on.
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(join(assetDir, 'img-000000000000.png'), animatedPng());
    const problems = checkProject(ctx, { slug: 'sample-cafe' }).problems.join('\n');
    assert.match(problems, /img-000000000000\.png/);
  } finally {
    cleanup();
  }
});

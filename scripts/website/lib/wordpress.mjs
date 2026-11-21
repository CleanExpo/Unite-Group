// WordPress export through the public REST API, without logging in.
// A failed, blocked or partial read must never look like a complete export: the export is built in
// a temp folder and renamed into place only when pages and posts returned exactly X-WP-Total items.
//
// Media is the one exception. WordPress core counts X-WP-Total before it drops each item the
// anonymous reader may not see, and an attachment inherits its parent's visibility, so images
// attached to a draft or private post are counted but never listed (WP_REST_Posts_Controller::
// get_items and ::check_read_permission, read 16/11/2026). On wordpress.org/news that is 37 of
// 1,735. Media is a reference list, never site content, so a shortfall there is recorded as
// "visible-only" with the hidden count and printed as a warning; it never stops the export.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ToolError, readProject, requireWorkspace, writeJsonAtomic } from './common.mjs';

// Vercel's limit on the vercel.json redirects array (verified live 16/11/2026,
// https://vercel.com/docs/routing/redirects/configuration-redirects).
export const VERCEL_MAX_REDIRECTS = 2048;

// Only these endpoints and fields. No _embed and no /users, so no author logins are collected.
export const ENDPOINTS = {
  pages: 'id,slug,link,title,content,excerpt,modified,parent,type',
  posts: 'id,slug,link,title,content,excerpt,modified,type',
  media: 'id,slug,source_url,alt_text,mime_type',
};
const PER_PAGE = 100;
const MAX_PAGES = 100;

class EndpointError extends Error {
  constructor(result, message) {
    super(message);
    this.result = result;
  }
}

async function fetchOnce(fetchImpl, url, timeoutMs) {
  return fetchImpl(url, { headers: { accept: 'application/json' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
}

async function fetchPage(fetchImpl, url, timeoutMs, statuses) {
  let res;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      res = await fetchOnce(fetchImpl, url, timeoutMs);
    } catch (err) {
      statuses.push(`error:${err.name}`);
      if (attempt === 2) {
        const cause = err.cause?.code || err.cause?.message;
        throw new EndpointError('failed', `${url} could not be read (${err.message}${cause ? `: ${cause}` : ''})`);
      }
      continue;
    }
    statuses.push(res.status);
    if (res.status >= 500 && attempt === 1) continue;
    break;
  }
  if (res.status === 401 || res.status === 403) {
    throw new EndpointError('blocked', `${url} returned ${res.status}: the REST API is blocked for anonymous readers`);
  }
  if (res.status !== 200) throw new EndpointError(res.status === 404 ? 'blocked' : 'failed', `${url} returned ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!type.includes('json')) {
    throw new EndpointError('blocked', `${url} returned ${type || 'no content type'}, not JSON: not WordPress, or a security page is in the way`);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    throw new EndpointError('blocked', `${url} did not return valid JSON`);
  }
  if (!Array.isArray(body)) throw new EndpointError('blocked', `${url} did not return a list (${body && body.code ? body.code : typeof body})`);
  return { body, total: res.headers.get('x-wp-total'), totalPages: res.headers.get('x-wp-totalpages') };
}

// Endpoints where X-WP-Total may count items WordPress hides from anonymous readers.
export const HIDDEN_ALLOWED = new Set(['media']);

async function exportEndpoint(fetchImpl, base, name, timeoutMs) {
  const statuses = [];
  const url = (page) => `${base}/wp-json/wp/v2/${name}?per_page=${PER_PAGE}&page=${page}&_fields=${ENDPOINTS[name]}`;
  const first = await fetchPage(fetchImpl, url(1), timeoutMs, statuses);
  const expected = Number.parseInt(first.total, 10);
  const pages = Number.parseInt(first.totalPages, 10);
  if (!Number.isInteger(expected) || !Number.isInteger(pages)) {
    throw new EndpointError('blocked', `${name}: no X-WP-Total / X-WP-TotalPages headers, so completeness cannot be proven`);
  }
  if (pages > MAX_PAGES) throw new EndpointError('failed', `${name}: ${pages} pages of results is over the ${MAX_PAGES}-page limit`);
  const items = [...first.body];
  for (let p = 2; p <= pages; p += 1) {
    const next = await fetchPage(fetchImpl, url(p), timeoutMs, statuses);
    // A deletion between pages shifts later items up one place, so one is skipped and none repeats.
    // Only a changed total shows it, so every page must report page 1's numbers.
    if (next.total !== first.total || next.totalPages !== first.totalPages) {
      throw new EndpointError('partial', `${name}: page ${p} reported ${next.total} items over ${next.totalPages} pages, page 1 reported ${first.total} over ${first.totalPages}; the list changed while it was read`);
    }
    items.push(...next.body);
  }
  const ids = new Set(items.map((i) => i.id));
  if (ids.size !== items.length) {
    throw new EndpointError('partial', `${name}: ${items.length - ids.size} item(s) came back twice, so the list changed while it was read`);
  }
  const hidden = expected - items.length;
  if (hidden < 0 || (hidden > 0 && !HIDDEN_ALLOWED.has(name))) {
    throw new EndpointError('partial', `${name}: received ${items.length} of ${expected} items`);
  }
  // Nothing listed against a non-zero total looks like a plugin filtering the list, not hidden drafts.
  if (expected > 0 && items.length === 0) {
    throw new EndpointError('blocked', `${name}: listed 0 of ${expected} items, so something is filtering the list`);
  }
  let result = expected === 0 ? 'empty' : 'complete';
  if (hidden > 0) result = 'visible-only';
  return { items, summary: { expected, received: items.length, hidden, pages_fetched: pages, http_statuses: statuses, result } };
}

function pathOf(link) {
  try {
    const u = new URL(link);
    return { path: u.pathname, query: u.search };
  } catch {
    return { path: null, query: '' };
  }
}

export function buildRedirects(pages, posts) {
  const redirects = [];
  const manual = [];
  const add = (item, to) => {
    const { path, query } = pathOf(item.link);
    if (!path) return;
    if (query) {
      manual.push({ from: `${path}${query}`, to, reason: 'query-string permalink; add by hand' });
      return;
    }
    if (path !== to) redirects.push({ from: path, to });
  };
  for (const p of pages) add(p, pathOf(p.link).path || `/${p.slug}/`);
  for (const p of posts) add(p, `/blog/${p.slug}/`);
  return { redirects, manual };
}

function stamp(now) {
  return now.toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-');
}

export async function wpExport(ctx, { slug, url, fetchImpl = globalThis.fetch, timeoutMs = 20000, allowEmpty = false, now = new Date(), log = () => {} }) {
  const ws = requireWorkspace(ctx, slug);
  let base;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('scheme');
    base = `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    throw new ToolError(`"${url}" is not an http(s) address`, 2);
  }
  const results = {};
  const summary = { source: base, exported_at: now.toISOString(), endpoints: {} };
  for (const name of Object.keys(ENDPOINTS)) {
    try {
      const r = await exportEndpoint(fetchImpl, base, name, timeoutMs);
      results[name] = r.items;
      summary.endpoints[name] = r.summary;
      log(`${name} ${r.summary.received}/${r.summary.expected}`);
      if (r.summary.hidden > 0) {
        log(`WARNING: ${name}: ${r.summary.hidden} item(s) counted by WordPress but hidden from anonymous readers (usually attached to a draft or private post); recorded as visible-only`);
      }
    } catch (err) {
      if (!(err instanceof EndpointError)) throw err;
      log(`${name} ${err.result}`);
      throw new ToolError(`WordPress export stopped, nothing written: ${err.message}. If the API is blocked, export by crawling the public sitemap instead.`);
    }
  }
  if (results.pages.length === 0 && !allowEmpty) {
    throw new ToolError('WordPress export stopped, nothing written: the site reports 0 pages. Pass --allow-empty only if that is true.');
  }
  const { redirects, manual } = buildRedirects(results.pages, results.posts);
  const root = join(ws, 'incoming', 'wordpress');
  mkdirSync(root, { recursive: true });
  const finalDir = join(root, stamp(now));
  if (existsSync(finalDir)) throw new ToolError(`${finalDir} already exists; wait a minute and run again`);
  const tmp = join(root, `.tmp-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp);
  try {
    for (const name of Object.keys(ENDPOINTS)) writeFileSync(join(tmp, `${name}.json`), `${JSON.stringify(results[name], null, 2)}\n`);
    writeFileSync(join(tmp, 'redirects.json'), `${JSON.stringify({ redirects, manual }, null, 2)}\n`);
    writeFileSync(join(tmp, 'export-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    const index = ['# WordPress export', '', `Source: ${base}`, '', '## Pages', ...results.pages.map((p) => `- ${p.title?.rendered ?? p.slug} (${p.link})`),
      '', '## Posts', ...results.posts.map((p) => `- ${p.title?.rendered ?? p.slug} (${p.link})`), ''];
    writeFileSync(join(tmp, 'INDEX.md'), index.join('\n'));
    renameSync(tmp, finalDir);
  } catch (err) {
    rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
  return { dir: finalDir, summary, redirects: redirects.length, manual: manual.length };
}

export function latestExport(ws) {
  const root = join(ws, 'incoming', 'wordpress');
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name).sort();
  return dirs.length ? join(root, dirs[dirs.length - 1]) : null;
}

function readVercelJson(sitesDir, slug) {
  const path = join(sitesDir, slug, 'vercel.json');
  if (!existsSync(path)) throw new ToolError(`${path} is missing`);
  return { path, config: JSON.parse(readFileSync(path, 'utf8')) };
}

// Render the latest export's redirect map into the site's vercel.json (committed with the site).
export function applyRedirects(ctx, { slug }) {
  const ws = requireWorkspace(ctx, slug);
  readProject(ws);
  const dir = latestExport(ws);
  if (!dir) throw new ToolError('no WordPress export found; run wp-export first');
  const { redirects, manual } = JSON.parse(readFileSync(join(dir, 'redirects.json'), 'utf8'));
  const { path, config } = readVercelJson(ctx.sitesDir, slug);
  const existing = Array.isArray(config.redirects) ? config.redirects : [];
  const bySource = new Map(existing.map((r) => [r.source, r]));
  for (const r of redirects) bySource.set(r.from, { source: r.from, destination: r.to, permanent: true });
  const merged = [...bySource.values()];
  if (merged.length > VERCEL_MAX_REDIRECTS) {
    throw new ToolError(`the redirect map has ${merged.length} entries; Vercel accepts at most ${VERCEL_MAX_REDIRECTS} in vercel.json. Nothing written. Use Vercel Bulk Redirects for a map this size.`);
  }
  config.redirects = merged;
  writeJsonAtomic(path, config);
  return { applied: redirects.length, manual };
}

export function missingRedirects(ctx, slug, ws) {
  const dir = latestExport(ws);
  if (!dir) return [];
  const { redirects } = JSON.parse(readFileSync(join(dir, 'redirects.json'), 'utf8'));
  const path = join(ctx.sitesDir, slug, 'vercel.json');
  const config = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const have = new Set((config.redirects || []).map((r) => `${r.source} ${r.destination}`));
  return redirects.filter((r) => !have.has(`${r.from} ${r.to}`)).map((r) => `[redirect] ${r.from} -> ${r.to} is not in vercel.json; run redirects`);
}

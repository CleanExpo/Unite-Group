#!/usr/bin/env node
/**
 * Public-route smoke on a real Next production build.
 *
 * Why this exists: on 25/10/2026 the live /cards/thanks returned HTTP 500 to every paying buyer. A Server
 * Component page called a function exported from a 'use client' module. vitest cannot see that; only a real
 * production render fails. This script starts `next start` on an existing build (.next/BUILD_ID), with
 * placeholder environment and outbound fetch/http(s) refused, then requests a fixed list of public and private paths
 * and fails on any 5xx, status mismatch, wrong redirect target or Next error marker in a body.
 *
 *   node scripts/smoke-public-routes.mjs [--app-dir <apps/web>] [--port 3015]
 *
 * Exit 0: every check passed. 1: at least one check failed. 2: harness error (no build, server never up, bad usage).
 *
 * The coverage guard fails the run when an app route exists that is neither smoked nor on the EXCLUDED list,
 * so a new public page cannot ship unsmoked by accident.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildVerificationEnvironment,
  findBuildEnvironmentFiles,
} from '../../../scripts/verify-web-ci-build.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultAppDir = resolve(scriptDir, '..');
const PRELOAD = join(scriptDir, 'smoke-offline-preload.cjs');

export const DEFAULT_PORT = 3015;
export const REQUEST_TIMEOUT_MS = 20_000;
export const READY_TIMEOUT_MS = 60_000;
export const DUMMY_SEGMENT = 'smoke-dummy';
export const LOGIN_PATH = '/auth/login';

// ---------------------------------------------------------------------------
// The fixed path list. `pattern` ties an entry to a discovered app route (null: no such route exists, the
// entry checks how the proxy treats a path that has no page). `publicFile` ties an entry to apps/web/public.
// Statuses are what the production build returns with Supabase and Stripe unreachable (see the preload).
// ---------------------------------------------------------------------------
const UNKNOWN_CARD = '/c/smoke-unknown-card';
const PUBLISHED_CARD = '/c/smoke-published-card';

/** @type {ReadonlyArray<{path: string, pattern: string | null, publicFile?: string, status: number, location?: string, bodyIncludes?: string, note?: string}>} */
export const SMOKE_PATHS = Object.freeze([
  { path: '/', pattern: '/', status: 200 },
  { path: '/cards', pattern: '/cards', status: 200 },
  { path: '/cards/order', pattern: '/cards/order', status: 200 },
  { path: '/cards/terms', pattern: '/cards/terms', status: 200 },
  { path: '/pricing', pattern: '/pricing', status: 200 },
  { path: '/signatures', pattern: '/signatures', status: 200 },
  // The 25/10/2026 incident: all three must render. The page is a Server Component.
  { path: '/cards/thanks', pattern: '/cards/thanks', status: 200, note: 'no order reference' },
  { path: '/cards/thanks?session_id=cs_test_x', pattern: '/cards/thanks', status: 200, note: 'looks like a Checkout session' },
  { path: '/cards/thanks?session_id=not-a-session', pattern: '/cards/thanks', status: 200, note: 'rejected reference' },
  // Owner cards. The preload answers the card lookup as "reachable, no such card" (see smoke-offline-preload.cjs).
  { path: UNKNOWN_CARD, pattern: '/c/[slug]', status: 404, note: 'unknown but valid-looking slug' },
  { path: `${UNKNOWN_CARD}/contact.vcf`, pattern: '/c/[slug]/contact.vcf', status: 404, note: 'unknown but valid-looking slug' },
  { path: PUBLISHED_CARD, pattern: '/c/[slug]', status: 200, bodyIncludes: 'Smoke Test Owner', note: 'published card (stubbed row) renders CardView' },
  { path: `${PUBLISHED_CARD}/contact.vcf`, pattern: '/c/[slug]/contact.vcf', status: 200, bodyIncludes: 'Smoke Test Owner', note: 'published card (stubbed row)' },
  { path: '/c', pattern: null, status: 307, location: LOGIN_PATH, note: 'bare /c stays private' },
  { path: '/privacy-policy', pattern: '/privacy-policy', status: 200 },
  { path: '/terms-of-service', pattern: '/terms-of-service', status: 200 },
  { path: '/grow', pattern: '/grow', status: 200 },
  { path: '/solutions/visibility', pattern: '/solutions/visibility', status: 200 },
  { path: '/solutions/experience', pattern: '/solutions/experience', status: 200 },
  { path: '/solutions/conversion', pattern: '/solutions/conversion', status: 200 },
  { path: '/solutions/intelligence', pattern: '/solutions/intelligence', status: 200 },
  { path: '/robots.txt', pattern: '/robots.txt', status: 200, bodyIncludes: 'User-Agent' },
  { path: '/sitemap.xml', pattern: '/sitemap.xml', status: 200, bodyIncludes: '<urlset' },
  { path: '/video-sitemap.xml', pattern: '/video-sitemap.xml', status: 200, bodyIncludes: '<urlset' },
  { path: '/llms.txt', pattern: null, publicFile: 'llms.txt', status: 200, note: 'static file in public/' },
  { path: '/site.webmanifest', pattern: null, publicFile: 'site.webmanifest', status: 200, note: 'static file in public/' },
  { path: '/auth/confirm', pattern: '/auth/confirm', status: 200 },
  { path: '/auth/login', pattern: '/auth/login', status: 200 },
  { path: '/auth/reset-password', pattern: '/auth/reset-password', status: 200 },
  { path: '/forgot-password', pattern: '/forgot-password', status: 200 },
  // Private by the proxy: anything not public redirects to the login page.
  { path: '/docs', pattern: '/docs', status: 307, location: LOGIN_PATH, note: 'private' },
  { path: '/preview/knowledge-console', pattern: '/preview/knowledge-console', status: 307, location: LOGIN_PATH, note: 'public only when KNOWLEDGE_CONSOLE_PREVIEW=1' },
  // Metadata files from the brand pack beside the root layout.
  { path: '/icon.png', pattern: '/icon.png', status: 200 },
  { path: '/apple-icon.png', pattern: '/apple-icon.png', status: 200 },
  { path: '/opengraph-image.png', pattern: '/opengraph-image.png', status: 200 },
  { path: '/twitter-image.png', pattern: '/twitter-image.png', status: 200 },
]);

/**
 * App routes deliberately not smoked as public. A pattern ending in `/**` matches the base path and everything
 * under it. Every excluded page and route handler is still requested during the run and must redirect to the login page.
 */
export const EXCLUDED = Object.freeze([
  { pattern: '/founder/**', reason: 'private CRM; the run asserts each page redirects to the login page' },
]);

// ---------------------------------------------------------------------------
// Route discovery (pure, unit tested)
// ---------------------------------------------------------------------------
const PAGE_FILE = /^page\.(?:tsx|ts|jsx|js)$/;
const HANDLER_FILE = /^route\.(?:tsx|ts|jsx|js)$/;
const CODE_EXT = '(?:tsx|ts|jsx|js)';
const METADATA_DYNAMIC = new RegExp(`^(robots|sitemap|manifest|icon|apple-icon|opengraph-image|twitter-image)\\.${CODE_EXT}$`);
const METADATA_STATIC = /^(?:(?:icon|apple-icon|opengraph-image|twitter-image)\d*\.(?:png|jpe?g|gif|ico|svg)|favicon\.ico|manifest\.(?:json|webmanifest)|robots\.txt|sitemap\.xml)$/;

function metadataPatternFor(fileName) {
  const dynamic = METADATA_DYNAMIC.exec(fileName);
  if (dynamic) {
    const base = dynamic[1];
    if (base === 'robots') return '/robots.txt';
    if (base === 'sitemap') return '/sitemap.xml';
    if (base === 'manifest') return '/manifest.webmanifest';
    return `/${base}`;
  }
  return METADATA_STATIC.test(fileName) ? `/${fileName}` : null;
}

/** Segments that shape the file tree but not the URL: (group). Intercepting routes (.) are not used here. */
function isGroupSegment(segment) {
  return /^\([^)]*\)$/.test(segment) && !/^\(\.{1,3}\)/.test(segment);
}

function joinPattern(segments, leaf) {
  const url = segments.filter((segment) => !isGroupSegment(segment));
  if (leaf !== null) url.push(leaf);
  return `/${url.join('/')}`;
}

/**
 * Walk <appDir>/src/app and return the URL patterns it serves, apart from /api/** (route handlers out of scope).
 * @returns {{pattern: string, kind: 'page' | 'handler' | 'metadata', file: string}[]}
 */
export function discoverRoutes(appDir) {
  const root = join(appDir, 'src', 'app');
  const found = new Map();
  const add = (pattern, kind, file) => {
    if (pattern === '/api' || pattern.startsWith('/api/')) {
      // Route handlers under /api are out of scope by design. A page or metadata file there would be a public
      // document the guard never requests, so it must stop the run instead of vanishing.
      if (kind === 'handler') return;
      throw new HarnessError(`a ${kind} file under src/app/api is not supported by the coverage guard: ${file}`);
    }
    if (!found.has(pattern)) found.set(pattern, { pattern, kind, file });
  };

  const walk = (directory, segments) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      // A symlink is neither a file nor a directory to readdir; walking it silently skipped could hide a page.
      if (entry.isSymbolicLink()) throw new HarnessError(`symlink in src/app is not supported by the coverage guard: ${join(directory, entry.name)}`);
      if (entry.isDirectory()) {
        // Parallel (@slot) and intercepting ((.) (..) (...)) routes render inside another URL, which a plain
        // GET cannot exercise, so the guard cannot cover them. Refuse them loudly rather than skip them: a
        // new one must be handled here (or the guard extended) before it can merge.
        if (entry.name.startsWith('@') || /^\(\.{1,3}\)/.test(entry.name)) {
          throw new HarnessError(`parallel or intercepting route folder is not supported by the coverage guard: ${join(directory, entry.name)}`);
        }
        // _private folders never produce a URL of their own.
        if (entry.name.startsWith('_')) continue;
        walk(join(directory, entry.name), [...segments, entry.name]);
        continue;
      }
      if (!entry.isFile()) continue;
      const file = join(directory, entry.name);
      if (PAGE_FILE.test(entry.name)) add(joinPattern(segments, null), 'page', file);
      else if (HANDLER_FILE.test(entry.name)) add(joinPattern(segments, null), 'handler', file);
      else {
        const metadata = metadataPatternFor(entry.name);
        if (metadata !== null) add(joinPattern(segments, metadata.slice(1)), 'metadata', file);
      }
    }
  };

  walk(root, []);
  return [...found.values()].sort((left, right) => left.pattern.localeCompare(right.pattern));
}

/** True when a concrete pathname fits an app pattern such as /c/[slug]/contact.vcf. */
export function pathMatchesPattern(pathname, pattern) {
  const source = pattern
    .split('/')
    .map((segment) => {
      if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return '(?:.*)';
      if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return '.+';
      if (/^\[[^\]]+\]$/.test(segment)) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${source}$`).test(pathname);
}

function excludedMatches(excludedPattern, pattern) {
  if (excludedPattern.endsWith('/**')) {
    const base = excludedPattern.slice(0, -3);
    return pattern === base || pattern.startsWith(`${base}/`);
  }
  return pattern === excludedPattern;
}

/** Replace dynamic segments with a dummy value so an excluded page can be requested. */
export function substituteDummy(pattern) {
  return pattern
    .split('/')
    .map((segment) => {
      if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment) || /^\[\.\.\.[^\]]+\]$/.test(segment)) return `${DUMMY_SEGMENT}/${DUMMY_SEGMENT}`;
      if (/^\[[^\]]+\]$/.test(segment)) return DUMMY_SEGMENT;
      return segment;
    })
    .join('/');
}

/**
 * The coverage guard. Returns every way the smoke list and the app directory disagree.
 * @param {{discovered: {pattern: string}[], entries: typeof SMOKE_PATHS, excluded: typeof EXCLUDED, publicDir?: string}} input
 */
export function checkCoverage({ discovered, entries, excluded, publicDir }) {
  const discoveredPatterns = new Set(discovered.map((route) => route.pattern));
  const smoked = new Set(entries.filter((entry) => entry.pattern !== null).map((entry) => entry.pattern));

  const uncovered = discovered
    .map((route) => route.pattern)
    .filter((pattern) => !smoked.has(pattern) && !excluded.some((rule) => excludedMatches(rule.pattern, pattern)));

  const stale = [];
  for (const entry of entries) {
    if (entry.pattern !== null && !discoveredPatterns.has(entry.pattern)) {
      stale.push(`smoke entry ${entry.path} names pattern ${entry.pattern}, which is not in src/app`);
    }
    if (entry.publicFile && publicDir && !existsSync(join(publicDir, entry.publicFile))) {
      stale.push(`smoke entry ${entry.path} names public/${entry.publicFile}, which does not exist`);
    }
  }
  for (const rule of excluded) {
    if (![...discoveredPatterns].some((pattern) => excludedMatches(rule.pattern, pattern))) {
      stale.push(`excluded pattern ${rule.pattern} matches no route in src/app`);
    }
  }

  const mismatched = entries
    .filter((entry) => entry.pattern !== null && !pathMatchesPattern(entry.path.split('?')[0], entry.pattern))
    .map((entry) => `smoke entry ${entry.path} cannot be an instance of its pattern ${entry.pattern}`);

  return { uncovered, stale, mismatched, ok: uncovered.length + stale.length + mismatched.length === 0 };
}

/** Excluded page and route-handler patterns, each as a concrete request path that must redirect to the login page. */
export function excludedPageChecks(discovered, excluded) {
  return discovered
    .filter((route) => route.kind !== 'metadata' && excluded.some((rule) => excludedMatches(rule.pattern, route.pattern)))
    .map((route) => ({
      path: substituteDummy(route.pattern),
      pattern: route.pattern,
      status: 307,
      location: LOGIN_PATH,
      follow: true,
      note: `excluded private ${route.kind}`,
    }));
}

// ---------------------------------------------------------------------------
// Error markers (pure, unit tested)
//
// Grounded in next@16.4.2 and the React it bundles:
//  - "Application error: a client-side exception has occurred" / "...server-side...": the built-in error page
//    (next/dist/pages/_error.js:92,131; Vercel's runtime words it "server-side").
//  - id="__next_error__": the root error shell (next/dist/server/app-render/app-render.js:1322,
//    stream-utils/node-web-streams-helper.js:732). The same shell renders a not-found, so it only counts when
//    the check does not expect a 404.
//  - data-next-error-message: the dev-only error template (app-render.js:1324); never legitimate in a build.
//  - <!--$!--><template data-dgst="..."> and $RX("id","digest",...): React's client-rendered Suspense boundary,
//    emitted when a boundary's server render threw (react-dom-server.node.production.js:2413-2433, 2568-2571).
//    Next also throws for notFound() and redirect(), so those digests are legitimate:
//    NEXT_HTTP_ERROR_FALLBACK;<status> (client/components/http-access-fallback/http-access-fallback.js:41),
//    NEXT_REDIRECT;... (client/components/redirect-error.js:24) and BAILOUT_TO_CLIENT_SIDE_RENDERING
//    (shared/lib/lazy-dynamic/bailout-to-csr.js:24). Any other digest is an error.
//  - "Switched to client rendering because the server rendering errored": React's development wording of the
//    same condition; included so a dev-mode server cannot slip through.
//  - "Something went wrong!": this app's src/app/global-error.tsx, which renders only when the root failed.
// ---------------------------------------------------------------------------
const ALLOWED_DIGEST_PREFIXES = Object.freeze(['NEXT_HTTP_ERROR_FALLBACK;', 'NEXT_NOT_FOUND', 'NEXT_REDIRECT', 'BAILOUT_TO_CLIENT_SIDE_RENDERING']);

export function isAllowedDigest(digest) {
  return ALLOWED_DIGEST_PREFIXES.some((prefix) => digest.startsWith(prefix));
}

/**
 * @param {string} body
 * @param {{expectedStatus?: number}} [options]
 * @returns {string[]} human-readable findings; empty means clean
 */
export function detectErrorMarkers(body, { expectedStatus = 200 } = {}) {
  const findings = [];
  if (/Application error: a (?:server|client)-side exception has occurred/.test(body)) {
    findings.push('Next built-in error page text ("Application error: a ...-side exception has occurred")');
  }
  if (/Switched to client rendering because the server rendering errored/.test(body)) {
    findings.push('React "Switched to client rendering because the server rendering errored"');
  }
  if (/id=["']__next_error__["']/.test(body) && expectedStatus !== 404) {
    findings.push('Next root error shell (id="__next_error__")');
  }
  if (/data-next-error-message=/.test(body)) {
    findings.push('Next error template (data-next-error-message)');
  }
  if (/Something went wrong!/.test(body)) {
    findings.push('global-error.tsx text ("Something went wrong!")');
  }

  for (const match of body.matchAll(/<!--\$!--><template([^>]*)>/g)) {
    const digest = /data-dgst="([^"]*)"/.exec(match[1])?.[1];
    if (digest === undefined) findings.push('client-rendered Suspense boundary with no digest');
    else if (!isAllowedDigest(digest)) findings.push(`client-rendered Suspense boundary, digest ${JSON.stringify(digest)}`);
  }
  for (const match of body.matchAll(/data-dgst="([^"]*)"/g)) {
    if (!isAllowedDigest(match[1])) findings.push(`error digest ${JSON.stringify(match[1])} (data-dgst)`);
  }
  for (const match of body.matchAll(/\$RX\("[^"]*",(null|"(?:[^"\\]|\\.)*")/g)) {
    const digest = match[1] === 'null' ? '' : JSON.parse(match[1]);
    if (!isAllowedDigest(digest)) findings.push(`streamed render error, digest ${JSON.stringify(digest)} ($RX)`);
  }

  return [...new Set(findings)];
}

/** Pathnames from the <loc> entries of a sitemap, '/' for the origin. */
export function extractSitemapPaths(xml) {
  const paths = [];
  for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    try {
      paths.push(new URL(match[1]).pathname || '/');
    } catch {
      paths.push(`INVALID:${match[1]}`);
    }
  }
  return paths;
}

/** Sitemap paths with no smoked 200 entry. */
export function sitemapGaps(sitemapPaths, entries) {
  const smoked200 = new Set(entries.filter((entry) => entry.status === 200).map((entry) => entry.path.split('?')[0]));
  return sitemapPaths.filter((path) => !smoked200.has(path));
}

/**
 * Judge one response against its entry.
 * @returns {{ok: boolean, reason: string}}
 */
export function evaluateResponse(entry, { status, location, contentType, body }, origin = 'http://smoke.invalid') {
  if (status >= 500) return { ok: false, reason: `server error ${status}` };
  if (status !== entry.status) return { ok: false, reason: `status ${status}, expected ${entry.status}` };
  if (entry.location !== undefined) {
    let actual = null;
    try {
      const target = location ? new URL(location, origin) : null;
      // Same origin only: https://other.example/auth/login has the right pathname and the wrong destination.
      actual = target && target.origin === new URL(origin).origin ? target.pathname : null;
    } catch {
      actual = null;
    }
    if (actual !== entry.location) return { ok: false, reason: `redirected to ${location ?? '(no Location)'}, expected ${entry.location}` };
  }
  const textual = !contentType || /text|json|xml|vcard|javascript/i.test(contentType);
  if (textual) {
    const findings = detectErrorMarkers(body, { expectedStatus: entry.status });
    if (findings.length > 0) return { ok: false, reason: `error marker in body: ${findings.join('; ')}` };
  }
  if (entry.bodyIncludes !== undefined && !body.includes(entry.bodyIncludes)) {
    return { ok: false, reason: `body lacks ${JSON.stringify(entry.bodyIncludes)}` };
  }
  return { ok: true, reason: '' };
}

// ---------------------------------------------------------------------------
// Server lifecycle and the run
// ---------------------------------------------------------------------------
class HarnessError extends Error {}

export function parseArguments(argv) {
  const options = { appDir: defaultAppDir, port: DEFAULT_PORT };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--app-dir' && argv[index + 1]) options.appDir = resolve(argv[++index]);
    else if (argument === '--port' && argv[index + 1]) options.port = Number.parseInt(argv[++index], 10);
    else throw new HarnessError(`Unknown or incomplete argument: ${argument}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw new HarnessError(`Invalid --port: ${options.port}`);
  return options;
}

function startServer({ appDir, port }) {
  const nextBin = join(appDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!existsSync(nextBin)) throw new HarnessError(`next is not installed at ${nextBin}; run pnpm install in ${appDir}.`);
  const log = [];
  const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: appDir,
    env: { ...buildVerificationEnvironment(), PORT: String(port), NODE_OPTIONS: `--require ${PRELOAD}` },
    detached: true, // its own process group, so the whole tree can be killed
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const record = (chunk) => {
    for (const line of chunk.toString().split('\n')) if (line.trim() !== '') log.push(line);
    if (log.length > 2000) log.splice(0, log.length - 2000);
  };
  child.stdout.on('data', record);
  child.stderr.on('data', record);
  const state = { exited: false, code: null };
  child.on('exit', (code, signal) => {
    state.exited = true;
    state.code = code ?? signal;
  });
  return { child, log, state };
}

function killGroup(child, signal) {
  if (!child || child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // already gone
  }
}

async function request(base, path) {
  const response = await fetch(`${base}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'user-agent': 'unite-smoke-public-routes' },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const textual = !contentType || /text|json|xml|vcard|javascript/i.test(contentType);
  const body = textual ? await response.text() : (await response.arrayBuffer(), '');
  return { status: response.status, location: response.headers.get('location'), contentType, body };
}

async function waitUntilReady(base, server) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.state.exited) throw new HarnessError(`next start exited early (${server.state.code}) before it became ready.`);
    try {
      await request(base, '/robots.txt');
      return;
    } catch {
      await new Promise((done) => setTimeout(done, 500));
    }
  }
  throw new HarnessError(`next start was not ready within ${READY_TIMEOUT_MS / 1000}s.`);
}

async function portAnswers(base) {
  try {
    await fetch(`${base}/robots.txt`, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const { appDir, port } = parseArguments(argv);
  const base = `http://127.0.0.1:${port}`;

  if (!existsSync(join(appDir, '.next', 'BUILD_ID'))) {
    throw new HarnessError(`No production build at ${join(appDir, '.next', 'BUILD_ID')}. Build first (pnpm run build).`);
  }
  const envFiles = findBuildEnvironmentFiles(appDir);
  if (envFiles.length > 0) throw new HarnessError(`Refused local Next.js env inputs in ${appDir}: ${envFiles.join(', ')}`);
  if (!existsSync(join(appDir, 'src', 'app'))) throw new HarnessError(`No src/app in ${appDir}.`);

  const discovered = discoverRoutes(appDir);
  const coverage = checkCoverage({ discovered, entries: SMOKE_PATHS, excluded: EXCLUDED, publicDir: join(appDir, 'public') });
  const excludedChecks = excludedPageChecks(discovered, EXCLUDED);

  // A server already on the port would be judged instead of this build; refuse rather than pass silently.
  if (await portAnswers(base)) throw new HarnessError(`Something already answers on ${base}; refusing to smoke an unknown server.`);

  const server = startServer({ appDir, port });
  const cleanup = () => {
    killGroup(server.child, 'SIGKILL');
  };
  process.on('exit', cleanup);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      cleanup();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    });
  }
  process.on('uncaughtException', (error) => {
    cleanup();
    console.error(error);
    process.exit(2);
  });

  const tail = () => server.log.slice(-60).join('\n');
  let failures = 0;
  let passes = 0;
  const report = (ok, label, detail = '') => {
    if (ok) passes += 1;
    else failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
  };

  try {
    try {
      await waitUntilReady(base, server);
    } catch (error) {
      console.error(String(error.message ?? error));
      console.error(`--- server log (last 60 lines) ---\n${tail()}`);
      throw new HarnessError('server never became ready');
    }

    for (const problem of [...coverage.uncovered.map((p) => `route ${p} exists in src/app but is neither smoked nor excluded`), ...coverage.stale, ...coverage.mismatched]) {
      report(false, 'coverage', problem);
    }
    if (coverage.ok) report(true, `coverage ${discovered.length} app routes accounted for`);

    const run = async (entry) => {
      const label = `${entry.status} ${entry.path}${entry.location ? ` -> ${entry.location}` : ''}`;
      if (server.state.exited) {
        report(false, label, `server exited (${server.state.code})`);
        return null;
      }
      try {
        let result = await request(base, entry.path);
        // next.config redirects (/founder/dashboard and friends) hop to another private page first; follow up to
        // three hops so the chain must still END at the login page, never at a rendered page.
        for (let hop = 0; entry.follow && hop < 3 && result.status >= 300 && result.status < 400 && result.location; hop += 1) {
          const target = new URL(result.location, base);
          if (target.origin !== new URL(base).origin || target.pathname === entry.location) break;
          result = await request(base, `${target.pathname}${target.search}`);
        }
        const verdict = evaluateResponse(entry, result, base);
        report(verdict.ok, verdict.ok ? label : `${result.status} expected ${entry.status} ${entry.path}`, verdict.reason);
        return result;
      } catch (error) {
        report(false, `--- expected ${entry.status} ${entry.path}`, `request failed: ${error?.name ?? 'Error'}: ${error?.message ?? error}`);
        return null;
      }
    };

    let sitemapBody = null;
    for (const entry of SMOKE_PATHS) {
      const result = await run(entry);
      if (entry.path === '/sitemap.xml' && result?.status === 200) sitemapBody = result.body;
    }
    for (const entry of excludedChecks) await run(entry);

    if (sitemapBody === null) {
      report(false, 'sitemap', '/sitemap.xml was not fetched, so its <loc> entries could not be checked');
    } else {
      const paths = extractSitemapPaths(sitemapBody);
      if (paths.length === 0) report(false, 'sitemap', 'no <loc> entries found; an empty sitemap proves nothing');
      for (const gap of sitemapGaps(paths, SMOKE_PATHS)) report(false, `sitemap ${gap}`, 'listed in /sitemap.xml but not smoked with a 200 expectation');
      if (paths.length > 0 && sitemapGaps(paths, SMOKE_PATHS).length === 0) report(true, `sitemap all ${paths.length} <loc> paths are smoked with 200`);
    }

    const blocked = [...new Set(server.log.filter((line) => line.startsWith('[smoke-offline] blocked ')))];
    if (blocked.length > 0) console.log(`info: outbound hosts refused by the offline preload: ${blocked.map((line) => line.replace('[smoke-offline] blocked ', '')).join(', ')}`);
  } finally {
    killGroup(server.child, 'SIGTERM');
    await new Promise((done) => setTimeout(done, 300));
    killGroup(server.child, 'SIGKILL');
  }

  console.log(`\nSummary: ${passes} passed, ${failures} failed, ${passes + failures} checks`);
  if (failures > 0) {
    console.log(`--- server log (last 60 lines) ---\n${tail()}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof HarnessError ? `Harness error: ${error.message}` : error);
      process.exit(2);
    },
  );
}

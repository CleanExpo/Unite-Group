// Unit tests for scripts/smoke-public-routes.mjs. Run from the repo root:
//   node --test apps/web/scripts/__tests__/smoke-public-routes.test.mjs
// Deliberately .mjs and outside src/, so vitest (include: src/**) never picks it up.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EXCLUDED,
  SMOKE_PATHS,
  checkCoverage,
  detectErrorMarkers,
  discoverRoutes,
  evaluateResponse,
  excludedPageChecks,
  extractSitemapPaths,
  pathMatchesPattern,
  sitemapGaps,
} from '../smoke-public-routes.mjs';

const realAppDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const temporary = [];

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'smoke-fixture-'));
  temporary.push(root);
  for (const file of files) {
    const target = join(root, 'src', 'app', file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, '');
  }
  return root;
}

after(() => {
  for (const root of temporary) rmSync(root, { recursive: true, force: true });
});

const BASE_FILES = [
  'page.tsx',
  '(marketing)/about/page.tsx',
  '(marketing)/(deep)/team/page.js',
  'shop/[id]/page.tsx',
  'shop/[id]/receipt.pdf/route.ts',
  'files/[...path]/page.tsx',
  'robots.ts',
  'sitemap.ts',
  'icon.png',
  'api/health/route.ts',
  '(app)/api/inner/route.ts',
  '_private/page.tsx',
  'about/_components/page.tsx',
  'about/__tests__/page.test.tsx',
  'layout.tsx',
  'about/opengraph-image.alt.txt',
];

describe('route discovery', () => {
  const patterns = () => new Map(discoverRoutes(fixture(BASE_FILES)).map((r) => [r.pattern, r.kind]));

  test('strips (group) segments, nested groups included', () => {
    const found = patterns();
    assert.equal(found.get('/'), 'page');
    assert.equal(found.get('/about'), 'page');
    assert.equal(found.get('/team'), 'page');
  });

  test('keeps [param] and [...catchall] segments and finds route handlers', () => {
    const found = patterns();
    assert.equal(found.get('/shop/[id]'), 'page');
    assert.equal(found.get('/shop/[id]/receipt.pdf'), 'handler');
    assert.equal(found.get('/files/[...path]'), 'page');
  });

  test('maps metadata routes', () => {
    const found = patterns();
    assert.equal(found.get('/robots.txt'), 'metadata');
    assert.equal(found.get('/sitemap.xml'), 'metadata');
    assert.equal(found.get('/icon.png'), 'metadata');
  });

  test('ignores /api, including an api folder inside a route group', () => {
    const found = patterns();
    for (const pattern of found.keys()) assert.ok(!pattern.startsWith('/api'), pattern);
  });

  test('skips _private folders, test files and layouts', () => {
    const found = [...patterns().keys()];
    assert.deepEqual(found.filter((p) => p.includes('_private') || p.includes('modal') || p.includes('_components')), []);
    assert.equal(found.length, 9, found.join(', '));
  });
});

describe('parallel and intercepting routes', () => {
  for (const folder of ['@analytics', '@modal/(.)photo', 'feed/(..)photo', 'feed/(...)photo']) {
    test(`${folder} fails discovery instead of being skipped`, () => {
      assert.throws(() => discoverRoutes(fixture(['page.tsx', `${folder}/page.tsx`])), /not supported by the coverage guard/);
    });
  }
});

describe('coverage guard', () => {
  const entry = (path, pattern, status = 200) => ({ path, pattern, status });
  const full = [
    entry('/', '/'),
    entry('/about', '/about'),
    entry('/team', '/team'),
    entry('/shop/1', '/shop/[id]'),
    entry('/shop/1/receipt.pdf', '/shop/[id]/receipt.pdf'),
    entry('/files/a/b', '/files/[...path]'),
    entry('/robots.txt', '/robots.txt'),
    entry('/sitemap.xml', '/sitemap.xml'),
    entry('/icon.png', '/icon.png'),
  ];

  test('a fully listed fixture passes', () => {
    const result = checkCoverage({ discovered: discoverRoutes(fixture(BASE_FILES)), entries: full, excluded: [] });
    assert.deepEqual(result, { uncovered: [], stale: [], mismatched: [], ok: true });
  });

  test('a NEW page added to the app and absent from the smoke list FAILS coverage', () => {
    const root = fixture([...BASE_FILES, '(marketing)/pricing/page.tsx']);
    const result = checkCoverage({ discovered: discoverRoutes(root), entries: full, excluded: [] });
    assert.equal(result.ok, false);
    assert.deepEqual(result.uncovered, ['/pricing']);
  });

  test('a new page inside an excluded subtree is accepted (and later requested as private)', () => {
    const root = fixture([...BASE_FILES, 'founder/secret/page.tsx']);
    const excluded = [{ pattern: '/founder/**', reason: 'private' }];
    const result = checkCoverage({ discovered: discoverRoutes(root), entries: full, excluded });
    assert.equal(result.ok, true);
    const checks = excludedPageChecks(discoverRoutes(root), excluded);
    assert.deepEqual(checks.map((c) => [c.path, c.status, c.location]), [['/founder/secret', 307, '/auth/login']]);
  });

  test('a stale smoke entry (page removed from the app) FAILS', () => {
    const result = checkCoverage({ discovered: discoverRoutes(fixture(BASE_FILES)), entries: [...full, entry('/gone', '/gone')], excluded: [] });
    assert.equal(result.ok, false);
    assert.match(result.stale[0], /\/gone.*not in src\/app/);
  });

  test('a stale excluded pattern FAILS', () => {
    const result = checkCoverage({
      discovered: discoverRoutes(fixture(BASE_FILES)),
      entries: full,
      excluded: [{ pattern: '/founder/**', reason: 'x' }],
    });
    assert.equal(result.ok, false);
    assert.match(result.stale[0], /excluded pattern \/founder\/\*\* matches no route/);
  });

  test('an entry that cannot be an instance of its pattern FAILS', () => {
    const wrong = full.map((e) => (e.path === '/shop/1' ? entry('/other/1', '/shop/[id]') : e));
    const result = checkCoverage({ discovered: discoverRoutes(fixture(BASE_FILES)), entries: wrong, excluded: [] });
    assert.equal(result.ok, false);
    assert.equal(result.mismatched.length, 1);
  });

  test('pathMatchesPattern handles params, catch-alls and dots', () => {
    assert.ok(pathMatchesPattern('/c/x/contact.vcf', '/c/[slug]/contact.vcf'));
    assert.ok(!pathMatchesPattern('/c/x/contactXvcf', '/c/[slug]/contact.vcf'));
    assert.ok(pathMatchesPattern('/files/a/b/c', '/files/[...path]'));
    assert.ok(!pathMatchesPattern('/shop', '/shop/[id]'));
  });
});

describe('error markers', () => {
  test('a Next 500 body is caught', () => {
    const body = '<html id="__next_error__"><head><title>500: Internal Server Error</title></head><body><h2>Application error: a server-side exception has occurred (see the server logs for more information).</h2><p>Digest: 1234</p></body></html>';
    const findings = detectErrorMarkers(body);
    assert.ok(findings.length >= 2, findings.join(' | '));
  });

  test('a streamed render error (client-rendered Suspense boundary) is caught even with status 200', () => {
    const body = '<main><!--$!--><template data-dgst="3849201"></template><!--/$--></main>';
    assert.match(detectErrorMarkers(body).join('|'), /3849201/);
    const script = '<script>$RX("B:0","2718281","","")</script>';
    assert.match(detectErrorMarkers(script).join('|'), /2718281/);
  });

  test('a clean page is clean, including the React runtime that merely defines $RX', () => {
    const body = '<!DOCTYPE html><html lang="en-AU"><body><main><h1>Thank you</h1><!--$--><p>ok</p><!--/$--></main><script>$RX=function(b,c,d,e,f){var a=document.getElementById(b)}</script></body></html>';
    assert.deepEqual(detectErrorMarkers(body), []);
  });

  test('legitimate notFound() and redirect() digests are NOT errors', () => {
    const notFound = '<!--$!--><template data-dgst="NEXT_HTTP_ERROR_FALLBACK;404"></template><!--/$-->';
    const redirect = '<script>$RX("B:1","NEXT_REDIRECT;replace;/auth/login;307;")</script>';
    assert.deepEqual(detectErrorMarkers(notFound), []);
    assert.deepEqual(detectErrorMarkers(redirect), []);
  });

  test('the error shell is accepted only where a 404 is expected', () => {
    const shell = '<html id="__next_error__"><head></head><body></body></html>';
    assert.deepEqual(detectErrorMarkers(shell, { expectedStatus: 404 }), []);
    assert.equal(detectErrorMarkers(shell, { expectedStatus: 200 }).length, 1);
  });
});

describe('evaluateResponse', () => {
  const ok = { contentType: 'text/html', body: '<p>hi</p>', location: null };
  test('any 5xx fails, even when 5xx was somehow expected', () => {
    assert.equal(evaluateResponse({ path: '/x', status: 500 }, { ...ok, status: 500 }).ok, false);
  });
  test('status mismatch fails', () => {
    assert.match(evaluateResponse({ path: '/x', status: 200 }, { ...ok, status: 404 }).reason, /expected 200/);
  });
  test('a 200 whose body carries an error marker fails', () => {
    const body = '<template data-dgst="99"></template>';
    assert.equal(evaluateResponse({ path: '/x', status: 200 }, { ...ok, status: 200, body }).ok, false);
  });
  test('redirect target must match by pathname', () => {
    const entry = { path: '/docs', status: 307, location: '/auth/login' };
    assert.equal(evaluateResponse(entry, { ...ok, status: 307, location: 'http://h/auth/login?redirectTo=%2Fdocs' }).ok, true);
    assert.equal(evaluateResponse(entry, { ...ok, status: 307, location: '/somewhere' }).ok, false);
    assert.equal(evaluateResponse(entry, { ...ok, status: 200 }).ok, false);
  });
  test('required body text is enforced', () => {
    assert.equal(evaluateResponse({ path: '/robots.txt', status: 200, bodyIncludes: 'User-Agent' }, { ...ok, status: 200 }).ok, false);
  });
});

describe('sitemap', () => {
  const xml = '<urlset><url><loc>https://unite-group.in/</loc></url><url><loc>https://unite-group.in/cards</loc></url><url><loc>https://unite-group.in/new-page</loc></url></urlset>';
  test('extracts pathnames and reports the unsmoked one', () => {
    assert.deepEqual(extractSitemapPaths(xml), ['/', '/cards', '/new-page']);
    assert.deepEqual(sitemapGaps(extractSitemapPaths(xml), SMOKE_PATHS), ['/new-page']);
  });
  test('a path smoked only as a redirect does not satisfy the sitemap', () => {
    assert.deepEqual(sitemapGaps(['/docs'], SMOKE_PATHS), ['/docs']);
  });
});

describe('the shipped list against the real apps/web', () => {
  test('every app route is smoked or excluded, with no stale or mistied entries', () => {
    const discovered = discoverRoutes(realAppDir);
    assert.ok(discovered.length > 20, `discovery found only ${discovered.length} routes`);
    const result = checkCoverage({ discovered, entries: SMOKE_PATHS, excluded: EXCLUDED, publicDir: join(realAppDir, 'public') });
    assert.deepEqual({ uncovered: result.uncovered, stale: result.stale, mismatched: result.mismatched }, { uncovered: [], stale: [], mismatched: [] });
  });

  test('every public sitemap route in lib/public-site.ts is smoked with a 200 expectation', () => {
    const smoked = new Set(SMOKE_PATHS.filter((e) => e.status === 200).map((e) => e.path));
    for (const route of ['/', '/grow', '/cards', '/cards/order', '/cards/terms', '/solutions/visibility', '/solutions/experience', '/solutions/conversion', '/solutions/intelligence', '/privacy-policy', '/terms-of-service']) {
      assert.ok(smoked.has(route), route);
    }
  });

  test('the 25/10/2026 incident path is in the list three ways', () => {
    const thanks = SMOKE_PATHS.filter((e) => e.pattern === '/cards/thanks').map((e) => e.path);
    assert.deepEqual(thanks, ['/cards/thanks', '/cards/thanks?session_id=cs_test_x', '/cards/thanks?session_id=not-a-session']);
  });
});

describe('review follow-ups', () => {
  test('static robots.txt and sitemap.xml in src/app are discovered', () => {
    const patterns = discoverRoutes(fixture(['robots.txt', 'sitemap.xml'])).map((route) => route.pattern);
    assert.deepEqual(patterns, ['/robots.txt', '/sitemap.xml']);
  });

  test('a symlinked folder in src/app is a harness error, not a silent skip', () => {
    const root = fixture(['real/page.tsx']);
    symlinkSync(join(root, 'src', 'app', 'real'), join(root, 'src', 'app', 'link'));
    assert.throws(() => discoverRoutes(root), /symlink in src\/app/);
  });

  test('an excluded route handler is requested and must redirect to the login page, like an excluded page', () => {
    const discovered = discoverRoutes(fixture(['founder/page.tsx', 'founder/export/route.ts', 'founder/icon.png']));
    const checks = excludedPageChecks(discovered, [{ pattern: '/founder/**', reason: 'test' }]);
    assert.deepEqual(checks.map((check) => [check.path, check.status, check.location]), [
      ['/founder', 307, '/auth/login'],
      ['/founder/export', 307, '/auth/login'],
    ]);
  });

  test('the offline preload refuses non-loopback fetch, http and https, and lets loopback through', () => {
    const probe = join(mkdtempSync(join(tmpdir(), 'smoke-probe-')), 'probe.cjs');
    temporary.push(dirname(probe));
    writeFileSync(probe, `
const http = require('node:http'); const https = require('node:https');
const server = http.createServer((q, r) => r.end('ok')).listen(0, '127.0.0.1', async () => {
  const out = [];
  const settle = (start) => new Promise((done) => { const req = start((res) => { res.resume(); done('LEAK ' + res.statusCode); }); req.on('error', (e) => done(e.code)); });
  out.push(await settle((cb) => http.get('http://127.0.0.1:' + server.address().port + '/', cb)));
  out.push(await settle((cb) => https.get('https://example.com/', cb)));
  out.push(await settle((cb) => { const r = https.request({ hostname: 'api.stripe.com', path: '/v1', method: 'POST' }, cb); r.end(); return r; }));
  out.push(await fetch('https://example.com/').then(() => 'LEAK', (e) => e.message));
  server.close();
  console.log(JSON.stringify(out));
});`);
    const result = spawnSync(process.execPath, ['--require', join(realAppDir, 'scripts', 'smoke-offline-preload.cjs'), probe], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(result.status, 0, result.stderr);
    const [loopback, ...refused] = JSON.parse(result.stdout.trim().split('\n').pop());
    assert.equal(loopback, 'LEAK 200'); // loopback is allowed through
    assert.deepEqual(refused, ['ECONNREFUSED', 'ECONNREFUSED', 'fetch failed']);
  });

  test('the card stub answers only the exact public query and refuses any other like an outage', () => {
    const probe = join(mkdtempSync(join(tmpdir(), 'smoke-stub-')), 'probe.cjs');
    temporary.push(dirname(probe));
    const columns = /PUBLIC_COLUMNS\s*=\s*'([^']+)'/.exec(readFileSync(join(realAppDir, 'src', 'lib', 'card', 'published.ts'), 'utf8'))[1];
    writeFileSync(probe, `
const base = 'https://example.supabase.co/rest/v1/card_profiles';
const q = (select, slug, extra = '') => base + '?select=' + encodeURIComponent(select) + '&card_slug=eq.' + slug + extra;
const run = (url) => fetch(url).then(async (r) => r.status + ' ' + (await r.text()).slice(0, 40), (e) => e.message);
(async () => {
  const columns = ${JSON.stringify(columns)};
  console.log(JSON.stringify([
    await run(q(columns, 'smoke-unknown-card')),
    await run(q(columns, 'smoke-published-card')),
    await run(q('not_a_column', 'smoke-unknown-card')),
    await run(q(columns, 'some-other-slug')),
    await run(q(columns, 'smoke-unknown-card', '&extra=1')),
  ]));
})();`);
    const result = spawnSync(process.execPath, ['--require', join(realAppDir, 'scripts', 'smoke-offline-preload.cjs'), probe], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(result.status, 0, result.stderr);
    const [unknown, published, badColumn, otherSlug, extraParam] = JSON.parse(result.stdout.trim().split('\n').pop());
    assert.equal(unknown, '200 []');
    assert.match(published, /^200 \[\{"card_slug":"smoke-published-card"/);
    assert.deepEqual([badColumn, otherSlug, extraParam], ['fetch failed', 'fetch failed', 'fetch failed']);
  });
});

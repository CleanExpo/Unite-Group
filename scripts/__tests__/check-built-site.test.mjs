import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { PLACEHOLDER, checkBuiltSite, main } from '../website/check-built-site.mjs';

const SCRIPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SITE = 'https://example.com.au';

function page({ title = 'Example page title', h1s = 1, canonical = true, description = true, lang = true, body = '' } = {}) {
  return [
    `<!doctype html><html${lang ? ' lang="en-AU"' : ''}><head>`,
    `<title>${title}</title>`,
    description ? '<meta name="description" content="A real description">' : '',
    canonical ? `<link rel="canonical" href="${SITE}/">` : '',
    '</head><body>',
    ...Array.from({ length: h1s }, () => '<h1>Heading</h1>'),
    body,
    '</body></html>',
  ].join('\n');
}

function makeDist(files) {
  const dir = mkdtempSync(join(tmpdir(), 'cbs-'));
  for (const [rel, text] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}

function cleanSite(overrides = {}) {
  return makeDist({
    'index.html': page({ body: '<a href="/about/">About</a> <a href="/about/#team">Team</a> <img src="/img/a.webp" alt="">' }),
    'about/index.html': page({ body: '<a href="/">Home</a>' }),
    '404.html': page({ title: 'Page not found here' }),
    'robots.txt': 'User-agent: *\nAllow: /\n',
    'sitemap-index.xml': '<sitemapindex></sitemapindex>',
    ...overrides,
  });
}

function messages(result) {
  return result.problems.join('\n');
}

test('a clean built site passes and reports what it checked', () => {
  const dist = cleanSite();
  try {
    const r = checkBuiltSite(dist, { site: SITE, minPages: 3 });
    assert.deepEqual(r.problems, []);
    assert.equal(r.counts.pages, 3);
    assert.ok(r.counts.links >= 3);
    assert.equal(r.counts.images, 1);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a missing folder fails with [empty]', () => {
  const r = checkBuiltSite(join(tmpdir(), 'cbs-does-not-exist-xyz'));
  assert.match(messages(r), /^\[empty\]/m);
});

test('an empty folder fails: zero pages is never a pass', () => {
  const dist = makeDist({});
  try {
    const r = checkBuiltSite(dist);
    assert.match(messages(r), /\[empty\] found 0 HTML page/);
    assert.match(messages(r), /\[required\] missing index\.html/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a folder holding only 404.html fails', () => {
  const dist = makeDist({ '404.html': page() });
  try {
    const r = checkBuiltSite(dist);
    assert.match(messages(r), /\[required\] missing index\.html/);
    assert.match(messages(r), /\[required\] missing robots\.txt/);
    assert.match(messages(r), /\[required\] missing sitemap/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('--min-pages fails a build with fewer pages than expected', () => {
  const dist = cleanSite();
  try {
    assert.match(messages(checkBuiltSite(dist, { minPages: 5 })), /\[empty\] found 3 HTML page\(s\).*at least 5/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

const RULES = [
  ['[h1] two h1', { 'about/index.html': page({ h1s: 2 }) }, /\[h1\] about\/index\.html: expected 1 <h1>, found 2/],
  ['[h1] no h1', { 'about/index.html': page({ h1s: 0 }) }, /\[h1\] about\/index\.html: expected 1 <h1>, found 0/],
  ['[title] short title', { 'about/index.html': page({ title: 'Short' }) }, /\[title\] about\/index\.html/],
  ['[description] missing', { 'about/index.html': page({ description: false }) }, /\[description\] about\/index\.html/],
  ['[canonical] missing', { 'about/index.html': page({ canonical: false }) }, /\[canonical\] about\/index\.html/],
  ['[lang] missing', { 'about/index.html': page({ lang: false }) }, /\[lang\] about\/index\.html/],
  ['[link] broken internal link', { 'about/index.html': page({ body: '<a href="/services/">x</a>' }) }, /\[link\] about\/index\.html: broken internal link \/services\//],
  ['[link] broken absolute same-site link', { 'about/index.html': page({ body: `<a href="${SITE}/gone/">x</a>` }) }, /\[link\] .*\/gone\//],
  ['[hotlink] image from another site', { 'about/index.html': page({ body: '<img src="https://images.example.net/a.jpg" alt="">' }) }, /\[hotlink\] about\/index\.html: image loaded from https:\/\/images\.example\.net/],
  ['[placeholder] TODO(client) left', { 'about/index.html': page({ body: `<p>${PLACEHOLDER}: phone</p>` }) }, /\[placeholder\] about\/index\.html/],
  ['[placeholder] TODO(client) in robots', { 'robots.txt': `# ${PLACEHOLDER}\n` }, /\[placeholder\] robots\.txt/],
  ['[privacy] form without privacy page', { 'about/index.html': page({ body: '<form><input name="contact_consent" type="checkbox"><a href="/privacy/">p</a></form>' }) }, /\[privacy\] about\/index\.html has a form but the site has no \/privacy\/ page/],
  ['[privacy] form without consent', {
    'privacy/index.html': page(),
    'about/index.html': page({ body: '<form><a href="/privacy/">p</a></form>' }),
  }, /\[privacy\] about\/index\.html has a form with no contact_consent checkbox/],
];

for (const [name, files, pattern] of RULES) {
  test(`rule ${name} fires with its own message`, () => {
    const dist = cleanSite(files);
    try {
      const r = checkBuiltSite(dist, { site: SITE });
      assert.match(messages(r), pattern);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
}

test('a complete form with a privacy page and consent passes', () => {
  const dist = cleanSite({
    'privacy/index.html': page(),
    'about/index.html': page({ body: '<form><input type="checkbox" name="contact_consent"><a href="/privacy/">Privacy</a></form>' }),
  });
  try {
    assert.deepEqual(checkBuiltSite(dist, { site: SITE }).problems, []);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('both programs run when invoked through a symlinked folder instead of exiting 0 silently', () => {
  const base = mkdtempSync(join(tmpdir(), 'cbs-link-'));
  try {
    symlinkSync(SCRIPTS_DIR, join(base, 'scripts'), 'dir');
    const checker = spawnSync(process.execPath, [join(base, 'scripts', 'website', 'check-built-site.mjs')], { encoding: 'utf8' });
    assert.equal(checker.status, 2);
    assert.match(checker.stderr, /^Usage: /);
    const tool = spawnSync(process.execPath, [join(base, 'scripts', 'website', 'client-site.mjs'), 'frobnicate'], { encoding: 'utf8' });
    assert.equal(tool.status, 2);
    assert.match(tool.stderr, /unknown command "frobnicate"/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('main exits 0 on a clean site, 1 on problems, 2 on bad usage', () => {
  const quiet = { log() {}, error() {} };
  const good = cleanSite();
  const bad = cleanSite({ 'about/index.html': page({ h1s: 2 }) });
  try {
    assert.equal(main([good, '--site', SITE], quiet), 0);
    assert.equal(main([bad], quiet), 1);
    assert.equal(main([], quiet), 2);
    assert.equal(main([good, '--min-pages', '0'], quiet), 2);
  } finally {
    rmSync(good, { recursive: true, force: true });
    rmSync(bad, { recursive: true, force: true });
  }
});

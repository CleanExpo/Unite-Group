#!/usr/bin/env node
// Checks a built static site (an Astro `dist` folder) before it is shown to a client or released.
//
// Exit 0 only when at least --min-pages HTML pages were checked and none broke a rule.
// A missing folder or a folder with no HTML is a failure, never a quiet pass.
//
// Rules, one message prefix each so tests can assert the rule that fired:
//   [h1]          each page has exactly one <h1>
//   [title]       a <title> of 10 or more characters
//   [description] a meta description
//   [canonical]   a canonical link
//   [lang]        <html lang="...">
//   [link]        internal links resolve to a built file
//   [hotlink]     no <img> loaded from another site
//   [placeholder] no TODO(client) left anywhere
//   [required]    index.html, 404.html, robots.txt and a sitemap exist
//   [privacy]     a page with a form links to /privacy/, which exists, and asks for contact_consent
//   [empty]       the folder exists and holds at least --min-pages pages
//
// Usage: node scripts/website/check-built-site.mjs <dist> [--site https://example.com.au] [--min-pages N]

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { invokedDirectly } from './lib/common.mjs';

export const PLACEHOLDER = 'TODO(client)';

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function stripQueryAndHash(href) {
  return href.split('#')[0].split('?')[0];
}

function resolvesToFile(dist, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const rel = decoded.replace(/^\/+/, '');
  const candidates = [];
  if (rel === '' || rel.endsWith('/')) candidates.push(join(rel, 'index.html'));
  else {
    candidates.push(rel, `${rel}.html`, join(rel, 'index.html'));
  }
  return candidates.some((c) => {
    const full = resolve(dist, c);
    if (full !== dist && !full.startsWith(dist + sep)) return false;
    return existsSync(full) && statSync(full).isFile();
  });
}

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function checkBuiltSite(distDir, { site = null, minPages = 1 } = {}) {
  const problems = [];
  const counts = { pages: 0, links: 0, images: 0 };
  const dist = resolve(distDir);
  if (!existsSync(dist) || !statSync(dist).isDirectory()) {
    problems.push(`[empty] ${distDir} does not exist or is not a folder; build the site first`);
    return { problems, counts };
  }
  const files = listFiles(dist);
  const pages = files.filter((f) => f.endsWith('.html'));
  counts.pages = pages.length;
  if (pages.length < Math.max(1, minPages)) {
    problems.push(`[empty] found ${pages.length} HTML page(s) in ${distDir}; expected at least ${Math.max(1, minPages)}`);
  }

  const relFiles = new Set(files.map((f) => relative(dist, f).split(sep).join('/')));
  for (const req of ['index.html', '404.html', 'robots.txt']) {
    if (!relFiles.has(req)) problems.push(`[required] missing ${req}`);
  }
  if (!relFiles.has('sitemap-index.xml') && !relFiles.has('sitemap.xml')) {
    problems.push('[required] missing sitemap (sitemap-index.xml or sitemap.xml)');
  }

  const siteOrigin = site ? originOf(site) : null;

  for (const file of files) {
    const rel = relative(dist, file).split(sep).join('/');
    if (!/\.(html|xml|txt|json|js|css)$/i.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (text.includes(PLACEHOLDER)) problems.push(`[placeholder] ${rel} still contains ${PLACEHOLDER}`);
  }

  for (const file of pages) {
    const rel = relative(dist, file).split(sep).join('/');
    const html = readFileSync(file, 'utf8');
    const h1s = (html.match(/<h1[\s>]/gi) || []).length;
    if (h1s !== 1) problems.push(`[h1] ${rel}: expected 1 <h1>, found ${h1s}`);
    if (!/<title>[^<]{10,}<\/title>/i.test(html)) problems.push(`[title] ${rel}: missing or short <title>`);
    if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html)) {
      problems.push(`[description] ${rel}: missing meta description`);
    }
    if (!/<link\s+rel=["']canonical["']\s+href=["'][^"']+["']/i.test(html)) {
      problems.push(`[canonical] ${rel}: missing canonical link`);
    }
    if (!/<html[^>]*\slang=["'][a-zA-Z-]+["']/i.test(html)) problems.push(`[lang] ${rel}: <html> has no lang`);

    for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
      const href = m[1];
      if (/^(mailto:|tel:|#|javascript:)/i.test(href)) continue;
      let pathname = null;
      if (href.startsWith('/') && !href.startsWith('//')) pathname = stripQueryAndHash(href);
      else if (siteOrigin && originOf(href) === siteOrigin) pathname = new URL(href).pathname;
      if (pathname === null) continue;
      counts.links += 1;
      if (!resolvesToFile(dist, pathname)) problems.push(`[link] ${rel}: broken internal link ${href}`);
    }

    if (/<form[\s>]/i.test(html)) {
      if (!relFiles.has('privacy/index.html')) problems.push(`[privacy] ${rel} has a form but the site has no /privacy/ page`);
      if (!/href=["'](?:https?:\/\/[^"']*)?\/privacy\/?["']/i.test(html)) problems.push(`[privacy] ${rel} has a form but does not link to /privacy/`);
      if (!/name=["']contact_consent["']/i.test(html)) problems.push(`[privacy] ${rel} has a form with no contact_consent checkbox`);
    }

    for (const m of html.matchAll(/<img\s[^>]*src=["']([^"']+)["']/gi)) {
      counts.images += 1;
      const src = m[1];
      const o = /^(https?:)?\/\//i.test(src) ? originOf(src.startsWith('//') ? `https:${src}` : src) : null;
      if (o && o !== siteOrigin) problems.push(`[hotlink] ${rel}: image loaded from ${o}`);
    }
  }
  return { problems, counts };
}

function parseArgs(argv) {
  const args = { dist: null, site: null, minPages: 1 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--site') args.site = argv[++i];
    else if (a === '--min-pages') args.minPages = Number.parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!args.dist) args.dist = a;
    else args.extra = a;
  }
  return args;
}

export function main(argv = process.argv.slice(2), log = console) {
  const args = parseArgs(argv);
  if (args.help || !args.dist || args.extra || !Number.isInteger(args.minPages) || args.minPages < 1) {
    log.error('Usage: node scripts/website/check-built-site.mjs <dist> [--site https://example.com.au] [--min-pages N]');
    return 2;
  }
  const { problems, counts } = checkBuiltSite(args.dist, { site: args.site, minPages: args.minPages });
  log.log(`checked ${counts.pages} pages, ${counts.links} internal links, ${counts.images} images`);
  for (const p of problems) log.error(p);
  if (problems.length) {
    log.error(`FAIL: ${problems.length} problem(s)`);
    return 1;
  }
  log.log('PASS');
  return 0;
}

if (invokedDirectly(import.meta.url)) {
  process.exitCode = main();
}

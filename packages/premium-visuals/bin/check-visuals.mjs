#!/usr/bin/env node
/**
 * check-visuals — CleanExpo premium visual & motion gate. Zero dependencies (Node >= 20).
 *
 * A static, text-level heuristic. A clean run is NOT visual acceptance: the SDA visual
 * evidence gate (real screenshots, video frames) and the owner's review of the rendered
 * page are still required. Report-only mode lists findings and never fails the build.
 *
 * FINDINGS (fail in enforce mode):
 *   inline-svg-art            inline <svg> not marked data-pv-allow="icon|logo" (use lucide/real icon sets for UI)
 *   svg-asset                 .svg files in public/ whose own name is not a logo/icon/favicon name, unless allowlisted
 *   css-art                   conic/radial/repeating gradients or clip-path polygons (>=5 points) used as artwork
 *   canvas-drawing            <canvas> / getContext() drawing (light WebGL needs an allowlist entry)
 *   placeholder-host          placeholder or hot-linked stock hosts (placehold.co, picsum, unsplash CDN, ...)
 *   unmanifested-media        image/video paths used in code or stylesheets with no media.manifest.json entry
 *   unmanifested-public-media image/video files in public/ with no media.manifest.json entry
 *   manifest-missing          no media.manifest.json at all
 *   manifest-invalid          manifest not {version:1, entries:[...]}, or an entry with a bad src, kind
 *                             (image|video|render), source (client|stock|generated|blender), non-string
 *                             credit/alt, duplicate src, or a video without a poster
 *   manifest-missing-file     manifest entry (or poster) whose file is not in any public dir
 *   hero-missing-media        marketing page without a rendered <PremiumHero media={...}> (or a data-pv-hero element holding its own image/video)
 *   no-motion                 marketing page with no rendered <MotionSection> / data-pv-motion
 *   marketing-coverage        fewer marketing pages found than minMarketingPages (default 1)
 *   media-budget              raster > imageMaxKB, video > videoMaxKB, PNG/JPG > legacyRasterMaxKB, or .mov
 *
 * Comments are never evidence and never findings. String literals count for findings
 * (a string can be rendered) but never as evidence of a hero or motion section.
 * Manifest credit/source fields are declarations only; this tool does not verify rights.
 *
 * The allowlist exempts files from the code-drawn-art rules only (inline-svg-art, svg-asset,
 * css-art, canvas-drawing). It never exempts budgets, provenance, placeholders or page rules.
 *
 * Exit: 0 = no findings, or report-only; 1 = findings in enforce mode; 2 = configuration error.
 * Usage: check-visuals [--root .] [--report-only] [--json] [--limit N] [--config visuals.config.json] [--list-extensions]
 */
import fs from 'node:fs';
import path from 'node:path';

const CODE_EXTS = ['tsx', 'jsx', 'ts', 'js', 'mdx', 'html', 'astro', 'vue', 'svelte'];
const STYLE_EXTS = ['css', 'scss', 'sass', 'less'];
const MEDIA_EXTS = ['avif', 'webp', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'mov'];
const IMAGE_EXTS = ['avif', 'webp', 'png', 'jpg', 'jpeg', 'gif'];
const KINDS = ['image', 'video', 'render'];
const SOURCES = ['client', 'stock', 'generated', 'blender'];

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

function configError(msg) {
  console.error(`check-visuals: configuration error: ${msg}`);
  process.exitCode = 2;
}

function main() {
  if (flag('--list-extensions')) {
    console.log(JSON.stringify({ code: CODE_EXTS, style: STYLE_EXTS, media: MEDIA_EXTS }));
    return;
  }
  const root = path.resolve(opt('--root', '.'));
  const cfgPath = path.join(root, opt('--config', 'visuals.config.json'));

  const DEFAULTS = {
    mode: 'enforce',
    srcDirs: ['app', 'src', 'components', 'pages', 'apps/web'],
    publicDirs: ['public', 'apps/web/public'],
    manifest: 'media.manifest.json',
    ignore: ['node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.git', '.turbo', 'storybook-static', '__tests__', 'tests', 'e2e', '.vercel'],
    allowlist: [],
    marketingPages: ['**/app/**/page.{tsx,jsx,ts,js,mdx}', '**/pages/**/*.{tsx,jsx,mdx}'],
    nonMarketing: ['/api/', '/admin', '/dashboard', 'portal/', '/account', '/login', '/auth', '/settings', '/(app)/', '/(dashboard)/', '/(auth)/', '/(admin)/', '/(founder)/', '/(preview)/', '/app/app/', '/crm/', '/demo/', '/dev/', '/onboarding', '/invoices', '/billing', '/reports', '/setup', '/signup', '/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/invite', '/sign/', '/learn/', '/lms/', '/student', '/instructor', '/offline', '/status/', '/__tests__/', '/pages/_app.', '/pages/_document.', '/pages/_error.'],
    minMarketingPages: 1,
    budgets: { imageMaxKB: 450, videoMaxKB: 6000, legacyRasterMaxKB: 80 },
  };
  let cfg = { ...DEFAULTS };
  if (fs.existsSync(cfgPath)) {
    let u;
    try { u = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) { return configError(`${cfgPath} is not valid JSON (${e.message})`); }
    if (!u || typeof u !== 'object' || Array.isArray(u)) return configError(`${cfgPath} must be a JSON object`);
    cfg = { ...DEFAULTS, ...u, budgets: { ...DEFAULTS.budgets, ...(u.budgets || {}) } };
  }
  if (!['report', 'enforce'].includes(cfg.mode)) return configError(`mode must be "report" or "enforce", got ${JSON.stringify(cfg.mode)}`);
  for (const k of ['srcDirs', 'publicDirs', 'ignore', 'allowlist', 'marketingPages', 'nonMarketing']) {
    if (!Array.isArray(cfg[k]) || !cfg[k].every((s) => typeof s === 'string')) return configError(`${k} must be an array of strings`);
  }
  if (typeof cfg.manifest !== 'string' || !cfg.manifest) return configError('manifest must be a file path string');
  if (!Number.isInteger(cfg.minMarketingPages) || cfg.minMarketingPages < 0) return configError('minMarketingPages must be a non-negative integer');
  for (const k of ['imageMaxKB', 'videoMaxKB', 'legacyRasterMaxKB']) {
    if (typeof cfg.budgets[k] !== 'number' || !(cfg.budgets[k] > 0)) return configError(`budgets.${k} must be a positive number`);
  }
  const reportOnly = flag('--report-only') || cfg.mode === 'report';

  const allowRes = cfg.allowlist.map((a) => globToRe(a.replace(/^\.\//, '')));
  const allowed = (r) => allowRes.some((re) => re.test(r));
  const mktRes = cfg.marketingPages.map(globToRe);

  const testFile = /\.(test|spec|stories)\.[cm]?[jt]sx?$/;
  function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (cfg.ignore.includes(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, out);
      else if (ent.isFile() && !testFile.test(ent.name)) out.push(p);
    }
    return out;
  }
  const rel = (p) => path.relative(root, p).split(path.sep).join('/');
  const uniq = (a) => [...new Set(a)];
  const extOf = (f) => path.extname(f).slice(1).toLowerCase();

  const srcFiles = uniq(cfg.srcDirs.flatMap((d) => walk(path.join(root, d)))).filter((f) => CODE_EXTS.includes(extOf(f)) || STYLE_EXTS.includes(extOf(f))).sort();
  const publicFiles = uniq(cfg.publicDirs.flatMap((d) => walk(path.join(root, d)))).sort();

  const violations = [];
  const add = (rule, file, line, detail) => violations.push({ rule, file, line, detail });
  const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

  // svg-asset exemption (a code-drawn-art rule): the file's own name must be a whole-word
  // logo/icon/brand-mark name. A folder such as icons/ or logos/ never excuses an illustration.
  const BRAND_NAME = /(^|[-_.\s])(logo|logos|icon|icons|favicon|apple-touch-icon|og|opengraph|opengraph-image|twitter-image|mark|wordmark|badge-official|flag)([-_.\s@]|$)/i;
  const brandAsset = (p) => BRAND_NAME.test(path.basename(p));
  // Manifest exemption is narrower: only a file whose own name says it is a logo, icon or share
  // image. A folder name (/logos/banner.webp) or a word such as "flag" never excuses ordinary media.
  const BRAND_MEDIA = /(^|[-_.\s])(logo|logos|icon|icons|favicon|apple-touch-icon|apple-icon|og|opengraph|opengraph-image|twitter-image)([-_.\s@]|$)/i;
  const brandMedia = (p) => BRAND_MEDIA.test(path.basename(p));
  // Only a path that stays inside a public dir counts as found there.
  const findPublic = (src) => cfg.publicDirs.map((d) => {
    const base = path.resolve(root, d);
    const p = path.resolve(base, '.' + src);
    return p.startsWith(base + path.sep) ? p : null;
  }).find((p) => p && fs.existsSync(p) && fs.statSync(p).isFile());

  // ---- manifest ----
  const manifestSrcs = new Set(); // entry srcs and posters: paths that count as manifested
  const entrySrcs = new Set(); // entry srcs only: a poster may also have its own entry (videoEntries does this)
  const mPath = path.join(root, cfg.manifest);
  const manifestBad = (detail) => add('manifest-invalid', cfg.manifest, 0, detail);
  let entryCount = 0;
  if (!fs.existsSync(mPath)) add('manifest-missing', cfg.manifest, 0, `${cfg.manifest} not found; every shipped image/video needs an entry`);
  else {
    let m;
    try { m = JSON.parse(fs.readFileSync(mPath, 'utf8')); } catch (e) { manifestBad(`not valid JSON (${e.message})`); }
    if (m !== undefined) {
      if (!m || typeof m !== 'object' || Array.isArray(m)) manifestBad('manifest must be an object {"version":1,"entries":[...]}');
      else {
        if (m.version !== 1) manifestBad(`version must be 1, got ${JSON.stringify(m.version)}`);
        if (!Array.isArray(m.entries)) manifestBad('entries must be an array');
        else {
          const isText = (v) => typeof v === 'string' && v.trim().length > 0;
          const validPath = (p) => typeof p === 'string' && /^\/[^\s?#\\]+$/.test(p) && !p.split('/').includes('..') && MEDIA_EXTS.includes(extOf(p));
          m.entries.forEach((e, i) => {
            entryCount++;
            const id = e && typeof e === 'object' && typeof e.src === 'string' ? e.src : `entries[${i}]`;
            if (!e || typeof e !== 'object' || Array.isArray(e)) return manifestBad(`${id}: entry must be an object`);
            const bad = [];
            if (!validPath(e.src)) bad.push('src (absolute public path to an image/video file)');
            else if (entrySrcs.has(e.src)) bad.push('src (duplicate entry)');
            if (!KINDS.includes(e.kind)) bad.push(`kind (${KINDS.join('|')})`);
            if (!SOURCES.includes(e.source)) bad.push(`source (${SOURCES.join('|')})`);
            if (!isText(e.credit)) bad.push('credit (non-empty text)');
            if (!isText(e.alt)) bad.push('alt (non-empty text)');
            if (e.kind === 'video' && e.poster === undefined) bad.push('poster (required for video)');
            if (e.poster !== undefined && !(validPath(e.poster) && IMAGE_EXTS.includes(extOf(e.poster)))) bad.push('poster (absolute public path to an image)');
            if (bad.length) manifestBad(`${id}: invalid ${bad.join(', ')}`);
            if (validPath(e.src)) {
              entrySrcs.add(e.src);
              manifestSrcs.add(e.src);
              if (!findPublic(e.src)) add('manifest-missing-file', cfg.manifest, 0, `${e.src} is listed but no such file exists in ${cfg.publicDirs.join(' or ')}`);
            }
            if (validPath(e.poster)) {
              manifestSrcs.add(e.poster);
              if (!findPublic(e.poster)) add('manifest-missing-file', cfg.manifest, 0, `${e.poster} (poster of ${id}) does not exist in ${cfg.publicDirs.join(' or ')}`);
            }
          });
        }
      }
    }
  }

  const PLACEHOLDER = /\b(placehold\.co|placeholder\.com|via\.placeholder\.com|picsum\.photos|unsplash\.it|source\.unsplash\.com|images\.unsplash\.com|plus\.unsplash\.com|loremflickr\.com|dummyimage\.com|placekitten\.com|placeimg\.com|images\.pexels\.com|lorempixel\.com|fakeimg\.pl)\b/g;
  const MEDIA_PATH = new RegExp(`["'\`(](\\/[A-Za-z0-9_\\-./%@]+\\.(?:${MEDIA_EXTS.join('|')}))["'\`)?]`, 'gi');

  const views = new Map();
  for (const f of srcFiles) {
    const r = rel(f);
    const ext = extOf(f);
    const isCode = CODE_EXTS.includes(ext);
    const raw = fs.readFileSync(f, 'utf8');
    const v = scrub(raw, { slashComments: ext !== 'css', htmlComments: ['html', 'mdx', 'astro', 'vue', 'svelte'].includes(ext), jsx: ['tsx', 'jsx', 'js', 'mdx'].includes(ext), mdx: ext === 'mdx' });
    views.set(f, v);
    const t = v.code;
    const artOk = allowed(r);
    let m;
    if (isCode && !artOk) {
      const svgRe = /<svg\b[^>]*>/g;
      while ((m = svgRe.exec(t))) {
        if (/data-pv-allow=["'{]?\s*["']?(icon|logo)["']/.test(m[0])) continue;
        add('inline-svg-art', r, lineOf(t, m.index), 'inline <svg>: replace with real image/video, or a real icon set (lucide-react); logos: data-pv-allow="logo"');
      }
      const cv = /<canvas\b|\.getContext\(\s*["'](2d|webgl2?|bitmaprenderer)["']/g;
      while ((m = cv.exec(t))) add('canvas-drawing', r, lineOf(t, m.index), m[0]);
    }
    if (!artOk) {
      const css = /\b(conic-gradient|radial-gradient|repeating-(linear|radial|conic)-gradient)\s*\(|bg-\[(conic|radial)-gradient|bg-gradient-(conic|radial)/g;
      while ((m = css.exec(t))) add('css-art', r, lineOf(t, m.index), m[0]);
      const clip = /clip-path\s*:\s*polygon\(([^)]*)\)|\[clip-path:polygon\(([^\]]*)\)\]|clipPath\s*:\s*["']polygon\(([^)]*)\)/g;
      while ((m = clip.exec(t))) {
        const pts = (m[1] || m[2] || m[3] || '').split(',').length;
        if (pts >= 5) add('css-art', r, lineOf(t, m.index), `clip-path polygon with ${pts} points`);
      }
    }
    PLACEHOLDER.lastIndex = 0;
    while ((m = PLACEHOLDER.exec(t))) add('placeholder-host', r, lineOf(t, m.index), m[1]);
    // Code and stylesheets alike: a CSS background-image: url("/media/x.webp") is shipped media too.
    {
      MEDIA_PATH.lastIndex = 0;
      while ((m = MEDIA_PATH.exec(t))) {
        const p = m[1].split('?')[0];
        if (brandMedia(p)) continue;
        if (!manifestSrcs.has(p)) add('unmanifested-media', r, lineOf(t, m.index), `${p} has no ${cfg.manifest} entry`);
      }
    }
  }

  for (const f of publicFiles) {
    const r = rel(f);
    const base = path.basename(f).toLowerCase();
    const ext = extOf(f);
    const kb = fs.statSync(f).size / 1024;
    const publicPath = '/' + path.relative(cfg.publicDirs.map((d) => path.join(root, d)).find((d) => f.startsWith(d + path.sep)), f).split(path.sep).join('/');
    if (ext === 'svg' && !brandAsset(publicPath) && !allowed(r))
      add('svg-asset', r, 0, 'SVG illustration asset: replace with photo/generated image (logos/icons: name them *-logo*/*-icon* or allowlist)');
    // Budgets apply to every file. Neither the allowlist nor a brand-like name exempts them.
    if (['avif', 'webp', 'png', 'jpg', 'jpeg', 'gif'].includes(ext) && kb > cfg.budgets.imageMaxKB) add('media-budget', r, 0, `${kb.toFixed(0)}KB > ${cfg.budgets.imageMaxKB}KB image budget`);
    else if (['png', 'jpg', 'jpeg'].includes(ext) && !/^(favicon|icon|apple-touch-icon|apple-icon|og|opengraph-image|twitter-image)([-_.@]|$)/.test(base) && kb > cfg.budgets.legacyRasterMaxKB)
      add('media-budget', r, 0, `${kb.toFixed(0)}KB PNG/JPG: ship AVIF/WebP (budget ${cfg.budgets.legacyRasterMaxKB}KB)`);
    if (['mp4', 'webm', 'mov'].includes(ext) && kb > cfg.budgets.videoMaxKB) add('media-budget', r, 0, `${(kb / 1024).toFixed(1)}MB > ${(cfg.budgets.videoMaxKB / 1024).toFixed(1)}MB video budget`);
    if (ext === 'mov') add('media-budget', r, 0, '.mov: encode to AV1/H.264 MP4 + WebM');
    if (MEDIA_EXTS.includes(ext) && !brandMedia(publicPath) && !manifestSrcs.has(publicPath))
      add('unmanifested-public-media', r, 0, `${publicPath} is in a public dir with no ${cfg.manifest} entry`);
  }

  // ---- marketing pages ----
  const marketing = srcFiles.filter((f) => ['tsx', 'jsx', 'ts', 'js', 'mdx'].includes(extOf(f))).filter((f) => {
    const r = rel(f);
    return mktRes.some((re) => re.test(r)) && !cfg.nonMarketing.some((n) => ('/' + r).includes(n));
  });
  for (const f of marketing) {
    const r = rel(f);
    const { code, bare } = views.get(f);
    if (!hasHeroMedia(code, bare)) add('hero-missing-media', r, 0, 'marketing page needs a rendered <PremiumHero media={...} video={...}> with a real/generated photo or video');
    if (!MOTION_TAG.test(bare) && !hasTagAttr(bare, 'data-pv-motion')) add('no-motion', r, 0, 'marketing page needs at least one rendered <MotionSection> (hero motion alone is not enough)');
  }
  if (marketing.length < cfg.minMarketingPages)
    add('marketing-coverage', '.', 0, `${marketing.length} marketing page(s) found, expected at least ${cfg.minMarketingPages}; check marketingPages/nonMarketing patterns (set minMarketingPages: 0 only for a repo with no public pages)`);

  // ---- report ----
  const byRule = violations.reduce((a, v) => ((a[v.rule] = (a[v.rule] || 0) + 1), a), {});
  const mode = reportOnly ? 'report-only' : 'enforce';
  const notice = reportOnly
    ? 'REPORT-ONLY: findings do not fail the build. This is not visual acceptance.'
    : 'Static heuristic only: a pass here is not visual acceptance; the SDA evidence gate and owner review still apply.';
  const summary = {
    root, mode, notice, visualAcceptance: false,
    total: violations.length, byRule,
    marketingPagesChecked: marketing.length, marketingPages: marketing.map(rel),
    provenance: { manifestEntries: entryCount, rightsVerified: false, note: 'source/credit are declarations only; licences and rights must be verified separately' },
    violations,
  };
  if (flag('--json')) console.log(JSON.stringify(summary, null, 2));
  else {
    const limit = Number(opt('--limit', 400));
    console.log(`check-visuals (${mode}): ${violations.length} finding(s), ${marketing.length} marketing page(s) checked`);
    console.log(notice);
    for (const [k, n] of Object.entries(byRule)) console.log(`  ${k.padEnd(26)} ${n}`);
    for (const v of violations.slice(0, limit)) console.log(`${v.rule}\t${v.file}${v.line ? ':' + v.line : ''}\t${v.detail}`);
    if (violations.length > limit) console.log(`... ${violations.length - limit} more (use --json for all)`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = Object.entries(byRule).map(([k, n]) => `| ${k} | ${n} |`).join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### check-visuals (${mode}): ${violations.length} findings, ${marketing.length} marketing pages\n\n**${notice}**\n\n| rule | count |\n|---|---|\n${rows}\n`);
  }
  // Set exitCode and let Node exit naturally: a forced exit drops stdout still buffered in a pipe (GP-667).
  process.exitCode = violations.length && !reportOnly ? 1 : 0;
}

/** Glob to RegExp: `**` any depth (`**\/` may match zero dirs), `*` one segment, `{a,b}` alternation. */
function globToRe(g) {
  let s = '';
  let inBrace = false;
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      if (g[i + 2] === '/') { s += '(?:.*/)?'; i += 2; } else { s += '.*'; i++; }
    } else if (c === '*') s += '[^/]*';
    else if (c === '{' && !inBrace) { s += '(?:'; inBrace = true; }
    else if (c === '}' && inBrace) { s += ')'; inBrace = false; }
    else if (c === ',' && inBrace) s += '|';
    else if ('.+^$()|[]\\?{}'.includes(c)) s += '\\' + c;
    else s += c;
  }
  return new RegExp('^' + s + '$');
}

/**
 * Two views of a source file, same length and line breaks as the original:
 *   code: comments blanked (strings kept, since a string can be rendered)
 *   bare: comments and string-literal contents blanked (used for positive evidence only)
 * A '...' or "..." literal must close on its line; an unclosed quote is JSX text (e.g. "don't").
 * `//` after ':' or '(' is a URL, not a comment. In the code view a `//` only counts as a comment at
 * line start or after `; { } ) ]`, so JSX text such as `See // <svg />` cannot hide a finding.
 * In JSX page text (tsx, jsx, js, mdx) `//` and `/*` render as characters, so neither view blanks them.
 */
/**
 * True when the quote at `i` sits where code can start a string literal: at the start, after an
 * operator or opening bracket, after `=>`, or after a keyword such as `return`. A quote straight
 * after a word or a closing `>` is JSX text ("We're here", <p>"Hi"</p>), so pairing it with a later
 * apostrophe would blank the real tags in between.
 */
const STRING_KEYWORDS = new Set(['return', 'case', 'typeof', 'in', 'of', 'yield', 'await', 'else', 'do', 'void', 'delete', 'new', 'export', 'default', 'from', 'import']);
function opensString(text, i) {
  let k = i - 1;
  while (k >= 0 && /\s/.test(text[k])) k--;
  if (k < 0) return true;
  const p = text[k];
  if ('=([{,:;!&|?+-*/%<~^'.includes(p)) return true;
  if (p === '>') return text[k - 1] === '=';
  if (/[\w$]/.test(p)) {
    let s = k;
    while (s > 0 && /[\w$]/.test(text[s - 1])) s--;
    return STRING_KEYWORDS.has(text.slice(s, k + 1));
  }
  return false;
}

/** True when the `<` at `i` can open a JSX element: a quote could start there, and it is not `a / <b` or a regex. */
function opensJsx(text, i) {
  let k = i - 1;
  while (k >= 0 && /\s/.test(text[k])) k--;
  if (k >= 0 && '/<*%+-~^'.includes(text[k])) return false;
  return opensString(text, i);
}

/**
 * In JSX files (jsx: true) scrub also tracks where it is: code, inside an opening tag, or in an
 * element's children. Children are page text, so a quote or backtick there is a word, never a
 * string; `{...}` inside them is code again. Only code strings and attribute strings are blanked.
 */
function scrub(text, { slashComments, htmlComments, jsx = false, mdx = false }) {
  const code = text.split('');
  const bare = text.split('');
  const blank = (arr, a, b) => { for (let k = a; k < b; k++) if (arr[k] !== '\n') arr[k] = ' '; };
  const n = text.length;
  // MDX starts as page text; other files start as code.
  const stack = [{ t: mdx ? 'text' : 'code', braces: 0 }];
  // Index after the tag name of an element opening at `at`, or -1 for a generic such as <T,> or <T extends U>.
  const openTag = (at) => {
    let j = at + 1;
    while (j < n && /[\w.$:-]/.test(text[j])) j++;
    if (/^\s*(,|extends\b)/.test(text.slice(j, j + 12))) return -1;
    stack.push({ t: 'tag' });
    return j;
  };
  let i = 0;
  while (i < n) {
    const c = text[i];
    const d = text[i + 1];
    const top = stack[stack.length - 1];
    // In JSX page text `//` and `/*` are characters that render, not comments.
    const inText = jsx && top.t === 'text';
    if (!inText && c === '/' && d === '*') {
      const e = text.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2;
      blank(code, i, end); blank(bare, i, end); i = end; continue;
    }
    if (htmlComments && text.startsWith('<!--', i)) {
      const e = text.indexOf('-->', i + 4); const end = e < 0 ? n : e + 3;
      blank(code, i, end); blank(bare, i, end); i = end; continue;
    }
    if (!inText && slashComments && c === '/' && d === '/' && text[i - 1] !== ':' && text[i - 1] !== '(') {
      const e = text.indexOf('\n', i); const end = e < 0 ? n : e;
      // Evidence view: any // ends the line, so a comment can never fake a hero or motion section.
      blank(bare, i, end);
      // Findings view: only a // that starts a line or follows code punctuation is a comment.
      // `See // <svg />` in JSX text renders, so it stays visible to the findings rules.
      let k = i - 1;
      while (k >= 0 && (text[k] === ' ' || text[k] === '\t')) k--;
      if (k < 0 || '\n;{})]'.includes(text[k])) blank(code, i, end);
      i = end; continue;
    }
    if (jsx && top.t === 'text') {
      if (mdx && stack.length === 1 && (i === 0 || text[i - 1] === '\n') && /^(import|export)\s/.test(text.slice(i, i + 7))) {
        stack.push({ t: 'code', braces: 0, line: true }); i += 6; continue;
      }
      if (c === '{') { stack.push({ t: 'code', braces: 0, inner: true }); i++; continue; }
      if (c === '<' && d === '/') { const e = text.indexOf('>', i); if (stack.length > 1) stack.pop(); i = e < 0 ? n : e + 1; continue; }
      if (c === '<' && /[A-Za-z>]/.test(d || '')) { const j = openTag(i); i = j < 0 ? i + 1 : j; continue; }
      // Page text: quotes and backticks here are words, never strings.
      i++; continue;
    }
    if (jsx && top.t === 'tag') {
      if (c === '"' || c === "'") { const e = text.indexOf(c, i + 1); const end = e < 0 ? n : e; blank(bare, i + 1, end); i = end + 1; continue; }
      if (c === '{') { stack.push({ t: 'code', braces: 0, inner: true }); i++; continue; }
      if (c === '/' && d === '>') { stack.pop(); i += 2; continue; }
      if (c === '>') { stack.pop(); stack.push({ t: 'text' }); i++; continue; }
      i++; continue;
    }
    if (jsx) {
      if (top.line && c === '\n' && top.braces === 0) { stack.pop(); i++; continue; }
      if (c === '{') { top.braces++; i++; continue; }
      if (c === '}') { if (top.braces > 0) top.braces--; else if (top.inner) stack.pop(); i++; continue; }
      if (c === '<' && /[A-Za-z>]/.test(d || '') && opensJsx(text, i)) { const j = openTag(i); if (j >= 0) { i = j; continue; } }
    }
    if (c === '`' || ((c === '"' || c === "'") && (jsx || opensString(text, i)))) {
      let j = i + 1;
      while (j < n && text[j] !== c && (c === '`' || text[j] !== '\n')) j += text[j] === '\\' ? 2 : 1;
      if (j < n && text[j] === c) { blank(bare, i + 1, j); i = j + 1; continue; }
    }
    i++;
  }
  return { code: code.join(''), bare: bare.join('') };
}

/** End index of a JSX opening tag starting at `start`, honouring {...} attribute expressions. */
function tagEnd(bare, start) {
  let depth = 0;
  for (let i = start; i < bare.length; i++) {
    const c = bare[i];
    if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
    else if (c === '>' && depth === 0) return i + 1;
  }
  return bare.length;
}

// `void <anything>` is always undefined, so it renders nothing either.
const EMPTY_VALUE = /^(undefined|null|false|true|0|void\b[\s\S]*|'\s*'|"\s*"|`\s*`|\[\s*\]|\{\s*\})?$/;
// A JSX tag name ends here: <PremiumHero.Fake> or <MotionSectionX> is another component, not this one.
const NAME_END = String.raw`(?![\w.$:-])`;
const MOTION_TAG = new RegExp(String.raw`<MotionSection${NAME_END}`);

/** True when the opening tag at `start` gives one of `names` a value that renders something. */
function hasNonEmptyAttr(code, bare, start, names) {
  const attrsBare = bare.slice(start, tagEnd(bare, start));
  const attrRe = new RegExp(String.raw`(?<![\w$-])(${names})\s*=\s*`, 'g'); // not data-media=, heroMedia=
  let a;
  while ((a = attrRe.exec(attrsBare))) {
    const vStart = start + a.index + a[0].length;
    const opener = code[vStart];
    let value;
    if (opener === '{') value = code.slice(vStart + 1, matchBrace(bare, vStart)).trim();
    else if (opener === '"' || opener === "'") value = code.slice(vStart + 1, code.indexOf(opener, vStart + 1)).trim();
    else continue;
    if (!EMPTY_VALUE.test(value)) return true;
  }
  return false;
}

function hasHeroMedia(code, bare) {
  const heroRe = new RegExp(String.raw`<PremiumHero${NAME_END}`, 'g');
  let m;
  while ((m = heroRe.exec(bare))) if (hasNonEmptyAttr(code, bare, m.index, 'media')) return true;
  // A data-pv-hero element must contain its own image or video with a real src, between its open and close tags.
  const markerRe = /<([A-Za-z][\w.]*)\b/g;
  while ((m = markerRe.exec(bare))) {
    const openEnd = tagEnd(bare, m.index);
    if (!/\sdata-pv-hero\b/.test(bare.slice(m.index, openEnd)) || bare[openEnd - 2] === '/') continue;
    const close = closingTag(bare, m[1], openEnd);
    const mediaRe = new RegExp(String.raw`<(img|Image|picture|video|PremiumImage|PremiumVideo)${NAME_END}`, 'g');
    mediaRe.lastIndex = openEnd;
    let e;
    while ((e = mediaRe.exec(bare)) && e.index < close) if (hasNonEmptyAttr(code, bare, e.index, 'src|media')) return true;
  }
  return false;
}

/** True when some element's opening tag carries `attr`. The same word in page text is not a marker. */
function hasTagAttr(bare, attr) {
  const tagRe = /<[A-Za-z][\w.]*\b/g;
  const attrRe = new RegExp(String.raw`\s${attr}\b`);
  let m;
  while ((m = tagRe.exec(bare))) if (attrRe.test(bare.slice(m.index, tagEnd(bare, m.index)))) return true;
  return false;
}

/** Index of the `</tag>` that closes a `<tag ...>` whose opening tag ends at `from`, counting nested same-name tags. */
function closingTag(bare, tag, from) {
  const re = new RegExp(String.raw`<(/?)${tag.replace(/\./g, '\\.')}\b`, 'g');
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(bare))) {
    if (m[1]) { if (--depth === 0) return m.index; }
    else if (bare[tagEnd(bare, m.index) - 2] !== '/') depth++;
  }
  return -1;
}

/** Index of the `}` matching the `{` at `open` (in the bare view, so braces in strings are ignored). */
function matchBrace(bare, open) {
  let depth = 0;
  for (let i = open; i < bare.length; i++) {
    if (bare[i] === '{') depth++;
    else if (bare[i] === '}' && --depth === 0) return i;
  }
  return bare.length;
}

main();

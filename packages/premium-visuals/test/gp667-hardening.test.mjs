/**
 * GP-667 regression tests for bin/check-visuals.mjs (ported from CARSI
 * src/lib/premium-visuals/check-visuals.test.ts at b2b05e85).
 *
 * Each block plants one GP-667 defect in a throwaway fixture repo, runs the real scanner
 * as a child process (stdout is a pipe, exactly as in CI), and asserts it is caught. Each
 * block also carries a positive control: the same fixture with the defect removed must
 * pass, so a scanner that fails everything cannot satisfy these tests.
 *
 * The scanner is a static heuristic. Passing it is never visual acceptance; the SDA
 * evidence gate and the owner's review of the rendered page remain mandatory.
 *
 * Run: npm test in packages/premium-visuals (node --test 'test/*.test.mjs'; Node 22 or later).
 * A bare directory argument (node --test test/) runs nothing and fails on Node 22 and 24.
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(PKG, '../..');
// CHECK_VISUALS_SCRIPT lets a mutation run point these tests at a deliberately broken copy.
const SCRIPT = process.env.CHECK_VISUALS_SCRIPT ?? path.join(PKG, 'bin/check-visuals.mjs');
const tmpRoots = [];

after(() => {
  for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true });
});

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-fixture-'));
  tmpRoots.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return root;
}

function run(root, extra = []) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, ...extra], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function runJson(root, extra = []) {
  const r = run(root, ['--json', ...extra]);
  let json;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    throw new Error(
      `scanner stdout was not complete JSON (status ${r.status}, ${r.stdout.length} bytes): ${r.stderr}`
    );
  }
  return { ...r, json };
}

const rules = (s) => s.violations.map((v) => v.rule);
const ENFORCE = JSON.stringify({ mode: 'enforce' });
const REPORT = JSON.stringify({ mode: 'report' });
const MANIFEST_OK = JSON.stringify({
  version: 1,
  entries: [
    {
      src: '/media/hero.webp',
      kind: 'image',
      source: 'client',
      credit: 'Client photo',
      alt: 'Technician drying a carpet',
    },
  ],
});
const GOOD_PAGE = `import { PremiumHero, MotionSection } from '@cleanexpo/premium-visuals';
export default function Page() {
  return (
    <main>
      <PremiumHero title="Real" media={{ src: '/media/hero.webp' }} />
      <MotionSection><p>Body</p></MotionSection>
    </main>
  );
}
`;
const BARE_PAGE = 'export default function Page() { return <main><h1>Plain</h1></main>; }\n';

/** A clean fixture: one compliant marketing page with real, manifested, present media. */
function cleanFiles(extra = {}) {
  return {
    'visuals.config.json': ENFORCE,
    'media.manifest.json': MANIFEST_OK,
    'public/media/hero.webp': Buffer.alloc(10 * 1024),
    'app/page.tsx': GOOD_PAGE,
    ...extra,
  };
}

describe('positive control', () => {
  it('a compliant fixture passes enforce mode with zero findings', () => {
    const r = runJson(fixture(cleanFiles()));
    assert.deepEqual(r.json.violations, []);
    assert.equal(r.status, 0);
    assert.equal(r.json.marketingPagesChecked, 1);
  });
});

describe('(1) JSON output is complete when piped', () => {
  it('emits valid JSON well past the pipe buffer, with the enforce exit status', () => {
    const files = cleanFiles();
    // ~1,500 findings -> several hundred kB of JSON, far beyond a 64 kB pipe buffer.
    for (let i = 0; i < 15; i++)
      files[`components/art${i}.tsx`] = '<svg viewBox="0 0 1 1"></svg>\n'.repeat(100);
    const r = runJson(fixture(files));
    assert.ok(r.stdout.length > 256 * 1024, `stdout only ${r.stdout.length} bytes`);
    assert.equal(r.json.total, 1500);
    assert.equal(r.json.violations.length, 1500);
    assert.equal(r.status, 1);
  });

  it('report mode keeps the full JSON and exits 0', () => {
    const files = cleanFiles({ 'visuals.config.json': REPORT });
    for (let i = 0; i < 15; i++) files[`components/art${i}.tsx`] = '<svg></svg>\n'.repeat(100);
    const r = runJson(fixture(files));
    assert.equal(r.json.total, 1500);
    assert.equal(r.status, 0);
  });

  it('never ends with process.exit(), which drops buffered pipe output', () => {
    // Pipes are asynchronous on macOS, so process.exit() after a large write truncates it there.
    // A Linux runner may flush synchronously and hide the bug, so the source is guarded too.
    assert.doesNotMatch(fs.readFileSync(SCRIPT, 'utf8'), /process\.exit\s*\(/);
  });
});

describe('(2) marketing-route coverage', () => {
  it('counts app/page.jsx and dynamic public routes such as app/courses/[slug]/page.tsx', () => {
    const files = cleanFiles({
      'app/page.jsx': BARE_PAGE,
      'app/courses/[slug]/page.tsx': BARE_PAGE,
      'app/(public)/about/page.js': BARE_PAGE,
    });
    delete files['app/page.tsx'];
    const r = runJson(fixture(files));
    assert.deepEqual([...r.json.marketingPages].sort(), [
      'app/(public)/about/page.js',
      'app/courses/[slug]/page.tsx',
      'app/page.jsx',
    ]);
    assert.deepEqual(
      r.json.violations
        .filter((v) => v.rule === 'hero-missing-media')
        .map((v) => v.file)
        .sort(),
      [...r.json.marketingPages].sort()
    );
    assert.equal(r.status, 1);
  });

  it('still excludes app-only routes (dashboard, admin, api, auth groups)', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'app/(dashboard)/dashboard/page.tsx': BARE_PAGE,
          'app/(admin)/admin/x/page.tsx': BARE_PAGE,
          'app/api/x/page.tsx': BARE_PAGE,
          'app/(auth)/login/page.tsx': BARE_PAGE,
        })
      )
    );
    assert.deepEqual(r.json.marketingPages, ['app/page.tsx']);
    assert.equal(r.status, 0);
  });

  it('fails closed when zero marketing pages are found but pages are expected', () => {
    const files = cleanFiles({ 'app/(dashboard)/dashboard/page.tsx': BARE_PAGE });
    delete files['app/page.tsx'];
    const r = runJson(fixture(files));
    assert.equal(r.json.marketingPagesChecked, 0);
    assert.ok(rules(r.json).includes('marketing-coverage'));
    assert.equal(r.status, 1);
  });

  it('a repo that declares minMarketingPages 0 may have none', () => {
    const files = cleanFiles({
      'visuals.config.json': JSON.stringify({ mode: 'enforce', minMarketingPages: 0 }),
    });
    delete files['app/page.tsx'];
    const r = runJson(fixture(files));
    assert.ok(!rules(r.json).includes('marketing-coverage'));
  });

  it('**/app/ in a glob does not match a directory that merely ends in "app"', () => {
    const r = runJson(fixture(cleanFiles({ 'src/webapp/page.tsx': BARE_PAGE })));
    assert.deepEqual(r.json.marketingPages, ['app/page.tsx']);
  });
});

describe('(3) comments and unused strings are not rendered evidence', () => {
  const cases = {
    'line comment':
      'export default function Page() {\n  // <PremiumHero media={undefined} /> <MotionSection />\n  return <main />;\n}\n',
    'JSX comment':
      'export default function Page() {\n  return <main>{/* <PremiumHero media={x} /> <MotionSection> */}</main>;\n}\n',
    'unused string':
      "const note = '<PremiumHero media={x} /> <MotionSection> data-pv-motion';\nexport default function Page() { return <main />; }\n",
    'media={undefined}':
      'export default function Page() { return <main><PremiumHero title="x" media={undefined} /><MotionSection /></main>; }\n',
    'data-media attribute':
      'export default function Page() { return <main><PremiumHero title="x" data-media="hero" /><MotionSection /></main>; }\n',
    'media on a different element':
      'export default function Page() { return <main><PremiumHero title="x" /><MediaSection media={m} /><MotionSection /></main>; }\n',
  };
  for (const [name, page] of Object.entries(cases)) {
    it(`${name} does not satisfy the hero rule`, () => {
      const r = runJson(fixture(cleanFiles({ 'app/page.tsx': page })));
      assert.ok(rules(r.json).includes('hero-missing-media'), JSON.stringify(rules(r.json)));
      assert.equal(r.status, 1);
    });
  }

  it('a commented-out MotionSection does not satisfy the motion rule', () => {
    const page = GOOD_PAGE.replace(
      '<MotionSection><p>Body</p></MotionSection>',
      '{/* <MotionSection /> */}'
    );
    const r = runJson(fixture(cleanFiles({ 'app/page.tsx': page })));
    assert.ok(rules(r.json).includes('no-motion'));
  });
});

describe('(4) manifest provenance is validated', () => {
  const entry = {
    src: '/media/hero.webp',
    kind: 'image',
    source: 'client',
    credit: 'Client photo',
    alt: 'Technician',
  };
  const withEntry = (e) =>
    cleanFiles({ 'media.manifest.json': JSON.stringify({ version: 1, entries: [e] }) });
  const bad = {
    'missing src': withEntry({ ...entry, src: undefined }),
    'invalid kind': withEntry({ ...entry, kind: 'drawing' }),
    'missing kind': withEntry({ ...entry, kind: undefined }),
    'object credit': withEntry({ ...entry, credit: { name: 'x' } }),
    'object alt': withEntry({ ...entry, alt: { text: 'x' } }),
    'path traversal src': withEntry({ ...entry, src: '/../secret.webp' }),
    'non-object entry': withEntry('hero.webp'),
    'non-object manifest': cleanFiles({ 'media.manifest.json': '[]' }),
    'entries not an array': cleanFiles({
      'media.manifest.json': JSON.stringify({ version: 1, entries: {} }),
    }),
    'malformed JSON': cleanFiles({ 'media.manifest.json': '{ "version": 1, ' }),
    'video without poster': cleanFiles({
      'media.manifest.json': JSON.stringify({
        version: 1,
        entries: [entry, { ...entry, src: '/media/v.mp4', kind: 'video' }],
      }),
      'public/media/v.mp4': Buffer.alloc(1024),
    }),
  };
  for (const [name, files] of Object.entries(bad)) {
    it(`rejects ${name}`, () => {
      const r = runJson(fixture(files));
      assert.ok(rules(r.json).includes('manifest-invalid'), JSON.stringify(rules(r.json)));
      assert.equal(r.status, 1);
    });
  }

  it('names the shape error for an array or string manifest, not just a version mismatch', () => {
    for (const body of ['[]', '"media"', '[{"version":1,"entries":[]}]']) {
      const r = runJson(fixture(cleanFiles({ 'media.manifest.json': body })));
      const details = r.json.violations
        .filter((v) => v.rule === 'manifest-invalid')
        .map((v) => v.detail);
      assert.ok(
        details.some((d) => /must be an object/.test(d)),
        body
      );
    }
  });

  it('rejects a manifest entry whose file does not exist', () => {
    const files = cleanFiles();
    delete files['public/media/hero.webp'];
    const r = runJson(fixture(files));
    assert.ok(rules(r.json).includes('manifest-missing-file'));
    assert.equal(r.status, 1);
  });

  it('rejects an unmanifested image sitting in public/ even if no page references it', () => {
    const r = runJson(fixture(cleanFiles({ 'public/media/stray.webp': Buffer.alloc(1024) })));
    assert.deepEqual(
      r.json.violations.filter((v) => v.rule === 'unmanifested-public-media').map((v) => v.file),
      ['public/media/stray.webp']
    );
    assert.equal(r.status, 1);
  });

  it('reports credits as declarations, never as verified rights', () => {
    const r = runJson(fixture(cleanFiles()));
    assert.equal(r.json.provenance.rightsVerified, false);
  });
});

describe('(5) allowlist and comment false positives', () => {
  const allowLogo = JSON.stringify({ mode: 'enforce', allowlist: ['**/*logo*'] });

  it('an allowlisted 500 kB catalogue-logo.webp still fails the image budget', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'visuals.config.json': allowLogo,
          'public/catalogue-logo.webp': Buffer.alloc(500 * 1024),
        })
      )
    );
    assert.deepEqual(
      r.json.violations.filter((v) => v.rule === 'media-budget').map((v) => v.file),
      ['public/catalogue-logo.webp']
    );
    assert.equal(r.status, 1);
  });

  it('a 200 kB catalogue-logo.png is not exempted from the PNG budget by the "og" inside "logo"', () => {
    const r = runJson(fixture(cleanFiles({ 'public/catalogue-logo.png': Buffer.alloc(200 * 1024) })));
    assert.ok(rules(r.json).includes('media-budget'));
  });

  it('an allowlisted component still gets placeholder-host checks', () => {
    const cfg = JSON.stringify({ mode: 'enforce', allowlist: ['**/components/ui/**'] });
    const r = runJson(
      fixture(
        cleanFiles({
          'visuals.config.json': cfg,
          'components/ui/card.tsx': 'export const C = () => <img src="https://picsum.photos/200" />;\n',
        })
      )
    );
    assert.ok(rules(r.json).includes('placeholder-host'));
  });

  it('an allowlisted component is exempt from the code-drawn-art rules it was listed for', () => {
    const cfg = JSON.stringify({ mode: 'enforce', allowlist: ['**/components/ui/**'] });
    const r = runJson(
      fixture(
        cleanFiles({
          'visuals.config.json': cfg,
          'components/ui/check.tsx': 'export const C = () => <svg viewBox="0 0 1 1" />;\n',
        })
      )
    );
    assert.deepEqual(r.json.violations, []);
  });

  it('SVG and gradients inside comments do not create findings', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx':
            '// old: <svg viewBox="0 0 1 1"></svg>\n/* background: radial-gradient(red, blue); */\nexport const A = () => null;\n',
          'app/globals.css': '/* conic-gradient(red, blue) was removed */\nbody { color: black; }\n',
          'components/b.html': '<!-- <svg></svg> <canvas></canvas> -->\n<p>ok</p>\n',
        })
      )
    );
    assert.deepEqual(r.json.violations, []);
  });

  it('real SVG, gradients and canvas in code are still caught (mutation control)', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx':
            'export const A = () => <div style={{ background: "radial-gradient(red, blue)" }}><svg viewBox="0 0 1 1" /><canvas /></div>;\n',
          'app/globals.css': 'body { background: conic-gradient(red, blue); }\n',
        })
      )
    );
    assert.deepEqual(rules(r.json).sort(), ['canvas-drawing', 'css-art', 'css-art', 'inline-svg-art']);
  });

  it('a // inside JSX text does not hide a real svg or placeholder host on the same line', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx':
            'export const A = () => <p>See // <svg /><img src="https://picsum.photos/200" /></p>;\n',
        })
      )
    );
    assert.deepEqual(rules(r.json).sort(), ['inline-svg-art', 'placeholder-host']);
  });

  it('a URL in JSX text is not mistaken for a comment that hides real art', () => {
    const r = runJson(
      fixture(
        cleanFiles({
          'components/a.tsx': 'export const A = () => <p>See https://example.com.au <svg /></p>;\n',
        })
      )
    );
    assert.ok(rules(r.json).includes('inline-svg-art'));
  });
});

describe('(6) mode labelling, config, workflow and docs', () => {
  const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
  const DOCS = ['AGENTS.md', 'CLAUDE.md', 'packages/premium-visuals/rules/AGENTS-premium-visuals.md'];
  const TEMPLATE = 'packages/premium-visuals/templates/marketing-page.tsx';

  it('report-only mode is labelled as not visual acceptance, in text and JSON', () => {
    const root = fixture(cleanFiles({ 'visuals.config.json': REPORT, 'components/a.tsx': '<svg />\n' }));
    const text = run(root);
    assert.equal(text.status, 0);
    assert.match(text.stdout, /REPORT-ONLY/);
    assert.match(text.stdout, /not visual acceptance/i);
    const j = runJson(root);
    assert.equal(j.json.mode, 'report-only');
    assert.equal(j.json.visualAcceptance, false);
  });

  it('enforce mode with zero findings is still not visual acceptance', () => {
    const r = runJson(fixture(cleanFiles()));
    assert.equal(r.status, 0);
    assert.equal(r.json.visualAcceptance, false);
  });

  it('an unknown mode or malformed config is a configuration error (exit 2), not a pass', () => {
    assert.equal(
      run(fixture(cleanFiles({ 'visuals.config.json': JSON.stringify({ mode: 'enforced' }) }))).status,
      2
    );
    assert.equal(run(fixture(cleanFiles({ 'visuals.config.json': '{ "mode": ' }))).status, 2);
    assert.equal(
      run(fixture(cleanFiles({ 'visuals.config.json': JSON.stringify({ mode: 'enforce', allowlist: '**' }) })))
        .status,
      2
    );
  });

  it('both workflow path filters cover every extension the scanner reads', () => {
    const exts = JSON.parse(
      spawnSync(process.execPath, [SCRIPT, '--list-extensions'], { encoding: 'utf8' }).stdout
    );
    assert.ok(exts.code.length > 0);
    for (const rel of ['.github/workflows/check-visuals.yml', 'packages/premium-visuals/ci/check-visuals.yml']) {
      const wf = read(rel);
      const missing = [...exts.code, ...exts.style].filter((e) => !wf.includes(`"**/*.${e}"`));
      assert.deepEqual(missing, [], rel);
      assert.ok(wf.includes('"**/public/**"'), rel);
    }
  });

  it("this repo's workflow runs these regression tests, so a scanner change cannot skip them", () => {
    const wf = read('.github/workflows/check-visuals.yml');
    assert.match(wf, /node --test 'packages\/premium-visuals\/test\/\*\.test\.mjs'/);
  });

  it('docs do not claim CI enforcement while visuals.config.json is report-only', () => {
    const cfg = JSON.parse(read('visuals.config.json'));
    for (const doc of DOCS) {
      const t = read(doc);
      if (cfg.mode === 'report') {
        assert.doesNotMatch(t, /It is enforced in CI/, doc);
        assert.match(t, /report-only/, doc);
      }
      assert.match(t, /not visual acceptance/i, doc);
    }
    // The package README is read by every repo that vendors the scanner.
    assert.doesNotMatch(read('packages/premium-visuals/README.md'), /`check-visuals` enforces it in CI/);
  });

  it('the rule text shipped to other repos matches the text in this repo', () => {
    const rules = read('packages/premium-visuals/rules/AGENTS-premium-visuals.md').trim();
    for (const doc of ['AGENTS.md', 'CLAUDE.md']) assert.ok(read(doc).includes(rules), doc);
  });

  it('the docs point at the scaffold that exists, and the scaffold states its real install state', () => {
    assert.ok(fs.existsSync(path.join(REPO, TEMPLATE)));
    for (const doc of DOCS) assert.ok(read(doc).includes(TEMPLATE), doc);
    const installed = fs
      .readdirSync(path.join(REPO, 'apps'))
      .map((a) => path.join(REPO, 'apps', a, 'package.json'))
      .filter((p) => fs.existsSync(p))
      .some((p) => {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
        return Boolean(
          pkg.dependencies?.['@cleanexpo/premium-visuals'] ?? pkg.devDependencies?.['@cleanexpo/premium-visuals']
        );
      });
    const body = read(TEMPLATE);
    if (!installed) assert.match(body, /NOT INSTALLED/);
    // "@/" maps to an app's ./src, and media.manifest.json lives at the repo root.
    assert.ok(!body.includes("'@/media.manifest.json'"));
  });
});

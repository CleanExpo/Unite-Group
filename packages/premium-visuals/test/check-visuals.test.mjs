import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Resolved from this file, not the cwd, so the tests run from the package or the repo root.
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(pkg, 'bin/check-visuals.mjs');
function run(files, extra = []) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-'));
  for (const [p, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, p)), { recursive: true }); fs.writeFileSync(path.join(d, p), c); }
  const r = spawnSync('node', [bin, '--root', d, '--json', ...extra], { encoding: 'utf8' });
  return { code: r.status, out: JSON.parse(r.stdout) };
}
test('flags svg art, css art, placeholder, missing hero + motion', () => {
  const { code, out } = run({ 'app/page.tsx': `export default()=> <div style={{background:'radial-gradient(red,blue)'}}><svg viewBox="0 0 10 10"/><img src="https://picsum.photos/200"/></div>` });
  assert.equal(code, 1);
  for (const r of ['inline-svg-art', 'css-art', 'placeholder-host', 'hero-missing-media', 'no-motion']) assert.ok(out.byRule[r], r);
});
test('passes a compliant page', () => {
  const { code, out } = run({
    'media.manifest.json': JSON.stringify({ version: 1, entries: [{ src: '/media/hero/a.avif', kind: 'image', source: 'generated', credit: 'Higgsfield', alt: 'x' }] }),
    'public/media/hero/a.avif': 'x',
    'app/page.tsx': `<PremiumHero media={m('/media/hero/a.avif')} title="t"/><MotionSection>x</MotionSection><svg data-pv-allow="logo"/>`,
  });
  assert.equal(code, 0, JSON.stringify(out.violations));
});
const entry = (src) => ({ src, kind: 'image', source: 'generated', credit: 'Higgsfield', alt: 'x' });
const page = `<PremiumHero media={m('/media/hero/a.avif')} title="t"/><MotionSection>x</MotionSection>`;
test('a manifest entry whose file is not in public/ fails', () => {
  const { code, out } = run({ 'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }), 'app/page.tsx': page });
  assert.equal(code, 1); assert.ok(out.byRule['manifest-missing-file']);
});
test('comments do not count as a hero or a motion section', () => {
  const { code, out } = run({ 'app/page.tsx': `// data-pv-hero data-pv-motion\n/* <PremiumHero media={x}/> <MotionSection> */\nexport default () => <main>{/* <MotionSection> */}Hello</main>` });
  assert.equal(code, 1);
  for (const r of ['hero-missing-media', 'no-motion']) assert.ok(out.byRule[r], r);
});
test('the shipped allowlist still scans components/ui for svg art', () => {
  const shipped = JSON.parse(fs.readFileSync(path.join(pkg, 'templates/visuals.config.json'), 'utf8'));
  const { code, out } = run({
    'visuals.config.json': JSON.stringify({ ...shipped, mode: 'enforce' }),
    'src/components/ui/illustration.tsx': `export const A = () => <svg viewBox="0 0 10 10"><circle r="4"/></svg>`,
  });
  assert.equal(code, 1); assert.ok(out.byRule['inline-svg-art']);
});
test('a data-pv-hero marker with no image or video on the page fails', () => {
  const { code, out } = run({ 'app/page.tsx': `<div data-pv-hero>Text only</div><div data-pv-motion>Text only</div>` });
  assert.equal(code, 1); assert.ok(out.byRule['hero-missing-media']);
});
test('a data-pv-hero marker with a real manifested image passes', () => {
  const { code, out } = run({
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
    'app/page.tsx': `<header data-pv-hero><img src="/media/hero/a.avif" alt="x"/></header><MotionSection>x</MotionSection>`,
  });
  assert.equal(code, 0, JSON.stringify(out.violations));
});
test('a PremiumHero with an empty media value fails', () => {
  for (const v of ['{undefined}', '{null}', '{ }', '""', '{""}', '{" "}', "{''}", '{``}']) {
    const { code, out } = run({ 'app/page.tsx': `<PremiumHero media=${v} title="t"/><MotionSection>x</MotionSection>` });
    assert.equal(code, 1, v); assert.ok(out.byRule['hero-missing-media'], v);
  }
});
test('a data-pv-hero around an image with an empty src fails', () => {
  const { code, out } = run({ 'app/page.tsx': `<header data-pv-hero><img src={""} alt="x"/></header><MotionSection>x</MotionSection>` });
  assert.equal(code, 1); assert.ok(out.byRule['hero-missing-media']);
});
test('a data-pv-hero whose image sits outside it fails', () => {
  const { code, out } = run({
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
    'app/page.tsx': `<header data-pv-hero>text</header><img src="/media/hero/a.avif" alt="x"/><MotionSection>x</MotionSection>`,
  });
  assert.equal(code, 1); assert.ok(out.byRule['hero-missing-media']);
});
test('every video file the CLIs encode gets a manifest entry, so the template sources pass', async () => {
  const { videoEntries } = await import(path.join(pkg, 'bin/manifest-entries.mjs'));
  const entries = videoEntries('/media/hero/a', { source: 'generated', credit: 'Higgsfield', alt: 'x' });
  const files = Object.fromEntries(['.mp4', '.av1.mp4', '.webm', '.poster.webp'].map((x) => [`public/media/hero/a${x}`, 'x']));
  const { code, out } = run({
    ...files,
    'media.manifest.json': JSON.stringify({ version: 1, entries }),
    'app/page.tsx': `<PremiumHero media={m('/media/hero/a.mp4')} video={[{ src: '/media/hero/a.av1.mp4', type: 'video/mp4' }, { src: '/media/hero/a.webm', type: 'video/webm' }, { src: '/media/hero/a.mp4', type: 'video/mp4' }]} title="t"/><MotionSection>x</MotionSection>`,
  });
  assert.equal(code, 0, JSON.stringify(out.violations));
  for (const cli of ['bin/generate-media.mjs', 'bin/blender-render.mjs']) assert.match(fs.readFileSync(path.join(pkg, cli), 'utf8'), /videoEntries\(pub,/, cli);
});
test('media in a stylesheet url() needs a manifest entry', () => {
  const { code, out } = run({ 'src/site.css': `body { background-image: url("/media/hero.webp"); }`, 'public/media/hero.webp': 'x' });
  assert.equal(code, 1); assert.ok(out.byRule['unmanifested-media']);
});
test('the marketing template gives PremiumHero a video entry, which carries the poster', () => {
  const t = fs.readFileSync(path.join(pkg, 'templates/marketing-page.tsx'), 'utf8');
  const hero = t.slice(t.indexOf('<PremiumHero'), t.indexOf('/>', t.indexOf('<PremiumHero')));
  assert.match(hero, /video=\{/);
  assert.match(hero, /media=\{m\('[^']+\.mp4'\)\}/);
});
test('report-only never fails; unmanifested media caught', () => {
  const { code, out } = run({ 'src/x.tsx': `<img src="/hero.webp"/>` }, ['--report-only']);
  assert.equal(code, 0); assert.ok(out.byRule['unmanifested-media']);
});
test('dashboard pages are not marketing pages', () => {
  const { out } = run({ 'app/dashboard/page.tsx': `x` });
  assert.equal(out.marketingPagesChecked, 0);
});

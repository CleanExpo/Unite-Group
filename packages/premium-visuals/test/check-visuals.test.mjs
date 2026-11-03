import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Resolved from this file, not the cwd, so the tests run from the package or the repo root.
const bin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/check-visuals.mjs');
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
test('report-only never fails; unmanifested media caught', () => {
  const { code, out } = run({ 'src/x.tsx': `<img src="/hero.webp"/>` }, ['--report-only']);
  assert.equal(code, 0); assert.ok(out.byRule['unmanifested-media']);
});
test('dashboard pages are not marketing pages', () => {
  const { out } = run({ 'app/dashboard/page.tsx': `x` });
  assert.equal(out.marketingPagesChecked, 0);
});

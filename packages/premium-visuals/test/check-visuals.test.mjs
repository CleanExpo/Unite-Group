import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Resolved from this file, not the cwd, so the tests run from the package or the repo root.
const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(PKG, 'bin/check-visuals.mjs');
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
  const shipped = JSON.parse(fs.readFileSync(path.join(PKG, 'templates/visuals.config.json'), 'utf8'));
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
test('a PremiumHero with video but no media fails: the hero renders media, not video alone', () => {
  for (const attrs of ['video={[{ src: "/media/hero/a.mp4", type: "video/mp4" }]}', 'video={[{}]}']) {
    const { code, out } = run({ 'app/page.tsx': `<PremiumHero title="t" ${attrs}/><MotionSection>x</MotionSection>` });
    assert.equal(code, 1, attrs); assert.ok(out.byRule['hero-missing-media'], attrs);
  }
});
test('a PremiumHero with media={void(0)} fails', () => {
  for (const v of ['{void(0)}', '{void (0)}', '{void 0}']) {
    const { code, out } = run({ 'app/page.tsx': `<PremiumHero media=${v} title="t"/><MotionSection>x</MotionSection>` });
    assert.equal(code, 1, v); assert.ok(out.byRule['hero-missing-media'], v);
  }
});
test('media={void(anything)} is empty: void always gives undefined', () => {
  for (const v of ['{void(1)}', '{void hero}', '{void m("/media/hero/a.avif")}']) {
    const { code, out } = run({ 'app/page.tsx': `<PremiumHero media=${v} title="t"/><MotionSection>x</MotionSection>` });
    assert.equal(code, 1, v); assert.ok(out.byRule['hero-missing-media'], v);
  }
});
test('a void expression with an operator after it gives that value, so it is real media', () => {
  const files = {
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
  };
  for (const v of ['{void 0 ? "" : "/media/hero/a.avif"}', '{void 0 ?? "/media/hero/a.avif"}', "{void 0 || m('/media/hero/a.avif')}", '{(void 0, "/media/hero/a.avif")}']) {
    const { code, out } = run({ ...files, 'app/page.tsx': `<PremiumHero media=${v} title="t"/><MotionSection>x</MotionSection>` });
    assert.equal(code, 0, v + ' ' + JSON.stringify(out.violations));
  }
});
test('a member component named like PremiumHero or MotionSection is not one', () => {
  const files = {
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
  };
  const fakeHero = run({ ...files, 'app/page.tsx': `<PremiumHero.Fake media={m('/media/hero/a.avif')}/><MotionSection>x</MotionSection>` });
  assert.equal(fakeHero.code, 1); assert.ok(fakeHero.out.byRule['hero-missing-media']);
  const fakeMotion = run({ ...files, 'app/page.tsx': `<PremiumHero media={m('/media/hero/a.avif')}/><MotionSection.Fake/>` });
  assert.equal(fakeMotion.code, 1); assert.ok(fakeMotion.out.byRule['no-motion']);
  const fakeImg = run({ ...files, 'app/page.tsx': `<header data-pv-hero><Image.Fake src="/media/hero/a.avif"/></header><MotionSection>x</MotionSection>` });
  assert.equal(fakeImg.code, 1); assert.ok(fakeImg.out.byRule['hero-missing-media']);
  const real = run({ ...files, 'app/page.tsx': `<PremiumHero media={m('/media/hero/a.avif')}/><MotionSection>x</MotionSection>` });
  assert.equal(real.code, 0, JSON.stringify(real.out.violations));
});
test('apostrophes in page text do not hide a real hero and motion section', () => {
  const { code, out } = run({
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
    'app/page.tsx': `export default function Page() { return <main>We're here. <PremiumHero media={m('/media/hero/a.avif')}/><MotionSection>x</MotionSection> Let's go. "Quoted" <p>"Hi"</p></main>; }`,
  });
  assert.equal(code, 0, JSON.stringify(out.violations));
});
test('quotes and backticks anywhere in page text do not hide a real hero or motion section', () => {
  const files = {
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
  };
  const hero = `<PremiumHero media={m('/media/hero/a.avif')}/>`;
  for (const body of [
    'Use ` ' + hero + ' ` here <MotionSection />',
    hero + ' Use ` <MotionSection /> ` here',
    `Tip: ' ${hero} ' and <MotionSection /> then '`,
    `Tip: " ${hero} " then <MotionSection /> "`,
    `<p>(see 'a')</p> ${hero} <span>x, 'b'</span><MotionSection>x</MotionSection>`,
    `{cond && <b>x</b>} Note: ' ${hero} <MotionSection /> '`,
  ]) {
    const { code, out } = run({ ...files, 'app/page.tsx': `export default () => <main>${body}</main>;` });
    assert.equal(code, 0, body + ' ' + JSON.stringify(out.violations));
  }
});
test('a string inside a JSX expression is still not a hero or motion section', () => {
  const { code, out } = run({ 'app/page.tsx': `export default () => <main>{'<MotionSection />'}{"<PremiumHero media={x}/>"}{\`<MotionSection/>\`}Hi</main>;` });
  assert.equal(code, 1);
  for (const r of ['hero-missing-media', 'no-motion']) assert.ok(out.byRule[r], r);
  // A closing tag closes its own element and any unclosed ones inside it, so code after it is code.
  const unclosed = run({ 'app/page.tsx': `export default () => <main><p>open <b>x\n</main>;\nconst s = '<MotionSection />', h = "<PremiumHero media={x}/>";` });
  assert.equal(unclosed.code, 1);
  for (const r of ['hero-missing-media', 'no-motion']) assert.ok(unclosed.out.byRule[r], 'unclosed ' + r);
  // After the element closes the file is code again, so a later string is still not evidence.
  const after = run({ 'app/page.tsx': `export default () => <main><p>Hi</p></main>;\nconst s = '<MotionSection />', h = "<PremiumHero media={x}/>";` });
  assert.equal(after.code, 1);
  for (const r of ['hero-missing-media', 'no-motion']) assert.ok(after.out.byRule[r], r);
});
test('// or /* in page text is text, so it does not hide a real hero or motion section', () => {
  const files = {
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
  };
  const tags = `<PremiumHero media={m('/media/hero/a.avif')}/><MotionSection />`;
  for (const lead of ['"// ', '`// ', "'// ", 'a // b ', '/* note ']) {
    const { code, out } = run({ ...files, 'app/page.tsx': `export default function Page(){return <main><p>${lead}</p>${tags}</main>}` });
    assert.equal(code, 0, lead + ' ' + JSON.stringify(out.violations));
  }
  // A real comment in code still hides nothing and fakes nothing.
  const comment = run({ ...files, 'app/page.tsx': `// ${tags}\nexport default function Page(){return <main>{/* ${tags} */}Hi</main>}` });
  assert.equal(comment.code, 1);
  for (const r of ['hero-missing-media', 'no-motion']) assert.ok(comment.out.byRule[r], r);
});
test('a < inside a regex literal is code, so a later comment cannot fake a hero or motion section', () => {
  const files = {
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
  };
  const tags = `<PremiumHero media={m('/media/hero/a.avif')}/><MotionSection/>`;
  for (const rx of ['/(<div>)/', '/<div>/g', '/[/]|(<b>)/', '/a\\/(<b>)/']) {
    const fake = run({ ...files, 'app/page.tsx': `const rx = ${rx}; // ${tags}\nexport default () => <main>Hello</main>` });
    assert.equal(fake.code, 1, rx);
    for (const r of ['hero-missing-media', 'no-motion']) assert.ok(fake.out.byRule[r], rx + ' ' + r);
    // Positive control: the same regex beside a real hero and motion section passes.
    const real = run({ ...files, 'app/page.tsx': `const rx = ${rx};\nexport default () => <main>It's ${tags}</main>` });
    assert.equal(real.code, 0, rx + ' ' + JSON.stringify(real.out.violations));
  }
  // Division is not a regex: a / b / c leaves the real tags visible.
  const div = run({ ...files, 'app/page.tsx': `const q = a / b / c;\nexport default () => <main>${tags}</main>` });
  assert.equal(div.code, 0, JSON.stringify(div.out.violations));
});
test('an icons/ or logos/ folder does not excuse an SVG illustration', () => {
  for (const p of ['public/icons/illustration.svg', 'public/logos/illustration.svg', 'public/favicons/scene.svg']) {
    const { out } = run({ [p]: '<svg></svg>' });
    assert.ok(out.byRule['svg-asset'], p);
  }
  for (const p of ['public/icons/menu-icon.svg', 'public/logos/site-logo.svg', 'public/brand-logo.svg', 'public/favicon.svg']) {
    const { out } = run({ [p]: '<svg></svg>' });
    assert.ok(!out.byRule['svg-asset'], p + ' ' + JSON.stringify(out.violations));
  }
});
test('a logos/ or icons/ folder, or a brand word inside another word, does not excuse ordinary media from the manifest', () => {
  for (const p of ['/logos/ordinary.webp', '/icons/ordinary.webp', '/media/flagship.webp', '/media/benchmark.webp']) {
    const { code, out } = run({
      'media.manifest.json': JSON.stringify({ version: 1, entries: [] }),
      [`public${p}`]: 'x',
      'src/other.tsx': `export const A = () => <img src="${p}" alt="x"/>;`,
    });
    assert.equal(code, 1, p); assert.ok(out.byRule['unmanifested-media'], p); assert.ok(out.byRule['unmanifested-public-media'], p);
  }
  const logo = run({
    'media.manifest.json': JSON.stringify({ version: 1, entries: [] }),
    'public/media/site-logo.webp': 'x',
    'src/other.tsx': `export const A = () => <img src="/media/site-logo.webp" alt="x"/>;`,
  });
  assert.ok(!logo.out.byRule['unmanifested-media'], JSON.stringify(logo.out.violations));
  assert.ok(!logo.out.byRule['unmanifested-public-media'], JSON.stringify(logo.out.violations));
  // Positive controls: main's whole-word brand names still excuse a file by its own name.
  for (const name of ['company-wordmark.webp', 'brand-mark.png', 'badge-official.webp', 'au-flag.webp']) {
    const r = run({ 'media.manifest.json': JSON.stringify({ version: 1, entries: [] }), [`public/media/${name}`]: 'x' });
    assert.ok(!r.out.byRule['unmanifested-public-media'], name + ' ' + JSON.stringify(r.out.violations));
  }
});
test('a backslash path cannot point a manifest entry outside public/', () => {
  const { code, out } = run({
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/..\\secret.webp')] }),
    'secret.webp': 'x',
  });
  assert.equal(code, 1); assert.ok(out.byRule['manifest-invalid'], JSON.stringify(out.violations));
});
test('the words data-pv-motion in page text are not a motion section', () => {
  const files = {
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
  };
  const bad = run({ ...files, 'app/page.tsx': `<PremiumHero media={m('/media/hero/a.avif')} title="t"/><p>data-pv-motion</p>` });
  assert.equal(bad.code, 1); assert.ok(bad.out.byRule['no-motion']);
  const good = run({ ...files, 'app/page.tsx': `<PremiumHero media={m('/media/hero/a.avif')} title="t"/><section data-pv-motion>x</section>` });
  assert.equal(good.code, 0, JSON.stringify(good.out.violations));
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
test('a data-pv-hero with a nested same-name element still finds its own image', () => {
  const { code, out } = run({
    'media.manifest.json': JSON.stringify({ version: 1, entries: [entry('/media/hero/a.avif')] }),
    'public/media/hero/a.avif': 'x',
    'app/page.tsx': `<div data-pv-hero><div>text</div><img src="/media/hero/a.avif" alt="x"/></div><MotionSection>x</MotionSection>`,
  });
  assert.equal(code, 0, JSON.stringify(out.violations));
});
test('every video file the CLIs encode gets a manifest entry, so the template sources pass', async () => {
  const { videoEntries } = await import(pathToFileURL(path.join(PKG, 'bin/manifest-entries.mjs')).href);
  const entries = videoEntries('/media/hero/a', { source: 'generated', credit: 'Higgsfield', alt: 'x' });
  const files = Object.fromEntries(['.mp4', '.av1.mp4', '.webm', '.poster.webp'].map((x) => [`public/media/hero/a${x}`, 'x']));
  const { code, out } = run({
    ...files,
    'media.manifest.json': JSON.stringify({ version: 1, entries }),
    'app/page.tsx': `<PremiumHero media={m('/media/hero/a.mp4')} video={[{ src: '/media/hero/a.av1.mp4', type: 'video/mp4' }, { src: '/media/hero/a.webm', type: 'video/webm' }, { src: '/media/hero/a.mp4', type: 'video/mp4' }]} title="t"/><MotionSection>x</MotionSection>`,
  });
  assert.equal(code, 0, JSON.stringify(out.violations));
  for (const cli of ['bin/generate-media.mjs', 'bin/blender-render.mjs']) assert.match(fs.readFileSync(path.join(PKG, cli), 'utf8'), /videoEntries\(pub,/, cli);
});
test('media in a stylesheet url() needs a manifest entry', () => {
  const { code, out } = run({ 'src/site.css': `body { background-image: url("/media/hero.webp"); }`, 'public/media/hero.webp': 'x' });
  assert.equal(code, 1); assert.ok(out.byRule['unmanifested-media']);
});
test('the marketing template gives PremiumHero a video entry, which carries the poster', () => {
  const t = fs.readFileSync(path.join(PKG, 'templates/marketing-page.tsx'), 'utf8');
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

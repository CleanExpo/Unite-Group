import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire('/Volumes/Mini Mini 2T Storage/hot/caches/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { chromium } = require('playwright');
const dir = process.argv[2];
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const b = await chromium.launch({ headless: true, executablePath: exe });
for (const [name, w, h] of [['gallery-desktop', 1440, 1000], ['gallery-mobile', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('file://' + path.join(dir, 'index.html'));
  await p.waitForLoadState('networkidle');
  await p.evaluate(() => document.querySelectorAll('img').forEach(i => i.loading = 'eager'));
  await p.waitForTimeout(1500);
  const imgs = await p.evaluate(() => [...document.images].map(i => i.naturalWidth));
  console.log(name, 'images', imgs.length, 'loaded', imgs.filter(x => x > 0).length);
  await p.screenshot({ path: path.join(dir, name + '.png'), fullPage: name.endsWith('desktop') ? false : false });
}
await b.close();

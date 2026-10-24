import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire('/Volumes/Mini Mini 2T Storage/hot/caches/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { chromium } = require('playwright');
const sharp = require('sharp');
const out = path.dirname(fileURLToPath(import.meta.url));
const logPath = '/Volumes/Mini Mini 2T Storage/tmp/LEAD-STATUS.log';
const log = async message => { const line = `SCOUT: ${new Date().toISOString()} ${message}`; console.log(line); await fs.appendFile(logPath, line+'\n'); };
const candidates = [
  [
    "v1ce",
    "https://v1ce.co/nfc-cards",
    "card",
    "Product close-ups, video and a focused order path are promising ways to make a digital interaction feel premium."
  ],
  [
    "dot-cards",
    "https://dotcards.net/",
    "card",
    "Physical-device imagery alongside digital-profile demonstrations can connect the object to its on-phone experience."
  ],
  [
    "blinq",
    "https://blinq.me/",
    "card",
    "Phone mockups and profile customisation imagery can explain a digital identity with less descriptive copy."
  ],
  [
    "wave-metal",
    "https://wavecards.com.au/product/metal-smart-business-card/",
    "card",
    "A material-led hero, video and an adjacent order section can give an NFC card the presence of a premium retail object."
  ],
  [
    "mobilo",
    "https://www.mobilocard.com/",
    "card",
    "Showing profile and contact-exchange interfaces beside physical cards can make the end-to-end interaction understandable at a glance."
  ],
  [
    "hihello",
    "https://www.hihello.com/features/digital-business-cards",
    "card",
    "A focused card showcase with profile examples can provide a useful hierarchy reference for identity, contact actions and supporting links."
  ],
  [
    "designjoy",
    "https://www.designjoy.co/",
    "offer-page",
    "A single membership block following a three-step process and work examples can turn a service into a clear product."
  ],
  [
    "manypixels",
    "https://www.manypixels.co/pricing",
    "offer-page",
    "Repeated price panels and a consistent feature hierarchy can make inclusions and service capacity easy to scan."
  ],
  [
    "penji",
    "https://penji.co/pricing/",
    "offer-page",
    "A repeated plan structure with a distinct capacity measure can make an abstract service easier to compare."
  ],
  [
    "draftss",
    "https://draftss.com/",
    "offer-page",
    "Work examples, a process section and an embedded plan section can provide a complete service-buying narrative on one page."
  ]
];
// Decode actual screenshot pixels, not just compressed PNG bytes.
async function checkImage(file, expectedWidth) {
 const bytes = (await fs.stat(file)).size;
 const image = sharp(file); const meta = await image.metadata();
 const {data,info} = await image.resize({width:120}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const colours = new Set(); for(let i=0;i<data.length;i+=info.channels) colours.add(`${data[i]},${data[i+1]},${data[i+2]}`);
 if(bytes <= 30*1024 || colours.size < 32 || meta.width !== expectedWidth) throw new Error(`Image check failed: ${path.basename(file)} bytes=${bytes} colours=${colours.size} width=${meta.width}`);
 return {file:path.basename(file),bytes,width:meta.width,height:meta.height,sampled_colours:colours.size,pass:true};
}
if(process.argv.includes('--verify')) {
 const entries = JSON.parse(await fs.readFile(path.join(out,'scout.json'),'utf8'));
 if(entries.some(e=>!e.captured_at || !e.desktop || !e.mobile)) throw new Error('Capture incomplete: screenshot paths or capture timestamps are absent');
 const checks=[]; for(const item of entries) for(const [size,width] of [['desktop',1440],['mobile',390]]) checks.push(await checkImage(path.join(out,item[size]),width));
 if(entries.length!==10 || checks.length!==20) throw new Error('Expected 10 entries and 20 images');
 await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({verified_at:new Date().toISOString(),entries:entries.length,checks},null,2)+'\n');
 await log(`Step 3: verified ${checks.length}/20 PNGs above 30 KiB, varied pixel colours and exact viewport widths.`);
 process.exit(0);
}
await log('Step 1: public-web candidate research complete; beginning live Chromium inspection of six card showcases and four service offers.');
const scratch = path.join(out,'.browser-tmp'); await fs.mkdir(scratch,{recursive:true});
// Keep transient browser profiles inside the authorised work folder.
process.env.TMPDIR=scratch; process.env.TMP=scratch; process.env.TEMP=scratch;
const cache = path.join(os.homedir(),'Library/Caches/ms-playwright');
let browser; try { browser = await chromium.launch({headless:true,executablePath:path.join(cache,'chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'),args:['--disable-dev-shm-usage']}); } catch(error) { await log('Step 2 BLOCKED: Chromium failed before navigation; '+error.message.split('\n')[0]); await fs.rm(scratch,{recursive:true,force:true}); throw error; }
const entries=JSON.parse(await fs.readFile(path.join(out,'scout.json'),'utf8').catch(()=> '[]')); const diagnostics=JSON.parse(await fs.readFile(path.join(out,'inspection.json'),'utf8').catch(()=> '[]'));
try {
 for(let idx=0;idx<candidates.length;idx++) {
  const [slug,url,kind,why] = candidates[idx]; if(entries.some(e=>e.slug===slug && e.captured_at && e.desktop && e.mobile)) continue; const n=idx+1; const prefix=String(n).padStart(2,'0')+'-'+slug;
  const entry={n,slug,url,kind,title:'',captured_at:'',desktop:prefix+'-desktop.png',mobile:prefix+'-mobile.png',why_it_is_good:why,notes:'Internal pattern study only; source URL retained; no copying permission implied. Maker showcase.'};
  const detail={n,slug,views:[]};
  for(const [size,width,height] of [['desktop',1440,900],['mobile',390,844]]) {
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:size==='mobile',hasTouch:size==='mobile',acceptDownloads:false});
   const page=await context.newPage();
   try {
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    if(response && response.status()>=400) throw new Error(`HTTP ${response.status()}`);
    await page.waitForLoadState('networkidle',{timeout:45000}); await page.waitForTimeout(2000);
    let cookie='No obvious decline button; any banner left as presented.';
    const reject=page.getByRole('button',{name:/^(reject all|reject optional cookies|reject non-essential|decline all|decline|only necessary|necessary only|essential only|deny all)$/i});
    for(let i=0;i<await reject.count();i++) if(await reject.nth(i).isVisible()) {cookie='Declined non-essential cookies: '+await reject.nth(i).innerText(); await reject.nth(i).click(); await page.waitForLoadState('networkidle',{timeout:30000}); await page.waitForTimeout(2000); break;}
    // Trigger native lazy images and scroll-reveal sections before full-page capture.
    await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=650){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}window.scrollTo(0,0);});
    await page.waitForLoadState('networkidle',{timeout:45000}); await page.waitForTimeout(2000); await page.evaluate(()=>document.fonts.ready);
    const title=await page.title(); const body=await page.locator('body').innerText();
    if(body.length<150 || /^(access denied|just a moment|verify you are human)/i.test(title)) throw new Error(`Blocked or empty page: ${title}`);
    const links=await page.locator('a').evaluateAll(as=>as.map(a=>({text:a.innerText.trim(),href:a.href})).filter(a=>/buy|purchase|subscribe|start|get started|pricing|plan|checkout|order|membership/i.test(a.text)).slice(0,35));
    await page.screenshot({path:path.join(out,entry[size]),fullPage:true,timeout:60000});
    const check=await checkImage(path.join(out,entry[size]),width);
    detail.views.push({size,title,final_url:page.url(),status:response?.status(),cookie,check,cta_links:links,body_excerpt:body.slice(0,17000)});
    entry.title=title; entry.captured_at=new Date().toISOString(); entry.notes='Internal pattern study only; source URL retained; no copying permission implied. Public page captured in headless Chromium; '+cookie;
    await log(`Step 2: captured ${n}/10 ${slug} ${size}; ${check.bytes} bytes; ${check.sampled_colours} sampled colours; network idle plus two seconds satisfied.`);
   } finally {await context.close();}
  }
  const previous=entries.findIndex(e=>e.n===n); if(previous>=0) entries.splice(previous,1); entries.push(entry); entries.sort((a,b)=>a.n-b.n); diagnostics.push(detail);
  await fs.writeFile(path.join(out,'scout.json'),JSON.stringify(entries,null,2)+'\n');
  await fs.writeFile(path.join(out,'inspection.json'),JSON.stringify(diagnostics,null,2)+'\n');
 }
 await log('Step 4: scout.json written with ten live source URLs, design observations and 20 screenshot paths.');
} finally {await browser.close();await fs.rm(scratch,{recursive:true,force:true});}

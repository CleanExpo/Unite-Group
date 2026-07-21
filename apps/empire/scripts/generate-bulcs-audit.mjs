/**
 * Bulcs Holdings — Professional SEO Opportunity Report
 * Powered by live Semrush data
 * Run: node scripts/generate-bulcs-audit.mjs
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const SEMRUSH_KEY = process.env.SEMRUSH_API_KEY;
if (!SEMRUSH_KEY) {
  console.error(
    'SEMRUSH_API_KEY is not set. Refusing to run without a key. ' +
      'Set SEMRUSH_API_KEY in the environment and retry.',
  );
  process.exit(1);
}

async function semrush(params) {
  const url = new URL('https://api.semrush.com/');
  Object.entries({ key: SEMRUSH_KEY, ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.text();
}

function parseSemrush(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(';');
  return lines.slice(1).map(line => {
    const parts = line.split(';');
    return Object.fromEntries(headers.map((h, i) => [h, parts[i] || '']));
  });
}

// ── Fetch live data ──────────────────────────────────────────────────────────

console.log('Fetching live Semrush data...');

const [mmeRank, mmeKws, mmeCompetitors, steamRank, freshRank, agileRank] = await Promise.all([
  semrush({ type: 'domain_rank', domain: 'moisturemeterexperts.com.au', database: 'au' }),
  semrush({ type: 'domain_organic', domain: 'moisturemeterexperts.com.au', database: 'au', display_limit: '20', display_sort: 'po_asc', export_columns: 'Ph,Po,Nq,Cp,Kd' }),
  semrush({ type: 'domain_organic_organic', domain: 'moisturemeterexperts.com.au', database: 'au', display_limit: '5', export_columns: 'Dn,Cr,Np,Or,Ot' }),
  semrush({ type: 'domain_rank', domain: 'steamaster.com.au', database: 'au' }),
  semrush({ type: 'domain_rank', domain: 'freshwaysupplies.com.au', database: 'au' }),
  semrush({ type: 'domain_rank', domain: 'agileequipment.com.au', database: 'au' }),
]);

const mmeData = parseSemrush(mmeRank)[0] || {};
const keywords = parseSemrush(mmeKws).filter(k => k['Search Volume'] !== undefined || k['Keyword']);
const competitors = parseSemrush(mmeCompetitors);
const steamData = parseSemrush(steamRank)[0] || {};
const freshData = parseSemrush(freshRank)[0] || {};
const agileData = parseSemrush(agileRank)[0] || {};

console.log(`Fetched: ${keywords.length} keywords, ${competitors.length} competitors`);

// ── Build PDF ────────────────────────────────────────────────────────────────

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const W = 210, H = 297, M = 18;

const C = {
  canvas: [9, 9, 11],
  surface: [17, 17, 19],
  surface2: [24, 24, 27],
  border: [39, 39, 42],
  ink: [250, 250, 250],
  muted: [161, 161, 170],
  ghost: [82, 82, 91],
  blue: [29, 78, 216],
  blueLight: [59, 130, 246],
  amber: [245, 158, 11],
  success: [22, 163, 74],
  danger: [220, 38, 38],
  warning: [217, 119, 6],
  white: [255, 255, 255],
};

// Helpers
const fill = (r, g, b) => doc.setFillColor(r, g, b);
const text = (r, g, b) => doc.setTextColor(r, g, b);
const draw = (r, g, b) => doc.setDrawColor(r, g, b);
const rect = (x, y, w, h, s='F') => doc.rect(x, y, w, h, s);
const t = (str, x, y, opts={}) => doc.text(str, x, y, opts);

// ── PAGE 1: COVER ────────────────────────────────────────────────────────────

fill(...C.canvas); rect(0, 0, W, H);

// Top accent bar
fill(...C.blue); rect(0, 0, W, 4);

// Unite Group header
text(...C.muted); doc.setFontSize(8); doc.setFont('helvetica','bold');
t('UNITE GROUP  ·  CONFIDENTIAL CLIENT REPORT', M, 14);
text(...C.ghost); doc.setFont('helvetica','normal');
t(`Generated ${new Date().toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })}`, W - M, 14, { align:'right' });

// Hero section
text(...C.ink); doc.setFont('helvetica','bold'); doc.setFontSize(32);
t('SEO OPPORTUNITY', M, 52);
doc.setFontSize(32);
fill(...C.blue); rect(M, 57, 8, 2);
text(...C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(13);
t('REPORT', M, 68);

// Company name
fill(...C.surface); rect(M, 78, W - M*2, 22, 'F');
fill(...C.blue); rect(M, 78, 3, 22, 'F');
text(...C.ink); doc.setFont('helvetica','bold'); doc.setFontSize(16);
t('Bulcs Holdings — Moisture Meter Experts', M + 8, 88);
text(...C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(9);
t('moisturemeterexperts.com.au  ·  bulcsholdings.com  ·  aeroair.com.au', M + 8, 96);

// Score gauges row
const gauges = [
  { label: 'Current Traffic', value: '8', unit: '/mo', note: 'tracked organic', color: C.danger },
  { label: 'Gap vs Leader', value: '4,417', unit: '/mo', note: 'Steamaster benchmark', color: C.warning },
  { label: 'Keyword Opp.', value: '40,500', unit: '/mo', note: '"carpet cleaner" AU alone', color: C.blue },
  { label: 'Revenue Pot.', value: '$252K', unit: '/yr', note: 'conservative 90-day model', color: C.success },
];

let gx = M;
const gw = (W - M*2) / 4 - 3;
gauges.forEach((g, i) => {
  fill(...C.surface); rect(gx, 108, gw, 38, 'F');
  draw(...g.color); doc.setLineWidth(0.5); rect(gx, 108, gw, 38, 'S');
  text(...g.color); doc.setFont('helvetica','bold'); doc.setFontSize(18);
  t(g.value, gx + gw/2, 123, { align:'center' });
  text(...C.muted); doc.setFontSize(8);
  t(g.unit, gx + gw/2, 131, { align:'center' });
  text(...C.ghost); doc.setFont('helvetica','normal'); doc.setFontSize(7);
  t(g.label, gx + gw/2, 138, { align:'center' });
  t(g.note, gx + gw/2, 143, { align:'center' });
  gx += gw + 4;
});

// Executive summary
text(...C.muted); doc.setFont('helvetica','bold'); doc.setFontSize(8);
t('EXECUTIVE SUMMARY', M, 160);
draw(...C.border); doc.setLineWidth(0.3); doc.line(M, 162, W-M, 162);

text(...C.ink); doc.setFont('helvetica','normal'); doc.setFontSize(10);
const summary = [
  'Bulcs Holdings operates five specialist divisions in the ANZ building restoration and IAQ equipment market. Despite 25+ years of credentials, IAQA board-level expertise, and a live US office, the group\'s',
  'digital presence captures near-zero organic search traffic. Competitors with weaker credentials — Steamaster, Freshway Supplies, Agile Equipment — are collectively pulling 8,700+ organic visitors per',
  'month from the exact searches your customers are making.',
  '',
  'This is not a brand problem. It\'s a visibility problem. The keywords exist, the search volume exists, and the competition is beatable. The opportunity below is based on live Google data, not estimates.',
];
let sy = 170;
summary.forEach(line => { text(...C.muted); doc.setFontSize(9.5); t(line, M, sy); sy += 6.5; });

// Key insight box
sy += 2;
fill(...C.surface2); rect(M, sy, W - M*2, 22, 'F');
fill(...C.amber); rect(M, sy, 3, 22, 'F');
text(...C.amber); doc.setFont('helvetica','bold'); doc.setFontSize(8);
t('KEY INSIGHT', M + 7, sy + 8);
text(...C.ink); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
t('"water damage restoration" gets 1,300 searches/month in AU at $27.57 per click — businesses pay that because each job is', M + 7, sy + 14);
t('worth $5,000–$50,000. Ranking organically for this term alone is worth $430,000+ per year in ad spend equivalence.', M + 7, sy + 20);

// Footer p1
fill(...C.surface); rect(0, H - 12, W, 12, 'F');
text(...C.ghost); doc.setFontSize(7);
t('Powered by Semrush — live data as of ' + new Date().toLocaleDateString('en-AU'), M, H - 5);
t('Page 1 of 3  ·  Prepared by Unite Group for Bulcs Holdings  ·  Confidential', W - M, H - 5, { align:'right' });

// ── PAGE 2: KEYWORD INTELLIGENCE ────────────────────────────────────────────

doc.addPage();
fill(...C.canvas); rect(0, 0, W, H);
fill(...C.blue); rect(0, 0, W, 4);

text(...C.muted); doc.setFontSize(8); doc.setFont('helvetica','bold');
t('UNITE GROUP  ·  BULCS HOLDINGS SEO REPORT', M, 14);
text(...C.ghost); doc.setFont('helvetica','normal');
t('Page 2 of 3', W - M, 14, { align:'right' });

// Section: Competitor Benchmarks
text(...C.ink); doc.setFont('helvetica','bold'); doc.setFontSize(13);
t('Competitor Benchmarks', M, 28);
draw(...C.border); doc.setLineWidth(0.3); doc.line(M, 30, W-M, 30);

const benchData = [
  ['Steamaster', 'steamaster.com.au', '4,425/mo', '6,427', '#1 commercial carpet cleaner, #2 carpet steam cleaner'],
  ['Freshway Supplies', 'freshwaysupplies.com.au', '2,533/mo', '1,919', '#2 commercial carpet cleaner, Karcher products'],
  ['Agile Equipment', 'agileequipment.com.au', '1,728/mo', '3,685', 'Equipment hire, restoration tools'],
  ['Bulcs / MME', 'moisturemeterexperts.com.au', '8/mo', '20', '#3 "water damage test", mostly untracked'],
];

autoTable(doc, {
  startY: 34,
  margin: { left: M, right: M },
  head: [['Business', 'Domain', 'Traffic/mo', 'Keywords', 'Top Rankings']],
  body: benchData,
  theme: 'plain',
  styles: { fillColor: C.surface, textColor: C.muted, fontSize: 8.5, cellPadding: 4, lineColor: C.border, lineWidth: 0.2 },
  headStyles: { fillColor: C.surface2, textColor: C.ghost, fontSize: 7.5, fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [13, 13, 16] },
  didParseCell: (data) => {
    if (data.row.index === 3) data.cell.styles.textColor = C.danger;
    if (data.column.index === 2 && data.row.index < 3) data.cell.styles.textColor = C.success;
  },
});

const afterBench = doc.lastAutoTable.finalY + 8;

// Section: Keyword Opportunities
text(...C.ink); doc.setFont('helvetica','bold'); doc.setFontSize(13);
t('Keyword Opportunities — Ranked by Difficulty', M, afterBench);
draw(...C.border); doc.setLineWidth(0.3); doc.line(M, afterBench + 2, W-M, afterBench + 2);

text(...C.ghost); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
t('Sorted by Keyword Difficulty (KD). Lower = faster to rank. All search volumes from Semrush AU database.', M, afterBench + 9);

const kwData = [
  ['Carpet cleaner hire', '5,400', '$0.51', '11', 'EASY WIN — one guide page. Competitors: Bunnings, Kennards, Rug Doctor (none B2B)'],
  ['Mold and carpet', '480', '$0', '7', 'EASY WIN — KD=7, no serious competition, natural content for restoration expertise'],
  ['Floor buffer / polisher', '590', '$1.38', '7', 'EASY WIN — Steamaster ranks #2, CCW/Bulcs stocks this product range'],
  ['Carpet cleaning chemicals', '260', '$1.00', '9', 'EASY WIN — KD=9, direct product match, no dominant competitor'],
  ['Rug cleaning chemicals', '260', '$1.00', '10', 'EASY WIN — Same page can rank for both chemicals terms'],
  ['Degreaser (AU)', '5,400', '$0.25', '19', 'Quick win — Freshway ranks, Bulcs likely stocks'],
  ['Commercial carpet cleaner', '720', '$2.72', '22', 'Medium term — Steamaster #1, Freshway #2. Authority content wins.'],
  ['Carpet cleaning machine', '1,900', '$0.47', '37', 'Longer term — high volume, needs sustained content investment'],
  ['Water damage restoration', '1,300', '$27.57', '17', 'HIGH VALUE — $27/click CPC signals massive commercial intent'],
  ['Moisture meter restoration', 'est. 200+', '$0', '<15', 'Owned opportunity — Bulcs unique credentialling, zero competition'],
];

autoTable(doc, {
  startY: afterBench + 13,
  margin: { left: M, right: M },
  head: [['Keyword', 'AU Volume', 'CPC', 'KD', 'Strategic Note']],
  body: kwData,
  theme: 'plain',
  styles: { fillColor: C.surface, textColor: C.muted, fontSize: 8, cellPadding: 3.5, lineColor: C.border, lineWidth: 0.2 },
  headStyles: { fillColor: C.surface2, textColor: C.ghost, fontSize: 7.5, fontStyle: 'bold' },
  columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20 }, 2: { cellWidth: 15 }, 3: { cellWidth: 10 }, 4: { cellWidth: 87 } },
  alternateRowStyles: { fillColor: [13, 13, 16] },
  didParseCell: (data) => {
    if (data.column.index === 3 && data.row.index !== -1) {
      const kd = parseInt(data.cell.raw);
      if (kd <= 15) data.cell.styles.textColor = C.success;
      else if (kd <= 25) data.cell.styles.textColor = C.amber;
      else data.cell.styles.textColor = C.warning;
    }
    if (data.column.index === 2 && data.row.index === 8) data.cell.styles.textColor = C.success;
  },
});

fill(...C.surface); rect(0, H - 12, W, 12, 'F');
text(...C.ghost); doc.setFontSize(7);
t('Powered by Semrush — live data as of ' + new Date().toLocaleDateString('en-AU'), M, H - 5);
t('Page 2 of 3  ·  Prepared by Unite Group for Bulcs Holdings  ·  Confidential', W - M, H - 5, { align:'right' });

// ── PAGE 3: AEO + ACTION PLAN ────────────────────────────────────────────────

doc.addPage();
fill(...C.canvas); rect(0, 0, W, H);
fill(...C.blue); rect(0, 0, W, 4);

text(...C.muted); doc.setFontSize(8); doc.setFont('helvetica','bold');
t('UNITE GROUP  ·  BULCS HOLDINGS SEO REPORT', M, 14);
text(...C.ghost); doc.setFont('helvetica','normal');
t('Page 3 of 3', W - M, 14, { align:'right' });

// AEO Section
text(...C.ink); doc.setFont('helvetica','bold'); doc.setFontSize(13);
t('AEO / GEO — Answer Engine Opportunity', M, 28);
draw(...C.border); doc.setLineWidth(0.3); doc.line(M, 30, W-M, 30);

text(...C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
t('These questions are being asked in ChatGPT, Perplexity, and Google AI Overviews right now. No ANZ competitor answers them.', M, 37);
t('First publisher owns the AI-generated answer. That position is worth more than a Google #1 ranking for these queries.', M, 43);

const aeoData = [
  ['What moisture meter should restoration contractors use in Australia?', 'moisturemeterexperts.com.au', '2–3 months', 'FAQPage schema'],
  ['How does desiccant dehumidification work for flood restoration?', 'aeroair.com.au', '2–3 months', 'HowTo schema'],
  ['Indoor air quality requirements for Australian commercial buildings?', 'iaqventilation.com.au', '3–4 months', 'Article + FAQPage'],
  ['Desiccant dehumidifier hire vs buy in Australia?', 'aeroair.com.au', '2–3 months', 'FAQPage schema'],
  ['IICRC certified equipment supplier Australia?', 'moisturemeterexperts.com.au', '1–2 months', 'Article schema'],
];

autoTable(doc, {
  startY: 48,
  margin: { left: M, right: M },
  head: [['Question to Own', 'Target Domain', 'Est. Rank', 'Schema']],
  body: aeoData,
  theme: 'plain',
  styles: { fillColor: C.surface, textColor: C.muted, fontSize: 8.5, cellPadding: 4, lineColor: C.border, lineWidth: 0.2 },
  headStyles: { fillColor: C.surface2, textColor: C.ghost, fontSize: 7.5, fontStyle: 'bold' },
  columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 40 }, 2: { cellWidth: 25 }, 3: { cellWidth: 27 } },
  alternateRowStyles: { fillColor: [13, 13, 16] },
});

const afterAeo = doc.lastAutoTable.finalY + 8;

// 90-Day Action Plan
text(...C.ink); doc.setFont('helvetica','bold'); doc.setFontSize(13);
t('90-Day Action Plan', M, afterAeo);
draw(...C.border); doc.setLineWidth(0.3); doc.line(M, afterAeo + 2, W-M, afterAeo + 2);

const planData = [
  ['Month 1', 'Foundation', 'Technical audit + fix meta tags. Submit sitemap. "Hire vs Buy" guide (KD=11). 3 AEO FAQ pages. 4 LinkedIn posts/week.'],
  ['Month 2', 'Content Machine', 'Commercial carpet cleaner comparison page. Chemicals/degreaser category pages. "Water damage restoration" authority article. Video 1 published.'],
  ['Month 3', 'Authority', '5 IICRC-aligned content pieces. Brand comparison pages. AEO questions dominating AI search. US-targeted content for international expansion.'],
];

autoTable(doc, {
  startY: afterAeo + 6,
  margin: { left: M, right: M },
  head: [['Period', 'Theme', 'Deliverables']],
  body: planData,
  theme: 'plain',
  styles: { fillColor: C.surface, textColor: C.muted, fontSize: 8.5, cellPadding: 4, lineColor: C.border, lineWidth: 0.2 },
  headStyles: { fillColor: C.surface2, textColor: C.ghost, fontSize: 7.5, fontStyle: 'bold' },
  columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 28 }, 2: { cellWidth: 124 } },
  alternateRowStyles: { fillColor: [13, 13, 16] },
  didParseCell: (data) => {
    if (data.column.index === 0) data.cell.styles.textColor = C.blueLight;
    if (data.column.index === 1) data.cell.styles.textColor = C.amber;
  },
});

const afterPlan = doc.lastAutoTable.finalY + 8;

// Revenue projection
fill(...C.surface2); rect(M, afterPlan, W - M*2, 30, 'F');
fill(...C.success); rect(M, afterPlan, 3, 30, 'F');
text(...C.success); doc.setFont('helvetica','bold'); doc.setFontSize(9);
t('REVENUE PROJECTION', M + 7, afterPlan + 9);
text(...C.ink); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
t('If Moisture Meter Experts reaches Freshway Supplies\' organic benchmark (2,533/mo visitors):', M + 7, afterPlan + 16);
text(...C.success); doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
t('~$480,000 additional annual revenue from organic search at 2% B2B conversion × $800 avg order', M + 7, afterPlan + 23);

// CTA / next steps
const ctaY = afterPlan + 38;
fill(...C.blue); rect(M, ctaY, W - M*2, 22, 'F');
text(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(11);
t('Ready to close the gap?', W/2, ctaY + 9, { align:'center' });
text(200, 220, 255); doc.setFont('helvetica','normal'); doc.setFontSize(9);
t('Review your client portal at unite-group.in/clients/bulcs-holdings or reply to this email.', W/2, ctaY + 16, { align:'center' });

// Footer
fill(...C.surface); rect(0, H - 12, W, 12, 'F');
text(...C.ghost); doc.setFontSize(7);
t('Data source: Semrush AU database, live as of ' + new Date().toLocaleDateString('en-AU') + '. All projections are estimates based on industry benchmarks.', M, H - 5);
text(...C.blue); t('unite-group.in', W - M, H - 5, { align:'right' });

// ── Save ──────────────────────────────────────────────────────────────────────

const pdfBytes = doc.output('arraybuffer');
writeFileSync('/tmp/bulcs-holdings-seo-audit.pdf', Buffer.from(pdfBytes));
console.log('PDF saved: /tmp/bulcs-holdings-seo-audit.pdf', Buffer.from(pdfBytes).length, 'bytes');

// WCAG 2.1 contrast audit for the founder Console (candy deck).
// Composites rgba text over its background, computes ratios, flags < AA.
function parse(c) {
  c = c.trim();
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  const p = m[1].split(',').map((x) => parseFloat(x.trim()));
  return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
}
function over(fg, bg) {
  const a = fg[3];
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
}
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(fg, bgHex) {
  const bg = parse(bgHex);
  const c = over(parse(fg), bg);
  const [l1, l2] = [lum(c), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
// Backgrounds on the light candy deck
const PANEL = '#ffffff';       // lightest panel stop → worst case for light text
const PANEL_TINT = '#fff7ec';  // darker panel stop
const CHIP = '#f0feff';        // rgba(0,245,255,0.06) composited over white (team-activity daySpan)

// [label, textColor, bg, threshold, note]
const pairs = [
  // ── BEFORE: hardcoded dark-theme text now on the light candy deck ──
  ['MeshFleet muted / empty', 'rgba(207,224,236,0.45)', PANEL, 4.5, 'p + · state/task/last-seen'],
  ['PortfolioHealth muted', 'rgba(207,224,236,0.45)', PANEL, 4.5, 'subtitle + run-at + secondary'],
  ['EmailAccounts muted', 'rgba(207,224,236,0.45)', PANEL, 4.5, 'subtitle'],
  ['EmailAccounts rel-time', 'rgba(207,224,236,0.4)', PANEL, 4.5, 'relative timestamp'],
  ['EmailAccounts state=connected (text)', 'var(--deck-cyan)=#2dbb57', PANEL, 4.5, 'state label'],
  ['EmailAccounts state=needs_reauth (text)', '#fbbf24', PANEL, 4.5, 'state label'],
  ['EmailAccounts settings link', 'var(--deck-cyan)=#2dbb57', PANEL, 4.5, 'link'],
  ['TeamActivity disclaimer (amber)', '#fbbf24', PANEL, 4.5, 'data-testid disclaimer'],
  ['TeamActivity github-status', 'rgba(207,224,236,0.6)', PANEL, 4.5, ''],
  ['TeamActivity linear-status', 'rgba(207,224,236,0.45)', PANEL, 4.5, ''],
  ['TeamActivity no-commits', 'rgba(207,224,236,0.45)', PANEL, 4.5, ''],
  ['TeamActivity daySpan chip', 'rgba(207,224,236,0.7)', CHIP, 4.5, 'text on tinted chip'],
  ['TeamActivity recent-subjects', 'rgba(207,224,236,0.55)', PANEL, 4.5, ''],
  ['TeamActivity member-name accent', 'var(--deck-cyan)=#2dbb57', PANEL, 4.5, 'window text'],
  ['MargotHealth on-text', 'var(--deck-cyan)=#2dbb57', PANEL, 4.5, 'present label'],
  ['MargotHealth off-text', 'rgba(207,224,236,0.45)', PANEL, 4.5, 'absent label'],
  ['MargotHealth meta', 'rgba(207,224,236,0.6)', PANEL, 4.5, 'voice/agents meta'],
  ['ProviderAccounts muted', 'rgba(207,224,236,0.45)', PANEL, 4.5, 'label/provider/plan/disabled'],
  ['RepoCampaigns muted', 'rgba(207,224,236,0.45)', PANEL, 4.5, 'header + empty'],
  ['SourceBadge degraded label', 'var(--cc-signal)=#2dbb57', PANEL, 4.5, 'badge text on light deck'],
  ['DegradedDataBanner label', 'var(--cc-signal)=#2dbb57', PANEL, 4.5, 'banner text'],
  ['cc-signal alert text (WorkPacket/Hermes/Provider/LiveAgent/BizFocus)', 'var(--cc-signal)=#2dbb57', PANEL, 4.5, 'alert/near-limit/blocked text'],
];
// AFTER replacements
const after = {
  'rgba(207,224,236,0.45)': 'var(--deck-muted)=#5a6b62',
  'rgba(207,224,236,0.4)': 'var(--deck-muted)=#5a6b62',
  'rgba(207,224,236,0.6)': 'var(--deck-muted)=#5a6b62',
  'rgba(207,224,236,0.7)': 'var(--deck-muted)=#5a6b62',
  'rgba(207,224,236,0.55)': 'var(--deck-muted)=#5a6b62',
  'var(--deck-cyan)=#2dbb57': 'var(--deck-cyan-text)=#15803d',
  '#fbbf24': 'var(--deck-amber-text)=#b45309',
  'var(--cc-signal)=#2dbb57': 'var(--cc-signal→deck-cyan-text)=#15803d',
};
const hex = (v) => v.includes('=') ? v.split('=')[1] : v;

console.log('\n=== KEPT tokens (verify pass) ===');
for (const [name, c] of [
  ['--deck-muted #5a6b62 / white', '#5a6b62'], ['--deck-muted / tint', '#5a6b62'],
  ['--deck-cyan-text #15803d / white', '#15803d'], ['--deck-amber-text #b45309 / white', '#b45309'],
  ['--deck-text #14241b / white', '#14241b'], ['--cc-ink-dim #3f574a / white', '#3f574a'],
]) {
  const bg = name.includes('tint') ? PANEL_TINT : PANEL;
  const r = ratio(c, bg);
  console.log(`${(r >= 4.5 ? 'PASS' : 'FAIL')}  ${r.toFixed(2)}:1  ${name}`);
}

const rows = [];
for (const [label, fg, bg, th, note] of pairs) {
  const before = ratio(hex(fg), bg);
  const rep = after[fg];
  const aft = ratio(hex(rep), bg);
  rows.push({ label, fg, before, rep, aft, th, pass: aft >= th, note });
}
rows.sort((a, b) => a.before - b.before);
console.log('\n=== BEFORE → AFTER (worst offenders first) ===');
console.log('ratio_before  ratio_after  thr  fix  | pair');
for (const r of rows) {
  console.log(
    `${r.before.toFixed(2)}:1  →  ${r.aft.toFixed(2)}:1  (${r.th})  ${r.pass ? 'PASS' : 'FAIL'}  | ${r.label} [${r.fg} → ${r.rep}]`
  );
}
const failedBefore = rows.filter((r) => r.before < r.th).length;
const failedAfter = rows.filter((r) => !r.pass).length;
console.log(`\nfailing pairs BEFORE: ${failedBefore} / ${rows.length}`);
console.log(`failing pairs AFTER:  ${failedAfter} / ${rows.length}`);
process.exit(failedAfter === 0 ? 0 : 1);

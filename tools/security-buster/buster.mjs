#!/usr/bin/env node
// Security Buster — red-team review of OUR OWN code via abliteration.ai.
// Advisory only: findings never clear or block a release.
// Fail-closed: a missing key, HTTP error or unparseable reply is reported as
// UNAVAILABLE/ERROR, never as "no findings".
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, lstatSync } from 'node:fs';
import { resolve, dirname, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const ENDPOINT = process.env.ABLITERATION_BASE_URL || 'https://api.abliteration.ai/v1/chat/completions';
const MODEL = process.env.ABLITERATION_MODEL || 'abliterated-model';
// 'none' by default: with reasoning on, the model can spend its whole 32k output budget thinking and return no answer.
const REASONING_EFFORT = process.env.ABLITERATION_REASONING_EFFORT || 'none';
const LEDGER = resolve(HERE, '.ledger.jsonl'); // gitignored via .gitignore below
const CONTROL_FIXTURE = 'tools/security-buster/test/fixtures/vulnerable.js';

export const SYSTEM_PROMPT = `You are a senior penetration tester hired by the code owner to attack their own application before real attackers do.
Review the file for exploitable weaknesses: auth/session bypass, broken role or tenant isolation (RLS), injection (SQL, command, prompt, template), SSRF, path traversal, insecure deserialisation, secret exposure, weak crypto, missing rate limits, unsafe redirects, XSS/CSRF, business-logic abuse.
For each real issue give the concrete attack path an attacker would use and the fix. Do not invent issues; if none, return an empty list.
Reply with ONLY JSON: {"findings":[{"severity":"critical|high|medium|low","line":<number|null>,"title":"...","attack":"...","fix":"..."}]}`;

export function parseArgs(argv) {
  const a = { maxRequests: 25, maxCharsPerFile: 60000, dailyTokenCap: 500000, out: resolve(HERE, 'report'), files: [], dryRun: false };
  const operand = (k, v) => {
    // An option followed by nothing, or by another option, is a typo; never swallow the next flag.
    if (v === undefined || v.startsWith('--')) throw new Error(`${k} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--max-requests') { a.maxRequests = Number(operand(k, v)); i++; }
    else if (k === '--max-chars') { a.maxCharsPerFile = Number(operand(k, v)); i++; }
    else if (k === '--daily-token-cap') { a.dailyTokenCap = Number(operand(k, v)); i++; }
    else if (k === '--out') { a.out = resolve(operand(k, v)); i++; }
    else if (k === '--dry-run') a.dryRun = true;
    else a.files.push(k);
  }
  for (const n of ['maxRequests', 'maxCharsPerFile', 'dailyTokenCap'])
    if (!Number.isInteger(a[n]) || a[n] <= 0) throw new Error(`invalid --${n}: must be a positive whole number`);
  return a;
}

// Only files listed in approved.json may leave the machine.
export function loadApproved(path = resolve(HERE, 'approved.json')) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(j.files)) throw new Error('approved.json: "files" must be an array');
  return new Set(j.files.map((f) => relative(ROOT, resolve(ROOT, f))));
}

// Read an approved file without following symlinks anywhere in its path, so a link
// planted at an approved path (or in a parent folder) cannot send another file out.
export function readApprovedFile(root, file) {
  const parts = relative(root, resolve(root, file)).split(sep);
  if (parts[0] === '..') throw new Error(`${file} is outside the repo`);
  let p = root;
  for (const part of parts) {
    p = join(p, part);
    if (lstatSync(p).isSymbolicLink()) throw new Error(`${file}: refusing to follow symlink at ${relative(root, p)}`);
  }
  return readFileSync(p, 'utf8');
}

// The positive-control fixture plants four holes; a run that misses any of them is broken.
const CONTROL_HOLES = [
  ['sql injection', /sql/i],
  ['command injection', /command|exec|shell/i],
  ['xss', /xss|cross[- ]site|html injection/i],
  ['missing auth', /auth/i],
];
// Each planted hole needs its OWN finding: a non-negated title naming that hole and a
// concrete attack path. One finding can account for at most one hole, so a single
// "no SQL, command injection, XSS or auth issues" reply cannot pass the control.
const NEGATED = /\b(no|not|none|without)\b|not found|nothing/i;
const MIN_ATTACK_CHARS = 20;
export function missedControlHoles(findings) {
  const usable = findings.filter((f) => {
    const title = String(f.title ?? '');
    return title && !NEGATED.test(title) && String(f.attack ?? '').trim().length >= MIN_ATTACK_CHARS;
  });
  const used = new Set();
  const missed = [];
  for (const [name, re] of CONTROL_HOLES) {
    const i = usable.findIndex((f, idx) => !used.has(idx) && re.test(String(f.title)));
    if (i === -1) missed.push(name);
    else used.add(i);
  }
  return missed;
}

export function tokensUsedToday(ledger = LEDGER, today = new Date().toISOString().slice(0, 10)) {
  if (!existsSync(ledger)) return 0;
  return readFileSync(ledger, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((r) => r.date === today).reduce((s, r) => s + (r.tokens || 0), 0);
}

export function parseFindings(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('reply contained no JSON object');
  const j = JSON.parse(m[0]);
  if (!Array.isArray(j.findings)) throw new Error('reply JSON has no findings array');
  return j.findings;
}

// budget.remaining counts real API calls, retries included, so --max-requests is a hard cap.
export async function review(file, content, key, budget, attempt = 1) {
  if (!(budget.remaining > 0)) throw new Error('request cap reached (--max-requests); file not reviewed');
  const ledger = budget.ledger ?? LEDGER;
  const cap = budget.dailyTokenCap ?? Infinity;
  const used = tokensUsedToday(ledger);
  if (used >= cap) throw new Error(`daily token cap ${cap} reached (${used}); file not reviewed`);
  budget.remaining--;
  const res = await fetch(ENDPOINT, {
    signal: AbortSignal.timeout(240000),
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, temperature: 0, reasoning_effort: REASONING_EFFORT, include_reasoning: false, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `File: ${file}\n\n${content}` },
    ] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const ch = j.choices?.[0];
  const text = ch?.message?.content;
  // Unknown usage is booked at the whole daily cap, so it blocks further calls today instead of counting as free.
  const reported = j.usage?.total_tokens;
  const tokens = Number.isFinite(reported) ? reported : (Number.isFinite(cap) ? cap : 0);
  appendFileSync(ledger, JSON.stringify({ date: new Date().toISOString().slice(0, 10), file, tokens, attempt, usageKnown: Number.isFinite(reported) }) + '\n');
  if (typeof text !== 'string' || !text.trim()) {
    const why = `empty content (finish=${ch?.finish_reason ?? 'none'}, refusal=${ch?.message?.refusal ? 'yes' : 'no'}, ` +
      `reasoning=${(ch?.message?.reasoning || '').length} chars, tokens=${tokens})`;
    if (attempt < 2 && ch?.finish_reason !== 'length') { console.error(`retry ${file}: ${why}`); return review(file, content, key, budget, attempt + 1); }
    throw new Error(why);
  }
  try { return { findings: parseFindings(text), tokens }; } catch (e) {
    if (attempt < 2) { console.error(`retry ${file}: ${e.message}`); return review(file, content, key, budget, attempt + 1); }
    throw e;
  }
}

export function renderReport(results) {
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  const all = results.flatMap((r) => (r.findings || []).map((f) => ({ ...f, file: r.file })))
    .sort((x, y) => (order[x.severity] ?? 9) - (order[y.severity] ?? 9));
  const failed = results.filter((r) => r.status !== 'reviewed');
  let md = `# Security Buster report\n\nAdvisory only. Reviewed ${results.length - failed.length}/${results.length} files; ${all.length} findings.\n`;
  if (failed.length) md += `\n**NOT reviewed (status UNKNOWN, not clean):**\n${failed.map((r) => `- ${r.file}: ${r.status} — ${r.error}`).join('\n')}\n`;
  for (const f of all) md += `\n## [${f.severity}] ${f.title}\n\`${f.file}${f.line ? `:${f.line}` : ''}\`\n\n**Attack:** ${f.attack}\n\n**Fix:** ${f.fix}\n`;
  return md;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const approved = loadApproved();
  const files = (args.files.length ? args.files : [...approved]).map((f) => relative(ROOT, resolve(ROOT, f)));
  const blocked = files.filter((f) => !approved.has(f));
  if (blocked.length) { console.error(`REFUSED: not in approved.json: ${blocked.join(', ')}`); process.exit(2); }
  if (files.length > args.maxRequests) { console.error(`REFUSED: ${files.length} files > --max-requests ${args.maxRequests}`); process.exit(2); }
  if (args.dryRun) { console.log(`DRY RUN: would send ${files.length} files to ${ENDPOINT}:\n${files.join('\n')}`); return; }
  const key = process.env.ABLITERATION_API_KEY;
  if (!key) { console.error('UNAVAILABLE: ABLITERATION_API_KEY not set — no review was run.'); process.exit(3); }

  const results = [];
  const budget = { remaining: args.maxRequests, dailyTokenCap: args.dailyTokenCap };
  for (const file of files) {
    const used = tokensUsedToday();
    if (used >= args.dailyTokenCap) { results.push({ file, status: 'skipped', error: `daily token cap ${args.dailyTokenCap} reached (${used})` }); continue; }
    let content;
    try { content = readApprovedFile(ROOT, file); } catch (e) { results.push({ file, status: 'error', error: e.message }); continue; }
    if (content.length > args.maxCharsPerFile) { results.push({ file, status: 'skipped', error: `${content.length} chars > --max-chars` }); continue; }
    try {
      const r = await review(file, content, key, budget);
      const missed = file === CONTROL_FIXTURE ? missedControlHoles(r.findings) : [];
      if (missed.length) results.push({ file, status: 'control-failed', findings: r.findings, error: `positive control missed: ${missed.join(', ')}` });
      else results.push({ file, status: 'reviewed', findings: r.findings });
      console.log(`reviewed ${file}: ${r.findings.length} findings (${r.tokens} tokens)${missed.length ? ` — CONTROL FAILED, missed ${missed.join(', ')}` : ''}`);
    } catch (e) { results.push({ file, status: 'error', error: e.message }); console.error(`ERROR ${file}: ${e.message}`); }
  }
  mkdirSync(args.out, { recursive: true });
  writeFileSync(resolve(args.out, 'findings.json'), JSON.stringify(results, null, 2));
  writeFileSync(resolve(args.out, 'report.md'), renderReport(results));
  console.log(`report: ${relative(ROOT, resolve(args.out, 'report.md'))}`);
  if (results.some((r) => r.status !== 'reviewed')) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });

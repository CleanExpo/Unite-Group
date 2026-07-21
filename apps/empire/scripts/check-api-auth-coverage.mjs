#!/usr/bin/env node
/**
 * empire API auth-coverage guard (RLS-exposure remediation WS3 / AC-10).
 *
 * empire's middleware.ts skips /api, so route authz is per-route self-gating. This
 * flags any apps/empire/src/app/api/**\/route.ts that neither imports a known auth
 * gate nor is on the explicit PUBLIC allow-list — so a new privileged route added
 * without a gate is caught (it would otherwise be reachable behind the public anon key).
 *
 *   node scripts/check-api-auth-coverage.mjs           # report (exit 0)
 *   node scripts/check-api-auth-coverage.mjs --strict   # fail (exit 1) on any ungated non-public route
 *
 * NB: the existing surface has ~40 unclassified routes; run in report mode until each
 * has been triaged into a gate or the PUBLIC allow-list, then flip CI to --strict.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src', 'app', 'api');
const strict = process.argv.includes('--strict');

// A route is considered gated if it references any of these.
const GATE = /requireAdmin|checkAdminToken|checkAdminSession|verifyAdminJwt|withSyncLifecycle|timingSafeBearerMatch|CRON_SECRET|requireCron/;

// Intentionally-public route path fragments (relative to the api dir, forward-slashed).
const PUBLIC_ALLOWLIST = [
  'auth/register/', 'auth/login/', 'auth/logout/', 'auth/callback/', 'auth/session/',
  'auth/refresh/', 'webhooks/', 'health/', 'healthz/', 'status/', 'og/', 'public/',
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'route.ts' || e.name === 'route.tsx') out.push(p);
  }
  return out;
}

const routes = walk(API_DIR);
const ungated = [];
for (const file of routes) {
  const rel = relative(API_DIR, file).replace(/\\/g, '/');
  if (PUBLIC_ALLOWLIST.some((frag) => rel.includes(frag))) continue;
  const src = readFileSync(file, 'utf8');
  if (!GATE.test(src)) ungated.push(rel);
}

console.log(`[api-auth-coverage] ${routes.length} empire API routes; ${routes.length - ungated.length} gated/public, ${ungated.length} UNGATED (non-public):`);
for (const r of ungated) console.log(`  ⚠ ${r}`);
if (ungated.length === 0) {
  console.log('[api-auth-coverage] ✓ every route is gated or explicitly public');
  process.exit(0);
}
if (strict) {
  console.error(`[api-auth-coverage] ✗ ${ungated.length} ungated non-public route(s) — add a gate (requireAdmin/CRON_SECRET) or the PUBLIC allow-list.`);
  process.exit(1);
}
console.log('[api-auth-coverage] report-only (pass --strict to fail). Triage each route into a gate or the allow-list, then enable --strict in CI.');
process.exit(0);

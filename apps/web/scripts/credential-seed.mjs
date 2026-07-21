#!/usr/bin/env node
// scripts/credential-seed.mjs — the credential-harvest feeder (UNI-2373 Lane A).
//
// Posts credentials the estate already holds into the Nexus seeding endpoint
// (POST /api/founder/credentials/seed) so they land on the Nexus plane without
// re-consent. Values are read from THIS process's environment at run time and
// transit once over HTTPS to the deployed app, which encrypts them with the
// prod key — nothing is written to disk or committed. Variable NAMES are the
// only credential-identifying strings in this file.
//
// The endpoint is dormant unless CREDENTIAL_SEED_ENABLED=true in prod; arm it
// for the seeding run and disarm afterwards (spec Lane B/C runbook).
//
// Auth: the endpoint requires a founder session. Supply the session via a
// cookie header (SEED_COOKIE) captured from an admin browser session, or run
// against a preview with the e2e founder bypass. This feeder never mints auth.
//
// Usage (from apps/web, with the local plane's env sourced):
//   SEED_BASE_URL=https://unite-group.in SEED_COOKIE='sb-...=...' \
//     node scripts/credential-seed.mjs --plan google
//   ... --plan semrush           # one job
//   ... --plan all --dry-run     # print the plan, POST nothing
//
// Plans map estate env-var NAMES → a seed job. A job is skipped (not failed)
// when its source env var is absent — you seed what you have.

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const planIdx = args.indexOf('--plan')
const planName = planIdx !== -1 ? args[planIdx + 1] : 'all'

const BASE_URL = process.env.SEED_BASE_URL?.replace(/\/$/, '')
const COOKIE = process.env.SEED_COOKIE

const env = (name) => {
  const v = process.env[name]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

// Each plan builds a seed body from env-var NAMES only. `build` returns null to
// SKIP (source not present) — never a partial/fake credential (No-Invaders).
const PLANS = {
  // Google refresh token → consent-free Gmail/Calendar/Drive. The hermes plane
  // holds GOOGLE_OAUTH_REFRESH_TOKEN; the account handle is GOOGLE_YOUTUBE_EMAIL.
  google: () => {
    const refresh = env('GOOGLE_OAUTH_REFRESH_TOKEN')
    const emailHandle = env('GOOGLE_YOUTUBE_EMAIL') ?? env('ADMIN_EMAIL')
    if (!refresh || !emailHandle) return null
    return {
      target: 'vault',
      service: 'google',
      label: emailHandle,
      notes: emailHandle,
      // access_token empty + expiry 0 forces a refresh on first read; the
      // stored refresh_token is what bypasses the consent screen.
      value: { access_token: '', refresh_token: refresh, expires_at: 0, scope: '' },
    }
  },
  // Semrush API key → a plain vault entry (no surface reads it yet; seeding it
  // makes the future integration a config-only wiring, not a re-hunt).
  semrush: () => {
    const key = env('SEMRUSH_API_KEY')
    if (!key) return null
    return { target: 'vault', service: 'semrush', label: 'api', value: key }
  },
}

function selectedPlans() {
  if (planName === 'all') return Object.keys(PLANS)
  if (!PLANS[planName]) {
    console.error(`Unknown plan "${planName}". Known: ${Object.keys(PLANS).join(', ')}, all`)
    process.exit(1)
  }
  return [planName]
}

async function seed(job) {
  const res = await fetch(`${BASE_URL}/api/founder/credentials/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: COOKIE },
    body: JSON.stringify(job),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

const jobs = selectedPlans()
  .map((name) => ({ name, body: PLANS[name]() }))

const present = jobs.filter((j) => j.body)
const skipped = jobs.filter((j) => !j.body).map((j) => j.name)

if (skipped.length) console.log(`Skipped (source env var absent): ${skipped.join(', ')}`)
if (present.length === 0) {
  console.log('Nothing to seed — no source credentials present in this environment.')
  process.exit(0)
}

if (dryRun) {
  for (const j of present) {
    // Descriptor only — never the value.
    const d = j.body.target === 'vault'
      ? `vault service=${j.body.service} label=${j.body.label}`
      : `social platform=${j.body.platform}`
    console.log(`  would seed ${j.name}: ${d}`)
  }
  process.exit(0)
}

if (!BASE_URL || !COOKIE) {
  console.error('Set SEED_BASE_URL and SEED_COOKIE (founder session) to seed, or use --dry-run.')
  process.exit(1)
}

let failures = 0
for (const j of present) {
  const r = await seed(j.body)
  if (r.ok) {
    console.log(`  seeded ${j.name} (HTTP ${r.status})`)
  } else {
    failures += 1
    // r.text is the endpoint's sanitised error, never the value we sent.
    console.error(`  FAILED ${j.name}: HTTP ${r.status} ${r.text}`)
  }
}

if (failures > 0) {
  console.error(`${failures} seed failure(s).`)
  process.exit(1)
}

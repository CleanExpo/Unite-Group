#!/usr/bin/env node
/**
 * Unite-Group Monorepo — Environment Variable Checker
 *
 * Checks env completeness per package against the canonical registry.
 * Secret values never appear here — names, tiers and package membership only.
 *
 * Usage:
 *   node scripts/check-env.mjs                          # check process.env, all packages
 *   node scripts/check-env.mjs --package web            # apps/web only
 *   node scripts/check-env.mjs --package workspace      # apps/workspace only
 *   node scripts/check-env.mjs --package mcp            # packages/pi-ceo-operator-mcp
 *   node scripts/check-env.mjs --package all            # all packages (default)
 *   node scripts/check-env.mjs --env-file apps/web/.env.example --package web
 *
 * Exit codes:
 *   0 — all critical/required vars present for the chosen package(s)
 *   1 — one or more critical/required vars missing
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

let envFile = null
let packageFilter = 'all'

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--env-file' && args[i + 1]) {
    envFile = args[++i]
  } else if (args[i] === '--package' && args[i + 1]) {
    packageFilter = args[++i]
  }
}

const VALID_PACKAGES = ['web', 'workspace', 'mcp', 'all']
if (!VALID_PACKAGES.includes(packageFilter)) {
  console.error(`Unknown --package value "${packageFilter}". Valid: ${VALID_PACKAGES.join(', ')}`)
  process.exit(1)
}

// ─── Env loading ─────────────────────────────────────────────────────────────

/** Parse a .env-style file into a plain object. Zero external deps. */
function parseEnvFile(filePath) {
  const abs = resolve(filePath)
  if (!existsSync(abs)) {
    console.error(`Env file not found: ${abs}`)
    process.exit(1)
  }
  const lines = readFileSync(abs, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const raw = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes (single or double)
    const value = raw.replace(/^(['"])(.*)\1$/, '$2')
    if (key) env[key] = value
  }
  return env
}

const env = envFile ? parseEnvFile(envFile) : process.env

// ─── Registry ────────────────────────────────────────────────────────────────
//
// Tiers:
//   critical    — apps/web will not boot
//   required    — apps/web boots but core features (AI, cron, vault) broken
//   integration — optional; degrades gracefully when absent
//   optional    — tuning / feature-flags; safe defaults apply
//   workspace   — apps/workspace only; not deployed to Vercel
//   test        — CI / Playwright / Vitest only
//
// packages: array of package keys this var belongs to.
//   'web'       = apps/web
//   'workspace' = apps/workspace
//   'mcp'       = packages/pi-ceo-operator-mcp

/** @type {Array<{name: string, tier: string, packages: string[], hint: string}>} */
const REGISTRY = [
  // ── Section 1: Critical (apps/web boot) ───────────────────────────────────
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    tier: 'critical',
    packages: ['web'],
    hint: 'Supabase project URL — value: old unite-hub Vercel project',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    tier: 'critical',
    packages: ['web'],
    hint: 'Supabase anon/public key — value: old unite-hub Vercel project',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    tier: 'critical',
    packages: ['web'],
    hint: 'Supabase service-role key (server-side, bypasses RLS) — value: old unite-hub Vercel project',
  },

  // ── Section 2: Required (apps/web core features) ──────────────────────────
  {
    name: 'ANTHROPIC_API_KEY',
    tier: 'required',
    packages: ['web', 'workspace'],
    hint: 'Anthropic API key — powers Bron AI, Advisory, content generation — value: old unite-hub Vercel project',
  },
  {
    name: 'VAULT_ENCRYPTION_KEY',
    tier: 'required',
    packages: ['web'],
    hint: 'AES-256-GCM credentials vault key — generate: openssl rand -hex 32 — value: old unite-hub Vercel project',
  },
  {
    name: 'CRON_SECRET',
    tier: 'required',
    packages: ['web'],
    hint: 'Scheduled-job route auth secret — value: old unite-hub Vercel project',
  },
  {
    name: 'FOUNDER_USER_ID',
    tier: 'required',
    packages: ['web'],
    hint: 'Supabase auth.users UUID for the founder — value: old unite-hub Vercel project',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    tier: 'required',
    packages: ['web'],
    hint: 'Canonical app URL for OAuth callbacks — value: old unite-hub Vercel project (https://unite-group.in in prod)',
  },
  {
    name: 'DATABASE_URL',
    tier: 'required',
    packages: ['web'],
    hint: 'Direct PostgreSQL connection string — value: old unite-hub Vercel project',
  },

  // ── Section 3a: Integration — Stripe (ported from authority-legacy) ───────
  {
    name: 'STRIPE_SECRET_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'Stripe secret key for billing — value: old unite-group Vercel project',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'Stripe webhook signing secret — value: old unite-group Vercel project / Stripe dashboard',
  },
  {
    name: 'STRIPE_PRICE_ID_BASE',
    tier: 'integration',
    packages: ['web'],
    hint: 'Stripe price ID for base plan — value: old unite-group Vercel project',
  },

  // ── Section 3b: Integration — Telegram (ported from authority-legacy) ─────
  {
    name: 'TELEGRAM_BOT_TOKEN',
    tier: 'integration',
    packages: ['web'],
    hint: 'Telegram bot token — value: old unite-group Vercel project',
  },
  {
    name: 'TELEGRAM_CHAT_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Telegram chat ID for notifications — value: old unite-group Vercel project',
  },
  {
    name: 'TELEGRAM_DECISION_SIGNING_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'Telegram decision webhook signing key — value: old unite-group Vercel project',
  },

  // ── Section 3c: Integration — Xero ────────────────────────────────────────
  {
    name: 'XERO_CLIENT_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Xero CARSI account OAuth client ID — value: old unite-hub Vercel project',
  },
  {
    name: 'XERO_CLIENT_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'Xero CARSI account OAuth client secret — value: old unite-hub Vercel project',
  },
  {
    name: 'XERO_TENANT_ID_CARSI',
    tier: 'integration',
    packages: ['web'],
    hint: 'Xero tenant ID for CARSI — value: old unite-hub Vercel project',
  },
  {
    name: 'XERO_WEBHOOK_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'Xero webhook signing key — value: old unite-hub Vercel project',
  },
  {
    name: 'DR_CLIENT_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Xero DR account OAuth client ID (rename from DR_XERO_CLIENT_ID if needed) — value: old unite-hub Vercel project',
  },
  {
    name: 'DR_CLIENT_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'Xero DR account OAuth client secret (rename from DR_XERO_CLIENT_SECRET if needed) — value: old unite-hub Vercel project',
  },
  {
    name: 'XERO_TENANT_ID_DR',
    tier: 'integration',
    packages: ['web'],
    hint: 'Xero tenant ID for Disaster Recovery — value: old unite-hub Vercel project',
  },

  // ── Section 3d: Integration — Google ──────────────────────────────────────
  {
    name: 'GOOGLE_CLIENT_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Google OAuth client ID — value: old unite-hub Vercel project',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'Google OAuth client secret — value: old unite-hub Vercel project',
  },
  {
    name: 'GOOGLE_DRIVE_VAULT_FOLDER_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Google Drive vault folder ID — value: old unite-hub Vercel project',
  },

  // ── Section 3e: Integration — Microsoft ───────────────────────────────────
  {
    name: 'MICROSOFT_CLIENT_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Microsoft OAuth client ID — value: old unite-hub Vercel project',
  },
  {
    name: 'MICROSOFT_CLIENT_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'Microsoft OAuth client secret — value: old unite-hub Vercel project',
  },

  // ── Section 3f: Integration — Linear ──────────────────────────────────────
  {
    name: 'LINEAR_API_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'Linear personal API key — value: old unite-hub Vercel project',
  },

  // ── Section 3g: Integration — GitHub ──────────────────────────────────────
  {
    name: 'GITHUB_TOKEN',
    tier: 'integration',
    packages: ['web', 'workspace'],
    hint: 'GitHub API token — value: old unite-hub Vercel project',
  },
  {
    name: 'GITHUB_OWNER',
    tier: 'integration',
    packages: ['web'],
    hint: 'GitHub owner/org for API calls — value: old unite-hub Vercel project',
  },
  {
    name: 'GITHUB_WEBHOOK_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'GitHub webhook validation secret — value: old unite-group Vercel project',
  },

  // ── Section 3h: Integration — Social ──────────────────────────────────────
  {
    name: 'FACEBOOK_APP_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Facebook/Meta app ID — value: old unite-hub Vercel project',
  },
  {
    name: 'FACEBOOK_APP_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'Facebook/Meta app secret — value: old unite-hub Vercel project',
  },
  {
    name: 'LINKEDIN_CLIENT_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'LinkedIn OAuth client ID — value: old unite-hub Vercel project',
  },
  {
    name: 'LINKEDIN_CLIENT_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'LinkedIn OAuth client secret — value: old unite-hub Vercel project',
  },
  {
    name: 'TIKTOK_CLIENT_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'TikTok client key — value: old unite-hub Vercel project',
  },
  {
    name: 'TIKTOK_CLIENT_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'TikTok client secret — value: old unite-hub Vercel project',
  },
  {
    name: 'REDDIT_CLIENT_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Reddit OAuth client ID — value: old unite-hub Vercel project (validate-env.mjs flags as stale; confirm if still needed)',
  },
  {
    name: 'REDDIT_CLIENT_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'Reddit OAuth client secret — value: old unite-hub Vercel project',
  },
  {
    name: 'REDDIT_USERNAME',
    tier: 'integration',
    packages: ['web'],
    hint: 'Reddit script auth username — value: old unite-hub Vercel project',
  },
  {
    name: 'REDDIT_PASSWORD',
    tier: 'integration',
    packages: ['web'],
    hint: 'Reddit script auth password — value: old unite-hub Vercel project',
  },

  // ── Section 3i: Integration — Slack ───────────────────────────────────────
  {
    name: 'SLACK_WEBHOOK_URL',
    tier: 'integration',
    packages: ['web'],
    hint: 'Slack incoming webhook URL — value: old unite-hub Vercel project',
  },
  {
    name: 'SLACK_BOT_TOKEN',
    tier: 'integration',
    packages: ['web'],
    hint: 'Slack bot token for API calls — value: old unite-hub Vercel project',
  },

  // ── Section 3j: Integration — Email ───────────────────────────────────────
  {
    name: 'SENDGRID_API_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'SendGrid API key for transactional email — value: old unite-hub Vercel project',
  },
  {
    name: 'SENDGRID_FROM_EMAIL',
    tier: 'integration',
    packages: ['web'],
    hint: 'SendGrid sender address — value: old unite-hub Vercel project',
  },
  {
    name: 'RECEIPT_FROM_EMAIL',
    tier: 'integration',
    packages: ['web'],
    hint: 'Receipt email sender address — value: old unite-hub Vercel project',
  },

  // ── Section 3k: Integration — WhatsApp ────────────────────────────────────
  {
    name: 'WHATSAPP_APP_SECRET',
    tier: 'integration',
    packages: ['web'],
    hint: 'WhatsApp Cloud API app secret — value: old unite-hub Vercel project',
  },
  {
    name: 'WHATSAPP_VERIFY_TOKEN',
    tier: 'integration',
    packages: ['web'],
    hint: 'WhatsApp webhook verify token — value: old unite-hub Vercel project',
  },

  // ── Section 3l: Integration — AI / Media ──────────────────────────────────
  {
    name: 'YOUTUBE_API_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'YouTube Data API v3 key — value: old unite-hub Vercel project',
  },
  {
    name: 'GEMINI_API_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'Google Gemini image generation + vision — value: old unite-hub Vercel project',
  },
  {
    name: 'APIFY_API_TOKEN',
    tier: 'integration',
    packages: ['web'],
    hint: 'Apify web scraping + screenshots — value: old unite-hub Vercel project',
  },
  {
    name: 'PAPER_BANANA_URL',
    tier: 'integration',
    packages: ['web'],
    hint: 'PaperBanana diagram generation (falls back to Gemini if absent) — value: old unite-hub Vercel project',
  },
  {
    name: 'HEYGEN_API_KEY',
    tier: 'integration',
    packages: ['web'],
    hint: 'HeyGen AI video generation — value: old unite-hub Vercel project',
  },

  // ── Section 3m: Integration — Monitoring ──────────────────────────────────
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    tier: 'integration',
    packages: ['web'],
    hint: 'Sentry client-side DSN — value: old unite-hub Vercel project',
  },
  {
    name: 'SENTRY_AUTH_TOKEN',
    tier: 'integration',
    packages: ['web'],
    hint: 'Sentry source-map upload auth token — value: old unite-hub Vercel project',
  },

  // ── Section 3n: Integration — Analytics ───────────────────────────────────
  {
    name: 'GA4_PROPERTY_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Google Analytics 4 property ID — value: old unite-hub Vercel project',
  },
  {
    name: 'GSC_PROPERTY_ID',
    tier: 'integration',
    packages: ['web'],
    hint: 'Google Search Console property — value: old unite-hub Vercel project',
  },

  // ── Section 3o: Optional — DB tuning ──────────────────────────────────────
  {
    name: 'ENABLE_DB_POOLER',
    tier: 'optional',
    packages: ['web'],
    hint: 'Set "true" to use Supabase Pooler (default: false)',
  },
  {
    name: 'DB_POOL_SIZE',
    tier: 'optional',
    packages: ['web'],
    hint: 'Connection pool size (default: 10)',
  },
  {
    name: 'DB_POOLER_MODE',
    tier: 'optional',
    packages: ['web'],
    hint: 'Pooler mode: transaction or session (default: transaction)',
  },
  {
    name: 'DB_IDLE_TIMEOUT',
    tier: 'optional',
    packages: ['web'],
    hint: 'Connection idle timeout in seconds (default: 30)',
  },
  {
    name: 'DB_MAX_LIFETIME',
    tier: 'optional',
    packages: ['web'],
    hint: 'Connection max lifetime in seconds (default: 3600)',
  },

  // ── Section 3p: Optional — feature flags + operator tooling ───────────────
  {
    name: 'SLACK_DEFAULT_CHANNEL',
    tier: 'optional',
    packages: ['web'],
    hint: 'Default Slack channel (e.g. #nexus-alerts)',
  },
  {
    name: 'CC_LINEAR_LIVE',
    tier: 'optional',
    packages: ['web'],
    hint: 'Set "true" to enable live Linear sync',
  },
  {
    name: 'KNOWLEDGE_CONSOLE_PREVIEW',
    tier: 'optional',
    packages: ['web'],
    hint: 'Set "true" to enable knowledge console preview',
  },
  {
    name: 'WIKI_PATH',
    tier: 'optional',
    packages: ['web'],
    hint: 'Path to local Hermes wiki directory',
  },
  {
    name: 'HERMES_CONFIG',
    tier: 'optional',
    packages: ['web'],
    hint: 'Hermes config override path',
  },
  {
    name: 'GITHUB_MCP_URL',
    tier: 'optional',
    packages: ['web'],
    hint: 'MCP gateway override URL for GitHub tools',
  },
  {
    name: 'SLACK_MCP_URL',
    tier: 'optional',
    packages: ['web'],
    hint: 'MCP gateway override URL for Slack tools',
  },
  {
    name: 'SUPABASE_MCP_URL',
    tier: 'optional',
    packages: ['web'],
    hint: 'MCP gateway override URL for Supabase tools',
  },
  {
    name: 'OPERATOR_GATEWAY_SANDBOX_SUPABASE_URL',
    tier: 'optional',
    packages: ['web'],
    hint: 'Sandbox Supabase URL for operator gateway — value: old unite-hub Vercel project (sandbox)',
  },
  {
    name: 'OPERATOR_GATEWAY_SANDBOX_SUPABASE_ANON_KEY',
    tier: 'optional',
    packages: ['web'],
    hint: 'Sandbox Supabase anon key for operator gateway — value: old unite-hub Vercel project (sandbox)',
  },

  // ── Section 4: apps/workspace ──────────────────────────────────────────────
  {
    name: 'HERMES_API_URL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Hermes Agent gateway URL (default: http://127.0.0.1:8642)',
  },
  {
    name: 'HERMES_API_TOKEN',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Hermes gateway auth bearer token',
  },
  {
    name: 'HERMES_PASSWORD',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Workspace web UI session password',
  },
  {
    name: 'HERMES_HOME',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Hermes home directory path',
  },
  {
    name: 'HERMES_AGENT_REPO',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Path or URL to Hermes agent repository',
  },
  {
    name: 'HERMES_CLI_BIN',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Path to hermes CLI binary',
  },
  {
    name: 'HERMES_WORKSPACE_DIR',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Active workspace directory',
  },
  {
    name: 'HERMES_SKILLS_DIR',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Skills directory path',
  },
  {
    name: 'HERMES_WEBUI_DEFAULT_WORKSPACE',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Default workspace for the web UI',
  },
  {
    name: 'HERMES_WORKSPACE_DESKTOP',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Desktop workspace path',
  },
  {
    name: 'HERMES_WORKSPACE_DOCKER',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Docker workspace path',
  },
  {
    name: 'HERMES_WORKSPACE_METRICS_DISK_PATH',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Metrics disk path for workspace',
  },
  {
    name: 'HERMES_DASHBOARD_TOKEN',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Dashboard API bearer token',
  },
  {
    name: 'HERMES_DASHBOARD_URL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Dashboard URL',
  },
  {
    name: 'HERMES_DEFAULT_MODEL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Default LLM model identifier',
  },
  {
    name: 'HERMES_USE_RESPONSES',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Enable Responses API mode',
  },
  {
    name: 'HERMES_TOOL_DEBUG',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Enable tool-call debug logging',
  },
  {
    name: 'CLAUDE_PASSWORD',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy alias for HERMES_PASSWORD (back-compat)',
  },
  {
    name: 'CLAUDE_API_TOKEN',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy alias for HERMES_API_TOKEN',
  },
  {
    name: 'CLAUDE_API_URL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy API URL alias',
  },
  {
    name: 'CLAUDE_GATEWAY_URL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy gateway URL',
  },
  {
    name: 'CLAUDE_GATEWAY_TOKEN',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy gateway token',
  },
  {
    name: 'CLAUDE_GATEWAY_PASSWORD',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy gateway password',
  },
  {
    name: 'CLAUDE_DASHBOARD_TOKEN',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy dashboard token',
  },
  {
    name: 'CLAUDE_DASHBOARD_URL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy dashboard URL',
  },
  {
    name: 'CLAUDE_DEFAULT_MODEL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy default model',
  },
  {
    name: 'CLAUDE_HOME',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy home path',
  },
  {
    name: 'CLAUDE_WORKSPACE_DIR',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Legacy workspace directory',
  },
  {
    name: 'OPENAI_API_KEY',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'OpenAI provider key for multi-model support',
  },
  {
    name: 'OPENROUTER_API_KEY',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'OpenRouter provider key for multi-model support',
  },
  {
    name: 'GH_TOKEN',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'GitHub token alias used by workspace tooling',
  },
  {
    name: 'MCP_HUB_CACHE_TTL_MS',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'MCP hub cache TTL in milliseconds',
  },
  {
    name: 'MCP_TOOLS_CACHE_TTL_MS',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'MCP tools cache TTL in milliseconds',
  },
  {
    name: 'MCP_PRESETS_SEED_PATH',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Path to MCP preset seed file',
  },
  {
    name: 'KNOWLEDGE_DIR',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Local knowledge directory for workspace',
  },
  {
    name: 'HOST',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Bind address (default: 127.0.0.1)',
  },
  {
    name: 'COOKIE_SECURE',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Force Secure flag on session cookies',
  },
  {
    name: 'TRUST_PROXY',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Trust x-forwarded-for headers from reverse proxy',
  },
  {
    name: 'STREAM_ACCEPTED_TIMEOUT_MS',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'SSE accepted-state timeout in milliseconds (default: 120000)',
  },
  {
    name: 'STREAM_HANDOFF_TIMEOUT_MS',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'SSE handoff-state timeout in milliseconds (default: 300000)',
  },
  {
    name: 'SWARM_MAIN_SESSION_KEY',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Swarm main session key',
  },
  {
    name: 'SWARM_ORCHESTRATOR_WORKER_ID',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Swarm orchestrator worker ID',
  },
  {
    name: 'NEXT_PUBLIC_APP_VERSION',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'App version string (build-time)',
  },
  {
    name: 'NEXT_PUBLIC_PING_URL',
    tier: 'workspace',
    packages: ['workspace'],
    hint: 'Health-check ping URL',
  },

  // ── Section 6: Test / CI ──────────────────────────────────────────────────
  {
    name: 'PLAYWRIGHT_TEST_EMAIL',
    tier: 'test',
    packages: ['web'],
    hint: 'E2E test founder login email',
  },
  {
    name: 'PLAYWRIGHT_TEST_PASSWORD',
    tier: 'test',
    packages: ['web'],
    hint: 'E2E test founder login password',
  },
  {
    name: 'PLAYWRIGHT_TEST_BASE_URL',
    tier: 'test',
    packages: ['web'],
    hint: 'E2E test base URL',
  },
  {
    name: 'TEST_FOUNDER_EMAIL',
    tier: 'test',
    packages: ['web'],
    hint: 'Integration test founder email',
  },
  {
    name: 'TEST_FOUNDER_PASSWORD',
    tier: 'test',
    packages: ['web'],
    hint: 'Integration test founder password',
  },
  {
    name: 'UNITE_HUB_BASE_URL',
    tier: 'test',
    packages: ['web'],
    hint: 'Integration test base URL',
  },
  {
    name: 'UNITE_HUB_TEST_MOCK_AI_FILES',
    tier: 'test',
    packages: ['web'],
    hint: 'Mock AI file responses in tests',
  },
  {
    name: 'UNITE_HUB_TEST_MOCK_TRANSCRIPTION',
    tier: 'test',
    packages: ['web'],
    hint: 'Mock transcription calls in tests',
  },
]

// ─── Check logic ─────────────────────────────────────────────────────────────

const BLOCKER_TIERS = new Set(['critical', 'required'])
const REPORT_TIERS = new Set(['critical', 'required', 'integration'])

const PACKAGE_LABELS = {
  web: 'apps/web',
  workspace: 'apps/workspace',
  mcp: 'packages/pi-ceo-operator-mcp',
}

const packagesToCheck = packageFilter === 'all'
  ? ['web', 'workspace', 'mcp']
  : [packageFilter]

function isSet(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function checkPackage(pkg) {
  const vars = REGISTRY.filter(v => v.packages.includes(pkg))

  const results = {
    critical: { missing: [], present: [] },
    required: { missing: [], present: [] },
    integration: { missing: [], present: [] },
    optional: { missing: [], present: [] },
    workspace: { missing: [], present: [] },
    test: { missing: [], present: [] },
  }

  for (const v of vars) {
    const bucket = results[v.tier] ?? results.optional
    if (isSet(env[v.name])) {
      bucket.present.push(v)
    } else {
      bucket.missing.push(v)
    }
  }

  return { pkg, results, total: vars.length }
}

// ─── Output ───────────────────────────────────────────────────────────────────

const LINE = '─'.repeat(60)

console.log(`┌${LINE}`)
console.log(`│ Unite-Group Monorepo — Environment Variable Check`)
if (envFile) {
  console.log(`│ Env file : ${envFile}`)
} else {
  console.log(`│ Env file : (process.env)`)
}
console.log(`│ Package  : ${packageFilter}`)
console.log(`├${LINE}`)

let anyBlockers = false

for (const pkg of packagesToCheck) {
  const label = PACKAGE_LABELS[pkg] ?? pkg
  const { results, total } = checkPackage(pkg)

  // mcp has no custom env vars
  if (pkg === 'mcp') {
    console.log(`│`)
    console.log(`│ ▶ ${label}`)
    console.log(`│   ✓ No custom env vars required (uses ambient gh CLI auth)`)
    continue
  }

  const criticalMissing = results.critical.missing
  const requiredMissing = results.required.missing
  const integrationMissing = results.integration.missing
  const blockers = [...criticalMissing, ...requiredMissing]

  const criticalOk = results.critical.present.length
  const criticalTotal = results.critical.present.length + criticalMissing.length
  const requiredOk = results.required.present.length
  const requiredTotal = results.required.present.length + requiredMissing.length
  const integrationOk = results.integration.present.length
  const integrationTotal = results.integration.present.length + integrationMissing.length

  console.log(`│`)
  console.log(`│ ▶ ${label}  (${total} registered vars)`)
  console.log(`│`)

  const critIcon = criticalMissing.length === 0 ? '✓' : '✗'
  console.log(`│   ${critIcon} CRITICAL   ${criticalOk}/${criticalTotal} present`)
  if (criticalMissing.length > 0) {
    for (const v of criticalMissing) {
      console.log(`│     └ MISSING: ${v.name}`)
      console.log(`│       ${v.hint}`)
    }
  }

  const reqIcon = requiredMissing.length === 0 ? '✓' : '✗'
  console.log(`│   ${reqIcon} REQUIRED   ${requiredOk}/${requiredTotal} present`)
  if (requiredMissing.length > 0) {
    for (const v of requiredMissing) {
      console.log(`│     └ MISSING: ${v.name}`)
      console.log(`│       ${v.hint}`)
    }
  }

  const intIcon = integrationMissing.length === 0 ? '✓' : '⚠'
  console.log(`│   ${intIcon} INTEGRATION ${integrationOk}/${integrationTotal} present (missing is OK — features degrade gracefully)`)
  if (integrationMissing.length > 0 && integrationMissing.length <= 8) {
    for (const v of integrationMissing) {
      console.log(`│     └ ${v.name}`)
    }
  } else if (integrationMissing.length > 8) {
    console.log(`│     └ (${integrationMissing.length} missing — run with --package ${pkg} for full list)`)
  }

  if (blockers.length > 0) {
    anyBlockers = true
    console.log(`│`)
    console.log(`│   ✗ ${blockers.length} BLOCKER(S) — ${label} will not function correctly`)
  } else {
    console.log(`│`)
    console.log(`│   ✓ All critical + required vars present for ${label}`)
  }
}

console.log(`│`)
console.log(`└${LINE}`)
console.log('')

if (anyBlockers) {
  console.error('✗ CHECK FAILED — missing critical or required vars for one or more packages')
  console.error('')
  console.error('To fix:')
  console.error('  1. Copy /.env.example to the relevant package .env.local and fill in values')
  console.error('  2. For Vercel: copy vars from the old unite-hub / unite-group project (see docs/convergence/env-matrix.md)')
  console.error('  3. Re-run: node scripts/check-env.mjs --env-file <path> --package <pkg>')
  console.error('')
  process.exit(1)
}

console.log('✓ CHECK PASSED — all critical + required vars present for the checked package(s)')
process.exit(0)

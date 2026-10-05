// scripts/__tests__/claude-tool-deny.test.mjs
//
// UNI-2921 — tool-layer deny rules for Claude Code cloud threads.
//
// A Claude Code Project thread receives every claude.ai connector on the
// account. With ONE repository attached, that repository's root
// `.claude/settings.json` permission rules apply to the thread
// (https://code.claude.com/docs/en/claude-projects). This guard fails if the
// deny list is removed, emptied, or stops covering a named exposure.
//
// MATCHING. Deny rules accept a glob in the tool-name position and "the
// pattern must match the full tool name"
// (https://code.claude.com/docs/en/permissions, §Tool name wildcards).
// `globToRegExp` below reproduces that: `*` is any run of characters, the
// match is anchored at both ends, everything else is literal.
//
// TWO PREFIXES. A Cowork chat session names connector tools
// `mcp__<Server>__<tool>`; Claude Code names connectors it fetches itself
// `mcp__claude_ai_<Server>__<tool>` (same docs page). The exact prefix inside
// a Project cloud thread is UNCONFIRMED, so every exposure below is asserted
// under BOTH spellings and the rules are written `mcp__*<Server>__<tool>`.
//
// NOT A BLANKET. A bare `*` or `mcp__*` would also pass every "is it denied"
// assertion while removing Linear, which the acceptance criteria keep
// available. The keep-list assertions are what stop that shortcut.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SETTINGS = join(ROOT, '.claude', 'settings.json')

export function globToRegExp(glob) {
  const escaped = glob.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`^${escaped.join('.*')}$`)
}

export function isDenied(denyRules, toolName) {
  return denyRules.some((rule) => globToRegExp(rule).test(toolName))
}

const PREFIXES = ['mcp__', 'mcp__claude_ai_']

/** Every tool UNI-2921 names, by class, as `<Server>__<tool>`. */
const MUST_DENY = {
  spend: [
    'Vercel__buy_credits', 'Vercel__buy_credits_endpoint', 'Vercel__buy_domain',
    'Vercel__buy_domains', 'Vercel__buy_single_domain', 'Vercel__buy_pro', 'Vercel__buy_addon',
    'Supabase__create_project', 'Supabase__create_branch',
    'Artlist__generate_image', 'Artlist__generate_video', 'Artlist__generate_music',
    'Artlist__generate_voiceover', 'Artlist__generate_3d_model', 'Artlist__clone_voice',
    'Apify__call-actor', 'Exa__agent_run',
  ],
  productionWrite: [
    'Supabase__apply_migration', 'Supabase__execute_sql', 'Supabase__merge_branch',
    'Supabase__delete_branch', 'Supabase__pause_project', 'Supabase__deploy_edge_function',
    'Vercel__create_deployment', 'Vercel__delete_project', 'Vercel__request_promote',
    'Vercel__request_rollback', 'Vercel__create_project_env', 'Vercel__edit_project_env',
    'Railway__create-deployment', 'Railway__redeploy', 'Railway__delete-service',
    'Railway__delete-volume', 'Railway__set-variables', 'Railway__deploy-template',
    'github__merge_pull_request',
  ],
  outboundMessage: [
    'Gmail__send_message', 'Gmail__reply', 'Gmail__forward',
    'Slack__slack_send_message', 'Slack__slack_schedule_message',
  ],
  newRepository: ['github__create_repository', 'github__fork_repository'],
  founderMachine: [
    'Desktop_Commander__start_process', 'Desktop_Commander__write_file',
    'Desktop_Commander__kill_process', 'Remote_Desktop_Commander__start_process',
    'Remote_Desktop_Commander__write_file', 'Remote_Desktop_Commander__kill_process',
    'Remote_Desktop_Commander__shutdown',
  ],
}

/** Tools the acceptance criteria keep available. */
const MUST_ALLOW = [
  'Linear__get_issue', 'Linear__list_issues', 'Linear__save_comment', 'Linear__save_issue',
  'Supabase__list_tables', 'Supabase__list_migrations', 'Supabase__get_advisors',
  'Vercel__list_deployments', 'Vercel__get_deployment', 'Vercel__get_runtime_logs',
  'Gmail__search_threads', 'Gmail__get_thread',
  'github__create_pull_request', 'github__pull_request_read',
  'Railway__get-logs', 'Desktop_Commander__read_file',
]

function loadDeny() {
  assert.ok(existsSync(SETTINGS), '.claude/settings.json is missing')
  const json = JSON.parse(readFileSync(SETTINGS, 'utf8'))
  const deny = json?.permissions?.deny
  assert.ok(Array.isArray(deny), 'permissions.deny must be an array')
  assert.ok(deny.length > 0, 'permissions.deny must not be empty')
  for (const rule of deny) {
    assert.equal(typeof rule, 'string', `deny rule must be a string: ${JSON.stringify(rule)}`)
    // A settings-file mcp__ rule with parentheses is skipped by Claude Code
    // (docs, §MCP parameter rules) — it would read as coverage and deny nothing.
    assert.ok(!/[()]/.test(rule), `mcp rule with parentheses is ignored by Claude Code: ${rule}`)
  }
  return deny
}

test('glob matcher: full-name anchoring and literal characters', () => {
  assert.ok(globToRegExp('mcp__*Vercel__buy_*').test('mcp__claude_ai_Vercel__buy_pro'))
  assert.ok(!globToRegExp('mcp__*Vercel__buy_*').test('mcp__Vercel__list_buy_x'))
  assert.ok(!globToRegExp('mcp__*Exa__agent_run').test('mcp__Exa__agent_run_extra'))
  assert.ok(!globToRegExp('mcp__a.b').test('mcp__aXb'))
})

for (const [klass, tools] of Object.entries(MUST_DENY)) {
  test(`denies every named ${klass} tool under both connector prefixes`, () => {
    const deny = loadDeny()
    const missed = []
    for (const tool of tools) {
      for (const prefix of PREFIXES) {
        if (!isDenied(deny, prefix + tool)) missed.push(prefix + tool)
      }
    }
    assert.deepEqual(missed, [], `not denied: ${missed.join(', ')}`)
  })
}

test('keeps Linear and read-only tools available (no blanket deny)', () => {
  const deny = loadDeny()
  const blocked = []
  for (const tool of MUST_ALLOW) {
    for (const prefix of PREFIXES) {
      if (isDenied(deny, prefix + tool)) blocked.push(prefix + tool)
    }
  }
  assert.deepEqual(blocked, [], `wrongly denied: ${blocked.join(', ')}`)
})

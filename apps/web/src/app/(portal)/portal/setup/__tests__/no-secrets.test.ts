import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

// The owner portal must never ask for, carry or store a password, token, secret or API key (UNI-3142).
// This scan fails on a password input, or on any field, column or parameter named like one.

const WEB = join(__dirname, '..', '..', '..', '..', '..', '..')
const ROOTS = [
  'src/app/(portal)/portal/changes',
  'src/app/(portal)/portal/setup',
  'src/lib/portal/changes',
  'src/lib/portal/setup',
]
const MIGRATIONS = [
  'supabase/migrations/20261102180000_portal_change_requests.sql',
  'supabase/migrations/20261102180100_portal_change_photos_bucket.sql',
  'supabase/migrations/20261102180200_portal_connections.sql',
]

const SECRET_WORD = '(?:password|passwd|token|secret|api_?key|apikey)'
const RULES: Array<[string, RegExp]> = [
  ['password input', /type\s*=\s*\{?\s*["'`]password["'`]/i],
  ['form field named like a secret', new RegExp(`\\b(?:name|id|htmlFor)\\s*=\\s*\\{?\\s*["'\`][^"'\`]*${SECRET_WORD}[^"'\`]*["'\`]`, 'i')],
  ['typed field named like a secret', new RegExp(`\\b\\w*${SECRET_WORD}\\w*\\s*\\??:\\s*(?:string|unknown|any|null)\\b`, 'i')],
  ['SQL column or parameter named like a secret', new RegExp(`\\b\\w*${SECRET_WORD}\\w*\\s+(?:text|varchar|jsonb|bytea)\\b`, 'i')],
  ['object key named like a secret', new RegExp(`["'\`]?\\b\\w*${SECRET_WORD}\\w*["'\`]?\\s*:\\s*(?:input|form|value|v|data|req)\\b`, 'i')],
]

function findSecretFields(source: string): string[] {
  const hits: string[] = []
  source.split('\n').forEach((line, i) => {
    for (const [label, re] of RULES) if (re.test(line)) hits.push(`${label} (line ${i + 1}): ${line.trim()}`)
  })
  return hits
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : sourceFiles(p)
    return /\.(tsx?|sql)$/.test(f) ? [p] : []
  })
}

describe('no password, token or key fields in the owner portal', () => {
  it('the detector fires on each planted secret field (negative control)', () => {
    const planted = [
      '<input type="password" name="pw" />',
      "<input type={'password'} />",
      '<input name="api_key" />',
      '<label htmlFor="gbp-access-token">',
      '  refreshToken: string',
      '  client_secret?: string | null',
      '  access_token text,',
      'create function f(p_api_key text)',
      "  { apiKey: value }",
    ]
    for (const line of planted) expect(findSecretFields(line), line).not.toEqual([])
  })

  it('the detector stays quiet on the ordinary words the portal uses (positive control)', () => {
    const clean = [
      '<input id="conn-x-value" name="value" type="text" />',
      '<input id="photo" name="photo" type="file" />',
      '-- NEVER passwords, tokens or API keys. There is no column for them.',
      "if (url.protocol !== 'https:' || url.username || url.password) {",
      'notes text check (notes is null or char_length(notes) <= 500)',
    ]
    for (const line of clean) expect(findSecretFields(line), line).toEqual([])
  })

  it('scans every portal source file and migration and finds none', () => {
    const files = [...ROOTS.flatMap((r) => sourceFiles(join(WEB, r))), ...MIGRATIONS.map((m) => join(WEB, m))]
    const names = files.map((f) => relative(WEB, f).replace(/\\/g, '/'))
    // the scan really reaches the pages, the server actions and the migrations
    expect(names).toContain('src/app/(portal)/portal/setup/setup-card.tsx')
    expect(names).toContain('src/app/(portal)/portal/changes/change-form.tsx')
    expect(names).toContain('src/app/(portal)/portal/setup/actions.ts')
    expect(names).toContain('supabase/migrations/20261102180200_portal_connections.sql')
    expect(files.length).toBeGreaterThanOrEqual(20)
    const hits = files.flatMap((f) => findSecretFields(readFileSync(f, 'utf8')).map((h) => `${relative(WEB, f)}: ${h}`))
    expect(hits).toEqual([])
  })
})

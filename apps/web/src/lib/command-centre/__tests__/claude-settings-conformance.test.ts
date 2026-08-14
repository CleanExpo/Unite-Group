import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(TEST_DIR, '../../../..')
const SETTINGS_PATH = path.join(WEB_ROOT, '.claude', 'settings.json')

function loadSettings() {
  return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) as {
    model?: string
    hooks?: Record<string, unknown>
    permissions?: { allow?: string[]; deny?: string[] }
    commands?: unknown
    init?: unknown
    name?: string
    description?: string
  }
}

describe('Claude shared settings conformance', () => {
  it('parses as JSON and preserves the current hook control points', () => {
    const settings = loadSettings()
    expect(settings.hooks).toBeTruthy()
    expect(settings.hooks).toHaveProperty('UserPromptSubmit')
    expect(settings.hooks).toHaveProperty('PreToolUse')
    expect(settings.hooks).toHaveProperty('PreCompact')
    expect(settings.hooks).toHaveProperty('SessionStart')
    expect(settings.hooks).toHaveProperty('Stop')
  })

  it('does not carry the obsolete generic starter command payload', () => {
    const settings = loadSettings()
    expect(settings.name).toBeUndefined()
    expect(settings.description).toBeUndefined()
    expect(settings.init).toBeUndefined()
    expect(settings.commands).toBeUndefined()
  })

  it('does not blanket-preapprove GitHub, git or package-manager command families', () => {
    const allow = loadSettings().permissions?.allow ?? []
    expect(allow).not.toContain('Bash(git *)')
    expect(allow).not.toContain('Bash(gh *)')
    expect(allow).not.toContain('Bash(npm *)')
    expect(allow).not.toContain('Bash(npx *)')
    expect(allow).not.toContain('Bash(pnpm *)')
  })

  it('keeps ordinary verification and read-only git/github flows preapproved', () => {
    const allow = loadSettings().permissions?.allow ?? []
    expect(allow).toEqual(expect.arrayContaining([
      'Read',
      'Write',
      'Edit',
      'Bash(git status:*)',
      'Bash(git diff:*)',
      'Bash(gh pr view:*)',
      'Bash(gh pr checks:*)',
      'Bash(pnpm run lint:*)',
      'Bash(pnpm run type-check:*)',
      'Bash(pnpm run test:*)',
      'Bash(pnpm run build:*)',
    ]))
  })

  it('has defence-in-depth deny rules for consequential GitHub and dependency actions', () => {
    const deny = loadSettings().permissions?.deny ?? []
    expect(deny).toEqual(expect.arrayContaining([
      'Bash(gh pr ready:*)',
      'Bash(gh pr merge:*)',
      'Bash(gh api:*)',
      'Bash(gh release:*)',
      'Bash(pnpm add:*)',
      'Bash(npm install:*)',
      'Bash(git reset --hard:*)',
    ]))
  })

  it('does not change the configured model as a side effect of permission hardening', () => {
    expect(loadSettings().model).toBe('claude-sonnet-5')
  })
})

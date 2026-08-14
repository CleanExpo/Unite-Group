import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function resolveWebRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i += 1) {
    if (existsSync(path.join(dir, '.claude')) && existsSync(path.join(dir, 'package.json'))) return dir
    dir = path.dirname(dir)
  }
  throw new Error('could not resolve apps/web root')
}

const HOOK = path.join(resolveWebRoot(), '.claude', 'hooks', 'scripts', 'pre-bash-validate.py')

function run(command: string) {
  return spawnSync('python3', [HOOK], {
    encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
  })
}

function expectBlocked(command: string) {
  const result = run(command)
  expect(result.status).toBe(2)
  expect(result.stderr).toContain('BLOCKED:')
}

function expectAllowed(command: string) {
  const result = run(command)
  expect(result.status).toBe(0)
  expect(result.stderr).not.toContain('BLOCKED:')
}

describe('Claude PreToolUse Bash authority gate', () => {
  it('blocks protected-branch and destructive git operations', () => {
    expectBlocked('git push origin main')
    expectBlocked('git push --force origin feature/test')
    expectBlocked('git push --force-with-lease origin feature/test')
    expectBlocked('git reset --hard HEAD~1')
    expectBlocked('git clean -fd')
    expectBlocked('git branch -D old-branch')
  })

  it('keeps normal branch engineering available', () => {
    expectAllowed('git status --short')
    expectAllowed('git diff --stat')
    expectAllowed('git checkout -b feature/test')
    expectAllowed('git commit -m "candidate"')
    expectAllowed('git push -u origin feature/test')
  })

  it('blocks GitHub progression and raw mutation side doors', () => {
    expectBlocked('gh pr ready 123')
    expectBlocked('gh pr merge 123 --squash')
    expectBlocked('gh pr review 123 --approve')
    expectBlocked('gh pr edit 123 --add-label ready')
    expectBlocked('gh api repos/CleanExpo/Unite-Group/pulls/123')
    expectBlocked('gh workflow run ci.yml')
    expectBlocked('gh release create v1.0.0')
  })

  it('allows only draft PR creation targeting main', () => {
    expectAllowed('gh pr create --draft --base main --title "candidate" --body "evidence"')
    expectAllowed('gh pr create --draft --base=main --title "candidate" --body "evidence"')
    expectBlocked('gh pr create --base main --title "candidate"')
    expectBlocked('gh pr create --draft --base feature-base --title "candidate"')
    expectBlocked('gh pr create --draft --base main --web')
  })

  it('blocks dependency declaration mutation but permits installing the current lockfile', () => {
    expectBlocked('pnpm add lodash')
    expectBlocked('pnpm update next')
    expectBlocked('npm install lodash')
    expectBlocked('yarn add lodash')
    expectAllowed('pnpm install --frozen-lockfile')
    expectAllowed('npm ci')
  })

  it('blocks production/external mutation commands', () => {
    expectBlocked('vercel deploy --prod')
    expectBlocked('supabase db push')
    expectBlocked('supabase functions deploy worker')
    expectBlocked('supabase secrets set API_KEY=value')
    expectBlocked('pnpm publish')
  })

  it('permits normal verification commands', () => {
    expectAllowed('pnpm run lint')
    expectAllowed('pnpm run type-check')
    expectAllowed('pnpm run test')
    expectAllowed('pnpm run build')
    expectAllowed('pnpm exec playwright test e2e/core-journeys.spec.ts')
  })

  it('fails closed on malformed hook input', () => {
    const result = spawnSync('python3', [HOOK], { encoding: 'utf8', input: '{broken-json' })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('BLOCKED: invalid PreToolUse input')
  })
})

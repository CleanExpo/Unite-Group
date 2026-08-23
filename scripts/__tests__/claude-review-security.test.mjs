// scripts/__tests__/claude-review-security.test.mjs
//
// Guards the two security properties of the Claude review job. Both existed and
// both worked; neither had a test that could fail when it was removed.
// Independent review planted each defect and observed all 12 tests in
// workflow-supply-chain.test.mjs still pass (exit 0), which under the gate's
// mutation rubric makes the unprotected control itself a P0.
//
// The job feeds attacker-controlled PR diff text to a model holding a
// repo-scoped GitHub App token, so these two lines are the whole boundary:
//
//   1. track_progress must not be set. At the pinned action SHA
//      (459ad358ae43fea66bfefd0a1f8d840b4b9791fb) src/modes/detector.ts forces
//      TAG mode for pull_request events when trackProgress is true, and tag mode
//      runs with acceptEdits plus git add/commit and the action's push wrapper
//      against the branch being reviewed. Setting it turns a reviewer into a
//      writer on the code it is reviewing.
//
//   2. --allowedTools must grant no write-capable tool beyond the PR-bound
//      inline-comment MCP tool. `gh pr comment` in particular accepts an
//      arbitrary PR number, --repo, --edit-last and --delete-last --yes, so it
//      is not scoped to the PR under review.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const WORKFLOW = join(process.cwd(), '.github', 'workflows', 'claude-code-review.yml')

/** Lines with comments stripped, so a comment mentioning a token never counts. */
async function activeLines() {
  const raw = await readFile(WORKFLOW, 'utf8')
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)#.*$/, ''))
    .filter((line) => line.trim().length > 0)
}

test('the review job does not enable track_progress', async () => {
  const lines = await activeLines()

  // Positive control: the file was found and has real content. Without this a
  // bad path would make every assertion below pass vacuously.
  assert.ok(lines.length > 10, 'workflow file not read')
  assert.ok(
    lines.some((l) => l.includes('claude-code-action@')),
    'expected the action invocation to be present',
  )

  const offenders = lines.filter((l) => /(^|\s)track_progress\s*:/.test(l))
  const enabled = offenders.filter((l) => !/track_progress\s*:\s*false\b/.test(l))

  assert.deepEqual(
    enabled,
    [],
    `track_progress forces tag mode at the pinned SHA, which grants edit/commit/push ` +
      `against the reviewed branch:\n${enabled.join('\n')}`,
  )
})

test('the review job grants no write-capable tool beyond the PR-bound comment tool', async () => {
  const lines = await activeLines()
  const allowLine = lines.find((l) => l.includes('--allowedTools'))
  assert.ok(allowLine, 'expected an --allowedTools declaration')

  const inner = /--allowedTools\s+"([^"]*)"/.exec(allowLine)
  assert.ok(inner, `could not parse the allowlist from: ${allowLine}`)

  const granted = inner[1]
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  // Exactly the reviewed-PR-bound write, plus read-only inspection.
  const PERMITTED = new Set([
    'mcp__github_inline_comment__create_inline_comment',
    'Bash(gh pr diff:*)',
    'Bash(gh pr view:*)',
  ])

  const unexpected = granted.filter((t) => !PERMITTED.has(t))
  assert.deepEqual(
    unexpected,
    [],
    `this job reads attacker-controlled diff text while holding a repo-scoped token, ` +
      `so any tool beyond the permitted set is a write primitive an injection can reach:\n` +
      `${unexpected.join('\n')}`,
  )

  // Named explicitly because it is the one that was removed and is the easiest
  // to re-add by habit: it is not scoped to the PR under review.
  assert.ok(
    !granted.some((t) => /gh pr comment/.test(t)),
    'gh pr comment accepts another PR number, --repo, --edit-last and --delete-last --yes',
  )
})

// scripts/__tests__/claude-review-security.test.mjs
//
// Guards the two security properties of the Claude review job. That job feeds
// attacker-controlled PR diff text to a model holding a repo-scoped GitHub App
// token, so these are the whole boundary:
//
//   1. track_progress must not be enabled. At the pinned action SHA
//      (459ad358ae43fea66bfefd0a1f8d840b4b9791fb) src/modes/detector.ts forces
//      TAG mode for pull_request events when trackProgress is true, and tag mode
//      runs with acceptEdits plus git add/commit and the action's push wrapper
//      against the branch under review — turning a reviewer into a writer on the
//      code it is reviewing.
//
//   2. The allowed-tools set must be exactly the PR-bound inline-comment MCP
//      tool plus two read-only gh commands. `gh pr comment` in particular takes
//      an arbitrary PR number, --repo, --edit-last and --delete-last --yes, so
//      it is not scoped to the PR under review.
//
// THIS FILE WAS TEXT-MATCHING AND WAS DEFEATED FOUR WAYS by independent review,
// every mutant leaving it green 2/2:
//   - `"track_progress": true` — a quoted key the unquoted regex never matched.
//   - a harmless `--allowedTools` decoy in the prompt, with the real
//     write-capable one later in claude_args (only the first line was read).
//   - a SECOND `--allowedTools` flag; the pinned action accumulates them.
//   - a duplicate `with:` block whose dangerous last value a YAML parser takes.
//   - removing the required inline-comment tool entirely: the check only looked
//     for unexpected tools, never missing ones, so the reviewer lost its only
//     way to report and nothing failed.
//
// So it now parses the workflow structurally and asserts set EQUALITY. Text
// matching a spelling is not a security control.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const WORKFLOWS = join(process.cwd(), '.github', 'workflows')
const REVIEW_WORKFLOW = join(WORKFLOWS, 'claude-code-review.yml')
const CLAUDE_ACTION = 'anthropics/claude-code-action'

/** Parse YAML to JSON via python3, which this repo's other guards already rely on. */
function parseYaml(path) {
  const out = execFileSync('python3', [
    '-c',
    'import sys,yaml,json; json.dump(yaml.safe_load(open(sys.argv[1])), sys.stdout)',
    path,
  ], { encoding: 'utf8' })
  return JSON.parse(out)
}

/** Every step across every job. */
function allSteps(doc) {
  const steps = []
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) steps.push(step)
  }
  return steps
}

/** Accumulate EVERY --allowedTools value, as the pinned action itself does. */
function allowedToolsFrom(claudeArgs) {
  const tools = []
  for (const m of String(claudeArgs ?? '').matchAll(/--allowedTools\s+"([^"]*)"/g)) {
    for (const t of m[1].split(',')) {
      const trimmed = t.trim()
      if (trimmed) tools.push(trimmed)
    }
  }
  return tools
}

const REQUIRED = [
  'mcp__github_inline_comment__create_inline_comment',
  'Bash(gh pr diff:*)',
  'Bash(gh pr view:*)',
]

test('exactly one pinned Claude review invocation exists', () => {
  const doc = parseYaml(REVIEW_WORKFLOW)
  const invocations = allSteps(doc).filter((s) => String(s?.uses ?? '').startsWith(CLAUDE_ACTION))

  // Positive control: the file parsed and the step is really there.
  assert.equal(invocations.length, 1, 'expected exactly one Claude review step')
  assert.match(String(invocations[0].uses), /@[a-f0-9]{40}$/, 'action must be pinned to a commit SHA')
})

test('the review job does not enable track_progress', () => {
  const doc = parseYaml(REVIEW_WORKFLOW)
  const step = allSteps(doc).find((s) => String(s?.uses ?? '').startsWith(CLAUDE_ACTION))
  assert.ok(step, 'Claude review step not found')

  // Structural: quoting, casing and duplicate `with:` blocks are all resolved by
  // the parser before this sees the value.
  const withBlock = step.with ?? {}
  const value = withBlock.track_progress
  const enabled = value !== undefined && value !== null &&
    String(value).trim().toLowerCase() !== 'false'

  assert.equal(
    enabled, false,
    `track_progress forces tag mode at the pinned SHA, granting edit/commit/push ` +
      `against the reviewed branch. Effective value: ${JSON.stringify(value)}`,
  )
})

test('no local composite action enables track_progress either', () => {
  const doc = parseYaml(REVIEW_WORKFLOW)
  const locals = allSteps(doc)
    .map((s) => String(s?.uses ?? ''))
    .filter((u) => u.startsWith('./'))

  for (const rel of locals) {
    for (const name of ['action.yml', 'action.yaml']) {
      const path = join(process.cwd(), rel.replace(/^\.\//, ''), name)
      let parsed
      try {
        parsed = parseYaml(path)
      } catch {
        continue
      }
      const nested = (parsed?.runs?.steps ?? [])
        .filter((s) => String(s?.uses ?? '').startsWith(CLAUDE_ACTION))
        .some((s) => {
          const v = (s.with ?? {}).track_progress
          return v !== undefined && v !== null && String(v).trim().toLowerCase() !== 'false'
        })
      assert.equal(nested, false, `local action ${rel} enables track_progress`)
    }
  }
})

test('the allowed-tools set is exactly the permitted three', () => {
  const doc = parseYaml(REVIEW_WORKFLOW)
  const step = allSteps(doc).find((s) => String(s?.uses ?? '').startsWith(CLAUDE_ACTION))
  assert.ok(step, 'Claude review step not found')

  // Only claude_args carries tool grants. A decoy in the prompt is not a grant,
  // and every --allowedTools occurrence here is accumulated by the action.
  const granted = allowedToolsFrom((step.with ?? {}).claude_args)

  const unexpected = granted.filter((t) => !REQUIRED.includes(t))
  const missing = REQUIRED.filter((t) => !granted.includes(t))

  assert.deepEqual(
    unexpected, [],
    `this job reads attacker-controlled diff text while holding a repo-scoped ` +
      `token, so any tool beyond the permitted set is a reachable write primitive:\n${unexpected.join('\n')}`,
  )

  // The other half, which was missing: dropping the inline-comment tool leaves
  // the reviewer unable to report at all, and the action only installs that MCP
  // server when the tool is present.
  assert.deepEqual(
    missing, [],
    `the review job cannot fulfil its reporting contract without:\n${missing.join('\n')}`,
  )
})

test('no other workflow invokes the Claude action unpinned', () => {
  const files = readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/i.test(f))
  assert.ok(files.length > 0, 'no workflows found')

  for (const file of files) {
    const raw = readFileSync(join(WORKFLOWS, file), 'utf8')
    if (!raw.includes(CLAUDE_ACTION)) continue
    const doc = parseYaml(join(WORKFLOWS, file))
    for (const step of allSteps(doc)) {
      const uses = String(step?.uses ?? '')
      if (!uses.startsWith(CLAUDE_ACTION)) continue
      assert.match(uses, /@[a-f0-9]{40}$/, `${file} invokes the Claude action unpinned: ${uses}`)
    }
  }
})

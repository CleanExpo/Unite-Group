// scripts/__tests__/claude-review-security.test.mjs
//
// Guards the Claude review job's security boundary. That job feeds
// attacker-controlled PR diff text to a model holding a repo-scoped GitHub App
// token, so two properties are the whole boundary:
//
//   1. track_progress must not be enabled. At the pinned action SHA
//      (459ad358ae43fea66bfefd0a1f8d840b4b9791fb) src/modes/detector.ts forces
//      TAG mode for pull_request events when trackProgress is true, and tag mode
//      runs with acceptEdits plus git add/commit and the action's push wrapper
//      against the branch under review — a reviewer able to write to the code it
//      is reviewing.
//
//   2. The allowed-tools set must be exactly the PR-bound inline-comment MCP
//      tool plus two read-only gh commands. `gh pr comment` takes an arbitrary
//      PR number, --repo, --edit-last and --delete-last --yes, so it is not
//      scoped to the PR under review.
//
// THIS FILE HAS BEEN DEFEATED REPEATEDLY. Every previous version was broken by
// independent review, each mutant leaving it green:
//   - text matching missed a quoted `"track_progress": true` key;
//   - it read only the FIRST --allowedTools occurrence, while the action
//     accumulates every one of them;
//   - it accepted only --allowedTools, while the action's parse-tools.ts
//     defines ALLOWED_TOOLS_FLAGS = {"allowedTools", "allowed-tools"};
//   - it checked for unexpected tools but never for MISSING required ones, so
//     deleting the inline-comment tool silently disarmed the reviewer;
//   - it counted one STATIC step, so a two-entry strategy.matrix executed the
//     Claude step twice unnoticed;
//   - its local-action walk was one level deep and checked only track_progress,
//     so a composite referencing a second composite escaped entirely;
//   - and the file was unregistered in package.json, so CI never ran it at all.
//
// It now builds the TRANSITIVE EXECUTION GRAPH — every workflow, matrix
// expansion, reusable workflow and nested composite — and applies the full
// policy to every reachable Claude step.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = process.cwd()
const WORKFLOWS = join(ROOT, '.github', 'workflows')
const CLAUDE_ACTION = 'anthropics/claude-code-action'
const REVIEW_WORKFLOW = 'claude-code-review.yml'

const REQUIRED_TOOLS = [
  'mcp__github_inline_comment__create_inline_comment',
  'Bash(gh pr diff:*)',
  'Bash(gh pr view:*)',
]

/** Parse YAML via python3 — this repo has no js-yaml, and other guards use it. */
function parseYaml(path) {
  const out = execFileSync('python3', [
    '-c',
    'import sys,yaml,json; json.dump(yaml.safe_load(open(sys.argv[1])), sys.stdout, default=str)',
    path,
  ], { encoding: 'utf8' })
  return JSON.parse(out)
}

/**
 * How many times a job's steps actually execute.
 *
 * A two-entry strategy.matrix runs every step twice, so counting static steps
 * undercounts real invocations — which is how a matrix previously doubled the
 * Claude step unnoticed. Counted conservatively: never lower than reality.
 */
function executionCount(job) {
  const matrix = job?.strategy?.matrix
  if (!matrix || typeof matrix !== 'object') return 1

  const axes = Object.entries(matrix).filter(([k]) => k !== 'include' && k !== 'exclude')
  const include = Array.isArray(matrix.include) ? matrix.include.length : 0
  const exclude = Array.isArray(matrix.exclude) ? matrix.exclude.length : 0

  let combos = axes.reduce(
    (n, [, v]) => n * (Array.isArray(v) ? Math.max(v.length, 1) : 1),
    1,
  )
  combos = axes.length === 0
    ? (include > 0 ? include : 1)
    : Math.max(combos - exclude, 0) + include

  return Math.max(combos, 1)
}

/** Accumulate EVERY allowed-tools value, in both spellings the action accepts. */
function allowedToolsFrom(claudeArgs) {
  const tools = []
  const text = Array.isArray(claudeArgs) ? claudeArgs.join(' ') : String(claudeArgs ?? '')
  for (const m of text.matchAll(/--allowed[-_]?[Tt]ools\s+"([^"]*)"/g)) {
    for (const t of m[1].split(',')) {
      const trimmed = t.trim()
      if (trimmed) tools.push(trimmed)
    }
  }
  return tools
}

function isClaudeStep(step) {
  return String(step?.uses ?? '').trim().startsWith(CLAUDE_ACTION)
}

/** Resolve a `uses: ./path` step to its action file and recurse. */
function followLocal(step, multiplier, seen, trail) {
  const uses = String(step?.uses ?? '')
  if (!uses.startsWith('./')) return []
  const dir = join(ROOT, uses.replace(/^\.\//, ''))
  const out = []
  for (const name of ['action.yml', 'action.yaml']) {
    out.push(...collectClaudeSteps(join(dir, name), multiplier, seen, trail))
  }
  return out
}

/**
 * Walk the transitive execution graph and return every reachable Claude step,
 * with how many times it executes and the path that reached it.
 *
 * Follows job-level `uses:` (reusable workflows) and step-level `uses: ./...`
 * (local composites) to arbitrary depth. `seen` breaks reference cycles.
 */
function collectClaudeSteps(path, multiplier = 1, seen = new Set(), trail = []) {
  const key = resolve(path)
  if (seen.has(key) || !existsSync(key)) return []
  seen.add(key)

  let doc
  try {
    doc = parseYaml(key)
  } catch {
    return []
  }

  const found = []
  const here = [...trail, key.replace(`${ROOT}/`, '')]

  // Composite action shape.
  for (const step of doc?.runs?.steps ?? []) {
    if (isClaudeStep(step)) found.push({ step, executions: multiplier, trail: here })
    found.push(...followLocal(step, multiplier, seen, here))
  }

  // Workflow shape.
  for (const job of Object.values(doc?.jobs ?? {})) {
    const runs = multiplier * executionCount(job)

    const jobUses = String(job?.uses ?? '')
    if (jobUses.startsWith('./')) {
      found.push(...collectClaudeSteps(join(ROOT, jobUses.replace(/^\.\//, '')), runs, seen, here))
    }

    for (const step of job?.steps ?? []) {
      if (isClaudeStep(step)) found.push({ step, executions: runs, trail: here })
      found.push(...followLocal(step, runs, seen, here))
    }
  }

  return found
}

/** Every Claude step reachable from any workflow in the repo. */
function allReachableClaudeSteps() {
  const seen = new Set()
  const found = []
  for (const file of readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/i.test(f))) {
    found.push(...collectClaudeSteps(join(WORKFLOWS, file), 1, seen, []))
  }
  return found
}

test('the graph walker finds the review invocation (positive control)', () => {
  const steps = collectClaudeSteps(join(WORKFLOWS, REVIEW_WORKFLOW))
  assert.ok(
    steps.length > 0,
    'walker found no Claude step — every assertion below would pass vacuously',
  )
})

test('the review workflow executes the Claude action exactly once', () => {
  const steps = collectClaudeSteps(join(WORKFLOWS, REVIEW_WORKFLOW))
  const total = steps.reduce((n, s) => n + s.executions, 0)
  assert.equal(
    total, 1,
    `expected one effective Claude invocation, found ${total} — matrix expansion ` +
      `and composites are counted: ${steps.map((s) => s.trail.join(' -> ')).join(', ')}`,
  )
})

test('every reachable Claude step is pinned to a commit SHA', () => {
  const steps = allReachableClaudeSteps()
  assert.ok(steps.length > 0, 'no Claude steps found anywhere')
  for (const { step, trail } of steps) {
    assert.match(
      String(step.uses).trim(), /@[a-f0-9]{40}$/,
      `unpinned Claude action via ${trail.join(' -> ')}: ${step.uses}`,
    )
  }
})

test('no reachable Claude step enables track_progress', () => {
  for (const { step, trail } of allReachableClaudeSteps()) {
    const value = (step.with ?? {}).track_progress
    const enabled = value !== undefined && value !== null &&
      String(value).trim().toLowerCase() !== 'false'
    assert.equal(
      enabled, false,
      `track_progress forces tag mode at the pinned SHA, granting edit/commit/push ` +
        `against the reviewed branch. Reached via ${trail.join(' -> ')}, ` +
        `value ${JSON.stringify(value)}`,
    )
  }
})

test('every reachable Claude step grants exactly the permitted tools', () => {
  for (const { step, trail } of allReachableClaudeSteps()) {
    const granted = allowedToolsFrom((step.with ?? {}).claude_args)

    // A step declaring NO tools does not inherit something harmless. At the
    // pinned SHA, create-prompt/index.ts starts from
    // BASE_ALLOWED_TOOLS = ["Glob","Grep","LS","Read"] and then pushes
    // "Bash(git add:*)", "Bash(git commit:*)", "Bash(git rm:*)" and the push
    // wrapper. So an undeclared step inherits WRITE capability.
    //
    // An earlier version of this guard skipped such steps, reasoning they
    // "inherit the defaults" — which was true and precisely the problem. The
    // review workflow must declare its tools explicitly; the @claude-mention
    // workflow is allowed to omit them because it is gated on a human writing
    // @claude rather than on arbitrary PR content, so it is exempted BY NAME
    // rather than by the shape of its configuration.
    const MENTION_GATED = ['claude.yml']
    const fromMentionWorkflow = trail.some((t) =>
      MENTION_GATED.some((name) => t.endsWith(name)))

    if (granted.length === 0) {
      assert.ok(
        fromMentionWorkflow,
        `reachable via ${trail.join(' -> ')}: this step declares no claude_args ` +
          `tools, so at the pinned SHA it inherits git add/commit/rm and the push ` +
          `wrapper. A job that ingests attacker-controlled diff text must declare ` +
          `its tool set explicitly.`,
      )
      continue
    }

    const unexpected = granted.filter((t) => !REQUIRED_TOOLS.includes(t))
    const missing = REQUIRED_TOOLS.filter((t) => !granted.includes(t))

    assert.deepEqual(
      unexpected, [],
      `reachable via ${trail.join(' -> ')}: this job reads attacker-controlled diff ` +
        `text while holding a repo-scoped token, so any tool beyond the permitted set ` +
        `is a write primitive an injection can reach:\n${unexpected.join('\n')}`,
    )
    assert.deepEqual(
      missing, [],
      `reachable via ${trail.join(' -> ')}: the reviewer cannot fulfil its reporting ` +
        `contract without:\n${missing.join('\n')}`,
    )
  }
})

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
//   - the file was unregistered in package.json, so CI never ran it at all;
//   - it matched only DOUBLE-quoted tool values, while the action tokenises with
//     shell-quote and accepts single-quoted, unquoted and multiple consecutive
//     values — so `--allowedTools 'Bash(gh pr comment:*)'` was granted and
//     ignored;
//   - its `seen` set treated the execution graph as a set, so one composite
//     referenced TWICE from the same workflow counted once;
//   - its matrix arithmetic subtracted every exclude entry whether or not it
//     matched a real combination, and added every include entry whether or not
//     it merely extended one;
//   - and its default-tools exemption was attached to a FILENAME, so a second,
//     ungated, contents:write job added to that same file inherited the
//     action's write-capable defaults unchallenged.
//
// It now builds the TRANSITIVE EXECUTION GRAPH — every workflow, matrix
// expansion, reusable workflow and nested composite — tokenises claude_args the
// way the action does, and decides the default-tools exemption from the
// containing job's actual trigger gate and permissions rather than its filename.

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
 * Expand a strategy.matrix the way GitHub does, and return the job count.
 *
 * The previous arithmetic was `combos - exclude.length + include.length`, which
 * is wrong in both directions and was broken with a mutant of each kind:
 *   - an exclude entry matching NO generated combination still subtracted one,
 *     so two real jobs were reported as one;
 *   - an include entry that merely EXTENDS an existing combination with a new
 *     key still added one, so one real job was reported as two.
 *
 * So combinations are materialised, exclusions applied only where they match,
 * and an include entry counted as a new job only when it does not extend an
 * existing combination.
 */
export function matrixJobCount(matrix) {
  if (!matrix || typeof matrix !== 'object') return 1

  const axes = Object.entries(matrix).filter(([k]) => k !== 'include' && k !== 'exclude')
  const include = Array.isArray(matrix.include) ? matrix.include : []
  const exclude = Array.isArray(matrix.exclude) ? matrix.exclude : []

  let combos = axes.length === 0 ? [] : [{}]
  for (const [k, v] of axes) {
    const values = Array.isArray(v) ? v : [v]
    const next = []
    for (const combo of combos) {
      for (const value of values) next.push({ ...combo, [k]: value })
    }
    combos = next
  }

  // GitHub matches exclude/include filters partially: every key the filter names
  // must equal the combination's value for that key.
  const matches = (combo, filter) =>
    Object.entries(filter).every(([k, v]) => String(combo[k]) === String(v))

  const kept = combos.filter((combo) => !exclude.some((e) => matches(combo, e)))

  const axisKeys = new Set(axes.map(([k]) => k))
  let added = 0
  for (const entry of include) {
    if (!entry || typeof entry !== 'object') { added += 1; continue }
    const overlap = Object.fromEntries(
      Object.entries(entry).filter(([k]) => axisKeys.has(k)),
    )
    // An entry that names no axis key, or names one that matches nothing,
    // creates a job. One that matches an existing combination only extends it.
    const extendsExisting =
      Object.keys(overlap).length > 0 && kept.some((combo) => matches(combo, overlap))
    if (!extendsExisting) added += 1
  }

  return Math.max(kept.length + added, 1)
}

function executionCount(job) {
  return matrixJobCount(job?.strategy?.matrix)
}

/**
 * Tokenise a claude_args string the way the pinned action does.
 *
 * The action parses with shell-quote, so single quotes, double quotes and bare
 * words are all valid value forms. The previous regex accepted only
 * double-quoted values, and independent review appended
 * `--allowedTools 'Bash(gh pr comment:*)'` — granted by the action, invisible
 * to the guard.
 */
export function tokenizeArgs(text) {
  const tokens = []
  let current = ''
  let started = false
  let quote = null

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) { quote = null; continue }
      current += ch
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; continue }
    if (/\s/.test(ch)) {
      if (started) { tokens.push(current); current = ''; started = false }
      continue
    }
    current += ch
    started = true
  }
  if (started) tokens.push(current)
  return tokens
}

const ALLOWED_TOOLS_FLAGS = new Set(['--allowedTools', '--allowed-tools'])

/**
 * Accumulate EVERY allowed-tools value, in every form the action accepts:
 * both flag spellings, `--flag=value`, and multiple consecutive values after
 * one flag.
 */
export function allowedToolsFrom(claudeArgs) {
  const text = Array.isArray(claudeArgs) ? claudeArgs.join(' ') : String(claudeArgs ?? '')
  const tokens = tokenizeArgs(text)
  const tools = []

  const push = (value) => {
    for (const part of String(value).split(',')) {
      const trimmed = part.trim()
      if (trimmed) tools.push(trimmed)
    }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    const eq = token.indexOf('=')
    if (eq > 0 && ALLOWED_TOOLS_FLAGS.has(token.slice(0, eq))) {
      push(token.slice(eq + 1))
      continue
    }
    if (!ALLOWED_TOOLS_FLAGS.has(token)) continue
    // The action consumes every following value until the next flag.
    for (let j = i + 1; j < tokens.length && !tokens[j].startsWith('--'); j += 1) {
      push(tokens[j])
      i = j
    }
  }
  return tools
}

function isClaudeStep(step) {
  return String(step?.uses ?? '').trim().startsWith(CLAUDE_ACTION)
}

/** Resolve a `uses: ./path` step to its action file and recurse. */
function followLocal(step, multiplier, stack, trail, jobCtx) {
  const uses = String(step?.uses ?? '')
  if (!uses.startsWith('./')) return []
  const dir = join(ROOT, uses.replace(/^\.\//, ''))
  const out = []
  for (const name of ['action.yml', 'action.yaml']) {
    out.push(...collectClaudeSteps(join(dir, name), multiplier, stack, trail, jobCtx))
  }
  return out
}

/**
 * Walk the transitive execution graph and return every reachable Claude step,
 * with how many times it executes, the path that reached it, and the job whose
 * trigger gate and permissions govern it.
 *
 * Cycle prevention uses the CURRENT RECURSION STACK, not a global visited set.
 * Workflow execution is a multiset: independent review moved the reviewer into
 * one local composite and referenced that same composite twice, so GitHub ran
 * two invocations while a global `seen` discarded the second.
 */
function collectClaudeSteps(path, multiplier = 1, stack = [], trail = [], jobCtx = null) {
  const key = resolve(path)
  if (stack.includes(key) || !existsSync(key)) return []
  const nextStack = [...stack, key]

  let doc
  try {
    doc = parseYaml(key)
  } catch {
    return []
  }

  const found = []
  const here = [...trail, key.replace(`${ROOT}/`, '')]

  // Composite action shape — the caller's job context still governs.
  for (const step of doc?.runs?.steps ?? []) {
    if (isClaudeStep(step)) found.push({ step, executions: multiplier, trail: here, jobCtx })
    found.push(...followLocal(step, multiplier, nextStack, here, jobCtx))
  }

  // Workflow shape.
  for (const [jobName, job] of Object.entries(doc?.jobs ?? {})) {
    const runs = multiplier * executionCount(job)
    const ctx = { jobName, job, workflow: doc, workflowPath: here[here.length - 1] }

    const jobUses = String(job?.uses ?? '')
    if (jobUses.startsWith('./')) {
      found.push(...collectClaudeSteps(
        join(ROOT, jobUses.replace(/^\.\//, '')), runs, nextStack, here, ctx))
    }

    for (const step of job?.steps ?? []) {
      if (isClaudeStep(step)) found.push({ step, executions: runs, trail: here, jobCtx: ctx })
      found.push(...followLocal(step, runs, nextStack, here, ctx))
    }
  }

  return found
}

/** Every Claude step reachable from any workflow in the repo. */
function allReachableClaudeSteps() {
  const found = []
  for (const file of readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/i.test(f))) {
    found.push(...collectClaudeSteps(join(WORKFLOWS, file), 1, [], [], null))
  }
  return found
}

/**
 * Does this `if:` condition actually make a human mention control execution?
 *
 * Round 5 broke the previous version, which asked only whether the condition
 * lexically contained `contains(` and `@claude`. That is satisfied by
 * `if: ${{ contains('@claude', '@claude') }}` — a tautology. A job carrying it
 * runs on every triggering event while reading as mention-gated, and an
 * undeclared-tools step inside it inherits the action's git add/commit/rm and
 * push wrapper. Planted, the readiness gate passed 439/439, exit 0.
 *
 * The property that actually matters is not "the text @claude appears" but
 * "execution depends on attacker-visible-but-human-authored event text". So the
 * FIRST argument of the contains() call must be a `github.event.*` reference —
 * the body or title a person typed — and the second must be the literal
 * '@claude'. Two literals is a tautology; a `github.event.*` needle with a
 * literal haystack is backwards and equally inert.
 */
export function mentionGate(condition) {
  const text = String(condition ?? '').replace(/\$\{\{|\}\}/g, ' ')
  if (!text.trim()) return { gated: false, reason: 'has no `if:` condition at all' }

  // EVERY disjunct must require a mention, not merely some of them.
  //
  // Round 6 broke the previous version, and worse, it broke an assertion I had
  // written on purpose: I claimed a tautology sitting ALONGSIDE a real gate was
  // still gated, "because the real one is what governs". That is backwards.
  // `contains('@claude','@claude') || contains(github.event.review.body,'@claude')`
  // is true unconditionally — the tautology DOMINATES, and the job runs on every
  // triggering event while the guard called it mention-gated. The bypass was
  // encoded as a positive test, which is the most durable way to hide one.
  //
  // So the condition is split at top-level `||` and each branch must
  // independently require the mention. An `&&` inside a branch is fine: every
  // conjunct has to hold, so a mention check anywhere in the branch is required.
  const branches = splitTopLevel(text, '||')

  const ungated = branches.filter((branch) => !requiresMention(branch))
  if (ungated.length > 0) {
    return {
      gated: false,
      reason:
        'has an `if:` branch that does not require a human-authored @claude ' +
        `mention (${ungated[0].trim().slice(0, 80)}) — with \`||\`, one branch that ` +
        'can be true without a mention makes the whole condition unconditional, ' +
        "so a tautology such as contains('@claude', '@claude') reads as a mention " +
        'gate while the job runs on every triggering event',
    }
  }

  return { gated: true, reason: 'every branch requires human-authored mention text' }
}

/** Split on an operator at paren depth 0, so nested calls stay intact. */
function splitTopLevel(text, operator) {
  const parts = []
  let depth = 0
  let current = ''
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (depth === 0 && text.startsWith(operator, i)) {
      parts.push(current)
      current = ''
      i += operator.length - 1
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts.filter((p) => p.trim())
}

// Fields a human writes. `github.event.repository.name` and friends are NOT here
// on purpose: they are attacker-influenceable or constant, not authored by the
// person requesting the run.
const HUMAN_TEXT =
  /^github\.event\.(comment\.body|review\.body|issue\.body|issue\.title|pull_request\.body|pull_request\.title)$/

function requiresMention(branch) {
  for (const m of branch.matchAll(/(!?)\s*contains\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g)) {
    const [, negated, haystack, needle] = m
    if (negated) continue   // `!contains(...)` requires the mention to be ABSENT
    const subject = haystack.trim()
    const literal = needle.trim().replace(/^['"]|['"]$/g, '')
    if (HUMAN_TEXT.test(subject) && literal === '@claude') return true
  }
  return false
}

/**
 * May this step omit its tool declaration?
 *
 * Only when the job that runs it is genuinely gated on a human typing @claude
 * AND cannot write to the repository. The previous version exempted by
 * FILENAME, and independent review added a second job to that same file with no
 * `if:` condition and `contents: write` — reachable by opening any issue, and
 * inheriting the action's write-capable defaults, while the guard stayed green.
 */
export function defaultToolsExemption(jobCtx) {
  const job = jobCtx?.job
  if (!job) return { exempt: false, reason: 'no containing job could be resolved' }

  const condition = String(job.if ?? '')
  const gate = mentionGate(condition)
  if (!gate.gated) {
    return {
      exempt: false,
      reason: `job "${jobCtx.jobName}" ${gate.reason}, so it is reachable from ` +
        `unattended events`,
    }
  }

  // Unset permissions inherit the workflow default, then the repository default,
  // which may be write. Only an explicit read/none is evidence of anything.
  const permissions = job.permissions ?? jobCtx?.workflow?.permissions
  if (!permissions || typeof permissions !== 'object') {
    return {
      exempt: false,
      reason: `job "${jobCtx.jobName}" declares no explicit permissions, so it ` +
        `inherits the repository default, which may include contents: write`,
    }
  }
  const contents = String(permissions.contents ?? '').trim()
  if (contents !== 'read' && contents !== 'none') {
    return {
      exempt: false,
      reason: `job "${jobCtx.jobName}" grants contents: ${contents || '<unset>'}`,
    }
  }

  return { exempt: true, reason: 'mention-gated and read-only' }
}

test('mentionGate rejects a tautological gate and accepts a real one', () => {
  // Round 5's evasion: two literals. Reads as a mention gate, runs on every event.
  assert.equal(mentionGate("${{ contains('@claude', '@claude') }}").gated, false)
  // Backwards — literal haystack, event needle — is equally inert.
  assert.equal(mentionGate("${{ contains('@claude', github.event.comment.body) }}").gated, false)
  // A field a human does not author is not a mention.
  assert.equal(mentionGate("${{ contains(github.event.repository.name, '@claude') }}").gated, false)
  assert.equal(mentionGate('').gated, false)
  assert.equal(mentionGate("${{ github.actor == 'phill' }}").gated, false)

  // Positive control: the shape the real workflow uses must still pass, or this
  // check is just a way of failing everything.
  assert.equal(mentionGate("contains(github.event.comment.body, '@claude')").gated, true)
  assert.equal(mentionGate("contains(github.event.issue.title, '@claude')").gated, true)

  // ROUND 6, P0 — and this assertion used to say `true`, with a comment claiming
  // "the real one is what governs". It does not. `A || B` with an always-true A
  // is true unconditionally; the tautology DOMINATES and the job runs on every
  // triggering event. Encoding the bypass as a positive assertion is the most
  // durable way to hide one, because every later reader takes it as settled.
  assert.equal(
    mentionGate("contains('@claude','@claude') || contains(github.event.review.body, '@claude')").gated,
    false,
  )
  // Any ungated branch does it, not just a tautology.
  assert.equal(
    mentionGate("github.actor == 'dependabot[bot]' || contains(github.event.comment.body, '@claude')").gated,
    false,
  )
  // A negated mention check requires the mention to be ABSENT, so it gates nothing.
  assert.equal(mentionGate("!contains(github.event.comment.body, '@claude')").gated, false)

  // Positive control: the real workflow's shape is a chain of disjuncts where
  // EVERY branch carries its own mention check, and it must still pass.
  assert.equal(
    mentionGate(
      "(github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||\n" +
      "(github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||\n" +
      "(github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude')))",
    ).gated,
    true,
  )
})

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
  for (const { step, trail, jobCtx } of allReachableClaudeSteps()) {
    const granted = allowedToolsFrom((step.with ?? {}).claude_args)

    // A step declaring NO tools does not inherit something harmless. At the
    // pinned SHA, create-prompt/index.ts starts from
    // BASE_ALLOWED_TOOLS = ["Glob","Grep","LS","Read"] and then pushes
    // "Bash(git add:*)", "Bash(git commit:*)", "Bash(git rm:*)" and the push
    // wrapper. So an undeclared step inherits WRITE capability.
    if (granted.length === 0) {
      const { exempt, reason } = defaultToolsExemption(jobCtx)
      assert.ok(
        exempt,
        `reachable via ${trail.join(' -> ')}: this step declares no claude_args ` +
          `tools, so at the pinned SHA it inherits git add/commit/rm and the push ` +
          `wrapper. It is not exempt because ${reason}.`,
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

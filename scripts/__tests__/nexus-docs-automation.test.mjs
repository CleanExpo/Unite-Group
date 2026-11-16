/**
 * The weekly docs automation keeps the proposal for every fetched page when some pages fail to fetch, and still
 * turns the run red at the end.
 *
 * WHY. The collection step used to stop the whole job on any watcher exit other than 0. One vendor page that did not
 * load (exit 1 or 2) skipped the review and the proposal for the other 35 pages.
 *
 * HOW. The whole workflow is compared byte for byte with the approved text below, so any edit is a visible, reviewed
 * change to this file. Then the real run blocks of the two steps this change owns are cut out of that text and run
 * in bash, with a stand-in watcher that writes a report and exits as told:
 * - the collection step keeps going on exit 0, 1 or 2 when this run wrote a report that gives the same exit code,
 *   and stops on anything else (no report, a stale report, an exit above 2, an exit the report does not explain);
 * - the last step turns the run red when any page failed, which also fires "Notify Telegram on failure".
 * The step order and the keys of the two owned steps are checked against an allow-list, because a step-level
 * `if:` or `continue-on-error:` would change what the run blocks mean.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const WORKFLOW = new URL('../../.github/workflows/nexus-official-docs-automation.yml', import.meta.url)
const COLLECT = 'Read-only collection of official-source evidence and content'
const FINAL = 'Turn the run red when an official source could not be fetched'
const WATCH_DIR = '.artifacts/nexus-official-docs'

const APPROVED_AUTOMATION_WORKFLOW = [
  "name: Nexus official-docs automation",
  "",
  "# Weekly read-only collection of official vendor documentation, deterministic",
  "# review, and an automated pull request proposing vendor-intelligence updates.",
  "# It never mutates `main`: proposals land on an isolated branch as a PR that a",
  "# human reviews and merges. Telegram notification uses owner-set repository",
  "# secrets referenced by name only — no secret value ever appears in this file.",
  "",
  "on:",
  "  schedule:",
  "    # 03:17 Sunday Australia/Brisbane (AEST, UTC+10; no daylight saving).",
  "    # Offset one hour after the read-only weekly evidence workflow.",
  "    - cron: '17 17 * * 6'",
  "  workflow_dispatch:",
  "",
  "# Elevated only to push an isolated branch and open a PR; `main` is never a target.",
  "permissions:",
  "  contents: write",
  "  pull-requests: write",
  "",
  "concurrency:",
  "  group: nexus-official-docs-automation",
  "  cancel-in-progress: false",
  "",
  "env:",
  "  AUTOMATION_BRANCH: automation/nexus-docs-intelligence",
  "  REVIEW_DIR: .artifacts/nexus-docs-review",
  "  WATCH_DIR: .artifacts/nexus-official-docs",
  "  CONTENT_DIR: content",
  "  SNAPSHOT_DIR: docs/vendor-intelligence/.snapshots",
  "",
  "jobs:",
  "  propose:",
  "    name: Collect, review and propose vendor-intelligence updates",
  "    runs-on: ubuntu-latest",
  "    timeout-minutes: 15",
  "    steps:",
  "      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1",
  "",
  "      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0",
  "        with:",
  "          node-version: '24'",
  "",
  "      - name: Test the watcher and review layer without external requests",
  "        run: |",
  "          npm run verify:docs-watch",
  "          npm run verify:docs-review",
  "",
  "      - name: Read-only collection of official-source evidence and content",
  "        id: collect",
  "        run: |",
  "          # The watcher exits 0 when every source was fetched, 1 when a non-critical source failed and 2 when a",
  "          # critical source failed. Failed pages must not stop the proposal for the pages that were fetched, so this",
  "          # step keeps going on those, and the last step turns the run red. Anything else stops the run here: no",
  "          # report from this run, an exit above 2, or an exit the report does not give (a crash). The watcher writes",
  "          # report.json last, so a report on disk means it finished.",
  "          # scripts/__tests__/nexus-docs-automation.test.mjs runs this block.",
  "          rm -f \"${WATCH_DIR}/report.json\"",
  "          set +e",
  "          node scripts/nexus-docs-watch.mjs \\",
  "            --root . \\",
  "            --config config/nexus-official-sources.json \\",
  "            --baseline config/nexus-official-sources.baseline.json \\",
  "            --write \"${WATCH_DIR}\" \\",
  "            --write-content \"${CONTENT_DIR}\"",
  "          code=$?",
  "          set -e",
  "          if [ ! -f \"${WATCH_DIR}/report.json\" ]; then",
  "            echo \"::error::The watcher exited ${code} without writing this run's report.\"",
  "            exit 1",
  "          fi",
  "          reported=$(node -p \"require('./${WATCH_DIR}/report.json').gates.exitCode\")",
  "          if [ \"${code}\" != \"${reported}\" ] || [ \"${code}\" -gt 2 ]; then",
  "            echo \"::error::The watcher exited ${code}, but its report gives ${reported}.\"",
  "            exit 1",
  "          fi",
  "          failed_count=$(node -p \"require('./${WATCH_DIR}/report.json').gates.monitorFailures.length\")",
  "          failed_ids=$(node -p \"require('./${WATCH_DIR}/report.json').gates.monitorFailures.join(' ')\")",
  "          echo \"failed_count=${failed_count}\" >> \"$GITHUB_OUTPUT\"",
  "          echo \"failed_ids=${failed_ids}\" >> \"$GITHUB_OUTPUT\"",
  "",
  "      - name: Deterministic review (no network, no baseline overwrite)",
  "        id: review",
  "        run: |",
  "          set +e",
  "          node scripts/nexus-docs-review.mjs \\",
  "            --root . \\",
  "            --report \"${WATCH_DIR}/report.json\" \\",
  "            --classification config/nexus-docs-classification.json \\",
  "            --content \"${CONTENT_DIR}\" \\",
  "            --snapshots \"${SNAPSHOT_DIR}\" \\",
  "            --write \"${REVIEW_DIR}\"",
  "          echo \"exit_code=$?\" >> \"$GITHUB_OUTPUT\"",
  "          material=$(node -e \"process.stdout.write(String(require('./${REVIEW_DIR}/review.json').summary.materialChanges))\")",
  "          echo \"material=${material}\" >> \"$GITHUB_OUTPUT\"",
  "",
  "      - name: Upload deterministic evidence",
  "        if: always()",
  "        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2",
  "        with:",
  "          name: nexus-docs-automation-${{ github.run_id }}",
  "          path: |",
  "            .artifacts/nexus-official-docs/",
  "            .artifacts/nexus-docs-review/",
  "          if-no-files-found: warn",
  "          retention-days: 30",
  "",
  "      - name: Open or update the proposal pull request",
  "        id: pr",
  "        if: steps.review.outputs.material != '0'",
  "        env:",
  "          GH_TOKEN: ${{ github.token }}",
  "        run: |",
  "          set -euo pipefail",
  "          git config user.name 'nexus-docs-bot'",
  "          git config user.email 'nexus-docs-bot@users.noreply.github.com'",
  "",
  "          # Register + fetch any existing remote branch so --force-with-lease below",
  "          # has a real tracked remote-tracking ref to compare against. checkout only",
  "          # fetched main (single-branch); a plain `git fetch origin <branch>` alone",
  "          # writes FETCH_HEAD but does not register the ref as a tracked remote",
  "          # branch under this single-branch clone's restricted fetch refspec, and",
  "          # --force-with-lease silently ignores an untracked ref (verified empirically).",
  "          git remote set-branches --add origin \"${AUTOMATION_BRANCH}\"",
  "          git fetch origin \"${AUTOMATION_BRANCH}\" || true",
  "",
  "          # Refresh the proposed snapshot baseline and stage the review report.",
  "          mkdir -p \"${SNAPSHOT_DIR}\"",
  "          cp -f \"${CONTENT_DIR}\"/*.txt \"${SNAPSHOT_DIR}/\" 2>/dev/null || true",
  "          cp -f \"${REVIEW_DIR}/review.md\" docs/vendor-intelligence/REVIEW.md",
  "",
  "          git checkout -B \"${AUTOMATION_BRANCH}\"",
  "          git add \"${SNAPSHOT_DIR}\" docs/vendor-intelligence/REVIEW.md",
  "          if git diff --cached --quiet; then",
  "            echo \"No snapshot changes to propose.\"",
  "            echo \"created=false\" >> \"$GITHUB_OUTPUT\"",
  "            exit 0",
  "          fi",
  "",
  "          material=\"${{ steps.review.outputs.material }}\"",
  "          # The repo's commit-messages CI job needs a Linear ref on the subject and a",
  "          # Gate: line in the body. UNI-3431 is the standing ticket for these proposals.",
  "          # The Gate: paragraph names only what ran here; no review is claimed.",
  "          # scripts/__tests__/nexus-docs-proposal-commit.test.mjs runs these exact lines.",
  "          git commit -F - <<COMMIT_MSG",
  "          chore(nexus-docs): propose vendor-intelligence updates (${material} material) (UNI-3431)",
  "",
  "          Refreshes docs/vendor-intelligence/.snapshots and",
  "          docs/vendor-intelligence/REVIEW.md from this week's official-docs run.",
  "",
  "          What cannot happen after this merge: the committed vendor-intelligence",
  "          snapshots lag the official documentation this run fetched and classified.",
  "",
  "          Gate: automated only. nexus-docs-watch fetched and fingerprinted the",
  "          official sources, and nexus-docs-review classified ${material} material",
  "          change(s) against the committed snapshots. No human or model review has",
  "          run on this commit; a human reviews this pull request before merge.",
  "          Run: ${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}",
  "          COMMIT_MSG",
  "          git push --force-with-lease origin \"${AUTOMATION_BRANCH}\"",
  "",
  "          # Dedup: reuse an existing open PR for this branch instead of opening another.",
  "          existing=$(gh pr list --head \"${AUTOMATION_BRANCH}\" --state open --json number --jq '.[0].number' || true)",
  "          body=\"Automated weekly vendor-intelligence review proposes ${material} material documentation change(s).\\n\\nReview the snapshot diffs under \\`${SNAPSHOT_DIR}\\` and \\`docs/vendor-intelligence/REVIEW.md\\`. This PR never mutates \\`main\\`; merge only after human review.\"",
  "          if [ -n \"${existing}\" ]; then",
  "            gh pr edit \"${existing}\" --body \"$(printf '%b' \"${body}\")\"",
  "            url=$(gh pr view \"${existing}\" --json url --jq '.url')",
  "          else",
  "            url=$(gh pr create \\",
  "              --base main \\",
  "              --head \"${AUTOMATION_BRANCH}\" \\",
  "              --title \"chore(nexus-docs): weekly vendor-intelligence proposals\" \\",
  "              --body \"$(printf '%b' \"${body}\")\")",
  "          fi",
  "          echo \"created=true\" >> \"$GITHUB_OUTPUT\"",
  "          echo \"url=${url}\" >> \"$GITHUB_OUTPUT\"",
  "",
  "      - name: Notify Telegram (summary and PR link only)",
  "        if: steps.pr.outputs.created == 'true'",
  "        env:",
  "          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}",
  "          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}",
  "          PR_URL: ${{ steps.pr.outputs.url }}",
  "          MATERIAL: ${{ steps.review.outputs.material }}",
  "        run: |",
  "          set -euo pipefail",
  "          if [ -z \"${TELEGRAM_BOT_TOKEN}\" ] || [ -z \"${TELEGRAM_CHAT_ID}\" ]; then",
  "            echo \"Telegram secrets unset; skipping notification.\"",
  "            exit 0",
  "          fi",
  "          text=\"Nexus docs automation: ${MATERIAL} material change(s) proposed. Review: ${PR_URL}\"",
  "          curl --silent --show-error --fail --retry 3 --retry-delay 5 --max-time 30 \\",
  "            -X POST \"https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage\" \\",
  "            --data-urlencode \"chat_id=${TELEGRAM_CHAT_ID}\" \\",
  "            --data-urlencode \"text=${text}\" \\",
  "            --data-urlencode \"disable_web_page_preview=true\" > /dev/null",
  "",
  "      - name: Turn the run red when an official source could not be fetched",
  "        env:",
  "          FAILED_COUNT: ${{ steps.collect.outputs.failed_count }}",
  "          FAILED_IDS: ${{ steps.collect.outputs.failed_ids }}",
  "        run: |",
  "          # Runs after the proposal for the fetched pages, so a failed page never blocks it. A red run here also",
  "          # sends the failure alert below. An empty count means the collection step did not report: stay red.",
  "          # scripts/__tests__/nexus-docs-automation.test.mjs runs this block.",
  "          if [ \"${FAILED_COUNT}\" = \"0\" ]; then",
  "            echo \"Every official source was fetched.\"",
  "            exit 0",
  "          fi",
  "          echo \"::error::${FAILED_COUNT:-An unknown number of} official source(s) could not be fetched: ${FAILED_IDS:-unknown}. They are listed in the review; their snapshots were left unchanged.\"",
  "          exit 1",
  "",
  "      - name: Notify Telegram on failure",
  "        if: failure()",
  "        env:",
  "          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}",
  "          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}",
  "          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
  "        run: |",
  "          set -euo pipefail",
  "          if [ -z \"${TELEGRAM_BOT_TOKEN}\" ] || [ -z \"${TELEGRAM_CHAT_ID}\" ]; then",
  "            echo \"Telegram secrets unset; skipping failure notification.\"",
  "            exit 0",
  "          fi",
  "          text=\"Nexus docs automation FAILED. Logs: ${RUN_URL}\"",
  "          curl --silent --show-error --fail --retry 3 --retry-delay 5 --max-time 30 \\",
  "            -X POST \"https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage\" \\",
  "            --data-urlencode \"chat_id=${TELEGRAM_CHAT_ID}\" \\",
  "            --data-urlencode \"text=${text}\" > /dev/null",
  "",
].join('\n')

const indentOf = (line) => line.length - line.trimStart().length

/** Steps of the single job, in order: { name, keys, lines }. Keys are the step's top-level keys. */
function steps(text) {
  const lines = text.split('\n')
  const out = []
  for (const line of lines) {
    if (/^ {6}- /.test(line)) {
      const first = line.slice(8)
      out.push({ name: first.startsWith('name: ') ? first.slice(6) : first, keys: [first.split(':')[0]], lines: [line] })
    } else if (out.length && (line.trim() === '' || indentOf(line) > 6)) {
      const step = out[out.length - 1]
      step.lines.push(line)
      if (/^ {8}[A-Za-z_-]+:/.test(line)) step.keys.push(line.trim().split(':')[0])
    } else if (out.length && line.trim()) {
      break
    }
  }
  return out
}

/** The dedented `run: |` block of the named step. */
function runBlock(text, name) {
  const step = steps(text).find((s) => s.name === name)
  assert.ok(step, `workflow keeps a step named "${name}"`)
  const at = step.lines.findIndex((l) => /^ {8}run: \|\s*$/.test(l))
  assert.ok(at >= 0, `step "${name}" has a run: | block`)
  const body = []
  for (const line of step.lines.slice(at + 1)) {
    if (line.trim() && indentOf(line) <= 8) break
    body.push(line)
  }
  const min = Math.min(...body.filter((l) => l.trim()).map(indentOf))
  return body.map((l) => l.slice(min)).join('\n')
}

const BASH = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'

/** Runs a block the way GitHub runs a `run:` step: bash --noprofile --norc -eo pipefail. */
function runStep(root, script, env) {
  const file = path.join(root, 'step.sh')
  writeFileSync(file, `${script}\n`)
  const output = path.join(root, 'github-output.txt')
  rmSync(output, { force: true })
  const base = { ...process.env }
  const key = Object.keys(base).find((k) => k.toLowerCase() === 'path') ?? 'PATH'
  base[key] = `${path.dirname(process.execPath)}${path.delimiter}${base[key] ?? ''}`
  const result = spawnSync(BASH, ['--noprofile', '--norc', '-eo', 'pipefail', file], {
    cwd: root,
    encoding: 'utf8',
    env: { ...base, GITHUB_OUTPUT: output, ...env },
  })
  const outputs = Object.fromEntries((existsSync(output) ? readFileSync(output, 'utf8') : '')
    .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
  return { status: result.status, log: `${result.stdout}${result.stderr}`, outputs }
}

// A stand-in watcher: writes the planned report into its --write directory (if any), then exits as planned.
const FAKE_WATCHER = [
  "import { mkdirSync, writeFileSync } from 'node:fs'",
  'const plan = JSON.parse(process.env.FAKE_WATCHER_PLAN)',
  "const dir = process.argv[process.argv.indexOf('--write') + 1]",
  'if (plan.report) {',
  '  mkdirSync(dir, { recursive: true })',
  "  writeFileSync(`${dir}/report.json`, JSON.stringify(plan.report))",
  '}',
  'process.exit(plan.exit)',
  '',
].join('\n')

const report = (exitCode, monitorFailures) => ({ gates: { exitCode, monitorFailures, criticalFailures: [] } })

function collect(plan, { staleReport } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'nexus-docs-automation-'))
  try {
    mkdirSync(path.join(root, 'scripts'), { recursive: true })
    writeFileSync(path.join(root, 'scripts', 'nexus-docs-watch.mjs'), FAKE_WATCHER)
    if (staleReport) {
      mkdirSync(path.join(root, WATCH_DIR), { recursive: true })
      writeFileSync(path.join(root, WATCH_DIR, 'report.json'), JSON.stringify(staleReport))
    }
    return runStep(root, runBlock(APPROVED_AUTOMATION_WORKFLOW, COLLECT), {
      WATCH_DIR,
      CONTENT_DIR: 'content',
      FAKE_WATCHER_PLAN: JSON.stringify(plan),
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function finalStep(env) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'nexus-docs-automation-final-'))
  try {
    return runStep(root, runBlock(APPROVED_AUTOMATION_WORKFLOW, FINAL), env)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('the automation workflow matches the approved text byte for byte', () => {
  assert.equal(readFileSync(WORKFLOW, 'utf8'), APPROVED_AUTOMATION_WORKFLOW)
})

test('the failed-page step runs last before the failure alert, and the owned steps carry only allowed keys', () => {
  const list = steps(APPROVED_AUTOMATION_WORKFLOW)
  const names = list.map((s) => s.name)
  const at = (name) => {
    const index = names.indexOf(name)
    assert.ok(index >= 0, `step "${name}" exists`)
    return index
  }
  assert.ok(at(COLLECT) < at('Deterministic review (no network, no baseline overwrite)'))
  assert.ok(at('Open or update the proposal pull request') < at(FINAL))
  assert.ok(at('Notify Telegram (summary and PR link only)') < at(FINAL))
  assert.equal(at(FINAL) + 1, at('Notify Telegram on failure'))
  assert.equal(at('Notify Telegram on failure'), names.length - 1)

  assert.deepEqual(list[at(COLLECT)].keys, ['name', 'id', 'run'])
  assert.deepEqual(list[at(FINAL)].keys, ['name', 'env', 'run'])
  assert.deepEqual(list[at(FINAL)].lines.filter((l) => /^ {10}[A-Z_]+:/.test(l)).map((l) => l.trim()), [
    'FAILED_COUNT: ${{ steps.collect.outputs.failed_count }}',
    'FAILED_IDS: ${{ steps.collect.outputs.failed_ids }}',
  ])
})

test('the collection step keeps going on failed pages and stops on a crash', () => {
  const allFetched = collect({ exit: 0, report: report(0, []) })
  assert.equal(allFetched.status, 0, allFetched.log)
  assert.deepEqual(allFetched.outputs, { failed_count: '0', failed_ids: '' })

  const normalFailed = collect({ exit: 1, report: report(1, ['openai.api.models']) })
  assert.equal(normalFailed.status, 0, normalFailed.log)
  assert.deepEqual(normalFailed.outputs, { failed_count: '1', failed_ids: 'openai.api.models' })

  const criticalFailed = collect({ exit: 2, report: report(2, ['a.one', 'b.two']) })
  assert.equal(criticalFailed.status, 0, criticalFailed.log)
  assert.deepEqual(criticalFailed.outputs, { failed_count: '2', failed_ids: 'a.one b.two' })

  const stops = [
    ['a crash before any report', { exit: 1 }, undefined],
    ['a crash with a stale report from an earlier run', { exit: 1 }, report(1, ['old.page'])],
    ['an exit above 2', { exit: 3, report: report(3, []) }, undefined],
    ['exit 1 with a report that gives 0', { exit: 1, report: report(0, []) }, undefined],
    ['exit 0 with a report that gives 1', { exit: 0, report: report(1, ['a.one']) }, undefined],
  ]
  for (const [label, plan, staleReport] of stops) {
    const result = collect(plan, { staleReport })
    assert.notEqual(result.status, 0, `${label} must stop the run\n${result.log}`)
    assert.equal(result.outputs.failed_count, undefined, `${label} must not report a failed-page count`)
  }
})

test('the last step turns the run red when any page failed, and when the count is missing', () => {
  const clean = finalStep({ FAILED_COUNT: '0', FAILED_IDS: '' })
  assert.equal(clean.status, 0, clean.log)

  const failed = finalStep({ FAILED_COUNT: '2', FAILED_IDS: 'a.one b.two' })
  assert.notEqual(failed.status, 0)
  assert.match(failed.log, /a\.one b\.two/)

  const missing = finalStep({ FAILED_COUNT: '', FAILED_IDS: '' })
  assert.notEqual(missing.status, 0, 'an empty count is not a clean run')
})

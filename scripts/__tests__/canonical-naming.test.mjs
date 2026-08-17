import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(ROOT, 'scripts', 'check-canonical-naming.sh')
const execFileAsync = promisify(execFile)

/** Build a throwaway git repo and return helpers scoped to it. */
async function makeRepo(t) {
  const dir = await mkdtemp(join(tmpdir(), 'canonical-naming-'))
  t.after(() => rm(dir, { recursive: true, force: true }))

  const git = (...args) => execFileAsync('git', args, { cwd: dir })
  await git('init', '--quiet', '-b', 'main')
  await git('config', 'user.email', 'test@example.invalid')
  await git('config', 'user.name', 'Test')

  const commit = async (message) => {
    await git('add', '-A')
    await git('commit', '--quiet', '-m', message)
    const { stdout } = await git('rev-parse', 'HEAD')
    return stdout.trim()
  }

  const write = async (relPath, content) => {
    await mkdir(dirname(join(dir, relPath)), { recursive: true })
    await writeFile(join(dir, relPath), content, 'utf8')
  }

  return { dir, git, commit, write }
}

/** Run the guard script against two refs inside `dir`. */
function runGuard(dir, baseRef, headRef) {
  return execFileAsync('bash', [SCRIPT, baseRef, headRef], { cwd: dir })
}

/**
 * Assert the guard exits non-zero AND its stdout matches `pattern`.
 *
 * execFileAsync's rejection carries the CLI output on `error.stdout`, not in
 * `error.message` — asserting a regex straight against the rejection (as
 * `assert.rejects(promise, /pattern/)` does) tests the wrong string and
 * would pass on any failure at all, not specifically the naming violation.
 */
async function assertGuardFails(dir, baseRef, headRef, pattern) {
  try {
    await runGuard(dir, baseRef, headRef)
    assert.fail('expected the guard to exit non-zero')
  } catch (error) {
    assert.equal(error.code, 1)
    assert.match(error.stdout, pattern)
  }
}

test('passes on a repo with no naming changes', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await write('README.md', 'Unite-Group is the canonical product.\n')
  const base = await commit('base')
  const { stdout } = await runGuard(dir, base, base)
  assert.match(stdout, /guard passed/)
})

test('RED (miss class 1): still catches the original exact-case string', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await write('docs/status.md', 'Status: on track.\n')
  const base = await commit('base')
  await write('docs/status.md', 'Status: on track.\nWe are relaunching Unite-Hub next quarter.\n')
  const head = await commit('head')

  await assertGuardFails(dir, base, head, /Retired product naming detected/)
})

test('RED (miss class 2): catches lowercase/underscore/no-separator case variants the original literal-string guard missed', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await write('config/env.md', 'placeholder\n')
  const base = await commit('base')

  const variants = [
    'The unite-hub project is our main CRM.',
    'Route requests to UNITE_HUB for legacy support.',
    'UniteHub is still the primary system.',
    'This is the Unite Hub dashboard.',
  ]

  for (const [index, line] of variants.entries()) {
    await write(`config/variant-${index}.md`, `${line}\n`)
    const head = await commit(`variant ${index}`)
    await assertGuardFails(dir, base, head, /Retired product naming detected/)
  }
})

test('a word-adjacency exemption would be gameable, so there is none: a marker word near the term does not launder it outside docs/legacy', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await write('docs/status.md', 'placeholder\n')
  const base = await commit('base')
  // "legacy" appears in this sentence but is not a lineage claim about the
  // retired product — it is ordinary prose. A marker-word exemption would
  // have let this through; scope-only correctly still catches it.
  await write('docs/status.md', 'placeholder\nRoute requests to UNITE_HUB for legacy support.\n')
  const head = await commit('head')

  await assertGuardFails(dir, base, head, /Retired product naming detected/)
})

test('a genuine historical reference passes when written without the literal name (the repo\'s own convention)', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await write('CLAUDE.md', 'placeholder\n')
  const base = await commit('base')
  await write(
    'CLAUDE.md',
    'placeholder\nThe former standalone CRM repository was retired and merged into apps/web.\n',
  )
  const head = await commit('head')

  const { stdout } = await runGuard(dir, base, head)
  assert.match(stdout, /guard passed/)
})

test('the same historical sentence still fails outside docs/legacy if it keeps the literal retired name', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await write('CLAUDE.md', 'placeholder\n')
  const base = await commit('base')
  await write(
    'CLAUDE.md',
    'placeholder\nThe former standalone CRM repository (Unite-Hub) was retired and merged into apps/web.\n',
  )
  const head = await commit('head')

  await assertGuardFails(dir, base, head, /Retired product naming detected/)
})

test('still respects the docs/legacy/** exclusion', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await mkdir(join(dir, 'docs', 'legacy'), { recursive: true })
  await write('docs/legacy/history.md', 'placeholder\n')
  const base = await commit('base')
  await write('docs/legacy/history.md', 'placeholder\nUnite-Hub was the original name.\n')
  const head = await commit('head')

  const { stdout } = await runGuard(dir, base, head)
  assert.match(stdout, /guard passed/)
})

test('still respects the CHANGELOG.md exclusion', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await write('CHANGELOG.md', 'placeholder\n')
  const base = await commit('base')
  await write('CHANGELOG.md', 'placeholder\n## Unite-Hub 1.0.0\n')
  const head = await commit('head')

  const { stdout } = await runGuard(dir, base, head)
  assert.match(stdout, /guard passed/)
})

test('does not self-match its own script and workflow file', async (t) => {
  const { dir, write, commit } = await makeRepo(t)
  await mkdir(join(dir, 'scripts'), { recursive: true })
  await mkdir(join(dir, '.github', 'workflows'), { recursive: true })
  await write('scripts/check-canonical-naming.sh', '# placeholder\n')
  await write('.github/workflows/canonical-naming.yml', '# placeholder\n')
  const base = await commit('base')
  await write('scripts/check-canonical-naming.sh', '# placeholder\n# matches Unite-Hub and unite_hub and UniteHub literally\n')
  await write('.github/workflows/canonical-naming.yml', '# placeholder\n# forbidden="Unite-Hub"\n')
  const head = await commit('head')

  const { stdout } = await runGuard(dir, base, head)
  assert.match(stdout, /guard passed/)
})

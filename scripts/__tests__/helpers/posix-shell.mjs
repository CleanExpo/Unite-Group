// Test-only locator for a POSIX shell able to run the repo's committed .sh
// scripts, plus the path conversion that shell needs.
//
// Sibling of apps/web/src/test/posix-shell.ts. They are deliberately separate
// files: that one is TypeScript inside the apps/web vitest project, this one is
// plain ESM run by `node --test` from the repo root, and neither can import the
// other without a build step. This copy also differs in two ways that matter:
//
//   1. It resolves an ABSOLUTE interpreter on every platform, including
//      /bin/bash off Windows. These suites deliberately hand the script under
//      test a hostile PATH containing a fake `bash`, so resolving the
//      interpreter through that PATH would run the attacker's shim instead of
//      the real shell and quietly invert what the test proves.
//   2. It exposes toMsysPath(), because Git Bash needs `/d/repo` rather than
//      `D:\repo` — both for argv and for the ':'-separated PATH it is handed.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

const WSL_LAUNCHER = /^[a-z]:\\windows\\system32\\bash\.exe$/i

const WINDOWS_CANDIDATES = [
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
]

function fromPath() {
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  for (const dir of dirs) {
    const candidate = join(dir, 'bash.exe')
    if (WSL_LAUNCHER.test(candidate)) continue
    if (existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Absolute path to a POSIX bash, or `null` when the platform has none.
 *
 * Callers passing the result into a node:test `skip` option must convert a
 * "do not skip" to `false`, never `null`: node:test runs the body for
 * `skip: null` but still reports the case as SKIP, so a genuinely-passing
 * test disappears from the pass count.
 *
 * `null` means the interpreter is genuinely absent — callers must SKIP with a
 * visible reason rather than pass, so an unrunnable script test never reads as
 * a green one.
 */
export function findPosixBash() {
  if (process.platform !== 'win32') return '/bin/bash'

  const configured = process.env.GIT_BASH?.trim()
  if (configured && existsSync(configured)) return configured

  for (const candidate of WINDOWS_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  return fromPath()
}

/**
 * Rewrite a Windows path into the MSYS form Git Bash resolves
 * (`D:\a\b` → `/d/a/b`). A no-op off Windows, so callers stay single-path.
 *
 * Note this is not the same as the apps/web helper's `D:\a\b` → `D:/a/b`:
 * a drive-letter colon cannot survive inside a ':'-separated PATH.
 */
export function toMsysPath(value) {
  if (process.platform !== 'win32') return value
  return value.replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`).replace(/\\/g, '/')
}

/** Rewrite a Windows path into WSL's mount form (`D:\a\b` → `/mnt/d/a/b`). */
export function toWslPath(value) {
  if (process.platform !== 'win32') return value
  return value.replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`).replace(/\\/g, '/')
}

/** Which of `required` the shell cannot resolve. */
function missingIn(shell, required) {
  if (required.length === 0) return []
  // /usr/bin is the shell's own virtual root on Windows, not a filesystem path,
  // so ask the shell rather than guessing where it was installed.
  const probe = required.map((path) => `[ -x ${path} ] || echo ${path}`).join('; ')
  const { status, stdout } = shell.probe(probe)
  if (status !== 0) return required
  return stdout.split('\n').map((line) => line.trim()).filter(Boolean)
}

function gitBashShell() {
  const bash = findPosixBash()
  if (!bash) return null
  return {
    label: bash,
    toPath: toMsysPath,
    probe: (script) => spawnSync(bash, ['-c', script], { encoding: 'utf8' }),
    spawnArgs: (scriptPath, env) => [bash, [toMsysPath(scriptPath)], { env }],
  }
}

/**
 * Every installed WSL distribution, as shell candidates.
 *
 * `wsl -l -q` writes UTF-16, so decode it as such rather than letting the
 * ASCII happen to survive a UTF-8 read. The default distribution is not
 * necessarily a usable one — docker-desktop is listed here and has no bash —
 * so callers must probe each rather than trusting `wsl.exe --`.
 */
function wslShells() {
  if (process.platform !== 'win32') return []
  const listed = spawnSync('wsl.exe', ['-l', '-q'], { encoding: 'buffer' })
  if (listed.status !== 0 || !listed.stdout) return []

  return listed.stdout
    .toString('utf16le')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((distro) => ({
      label: `wsl:${distro}`,
      toPath: toWslPath,
      probe: (script) => spawnSync('wsl.exe', ['-d', distro, '--', 'bash', '-c', script], { encoding: 'utf8' }),
      // WSL does not inherit the Windows environment, so hand the child exactly
      // the environment the caller asked for — the same contract execFile's
      // `env` option gives the Git Bash branch.
      spawnArgs: (scriptPath, env) => [
        'wsl.exe',
        [
          '-d', distro, '--', 'env', '-i',
          ...Object.entries(env).map(([key, value]) => `${key}=${value}`),
          'bash', toWslPath(scriptPath),
        ],
        {},
      ],
    }))
}

/**
 * The first available shell that can resolve every path in `required`, or null.
 *
 * The scripts under test pin absolute paths like /usr/bin/git on purpose, so an
 * attacker-controlled PATH cannot substitute them. Git Bash ships git as
 * /mingw64/bin/git and has no /usr/bin/git at all, so the pinned call cannot
 * resolve there. Rather than point the script at a PATH-resolved git — which
 * would delete the very control the test exists to prove — fall through to a
 * shell that has a real /usr/bin. On Windows that is WSL.
 *
 * Git Bash is preferred when it qualifies: it is far cheaper to start, and it
 * reaches the Windows filesystem the fixtures are written to without a mount
 * translation.
 */
export function findSystemShell(required = []) {
  for (const shell of [gitBashShell(), ...wslShells()].filter(Boolean)) {
    if (missingIn(shell, required).length === 0) return shell
  }
  return null
}

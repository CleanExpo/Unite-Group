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

/**
 * The absolute system binaries from `required` that this machine does not have.
 *
 * The scripts under test pin absolute paths like /usr/bin/git on purpose, so an
 * attacker-controlled PATH cannot substitute them. Git Bash ships git as
 * /mingw64/bin/git and has no /usr/bin/git at all, so the pinned call cannot
 * resolve. Pointing the script at a PATH-resolved git to make the test green
 * would delete the very control the test exists to prove — the suite reports
 * the gap and skips instead.
 */
export function missingSystemBinaries(required) {
  const bash = findPosixBash()
  if (!bash) return required

  // /usr/bin is the shell's own virtual root on Windows, not a filesystem path,
  // so ask the shell rather than guessing where it was installed.
  const probe = required.map((path) => `[ -x ${path} ] || echo ${path}`).join('; ')
  const { status, stdout } = spawnSync(bash, ['-c', probe], { encoding: 'utf8' })
  if (status !== 0) return required
  return stdout.split('\n').map((line) => line.trim()).filter(Boolean)
}

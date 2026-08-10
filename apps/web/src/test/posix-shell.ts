// Test-only locator for a POSIX shell able to run the repo's committed .sh
// scripts and shims.
//
// On Windows the `bash` resolved from PATH is C:\Windows\System32\bash.exe —
// the WSL launcher. It runs inside a Linux distro that cannot see the Windows
// filesystem the tests write their fixtures to, so sourcing a `D:\...` script
// there fails and the shell exits 127. Git Bash (MSYS2) is the correct
// interpreter: it executes the same POSIX scripts against the real Windows
// filesystem, so the assertions still test the committed script.

import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

const WSL_LAUNCHER = /^[a-z]:\\windows\\system32\\bash\.exe$/i

const WINDOWS_CANDIDATES = [
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
]

function fromPath(): string | null {
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
 * A `null` return means the interpreter is genuinely absent — callers must
 * SKIP with a visible reason rather than pass, so an unrunnable script test
 * never reads as a green one.
 */
export function findPosixBash(): string | null {
  if (process.platform !== 'win32') return 'bash'

  const configured = process.env.GIT_BASH?.trim()
  if (configured && existsSync(configured)) return configured

  for (const candidate of WINDOWS_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  return fromPath()
}

/**
 * Rewrite a Windows path into the forward-slash form Git Bash accepts
 * (`D:\a\b` → `D:/a/b`). A no-op off Windows.
 */
export function toPosixPath(value: string): string {
  return process.platform === 'win32' ? value.replace(/\\/g, '/') : value
}

/** Single-quote a value for safe interpolation into a POSIX shell command. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

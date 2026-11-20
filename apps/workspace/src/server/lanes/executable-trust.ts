/**
 * Which program a shell command will start, and whether the gate may trust it
 * — UNI-3153.
 *
 * Split out of `autonomy-hook.mjs`, which is a CLI: it calls `main()` at import
 * time, so nothing inside it can be imported by a test, and this decision could
 * only ever be observed through a spawned child process. It is the single check
 * standing between a program a lane wrote and the gate's L0/L1 allow tier, so it
 * belongs somewhere a test can call it directly.
 *
 * Every function here takes its platform and environment as arguments instead of
 * reading `process.platform`. That is not decoration. This change was written and
 * measured on Windows, where the POSIX branch cannot be executed at all, and
 * "the POSIX behaviour is unchanged" has to be a test result rather than an
 * argument.
 */
import { realpathSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Directories whose programs are system binaries, not files a lane wrote.
 *
 * The list this gate has carried since UNI-2409, plus one entry from UNI-3475.
 * Anything added here widens what the allow tier will run, so the Windows set
 * below is kept separate rather than appended.
 *
 * Trust is judged on a program's real path, so the directory a symlink lands in
 * must be listed. Ubuntu 26.04 links /usr/bin/cat, ls and the rest of coreutils
 * into /usr/lib/cargo/bin/coreutils (root-owned, written only by the package
 * manager); without it every coreutils program counts as untrusted (UNI-3475,
 * #1417, moved here from autonomy-hook.mjs when the decision moved).
 */
const POSIX_SYSTEM_BIN_DIRS = [
  '/bin',
  '/usr/bin',
  '/usr/local/bin',
  '/sbin',
  '/usr/sbin',
  '/opt/homebrew/bin',
  '/usr/lib/cargo/bin/coreutils',
] as const

/**
 * Windows executable extensions, used both to resolve a bare name and to read a
 * program's name back out of a path.
 *
 * Kept to the four that make a file directly executable. `PATHEXT` on a real
 * machine also carries `.VBS`, `.JS`, `.PY` and friends — measured on the
 * founder's PC, 02/11/2026: `.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;
 * .MSC;.PY;.PYW;.CPL`. Those run through an interpreter, so a file with one of
 * those names is a script, and a script's name tells you nothing about what it
 * does. The resolver below still consults the real `PATHEXT` — the shell will —
 * but the trust decision never rests on an extension, only on the directory the
 * file really lives in.
 */
const WINDOWS_EXECUTABLE_EXTENSIONS = ['.COM', '.EXE', '.BAT', '.CMD'] as const

/**
 * The Windows equivalent of the POSIX list, and the reason for every entry,
 * because on that platform this list IS the security boundary.
 *
 * The property `/usr/bin` has is not its name. It is that a lane running as an
 * ordinary user cannot write there, so a program found there is one an
 * administrator installed. Measured on the founder's PC, 02/11/2026, from a
 * process that was NOT elevated (`IsInRole(Administrator)` returned False):
 *
 *     C:\WINDOWS\System32                        REFUSED EPERM
 *     C:\Program Files\Git\usr\bin               REFUSED EPERM
 *     C:\Program Files\nodejs                    REFUSED EPERM
 *     %LOCALAPPDATA%\Microsoft\WinGet\Links      WRITABLE by this user
 *
 * So the system directories and Program Files carry the property and the
 * per-user install locations do not. That is why a WinGet or scoop shim is not
 * trusted here even when it is the first thing on PATH — `rg` on that machine
 * resolves to one, under `AppData\Local`, which the lane can overwrite.
 *
 * Git for Windows is in the list because on Windows the lane's shell IS Git
 * Bash, and `ls`, `cat` and `grep` — names `SAFE_EXECUTABLES` in the gate
 * already allows — live in its `usr\bin`. `Git\cmd` is there for `git` itself,
 * whose read-only argument lists the gate allows by name. Without these the
 * allow tier stays inert on Windows, which is the whole of UNI-3153.
 *
 * One operational consequence, worth knowing before a lane is debugged on
 * Windows: an adapter that spawns the hook with a stripped environment gets a
 * gate that trusts NOTHING there, because `SystemRoot` and `ProgramFiles` are
 * where the trusted directories come from. It fails closed, so it is safe, but
 * it is also inert, and the symptom is every command refused as "does not
 * resolve to a trusted system program". Found while writing this change: the
 * Done harness strips exactly these variables from a criterion recipe, so the
 * suite had to restore them from fixed paths to test the gate at all.
 *
 * These paths come from the environment, where the POSIX ones are absolute
 * constants. A lane that could rewrite `SystemRoot` could aim this list at its
 * own directory. That is not a new trust: the hook already takes
 * `NEXUS_APPROVALS_FILE`, `NEXUS_LANE_WORKTREE_ROOT` and `NEXUS_LANE_ADAPTER`
 * from the same environment, so a lane that owns the environment has already
 * defeated the gate by an easier route. Windows has no fixed system root to use
 * instead.
 */
function windowsSystemBinDirs(env: NodeJS.ProcessEnv): string[] {
  const dirs: string[] = []
  const root = (env.SystemRoot ?? env.windir ?? '').trim()
  if (root !== '') {
    dirs.push(
      root,
      path.join(root, 'System32'),
      path.join(root, 'System32', 'Wbem'),
      path.join(root, 'System32', 'WindowsPowerShell', 'v1.0'),
      path.join(root, 'System32', 'OpenSSH'),
      path.join(root, 'SysWOW64'),
    )
  }
  // ProgramW6432 is the 64-bit location as seen by a 32-bit process, where
  // ProgramFiles would be the x86 one. All three are admin-installed.
  for (const key of ['ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432']) {
    const programFiles = (env[key] ?? '').trim()
    if (programFiles === '') continue
    for (const tail of [
      ['Git', 'cmd'],
      ['Git', 'usr', 'bin'],
      ['Git', 'mingw64', 'bin'],
      ['Git', 'mingw32', 'bin'],
    ]) {
      dirs.push(path.join(programFiles, ...tail))
    }
  }
  return dirs
}

/** The directories a program must really live in to be trusted, by platform. */
export function systemBinDirs(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): readonly string[] {
  return platform === 'win32' ? windowsSystemBinDirs(env) : [...POSIX_SYSTEM_BIN_DIRS]
}

/**
 * True when the word names a path rather than a program to look up on PATH.
 *
 * `word.includes('/')` was the whole of this test, which on Windows missed
 * `C:\Windows\System32\cmd.exe` and `..\lane\cat.exe` — both of them paths, both
 * read as bare names, both searched on PATH and not found. Deliberately not
 * conditional on the platform: a POSIX command word containing a backslash or
 * starting with a drive letter is exotic, and reading it as a path can only make
 * the gate stricter, because a path must then resolve INTO a trusted directory
 * to pass. Checked by test on both spellings.
 */
export function isExplicitProgramPath(word: string): boolean {
  return /[\\/]/.test(word) || /^[A-Za-z]:/.test(word)
}

/**
 * The program's own name, taken out of whatever the lane typed.
 *
 * `words[0].split('/').pop()` left `C:\Windows\System32\cmd.exe` whole, so the
 * gate's indirection check — the one that refuses `sh`, `bash` and `env`
 * because classifying them classifies nothing — looked that whole string up in
 * its set and missed.
 *
 * Not a hole, and the claim was checked rather than assumed: with this function
 * reverted, that command is still refused, two steps later, by the operand
 * check, as "command uses quoting the gate does not model" — the backslashes
 * trip its quote parser. `cmd.exe /c dir` with no path was refused because
 * `cmd.exe` was an unrecognised NAME. Both are the wrong refusal. An
 * interpreter has to be refused AS an interpreter, because a refusal that rests
 * on a backslash tripping a parser, or on a name simply not being listed, is
 * one that a later change to quoting or a single addition to a name list
 * removes silently.
 *
 * The extension strip is also what the allow tier needs on Windows: the program
 * really is `cat.exe`, and `cat` is the name the gate allows. Neither half is
 * conditional on the platform, so both are provable wherever the suite runs.
 */
export function programBasename(word: string): string {
  const name = word.split(/[\\/]/).pop() ?? ''
  for (const extension of WINDOWS_EXECUTABLE_EXTENSIONS) {
    if (name.length > extension.length && name.toUpperCase().endsWith(extension)) {
      return name.slice(0, -extension.length)
    }
  }
  return name
}

export interface ExecutableTrustOptions {
  /** Defaults to the running platform; named explicitly by the tests. */
  platform?: NodeJS.Platform
  /** Defaults to the real environment; named explicitly by the tests. */
  env?: NodeJS.ProcessEnv
}

export type ExecutableTrust = (word: string) => boolean

/** PATH, under whichever spelling this environment object carries. */
function pathVariable(env: NodeJS.ProcessEnv, windows: boolean): string {
  if (!windows) return env.PATH ?? ''
  // Windows environment variables are case-insensitive and Node normalises
  // process.env for them, but a plain object handed in by a test is not
  // normalised, so all three spellings are read.
  return env.PATH ?? env.Path ?? env.path ?? ''
}

function executableExtensions(env: NodeJS.ProcessEnv): string[] {
  const raw = (env.PATHEXT ?? '').trim()
  const configured = raw === '' ? [...WINDOWS_EXECUTABLE_EXTENSIONS] : raw.split(';')
  return configured.map((extension) => extension.trim()).filter((extension) => extension !== '')
}

/**
 * Find the program the shell will start for `word`, as the shell does: an
 * explicit path as written (relative to `base`), a bare name through PATH in
 * order, a relative or empty entry taken from the working directory. It is
 * trusted only if it really lives in a system bin directory, so a program the
 * working directory supplies (`./node_modules/.bin/cat`) is never trusted.
 *
 * On Windows each directory is tried with the word as typed FIRST and only then
 * with the `PATHEXT` extensions appended. That order is the MSYS shell's, which
 * is the shell a lane has there, and it is also the stricter one: a lane-written
 * extensionless `cat` next to a trusted `cat.exe` is the escape this check
 * exists to refuse, and trying the literal name first is what finds it.
 */
export function makeExecutableTrust(
  base: string,
  resolvePath: (target: string) => string,
  options: ExecutableTrustOptions = {},
): ExecutableTrust {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const windows = platform === 'win32'

  /**
   * The real file behind a path, or null.
   *
   * `realpathSync.native` on Windows because only the OS normalises the two
   * ways one directory can be spelled there: 8.3 short names (`PROGRA~1`) and
   * case. Measured on the founder's PC, 02/11/2026 — `%SystemRoot%` is spelled
   * `C:\WINDOWS`, and plain `realpathSync` returns that spelling verbatim while
   * the same directory reached through PATH comes back as `C:\Windows\System32`.
   * A Set of strings would not have matched those two, so the trusted set would
   * have been empty for a second reason. POSIX keeps plain `realpathSync`, the
   * call this code has always made.
   */
  const real = (target: string): string | null => {
    try {
      return windows ? realpathSync.native(target) : realpathSync(target)
    } catch {
      return null
    }
  }
  // Case folding on top of the OS normalisation, not instead of it: belt and
  // braces on the one comparison this whole control reduces to.
  const key = (directory: string): string => (windows ? directory.toLowerCase() : directory)

  const systemDirs = new Set(
    systemBinDirs(platform, env)
      .map(real)
      .filter((directory): directory is string => directory !== null)
      .map(key),
  )
  const delimiter = windows ? ';' : ':'
  const extensions = windows ? executableExtensions(env) : []

  return (word) => {
    let candidate: string | null = null
    if (isExplicitProgramPath(word)) {
      candidate = resolvePath(word)
    } else {
      search: for (const entry of pathVariable(env, windows).split(delimiter)) {
        // An empty or relative entry is searched from the working directory,
        // as the shell does; a match there is judged like any other.
        const directory = path.isAbsolute(entry) ? entry : path.resolve(base, entry)
        for (const name of [word, ...extensions.map((extension) => word + extension)]) {
          const file = path.join(directory, name)
          try {
            if (statSync(file).isFile()) {
              candidate = file
              break search
            }
          } catch {
            // not under this name in this directory; keep looking
          }
        }
      }
    }
    if (candidate === null) return false
    const resolved = real(candidate)
    return resolved !== null && systemDirs.has(key(path.dirname(resolved)))
  }
}

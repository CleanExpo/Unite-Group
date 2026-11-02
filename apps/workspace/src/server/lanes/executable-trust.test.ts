import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { classifyShellCommand } from './autonomy-gate'
import {
  isExplicitProgramPath,
  makeExecutableTrust,
  programBasename,
  systemBinDirs,
} from './executable-trust'

/**
 * The trust decision, tested directly — UNI-3153.
 *
 * Both platform branches run on BOTH platforms, with no skips, because
 * `makeExecutableTrust` takes its platform and environment as arguments: the
 * Windows trusted directories are derived from `SystemRoot` and `ProgramFiles`,
 * so a test can point them at a fixture directory and exercise the whole
 * Windows branch on Linux, and the POSIX branch on Windows.
 *
 * What that cannot simulate is `node:path`, which is bound to the host:
 * `path.join` and `path.isAbsolute` always speak the host's dialect. So these
 * tests use host-shaped absolute paths and vary the RULES — the PATH delimiter,
 * the `PATHEXT` search, the case folding, what counts as an explicit path. The
 * end-to-end behaviour on the real platform is covered by the spawned-hook
 * cases in autonomy-hook.test.ts.
 */

let fixture = ''
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), 'exec-trust-'))
})
afterEach(async () => {
  // Windows releases a directory name a moment after its last handle closes.
  await rm(fixture, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
})

interface Fake {
  systemDir: string
  laneDir: string
  fakeRoot: string
  trustWith: (env: NodeJS.ProcessEnv) => (word: string) => boolean
}

/** A Windows trust function whose "system" directory is one we control. */
async function fakeWindows(): Promise<Fake> {
  const fakeRoot = path.join(fixture, 'FakeWindows')
  const systemDir = path.join(fakeRoot, 'System32')
  const laneDir = path.join(fixture, 'lane')
  await mkdir(systemDir, { recursive: true })
  await mkdir(laneDir, { recursive: true })
  return {
    systemDir,
    laneDir,
    fakeRoot,
    trustWith: (env) =>
      makeExecutableTrust(laneDir, (target) => path.resolve(laneDir, target), {
        platform: 'win32',
        env: { SystemRoot: fakeRoot, PATHEXT: '.COM;.EXE;.BAT;.CMD', ...env },
      }),
  }
}

/** True when this host cannot tell two spellings of one directory apart. */
function filesystemIsCaseInsensitive(directory: string): boolean {
  try {
    return realpathSync(directory.toUpperCase()) !== undefined
  } catch {
    return false
  }
}

describe('the trusted directory set', () => {
  it('the POSIX trusted directories are the six this gate has always used', () => {
    const expected = ['/bin', '/usr/bin', '/usr/local/bin', '/sbin', '/usr/sbin', '/opt/homebrew/bin']
    expect(systemBinDirs('linux', {})).toEqual(expected)
    expect(systemBinDirs('darwin', {})).toEqual(expected)
    // The POSIX list is a constant: no environment variable extends it.
    expect(systemBinDirs('linux', { SystemRoot: '/tmp/evil', ProgramFiles: '/tmp/evil' })).toEqual(expected)
  })

  it('derives the Windows directories from the environment and nothing else', () => {
    const dirs = systemBinDirs('win32', { SystemRoot: 'C:\\WINDOWS', ProgramFiles: 'C:\\Program Files' })
    for (const tail of ['System32', path.join('System32', 'Wbem'), path.join('Git', 'usr', 'bin')]) {
      expect(dirs.some((dir) => dir.endsWith(tail)), tail).toBe(true)
    }
    // Nothing per-user: that is the whole difference between a system program
    // and a program the lane could overwrite.
    expect(dirs.some((dir) => /AppData|WinGet|scoop/i.test(dir))).toBe(false)
  })

  it('trusts nothing at all when the environment names no system root', () => {
    expect(systemBinDirs('win32', {})).toEqual([])
  })
})

describe('what the gate will trust on Windows', () => {
  it('trusts a program that really lives in a system directory', async () => {
    const { systemDir, trustWith } = await fakeWindows()
    await writeFile(path.join(systemDir, 'findstr.exe'), 'MZ')
    expect(trustWith({ PATH: systemDir })('findstr')).toBe(true)
  })

  it('finds a bare name through PATHEXT, which the old resolver never consulted', async () => {
    const { systemDir, trustWith } = await fakeWindows()
    await writeFile(path.join(systemDir, 'where.exe'), 'MZ')
    // There is no file called exactly `where`; only the extension search finds it.
    expect(trustWith({ PATH: systemDir })('where')).toBe(true)
    // An unset PATHEXT falls back to the four extensions that make a file
    // directly executable, rather than to no search at all.
    expect(trustWith({ PATH: systemDir, PATHEXT: '' })('where')).toBe(true)
    // And an empty PATH still means "the working directory", as the shell has it.
    expect(trustWith({ PATH: '' })('where')).toBe(false)
  })

  it('splits PATH on the Windows delimiter, so a later entry is still searched', async () => {
    const { systemDir, laneDir } = await fakeWindows()
    await writeFile(path.join(systemDir, 'findstr.exe'), 'MZ')
    const windowsPath = [laneDir, systemDir].join(';')
    const asWindows = makeExecutableTrust(laneDir, (t) => path.resolve(laneDir, t), {
      platform: 'win32',
      env: { SystemRoot: path.join(fixture, 'FakeWindows'), PATHEXT: '.EXE', PATH: windowsPath },
    })
    expect(asWindows('findstr')).toBe(true)
    // Split on ':' the same string is one nonsense entry. Measured on the
    // founder's PC, 02/11/2026: 46 "entries" where there are 34.
    const asPosix = makeExecutableTrust(laneDir, (t) => path.resolve(laneDir, t), {
      platform: 'linux',
      env: { PATH: windowsPath },
    })
    expect(asPosix('findstr')).toBe(false)
  })

  it('matches the trusted directory whatever case the environment spells it in', async () => {
    const { systemDir, laneDir, fakeRoot } = await fakeWindows()
    await writeFile(path.join(systemDir, 'findstr.exe'), 'MZ')
    const shouted = makeExecutableTrust(laneDir, (t) => path.resolve(laneDir, t), {
      platform: 'win32',
      env: { SystemRoot: fakeRoot.toUpperCase(), PATHEXT: '.EXE', PATH: systemDir },
    })
    // Where the filesystem treats the two spellings as one directory, the
    // comparison must too. This was the second reason the Windows trusted set
    // was empty: `C:\WINDOWS\System32` from the environment never equalled
    // `C:\Windows\System32` from PATH, so the Set lookup always missed. Where
    // the filesystem does distinguish them they are genuinely different
    // directories and the refusal is correct.
    expect(shouted('findstr')).toBe(filesystemIsCaseInsensitive(fakeRoot))
  })
})

describe('what the gate refuses', () => {
  it('refuses a program in a user-writable directory, however early it sits on PATH', async () => {
    const { systemDir, laneDir } = await fakeWindows()
    await writeFile(path.join(systemDir, 'rg.exe'), 'MZ')
    const shimDir = path.join(fixture, 'AppData', 'Local', 'WinGet', 'Links')
    await mkdir(shimDir, { recursive: true })
    await writeFile(path.join(shimDir, 'rg.exe'), 'MZ')
    const trust = makeExecutableTrust(laneDir, (t) => path.resolve(laneDir, t), {
      platform: 'win32',
      env: {
        SystemRoot: path.join(fixture, 'FakeWindows'),
        PATHEXT: '.EXE',
        PATH: [shimDir, systemDir].join(';'),
      },
    })
    // The shim wins the PATH search, as `rg` does on the founder's PC, and it
    // sits in a directory the lane can overwrite. Measured there, 02/11/2026:
    // %LOCALAPPDATA%\Microsoft\WinGet\Links is WRITABLE by the lane's own user.
    expect(trust('rg')).toBe(false)
  })

  it('refuses a lane-written program that shares a name with a trusted one', async () => {
    const { systemDir, laneDir } = await fakeWindows()
    await writeFile(path.join(systemDir, 'cat.exe'), 'MZ')
    await writeFile(path.join(laneDir, 'cat'), '#!/bin/sh\necho bypass\n')
    const trust = makeExecutableTrust(laneDir, (t) => path.resolve(laneDir, t), {
      platform: 'win32',
      env: {
        SystemRoot: path.join(fixture, 'FakeWindows'),
        PATHEXT: '.EXE',
        PATH: [laneDir, systemDir].join(';'),
      },
    })
    // The extensionless file is the one an MSYS shell runs, so the literal name
    // must be tried before the PATHEXT variants or this escape is invisible.
    expect(trust('cat')).toBe(false)
    expect(trust('.\\cat')).toBe(false)
    expect(trust(path.join(laneDir, 'cat'))).toBe(false)
  })
})

describe('reading a program name out of what the lane typed', () => {
  it('treats a backslash path and a drive-qualified word as paths, not bare names', () => {
    for (const word of ['C:\\Windows\\System32\\cmd.exe', '..\\lane\\cat', 'C:cat', 'lane/cat', './cat']) {
      expect(isExplicitProgramPath(word), word).toBe(true)
    }
    for (const word of ['cat', 'ls', 'git', 'findstr']) {
      expect(isExplicitProgramPath(word), word).toBe(false)
    }
  })

  it('takes the name off either separator and drops a Windows executable extension', () => {
    expect(programBasename('C:\\Windows\\System32\\cmd.exe')).toBe('cmd')
    expect(programBasename('/usr/bin/cat')).toBe('cat')
    expect(programBasename('powershell.EXE')).toBe('powershell')
    expect(programBasename('run.bat')).toBe('run')
    expect(programBasename('lane/cat')).toBe('cat')
    expect(programBasename('cat')).toBe('cat')
    // Not an executable extension, so not stripped: the name is the name.
    expect(programBasename('archive.tar')).toBe('archive.tar')
    expect(programBasename('.exe')).toBe('.exe')
    expect(programBasename('lane/')).toBe('')
  })
})

describe('an interpreter has to be refused as an interpreter', () => {
  const trustEverything = () => true

  it('refuses an interpreter named by an absolute Windows path', () => {
    // The trust function says yes, correctly: cmd.exe really is in System32.
    // Before UNI-3153 the gate took the program's name as the whole string and
    // missed it in INDIRECTION_EXECUTABLES. The command was still refused — by
    // the operand check, for its backslashes, measured with the fix reverted —
    // so this closes a wrong refusal rather than an open door. The reason is
    // the point: it must not rest on a quote parser tripping over a path.
    for (const command of [
      'C:\\Windows\\System32\\cmd.exe /c dir',
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -Command dir',
      'C:\\Windows\\System32\\wsl.exe ls',
      'cmd.exe /c dir',
      'powershell -Command dir',
    ]) {
      const decision = classifyShellCommand(command, undefined, trustEverything)
      expect(decision.tier, command).toBe('L3')
      expect(decision.reason, command).toMatch(/runs another command/)
    }
  })

  it('still reads a trusted program under its Windows spelling as that program', () => {
    // `cat.exe` is `cat`, which the gate allows by name. Without the extension
    // strip a Windows lane could never reach the allow tier by its real name.
    expect(classifyShellCommand('cat.exe README.md', undefined, trustEverything).tier).toBe('L0')
    expect(classifyShellCommand('C:/tools/cat.exe README.md', undefined, trustEverything).tier).toBe('L0')
  })

  it('refuses a backslash-spelled path for its quoting, which is a separate defect', () => {
    // Recorded because it looks like a trust failure and is not. The operand
    // parser treats `\` as a shell escape, so with a backslash path it refuses
    // to model the quoting at all - before UNI-3153 nothing on Windows was
    // trusted, so this was invisible. Measured 02/11/2026, trust granted:
    //
    //   cat.exe README.md               L0  'cat' is a known read-only command
    //   C:/tools/cat.exe README.md      L0  'cat' is a known read-only command
    //   C:\tools\cat.exe README.md      L3  command uses quoting the gate
    //                                       does not model
    //
    // Fail-closed, and a lane in Git Bash writes forward slashes, so the allow
    // tier works. Changing the quote parser is a security change of its own and
    // belongs in its own ticket, not bundled into this one.
    const decision = classifyShellCommand('C:\\tools\\cat.exe README.md', undefined, trustEverything)
    expect(decision.tier).toBe('L3')
    expect(decision.reason).toMatch(/quoting the gate does not model/)
  })

  it('does not trust a Windows path when no trust function is supplied', () => {
    // The fallback the gate uses when it is called without the hook.
    // `!includes('/')` read both of these as bare names and trusted them.
    expect(classifyShellCommand('C:\\lane\\cat.exe README.md').tier).toBe('L3')
    expect(classifyShellCommand('..\\lane\\cat README.md').tier).toBe('L3')
  })
})

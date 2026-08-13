import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { hostHome } from '@/lib/host-home'

const ORIGINAL = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME }

afterEach(() => {
  process.env.USERPROFILE = ORIGINAL.USERPROFILE
  process.env.HOME = ORIGINAL.HOME
  if (ORIGINAL.USERPROFILE === undefined) delete process.env.USERPROFILE
  if (ORIGINAL.HOME === undefined) delete process.env.HOME
})

describe('hostHome', () => {
  it('prefers USERPROFILE over HOME', () => {
    process.env.USERPROFILE = 'C:\\Users\\native'
    process.env.HOME = '/c/Users/msys'
    // Under Git Bash both are set and HOME is the MSYS form, which Node's fs
    // cannot resolve — taking HOME first would hand callers a broken path.
    expect(hostHome()).toBe('C:\\Users\\native')
  })

  it('falls back to HOME, and to empty when neither is set', () => {
    delete process.env.USERPROFILE
    process.env.HOME = '/home/phill'
    expect(hostHome()).toBe('/home/phill')

    delete process.env.HOME
    expect(hostHome()).toBe('')
  })

  it('ignores whitespace-only values rather than returning a blank path', () => {
    process.env.USERPROFILE = '   '
    process.env.HOME = '/home/phill'
    expect(hostHome()).toBe('/home/phill')
  })
})

// A build-time property, invisible to every runtime test AND to CI. @vercel/nft
// folds os.homedir() to a literal while tracing, then globs the resolved
// directory. On Windows that enumerates %LOCALAPPDATA% and its self-referential
// "Application Data" junction, and `next build` dies EPERM before compiling.
// Linux has no such junction, so CI stays green while every Windows build
// breaks. Only a source assertion can catch the regression.
//
// Repo-wide rather than a listed set of modules: a list only guards what someone
// remembered to add to it, and the failure it misses is invisible on CI. There
// is no allowlist because the count was already zero when this was installed.
//
// The ban is on the CALL, not on `node:os` — eight test files legitimately
// import tmpdir from it, and banning the import would be over-broad.
const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/
const SKIP_DIR = new Set(['node_modules', '.next', 'dist', 'build', '__tests__'])
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/

async function productionSources(dir: string, found: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Tests are excluded deliberately: nft traces shipped code, not specs, and
      // a spec reaching for the real home directory is not the hazard.
      if (!SKIP_DIR.has(entry.name)) await productionSources(full, found)
    } else if (CODE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)) {
      found.push(full)
    }
  }
  return found
}

describe('no shipped module folds a literal home directory', () => {
  it('holds across every production source file under src/', async () => {
    const root = path.join(process.cwd(), 'src')
    const files = await productionSources(root)

    // Guard the guard: a walk that silently found nothing would pass forever.
    expect(files.length).toBeGreaterThan(500)

    const offenders: string[] = []
    for (const file of files) {
      const code = (await readFile(file, 'utf-8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      // Second pattern catches `import { homedir as h }` — an aliased call the
      // first pattern would not see.
      if (/\bhomedir\s*\(/.test(code) || /import\s*\{[^}]*\bhomedir\b[^}]*\}\s*from\s*['"]node:os['"]/.test(code)) {
        offenders.push(path.relative(root, file).replace(/\\/g, '/'))
      }
    }

    expect(offenders, `use hostHome() from src/lib/host-home.ts instead:\n${offenders.join('\n')}`).toEqual([])
  })
})

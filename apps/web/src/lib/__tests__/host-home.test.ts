import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { HOME_OPAQUE_MODULES, hostHome } from '@/lib/host-home'

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
describe('modules that read machine-local files', () => {
  it.each(HOME_OPAQUE_MODULES)('%s never folds a literal home directory', async (moduleFile) => {
    const source = await readFile(path.join(process.cwd(), moduleFile), 'utf-8')
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')

    expect(code).not.toMatch(/\bhomedir\s*\(/)
    expect(code).not.toMatch(/from\s+['"]node:os['"]/)
  })
})

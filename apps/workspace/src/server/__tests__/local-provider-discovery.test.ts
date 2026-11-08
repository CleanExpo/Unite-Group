import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  readdirSync,
} = vi.hoisted(() => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(''),
  writeFileSync: vi.fn().mockImplementation(() => {}),
  mkdirSync: vi.fn().mockImplementation(() => {}),
  statSync: vi.fn().mockReturnValue({ isFile: () => false, mtimeMs: 0 }),
  readdirSync: vi.fn().mockReturnValue([]),
}))

vi.mock('node:fs', () => ({
  default: {
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    statSync,
    readdirSync,
  },
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  readdirSync,
}))

beforeEach(() => {
  vi.clearAllMocks()
  // local-provider-discovery reads HERMES_HOME BEFORE CLAUDE_HOME, so on a
  // machine that exports HERMES_HOME the CLAUDE_HOME set below was dead and
  // the mocked existsSync never matched the path the module asked for.
  vi.stubEnv('HERMES_HOME', undefined)
  vi.stubEnv('CLAUDE_HOME', undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

async function loadMod() {
  vi.resetModules()
  const mod = await import('../local-provider-discovery')
  // The module starts discovery at import time. Wait for that shared promise so
  // Vitest cannot tear down the worker while a probe is still logging.
  await mod.ensureDiscovery()
  return mod
}

describe('local-provider-discovery', () => {
  it('isProviderConfigured uses YAML.parse and reads from CLAUDE_HOME', async () => {
    const activeHome = '/mock/profiles/jarvis'
    vi.stubEnv('CLAUDE_HOME', activeHome)
    // path.join, as the module builds it: a `${activeHome}/config.yaml`
    // literal only matches on POSIX.
    const configPath = path.join(activeHome, 'config.yaml')
    existsSync.mockImplementation((p: string) => p === configPath)
    readFileSync.mockImplementation((p: string) => {
      if (p === configPath)
        return 'custom_providers:\n  - name: ollama\n    baseUrl: http://127.0.0.1:11434/v1\n'
      return ''
    })

    const mod = await loadMod()
    expect(mod.isProviderConfigured('ollama')).toBe(true)
    expect(mod.isProviderConfigured('atomic-chat')).toBe(false)
  })

  it('isProviderConfigured returns false when custom_providers is missing', async () => {
    const activeHome = '/mock/profiles/default'
    vi.stubEnv('CLAUDE_HOME', activeHome)
    // path.join, as the module builds it: a `${activeHome}/config.yaml`
    // literal only matches on POSIX.
    const configPath = path.join(activeHome, 'config.yaml')
    existsSync.mockImplementation((p: string) => p === configPath)
    readFileSync.mockImplementation((p: string) => {
      if (p === configPath) return 'model: some-model\n'
      return ''
    })

    const mod = await loadMod()
    expect(mod.isProviderConfigured('ollama')).toBe(false)
  })

  it('ensureProviderInConfig rate-limits warnings via loggedWarnings Set', async () => {
    const activeHome = '/mock/profiles/default'
    vi.stubEnv('CLAUDE_HOME', activeHome)
    // path.join, as the module builds it: a `${activeHome}/config.yaml`
    // literal only matches on POSIX.
    const configPath = path.join(activeHome, 'config.yaml')
    existsSync.mockImplementation((p: string) => p === configPath)
    readFileSync.mockImplementation((p: string) => {
      if (p === configPath) return 'model: m\n'
      return ''
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const mod = await loadMod()
    logSpy.mockClear()

    // first call should log
    mod.ensureProviderInConfig('ollama')
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0][0]).toContain('Gateway restart needed')

    // second call should NOT log (rate limited by Set)
    logSpy.mockClear()
    mod.ensureProviderInConfig('ollama')
    expect(logSpy).not.toHaveBeenCalled()

    logSpy.mockRestore()
  })
})

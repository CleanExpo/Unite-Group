import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { getHermesRoot, getLocalBinDir, getProfilesDir } from './claude-paths'

export const SWARM_CANONICAL_REPO = resolve(process.cwd())
export const SWARM_MEMORY_ROOT = join(homedir(), '.openclaw', 'workspace')
export const SWARM_MEMORY_HANDOFFS = join(SWARM_MEMORY_ROOT, 'memory')
export const SWARM_SENSITIVE_HOME_ROOTS = [
  join(homedir(), '.ssh'),
  join(homedir(), '.gnupg'),
  join(homedir(), '.aws'),
  join(homedir(), '.azure'),
  join(homedir(), '.kube'),
  join(homedir(), '.docker'),
  join(homedir(), '.config', 'gcloud'),
]
export const SWARM_FORBIDDEN_PATHS = [
  join(homedir(), 'hermes-workspace'),
  ...SWARM_SENSITIVE_HOME_ROOTS,
]

export type SwarmEnvironment = {
  canonicalRepo: string
  canonicalRepoExists: boolean
  memoryRoot: string
  memoryRootExists: boolean
  handoffsRoot: string
  handoffsRootExists: boolean
  hermesRoot: string
  profilesRoot: string
  localBinDir: string
  wrapperPattern: string
  tmuxSessionPattern: string
  defaultBuildCommand: string
  defaultTestCommand: string
  defaultDevCommand: string
  runtimeApis: Array<string>
  writableRoots: Array<string>
  readOnlyRoots: Array<string>
  forbiddenRoots: Array<string>
  notes: Array<string>
}

export function getSwarmEnvironment(): SwarmEnvironment {
  const hermesRoot = getHermesRoot()
  const profilesRoot = getProfilesDir()
  const localBinDir = getLocalBinDir()

  return {
    canonicalRepo: SWARM_CANONICAL_REPO,
    canonicalRepoExists: existsSync(SWARM_CANONICAL_REPO),
    memoryRoot: SWARM_MEMORY_ROOT,
    memoryRootExists: existsSync(SWARM_MEMORY_ROOT),
    handoffsRoot: SWARM_MEMORY_HANDOFFS,
    handoffsRootExists: existsSync(SWARM_MEMORY_HANDOFFS),
    hermesRoot,
    profilesRoot,
    localBinDir,
    wrapperPattern: join(localBinDir, 'swarmN'),
    tmuxSessionPattern: 'swarm-<workerId>',
    defaultBuildCommand: `cd ${SWARM_CANONICAL_REPO} && npm run build`,
    defaultTestCommand: `cd ${SWARM_CANONICAL_REPO} && npm test -- src/screens/swarm2`,
    defaultDevCommand: `cd ${SWARM_CANONICAL_REPO} && PORT=3002 npm run dev`,
    runtimeApis: [
      '/api/swarm-environment',
      '/api/swarm-runtime',
      '/api/swarm-roster',
      '/api/swarm-health',
      '/api/swarm-project',
      '/api/swarm-chat',
      '/api/swarm-decompose',
      '/api/swarm-dispatch',
      '/api/swarm-tmux-start',
      '/api/swarm-tmux-stop',
      '/api/swarm-tmux-scroll',
    ],
    writableRoots: [SWARM_CANONICAL_REPO, SWARM_MEMORY_HANDOFFS],
    readOnlyRoots: [SWARM_MEMORY_ROOT, profilesRoot, localBinDir],
    forbiddenRoots: SWARM_FORBIDDEN_PATHS,
    notes: [
      'Swarm code, git, build, and tests run only in the canonical repo.',
      'Do not use the legacy hermes-workspace alias for Swarm work.',
      'Worker profiles live under ~/.hermes/profiles/<workerId> and wrappers under ~/.local/bin/swarmN.',
      'Prefer live tmux-backed Hermes sessions over one-shot subprocesses.',
      'Use the swarm APIs as the machine-readable source of worker/runtime truth.',
      'Sensitive home credential roots are forbidden; remote operations use the authenticated SSH agent and approved host aliases, never key-file reads.',
    ],
  }
}

/**
 * Is `pathValue` a forbidden root, or anything underneath one?
 *
 * Containment is asked of `path.relative`, not of a string prefix. The prefix
 * form tested ``startsWith(`${root}/`)`` with a literal forward slash, while
 * the roots themselves are built by `join` — so on Windows a root reads
 * `C:\Users\<name>\.ssh`, no descendant ever matched, and every key under it
 * was reported as permitted. `path.relative` uses the platform separator and
 * folds case where the filesystem does, so each of those spellings is caught.
 *
 * `..` is compared whole, not by prefix: a child legitimately named `..foo`
 * yields the relative path `..foo`, which a `startsWith('..')` test would have
 * read as "outside the root" and allowed.
 */
export function isForbiddenSwarmPath(
  pathValue: string | null | undefined,
): boolean {
  if (!pathValue) return false
  return SWARM_FORBIDDEN_PATHS.some((root) => {
    const rel = relative(root, pathValue)
    if (rel === '') return true
    if (isAbsolute(rel)) return false
    return rel !== '..' && !rel.startsWith(`..${sep}`)
  })
}

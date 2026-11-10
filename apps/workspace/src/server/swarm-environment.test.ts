import { homedir } from 'node:os'
import { join, win32 } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SWARM_SENSITIVE_HOME_ROOTS,
  getSwarmEnvironment,
  isForbiddenSwarmPath,
  isUnderAnyRoot,
} from './swarm-environment'

describe('swarm environment sensitive-home boundary', () => {
  it('never exposes ~/.ssh as an agent-readable root', () => {
    const sshRoot = join(homedir(), '.ssh')
    const environment = getSwarmEnvironment()

    expect(environment.readOnlyRoots).not.toContain(sshRoot)
    expect(environment.forbiddenRoots).toContain(sshRoot)
    expect(isForbiddenSwarmPath(sshRoot)).toBe(true)
    expect(isForbiddenSwarmPath(join(sshRoot, 'id_ed25519'))).toBe(true)
  })

  it('denies common credential homes and all of their descendants', () => {
    const environment = getSwarmEnvironment()

    for (const root of SWARM_SENSITIVE_HOME_ROOTS) {
      expect(environment.readOnlyRoots).not.toContain(root)
      expect(environment.forbiddenRoots).toContain(root)
      expect(isForbiddenSwarmPath(root)).toBe(true)
      expect(isForbiddenSwarmPath(join(root, 'credential'))).toBe(true)
    }
  })

  it('contains each root without over-blocking its same-prefix siblings', () => {
    const sshRoot = join(homedir(), '.ssh')

    // Containment is asked of path.relative, so a directory that merely starts
    // with the same characters is outside the boundary and must stay readable.
    expect(isForbiddenSwarmPath(join(homedir(), '.sshfoo', 'notes.txt'))).toBe(
      false,
    )
    expect(isForbiddenSwarmPath(join(homedir(), '.aws-backup'))).toBe(false)

    // A child whose own name begins with two dots is still inside the root.
    // Its relative path is `..foo`, which a startsWith('..') test would have
    // mistaken for an escape and allowed.
    expect(isForbiddenSwarmPath(join(sshRoot, '..foo'))).toBe(true)
  })
})

// Windows path rules, exercised on every platform through path.win32 so the
// Linux CI job covers them too (UNI-3152 review round 1).
describe('credential boundary under Windows path rules', () => {
  const roots = ['C:\\Users\\Bob\\.ssh', '\\\\fileserver\\home\\Bob\\.aws']
  const denied = (p: string) => isUnderAnyRoot(p, roots, win32)

  it('denies every spelling of a path inside a root', () => {
    for (const p of [
      'C:\\Users\\Bob\\.ssh',
      'C:\\Users\\Bob\\.ssh\\id_ed25519',
      // Forward-slash spellings are derived, so no literal POSIX-looking home path sits in the repo.
      'C:\\Users\\Bob\\.ssh\\id_ed25519'.replace(/\\/g, '/'),
      'c:\\users\\bob\\.SSH\\id_ed25519',
      'C:\\Users\\Bob\\.ssh\\',
      'C:\\Users\\Bob\\.ssh\\..foo',
      '\\\\?\\C:\\Users\\Bob\\.ssh\\id_ed25519',
      '\\\\.\\C:\\Users\\Bob\\.ssh\\id_ed25519',
      '\\\\?\\C:\\Users\\Bob\\.ssh\\id_ed25519'.replace(/\\/g, '/'),
      '\\\\fileserver\\home\\Bob\\.aws\\credentials',
      '\\\\?\\UNC\\fileserver\\home\\Bob\\.aws\\credentials',
      '\\\\?\\unc\\fileserver\\home\\Bob\\.aws\\credentials',
      // Windows drops trailing dots and spaces from a component: these name the root itself.
      'C:\\Users\\Bob\\.ssh.',
      'C:\\Users\\Bob\\.ssh ',
      'C:\\Users\\Bob\\.ssh. .',
      'C:\\Users\\Bob\\.ssh.\\id_ed25519',
      'C:\\Users\\Bob.\\.ssh\\id_ed25519',
      'C:\\Users \\Bob\\.ssh \\id_ed25519',
      '\\\\fileserver\\home\\Bob\\.aws.\\credentials',
    ]) {
      expect(denied(p), p).toBe(true)
    }
  })

  it('still allows paths outside every root', () => {
    for (const p of [
      'C:\\Users\\Bob\\.sshfoo\\notes.txt',
      'C:\\Users\\Bob\\Documents\\id_ed25519',
      '\\\\?\\C:\\Users\\Bob\\Documents\\id_ed25519',
      'D:\\Users\\Bob\\.ssh\\id_ed25519',
      '\\\\fileserver\\home\\Bob\\.aws-backup\\x',
      'C:\\Users\\Bob\\.ssh2\\id_ed25519',
      'C:\\Users\\Bob\\.ssh.d\\id_ed25519',
    ]) {
      expect(denied(p), p).toBe(false)
    }
  })
})

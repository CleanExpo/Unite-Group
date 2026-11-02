import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SWARM_SENSITIVE_HOME_ROOTS,
  getSwarmEnvironment,
  isForbiddenSwarmPath,
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

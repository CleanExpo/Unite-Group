import { describe, expect, it } from 'vitest'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  getSwarmEnvironment,
  isForbiddenSwarmPath,
  SWARM_SENSITIVE_HOME_ROOTS,
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
})

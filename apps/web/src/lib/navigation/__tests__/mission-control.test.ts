import { describe, expect, it } from 'vitest'
import { getMissionControlSection, MISSION_CONTROL_HOME, MISSION_CONTROL_ROUTES } from '../mission-control'

describe('Mission Control route manifest', () => {
  it('has one canonical home and distinct destinations for every workspace', () => {
    expect(MISSION_CONTROL_HOME).toBe('/founder/command-centre')
    expect(MISSION_CONTROL_ROUTES).toHaveLength(12)
    expect(new Set(MISSION_CONTROL_ROUTES.map(route => route.href)).size).toBe(12)
    expect(MISSION_CONTROL_ROUTES.filter(route => route.section === 'home')).toHaveLength(1)
    for (const route of MISSION_CONTROL_ROUTES) expect(getMissionControlSection(route.href)).toBe(route.section)
  })
  it('recognises campaign children but never swallows unknown routes or genuine other cockpits', () => {
    expect(getMissionControlSection('/founder/campaigns/new')).toBe('campaigns')
    expect(getMissionControlSection('/founder/campaigns/abc')).toBe('campaigns')
    for (const path of ['/founder/command-centre/unknown', '/founder/command-centreish', '/founder/pi', '/founder/nexus', '/founder/campaigns/abc/unknown']) expect(getMissionControlSection(path)).toBeNull()
  })
})

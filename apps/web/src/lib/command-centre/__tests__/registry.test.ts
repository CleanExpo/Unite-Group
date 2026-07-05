import { describe, it, expect } from 'vitest'
import { getProjects, getProjectByName, mapPortfolioYamlToProjects } from '@/lib/command-centre/registry'

// Fixture-based, offline — models the exact drift UNI-2297 fixes: a
// CCW / CCW-CRM duplicate (dedupe), Duncan-Perkins-Ventures carrying the
// Lodgey alias (previously invisible on the deck), and a blocked ATIA row
// with no invented repo/vercel claims.
const FIXTURE = `
schema_version: 1
generated_at: 2026-07-05
parent_company: Unite-Group Nexus Pty Ltd
products:
  - canonical_name: RestoreAssist
    aliases: [RA]
    purpose: Restoration product
    status: active
    owner: phill
    github:
      org: CleanExpo
      repo: RestoreAssist
    local:
      access_via: D:\\Unite-Group\\RestoreAssist
    vercel:
      team_id: team_abc
      production:
        domain: restoreassist.app
    workflow:
      ci_required_checks: [typecheck, lint, test, build]
  - canonical_name: CCW-CRM
    aliases: [CCW, CCW CRM]
    purpose: CRM for client CCW (Carpet Cleaning of WA) — the fuller, canonical entry.
    status: active
    owner: phill
    github:
      org: CleanExpo
      repo: CCW-CRM
    local:
      access_via: D:\\Unite-Group\\CCW-CRM
    vercel:
      team_id: team_abc
      production:
        domain: ccw-crm-web.vercel.app
    workflow:
      ci_required_checks: [typecheck, lint, build]
  - canonical_name: CCW-CRM
    aliases: [CCW]
    purpose: Client account CCW, thin duplicate.
    status: active
    owner: phill
    github:
      org: CleanExpo
      repo: CCW-CRM
    local:
      access_via: D:\\Unite-Group\\clients\\CCW
    vercel:
      team_id: team_abc
      production:
        domain: ccw-crm-web.vercel.app
    workflow:
      ci_required_checks: []
  - canonical_name: Duncan-Perkins-Ventures
    aliases: [Duncan, Duncan Perkins, FITR, ITR Button, Lodgey, DIY Home Loan]
    purpose: Duncan Perkins' financial-services ventures — ITR Button (Lodgey) + DIY Home Loan.
    status: planned
    owner: phill
    github:
      org: CleanExpo
      repo: TBD
    local:
      access_via: null
    vercel:
      team_id: team_abc
      production:
        domain: TBD
  - canonical_name: ATIA
    aliases: []
    purpose: Multi-trade concierge/trades-network vertical pack for Nexus Concierge OS (UNI-2173).
    status: blocked
    note: blocked on trademark contest (UNI-2173)
    owner: phill
    github:
      org: null
      repo: null
    local:
      access_via: null
    vercel:
      team_id: team_abc
      production:
        domain: null
`

describe('mapPortfolioYamlToProjects (fixture, offline)', () => {
  it('maps a fully-populated portfolio product to a command-centre project', () => {
    const projects = mapPortfolioYamlToProjects(FIXTURE)
    const ra = projects.find((p) => p.name === 'RestoreAssist')
    expect(ra).toMatchObject({
      name: 'RestoreAssist',
      github_repo: 'CleanExpo/RestoreAssist',
      production_url: 'https://restoreassist.app',
      linear_prefix: 'RA',
      status: 'active',
      owner: 'Phill McGurk',
    })
    expect(ra?.validation_commands).toEqual(['pnpm type-check', 'pnpm lint', 'pnpm test', 'pnpm build'])
    expect(ra?.integration_status_url).toBe('https://restoreassist.app/api/v1/connections/status')
  })

  it('dedupes duplicate canonical_name entries, keeping the richer metadata', () => {
    const projects = mapPortfolioYamlToProjects(FIXTURE)
    const ccw = projects.filter((p) => p.name === 'CCW-CRM')
    expect(ccw).toHaveLength(1)
    expect(ccw[0].linear_prefix).toBe('CCW')
    // The richer entry declared real CI checks; the thin duplicate declared none.
    expect(ccw[0].validation_commands.length).toBeGreaterThan(0)
  })

  it('surfaces Duncan-Perkins-Ventures (carrying the Lodgey alias) with no invented repo/vercel data', () => {
    const projects = mapPortfolioYamlToProjects(FIXTURE)
    const duncan = projects.find((p) => p.name === 'Duncan-Perkins-Ventures')
    expect(duncan).toBeDefined()
    expect(duncan?.status).toBe('planned')
    expect(duncan?.github_repo).toBeNull() // repo is "TBD" — not a real repo yet
    expect(duncan?.production_url).toBeNull() // domain is "TBD"
  })

  it('surfaces ATIA as blocked with no invented repo/vercel claims', () => {
    const projects = mapPortfolioYamlToProjects(FIXTURE)
    const atia = projects.find((p) => p.name === 'ATIA')
    expect(atia).toBeDefined()
    expect(atia?.status).toBe('blocked')
    expect(atia?.github_repo).toBeNull()
    expect(atia?.production_url).toBeNull()
    expect(atia?.integration_status_url).toBeNull()
    expect(atia?.linear_prefix).toBe('UNI')
  })

  it('throws on malformed YAML missing a products array', () => {
    expect(() => mapPortfolioYamlToProjects('schema_version: 1\n')).toThrow(/malformed PORTFOLIO\.yaml/)
  })
})

describe('getProjects (real repo-root PORTFOLIO.yaml)', () => {
  it('loads the live SSOT without throwing and includes ATIA with no CCW/CCW-CRM duplicate', async () => {
    const projects = await getProjects()
    expect(projects.length).toBeGreaterThan(0)
    expect(projects.some((p) => p.name === 'ATIA')).toBe(true)
    expect(projects.filter((p) => p.name === 'CCW-CRM')).toHaveLength(1)
    expect(projects.some((p) => p.name === 'Duncan-Perkins-Ventures')).toBe(true)
  })

  it('looks up projects case-insensitively', async () => {
    const p = await getProjectByName('restoreassist')
    expect(p?.name).toBe('RestoreAssist')
  })
})

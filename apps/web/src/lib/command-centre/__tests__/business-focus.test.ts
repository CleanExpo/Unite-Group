import { describe, expect, it } from 'vitest'
import { buildBusinessFocusPayload } from '../business-focus'
import type { CommandCentreProject } from '../registry'

function project(overrides: Partial<CommandCentreProject> & Pick<CommandCentreProject, 'name'>): CommandCentreProject {
  return {
    name: overrides.name,
    repo_path: `D:/Unite-Group/${overrides.name}`,
    github_repo: `CleanExpo/${overrides.name}`,
    business_purpose: `${overrides.name} purpose`,
    brand_rules_ref: `brand-context/${overrides.name}.md`,
    deployment_target: 'Vercel',
    owner: 'Phill McGurk',
    status: 'active',
    evidence_vault_path: `raw/command-centre/${overrides.name}`,
    validation_commands: ['pnpm test'],
    linear_prefix: 'UNI',
    production_url: `https://${overrides.name.toLowerCase()}.example.com`,
    ...overrides,
  }
}

describe('buildBusinessFocusPayload', () => {
  it('maps canonical businesses to registry projects and summaries', () => {
    const payload = buildBusinessFocusPayload(
      [
        project({ name: 'RestoreAssist', github_repo: 'CleanExpo/RestoreAssist' }),
        project({ name: 'Synthex', integration_status_url: 'https://synthex.social/api/v1/connections/status' }),
        project({ name: 'CCW-CRM', github_repo: 'CleanExpo/CCW-CRM' }),
      ],
      new Date('2026-06-17T00:00:00Z'),
    )

    expect(payload.source).toBe('cc:business-focus')
    expect(payload.summary.businesses).toBe(7)
    expect(payload.summary.owned).toBe(6)
    expect(payload.summary.clients).toBe(1)
    expect(payload.items.find((item) => item.key === 'restore')).toMatchObject({
      name: 'RestoreAssist',
      signal: 'live',
      primaryProjectName: 'RestoreAssist',
      githubRepo: 'CleanExpo/RestoreAssist',
    })
    expect(payload.items.find((item) => item.key === 'synthex')?.integrationStatusUrl).toContain('/connections/status')
  })

  it('flags missing repo and production URL gaps as actionable signals', () => {
    const payload = buildBusinessFocusPayload([
      project({ name: 'CARSI', github_repo: null, production_url: null, status: 'stub' }),
      project({ name: 'ATO-APP', production_url: null }),
    ])

    expect(payload.items.find((item) => item.key === 'carsi')).toMatchObject({
      signal: 'needs_repo',
      nextAction: 'Connect CARSI to a repo-backed project before assigning agent work.',
    })
    expect(payload.items.find((item) => item.key === 'ato')).toMatchObject({
      signal: 'needs_url',
      nextAction: 'Add the production URL for ATO-APP so Mission Control can verify it.',
    })
  })
})

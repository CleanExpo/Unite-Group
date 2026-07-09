import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = join(process.cwd(), '../..')

describe('automation control-plane configuration', () => {
  it('keeps Brand Video manual-only without an unattended schedule', () => {
    const workflow = readFileSync(
      join(repoRoot, '.github/workflows/brand-video-render.yml'),
      'utf8',
    )

    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).not.toContain('repository_dispatch:')
    expect(workflow).not.toMatch(/^\s*schedule:/m)
    expect(workflow).not.toMatch(/^\s*- cron:/m)
  })

  it('uses a fifteen-minute operator queue reconciliation backstop', () => {
    const installer = readFileSync(
      join(
        repoRoot,
        'apps/autopilot-runner/scripts/install-operator-jobs-service.sh',
      ),
      'utf8',
    )

    expect(installer).toContain('<key>StartInterval</key><integer>900</integer>')
    expect(installer).not.toContain('<key>StartInterval</key><integer>60</integer>')
  })
})
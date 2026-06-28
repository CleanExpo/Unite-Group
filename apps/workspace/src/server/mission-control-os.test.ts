import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildMissionControlOsStatus } from './mission-control-os'

let tempRoot = ''
const originalEnv = { ...process.env }

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-control-os-'))
  process.env = { ...originalEnv }
})

afterEach(async () => {
  process.env = { ...originalEnv }
  await fs.rm(tempRoot, { recursive: true, force: true })
})

describe('Mission Control OS status', () => {
  it('locks Obsidian to the configured 2nd Brain vault and reports folder/file counts', async () => {
    const vault = path.join(tempRoot, '2nd-brain')
    await fs.mkdir(path.join(vault, 'Sources'), { recursive: true })
    await fs.mkdir(path.join(vault, 'Sketches'), { recursive: true })
    await fs.mkdir(path.join(vault, 'Outcomes'), { recursive: true })
    await fs.writeFile(path.join(vault, 'CLAUDE.md'), '# 2nd Brain\n')
    await fs.writeFile(path.join(vault, 'Sources', 'source.md'), '# Source\n')
    await fs.writeFile(path.join(vault, 'Sketches', 'layout.md'), '# Layout\n')
    process.env.OBSIDIAN_VAULT_PATH = vault

    const status = await buildMissionControlOsStatus({
      vaultPath: vault,
      mirrorPath: path.join(tempRoot, 'missing-mirror'),
    })

    expect(status.obsidian.status).toBe('connected')
    expect(status.obsidian.path).toBe(vault)
    expect(status.obsidian.markdownFiles).toBe(3)
    expect(status.obsidian.folders).toEqual(
      expect.arrayContaining(['Sources', 'Sketches', 'Outcomes']),
    )
    expect(status.obsidian.readFirst).toContain('CLAUDE.md')
  })

  it('surfaces the Julian Goldie feature map without enabling new vendors or Sakana logic', async () => {
    const status = await buildMissionControlOsStatus({
      vaultPath: path.join(tempRoot, 'missing'),
    })

    expect(status.title).toBe('Mission Control')
    expect(status.mode).toBe('systems-over-models')
    expect(status.guardrails).toContain('no-sakana-fugu-logic')
    expect(status.guardrails).toContain('no-new-vendors')
    expect(status.decisionSurface.headline).toBe(
      'Build the OS from local truth first.',
    )
    expect(status.quickCommands.map((command) => command.id)).toEqual([
      'daily-priority-brief',
      'source-to-shape',
      'seo-approval-packet',
      'video-command-packet',
    ])
    expect(status.operatorGates).toContain(
      'new vendors, accounts, or connector platforms',
    )
    expect(status.featureMap.map((feature) => feature.id)).toEqual([
      'memory-galaxy',
      'hermes-jarvis',
      'news-radar',
      'video-agent',
      'seo-agent-os',
      'loop-engineering',
    ])
  })
})

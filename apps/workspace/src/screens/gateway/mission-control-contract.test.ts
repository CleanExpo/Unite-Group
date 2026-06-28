import { describe, expect, it } from 'vitest'
import {
  MISSION_CONTROL_DOMAIN_CARDS,
  MISSION_CONTROL_LAYOUT_CONTRACT,
} from './conductor'

describe('Mission Control Agent OS layout contract', () => {
  it('keeps the surface named Mission Control while matching the Julian Goldie Agent OS structure', () => {
    expect(MISSION_CONTROL_LAYOUT_CONTRACT.name).toBe('Mission Control')
    expect(MISSION_CONTROL_LAYOUT_CONTRACT.reference).toBe(
      'Julian Goldie Agent OS + Obsidian + Memory Galaxy',
    )
    expect(MISSION_CONTROL_LAYOUT_CONTRACT.zones).toEqual([
      'top-command-rail',
      'hermes-oracle-feed',
      'obsidian-vault-galaxy',
      'memory-galaxy-map',
      'jarvis-voice-panel',
      'jarvis-command-tabs',
      'wall-mode-control',
      'decision-surface',
      'safe-command-generator',
      'domain-card-belt',
      'mission-composer',
    ])
    expect(MISSION_CONTROL_LAYOUT_CONTRACT.guardrails).toContain(
      'no-new-vendors',
    )
    expect(MISSION_CONTROL_LAYOUT_CONTRACT.guardrails).toContain(
      'no-sakana-fugu-logic',
    )
  })

  it('maps the generated Agent OS functions into Unite-owned first-party domains', () => {
    expect(MISSION_CONTROL_DOMAIN_CARDS.map((card) => card.title)).toEqual([
      'Memory Galaxy',
      'Hermes Jarvis',
      'News Radar',
      'Video Agent',
      'SEO Agent OS',
      'Loop Engineering',
    ])
    expect(
      MISSION_CONTROL_DOMAIN_CARDS.flatMap((card) => card.actions),
    ).toContain('Daily briefing')
    expect(
      MISSION_CONTROL_DOMAIN_CARDS.flatMap((card) => card.actions),
    ).toContain('Voice wake mode')
    expect(
      MISSION_CONTROL_DOMAIN_CARDS.flatMap((card) => card.actions),
    ).toContain('Video Command Center')
    expect(
      MISSION_CONTROL_DOMAIN_CARDS.flatMap((card) => card.actions),
    ).toContain('Generate drafts')
    expect(
      MISSION_CONTROL_DOMAIN_CARDS.find((card) => card.title === 'SEO Agent OS')
        ?.subtitle,
    ).toBe('Keyword → draft → approval')
  })
})

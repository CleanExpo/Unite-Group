// src/lib/advisory/__tests__/structured-output.test.ts
import { describe, it, expect } from 'vitest'

import {
  extractJson,
  parseFirmProposal,
  parseJudgeOutput,
  FirmProposalSchema,
  JudgeOutputSchema,
} from '../structured-output'

// ── Fixtures ──────────────────────────────────────────────────────────────

function validProposal() {
  return {
    summary: 'Apportion home-office costs and prepay deductible expenses.',
    strategies: [
      {
        title: 'Home-office apportionment',
        description: 'Claim the work-related portion of running costs.',
        estimatedSavingsAud: 1200,
        implementationSteps: ['Measure area', 'Keep a diary'],
        timeframe: 'This FY',
        riskLevel: 'low',
        citations: [
          { type: 'ato_ruling', reference: 'TR 93/30', title: 'Home office', relevance: 'On point.' },
        ],
      },
    ],
    confidenceScore: 82,
    riskFlags: [],
    auditTriggers: [],
  }
}

const FIRMS = ['tax_strategy', 'grants_incentives', 'cashflow_optimisation', 'compliance'] as const

function validJudgeOutput() {
  return {
    scores: FIRMS.map((firmKey) => ({
      firmKey,
      legality: 90,
      complianceRisk: 80,
      financialOutcome: 70,
      documentation: 60,
      ethics: 95,
      rationale: 'Solid and well-cited.',
      riskFlags: [],
      auditTriggers: [],
    })),
    winner: 'tax_strategy',
    summary: 'Tax Strategy wins on legality and documentation.',
  }
}

// ── extractJson ───────────────────────────────────────────────────────────

describe('extractJson', () => {
  it('extracts from a ```json fenced block', () => {
    const text = 'Here you go:\n```json\n{"a":1}\n```\nThanks.'
    expect(extractJson(text)).toBe('{"a":1}')
  })

  it('extracts from a plain ``` fenced block', () => {
    expect(extractJson('```\n{"b":2}\n```')).toBe('{"b":2}')
  })

  it('extracts raw JSON between the first { and last }', () => {
    expect(extractJson('prose {"c":3} trailing')).toBe('{"c":3}')
  })

  it('returns the original text when there is no JSON', () => {
    expect(extractJson('no json here')).toBe('no json here')
  })
})

// ── parseFirmProposal ─────────────────────────────────────────────────────

describe('parseFirmProposal', () => {
  it('parses a valid proposal wrapped in a markdown fence', () => {
    const text = '```json\n' + JSON.stringify(validProposal()) + '\n```'
    const result = parseFirmProposal(text)
    expect(result.confidenceScore).toBe(82)
    expect(result.strategies).toHaveLength(1)
  })

  it('throws when there are no strategies (min 1)', () => {
    const bad = { ...validProposal(), strategies: [] }
    expect(() => parseFirmProposal(JSON.stringify(bad))).toThrow()
  })

  it('throws when confidenceScore is out of the 0–100 range', () => {
    const bad = { ...validProposal(), confidenceScore: 140 }
    expect(() => parseFirmProposal(JSON.stringify(bad))).toThrow()
  })

  it('throws on invalid JSON', () => {
    expect(() => parseFirmProposal('not json at all')).toThrow()
  })

  it('rejects an unknown citation type via the schema', () => {
    const bad = validProposal()
    ;(bad.strategies[0].citations[0] as { type: string }).type = 'made_up'
    expect(FirmProposalSchema.safeParse(bad).success).toBe(false)
  })
})

// ── parseJudgeOutput ──────────────────────────────────────────────────────

describe('parseJudgeOutput', () => {
  it('parses a valid 4-firm judge output', () => {
    const result = parseJudgeOutput(JSON.stringify(validJudgeOutput()))
    expect(result.winner).toBe('tax_strategy')
    expect(result.scores).toHaveLength(4)
  })

  it('throws when the score array is not exactly 4 entries', () => {
    const bad = validJudgeOutput()
    bad.scores = bad.scores.slice(0, 3)
    expect(() => parseJudgeOutput(JSON.stringify(bad))).toThrow()
  })

  it('throws when the winner is not a known firm key', () => {
    const bad = { ...validJudgeOutput(), winner: 'nobody' }
    expect(JudgeOutputSchema.safeParse(bad).success).toBe(false)
  })

  it('throws when a score exceeds 100', () => {
    const bad = validJudgeOutput()
    bad.scores[0].legality = 101
    expect(() => parseJudgeOutput(JSON.stringify(bad))).toThrow()
  })
})

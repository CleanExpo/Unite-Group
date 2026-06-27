import { describe, it, expect } from 'vitest'
import { hasAcceptanceCriteria } from '@/lib/command-centre/linear-claim'

// The work→task bridge (B8) builds a Linear issue description from an insight.
// The issue is only claim-eligible for autonomous work if its description carries
// an "Acceptance Criteria" heading (src/lib/command-centre/linear-claim.ts). This
// guards the exact template the create-issue route uses against that contract.
function buildDescription(body: string, acceptanceCriteria: string, evidenceIds: string[]): string {
  const evidenceSection = evidenceIds.length
    ? `\n\n## Evidence\n${evidenceIds.map((e) => `- ${e}`).join('\n')}`
    : ''
  return (
    `${body}\n\n## Acceptance Criteria\n${acceptanceCriteria}` +
    evidenceSection +
    `\n\n---\nCreated from strategy insight \`abc\` (strategy).`
  )
}

describe('work→task bridge description', () => {
  it('produces a claim-eligible description (has Acceptance Criteria heading)', () => {
    const desc = buildDescription('Investigate slow query', 'Page loads under 1s', [
      'https://example.com/trace',
    ])
    expect(hasAcceptanceCriteria({ description: desc })).toBe(true)
  })

  it('includes the evidence section when evidence is supplied', () => {
    const desc = buildDescription('body', 'criteria', ['https://example.com/a', 'ref-2'])
    expect(desc).toContain('## Evidence')
    expect(desc).toContain('- https://example.com/a')
    expect(desc).toContain('- ref-2')
  })

  it('omits the evidence section when no evidence is supplied', () => {
    const desc = buildDescription('body', 'criteria', [])
    expect(desc).not.toContain('## Evidence')
    expect(hasAcceptanceCriteria({ description: desc })).toBe(true)
  })
})

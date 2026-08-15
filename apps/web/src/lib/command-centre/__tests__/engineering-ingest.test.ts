import { describe, expect, it } from 'vitest'

import {
  ENGINEERING_CATEGORIES,
  EngineeringIngestRefusal,
  ingestEngineering,
  parseFrontmatter,
  planFromEngineering,
  readEngineeringArtifact,
  type CategoryState,
  type EngineeringCategory,
} from '@/lib/command-centre/engineering-ingest'

/** Build a conforming engineering.md, overriding individual categories. */
function doc(
  overrides: Partial<Record<EngineeringCategory, { state?: CategoryState; blocking?: boolean; answer?: string }>> = {},
  meta: { type?: string; spec?: string; sha?: string; status?: string } = {},
): string {
  const lines = [
    '---',
    `type: ${meta.type ?? 'engineering-requirements'}`,
    `spec: ${meta.spec ?? '.spm/2026-08-15-example.md'}`,
    `spec_sha256: ${meta.sha ?? 'abc123'}`,
  ]
  if (meta.status !== undefined) lines.push(`status: ${meta.status}`)
  lines.push('categories:')
  for (const name of ENGINEERING_CATEGORIES) {
    const o = overrides[name] ?? {}
    lines.push(`  ${name}:`)
    lines.push(`    state: ${o.state ?? 'DECIDED'}`)
    lines.push(`    blocking: ${o.blocking ?? false}`)
    lines.push(`    answer: ${o.answer ?? `answer for ${name}`}`)
  }
  lines.push('---', '', '# body')
  return lines.join('\n')
}

describe('parseFrontmatter', () => {
  it('reads the two-level mapping the gate enforces', () => {
    const meta = parseFrontmatter(doc())
    expect(meta.type).toBe('engineering-requirements')
    const categories = meta.categories as Record<string, Record<string, string>>
    expect(categories.data_model.state).toBe('DECIDED')
    expect(categories.rollback.blocking).toBe('false')
  })

  it('refuses a document with no frontmatter rather than returning {}', () => {
    expect(() => parseFrontmatter('# just a heading')).toThrow(EngineeringIngestRefusal)
  })
})

describe('readEngineeringArtifact — refusals', () => {
  it('refuses a document that is not an engineering-requirements artefact', () => {
    expect(() => readEngineeringArtifact(doc({}, { type: 'spec' }))).toThrow(/not engineering-requirements/)
  })

  it('refuses a missing spec binding', () => {
    const raw = doc().replace(/^spec_sha256: .*$/m, 'spec_sha256:')
    expect(() => readEngineeringArtifact(raw)).toThrow(/missing `spec_sha256`/)
  })

  it('refuses when any of the ten categories is absent', () => {
    const raw = doc()
      .split('\n')
      .filter((line, index, all) => {
        const start = all.indexOf('  budget:')
        return index < start || index > start + 3
      })
      .join('\n')
    expect(() => readEngineeringArtifact(raw)).toThrow(/category `budget` is missing/)
  })

  it('refuses an illegal state instead of treating it as skippable', () => {
    expect(() => readEngineeringArtifact(doc({ concurrency: { state: 'MAYBE' as CategoryState } }))).toThrow(
      /illegal state `MAYBE`/,
    )
  })

  it('refuses a BLOCKED artefact — a blocking finding must not become code', () => {
    expect(() => readEngineeringArtifact(doc({ migration: { blocking: true } }))).toThrow(
      /blocking findings must be resolved.*`migration`/s,
    )
  })

  it('refuses a document that mislabels itself PASS while carrying a blocking finding', () => {
    let caught: EngineeringIngestRefusal | null = null
    try {
      readEngineeringArtifact(doc({ rollback: { blocking: true } }, { status: 'PASS' }))
    } catch (error) {
      caught = error as EngineeringIngestRefusal
    }
    expect(caught).toBeInstanceOf(EngineeringIngestRefusal)
    // status is DERIVED, so the label must not be able to launder the finding.
    expect(caught?.reasons.some((r) => /status is derived, not chosen/.test(r))).toBe(true)
  })

  it('reports every reason at once rather than only the first', () => {
    let caught: EngineeringIngestRefusal | null = null
    try {
      readEngineeringArtifact(doc({}, { type: 'spec', sha: '' }))
    } catch (error) {
      caught = error as EngineeringIngestRefusal
    }
    expect(caught!.reasons.length).toBeGreaterThan(1)
  })
})

describe('readEngineeringArtifact — acceptance', () => {
  it('accepts a conforming, unblocked artefact and derives PASS', () => {
    const artifact = readEngineeringArtifact(doc())
    expect(artifact.status).toBe('PASS')
    expect(artifact.spec).toBe('.spm/2026-08-15-example.md')
    expect(artifact.specSha256).toBe('abc123')
    expect(Object.keys(artifact.categories)).toHaveLength(ENGINEERING_CATEGORIES.length)
  })
})

describe('planFromEngineering', () => {
  it('emits one step per work-generating category, in fixed implementation order', () => {
    const plan = planFromEngineering(readEngineeringArtifact(doc()))
    expect(plan.steps).toHaveLength(10)
    expect(plan.planned[0]).toBe('data_model')
    expect(plan.planned[1]).toBe('migration')
    expect(plan.planned.at(-1)).toBe('test_oracle')
  })

  it('is deterministic — the same artefact yields an identical plan', () => {
    const a = planFromEngineering(readEngineeringArtifact(doc()))
    const b = planFromEngineering(readEngineeringArtifact(doc()))
    expect(b).toEqual(a)
  })

  it('generates NO step for DEFERRED or N/A, and records why they were skipped', () => {
    const plan = planFromEngineering(
      readEngineeringArtifact(doc({ concurrency: { state: 'DEFERRED' }, budget: { state: 'N/A' } })),
    )
    expect(plan.planned).not.toContain('concurrency')
    expect(plan.planned).not.toContain('budget')
    expect(plan.skipped).toEqual(
      expect.arrayContaining([
        { category: 'concurrency', state: 'DEFERRED' },
        { category: 'budget', state: 'N/A' },
      ]),
    )
  })

  it('treats PRESCRIBED as settled work, same as DECIDED', () => {
    const plan = planFromEngineering(readEngineeringArtifact(doc({ invariants: { state: 'PRESCRIBED' } })))
    expect(plan.planned).toContain('invariants')
  })

  it('escalates migration and rollback above low so they require a human', () => {
    const plan = planFromEngineering(readEngineeringArtifact(doc()))
    const risk = (title: string) => plan.steps.find((s) => s.title.startsWith(title))?.riskLevel
    expect(risk('Migration')).toBe('high')
    expect(risk('Rollback path')).toBe('high')
    // decomposeApprovedIdea sets humanApprovalRequired for anything above 'low'.
    expect(risk('Migration')).not.toBe('low')
  })

  it('carries the reviewer answer as the objective', () => {
    const plan = planFromEngineering(
      readEngineeringArtifact(doc({ data_model: { answer: 'One table, founder-scoped.' } })),
    )
    expect(plan.steps[0].objective).toBe('One table, founder-scoped.')
  })

  it('flags a missing answer instead of inventing an objective', () => {
    const plan = planFromEngineering(readEngineeringArtifact(doc({ data_model: { answer: '' } })))
    expect(plan.steps[0].objective).toMatch(/recorded no answer\. Resolve before implementing\./)
  })

  it('returns an empty plan — with every skip recorded — when nothing is settled', () => {
    const allDeferred = Object.fromEntries(
      ENGINEERING_CATEGORIES.map((name) => [name, { state: 'DEFERRED' as CategoryState }]),
    )
    const plan = planFromEngineering(readEngineeringArtifact(doc(allDeferred)))
    expect(plan.steps).toEqual([])
    // The empty plan must be explainable: 10 skips, not silence.
    expect(plan.skipped).toHaveLength(ENGINEERING_CATEGORIES.length)
  })

  it('binds the plan to the spec it came from', () => {
    const plan = ingestEngineering(doc({}, { spec: '.spm/x.md', sha: 'deadbeef' }))
    expect(plan.spec).toBe('.spm/x.md')
    expect(plan.specSha256).toBe('deadbeef')
  })
})

describe('the plan is consumable by decomposeApprovedIdea', () => {
  it('produces steps with the exact DecompositionStep shape', () => {
    const plan = ingestEngineering(doc())
    for (const step of plan.steps) {
      expect(typeof step.title).toBe('string')
      expect(step.title.length).toBeGreaterThan(0)
      expect(typeof step.objective).toBe('string')
      expect(['low', 'medium', 'high', 'critical']).toContain(step.riskLevel)
    }
  })
})

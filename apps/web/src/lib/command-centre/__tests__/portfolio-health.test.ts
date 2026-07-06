import { describe, it, expect } from 'vitest'
import {
  repoColor,
  overallColor,
  deriveRepoHealth,
  buildPortfolioHealth,
  type RepoHealth,
} from '../portfolio-health'

describe('repoColor', () => {
  it('grey when the repo could not be read', () => {
    expect(repoColor('unknown', 0, true)).toBe('grey')
  })
  it('red when the latest run failed', () => {
    expect(repoColor('failure', 0, false)).toBe('red')
  })
  it('green only on a clean latest success', () => {
    expect(repoColor('success', 0, false)).toBe('green')
  })
  it('yellow on a passing latest but a flaky rolling-10 window', () => {
    expect(repoColor('success', 2, false)).toBe('yellow')
  })
  it('yellow for in-flight / cancelled / unknown', () => {
    expect(repoColor('in_progress', 0, false)).toBe('yellow')
    expect(repoColor('cancelled', 0, false)).toBe('yellow')
    expect(repoColor('unknown', 0, false)).toBe('yellow')
  })
})

describe('overallColor', () => {
  const r = (color: RepoHealth['color']): RepoHealth => ({
    repo: 'x', fullName: 'o/x', latestConclusion: 'success', failCountLast10: 0, latestRunAt: null, latestRunUrl: null, color,
  })
  it('grey for an empty set', () => {
    expect(overallColor([])).toBe('grey')
  })
  it('returns the worst colour (red beats yellow beats grey beats green)', () => {
    expect(overallColor([r('green'), r('yellow'), r('red')])).toBe('red')
    expect(overallColor([r('green'), r('yellow')])).toBe('yellow')
    expect(overallColor([r('green'), r('grey')])).toBe('grey')
    expect(overallColor([r('green'), r('green')])).toBe('green')
  })
})

describe('deriveRepoHealth', () => {
  it('maps an error result to a grey card carrying the reason', () => {
    const h = deriveRepoHealth('Synthex', 'CleanExpo/Synthex', { ok: false, error: 'HTTP 500' })
    expect(h.color).toBe('grey')
    expect(h.error).toBe('HTTP 500')
    expect(h.latestConclusion).toBe('unknown')
  })

  it('counts fails in the rolling-10 window and takes the latest run metadata', () => {
    const h = deriveRepoHealth('Nexus', 'CleanExpo/Unite-Group', {
      ok: true,
      runs: [
        { conclusion: 'success', status: 'completed', html_url: 'https://x/1', updated_at: '2026-07-05T02:00:00Z' },
        { conclusion: 'failure', status: 'completed' },
        { conclusion: 'failure', status: 'completed' },
      ],
    })
    expect(h.latestConclusion).toBe('success')
    expect(h.failCountLast10).toBe(2)
    expect(h.color).toBe('yellow')
    expect(h.latestRunUrl).toBe('https://x/1')
  })

  it('treats a running (null-conclusion, non-completed) latest as in_progress', () => {
    const h = deriveRepoHealth('RA', 'o/RA', { ok: true, runs: [{ conclusion: null, status: 'in_progress' }] })
    expect(h.latestConclusion).toBe('in_progress')
    expect(h.color).toBe('yellow')
  })
})

describe('buildPortfolioHealth', () => {
  const repos = [
    { repo: 'RestoreAssist', fullName: 'CleanExpo/RestoreAssist' },
    { repo: 'Synthex', fullName: 'CleanExpo/Synthex' },
  ]

  it('source github_live + linear_live on the happy path', async () => {
    const payload = await buildPortfolioHealth({
      repos,
      fetchRuns: async () => ({ ok: true, runs: [{ conclusion: 'success', status: 'completed' }] }),
      fetchP0P1: async () => ({ ok: true, count: 3 }),
      now: '2026-07-05T00:00:00Z',
    })
    expect(payload.source).toBe('github_live')
    expect(payload.linearSource).toBe('linear_live')
    expect(payload.openP0P1).toBe(3)
    expect(payload.overall).toBe('green')
  })

  it('source error when every repo fails; openP0P1 null on not_configured Linear', async () => {
    const payload = await buildPortfolioHealth({
      repos,
      fetchRuns: async () => ({ ok: false, error: 'timeout' }),
      fetchP0P1: async () => ({ ok: 'not_configured' }),
      now: '2026-07-05T00:00:00Z',
    })
    expect(payload.source).toBe('error')
    expect(payload.overall).toBe('grey')
    expect(payload.linearSource).toBe('not_configured')
    expect(payload.openP0P1).toBeNull()
  })

  it('source partial when only some repos fail', async () => {
    const payload = await buildPortfolioHealth({
      repos,
      fetchRuns: async (full) =>
        full.includes('Synthex') ? { ok: false, error: 'HTTP 404' } : { ok: true, runs: [{ conclusion: 'success', status: 'completed' }] },
      fetchP0P1: async () => ({ ok: false, error: 'HTTP 401' }),
      now: '2026-07-05T00:00:00Z',
    })
    expect(payload.source).toBe('partial')
    expect(payload.linearSource).toBe('error')
    expect(payload.openP0P1).toBeNull()
  })
})

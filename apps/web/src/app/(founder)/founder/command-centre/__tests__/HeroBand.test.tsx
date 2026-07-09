// src/app/(founder)/founder/command-centre/__tests__/HeroBand.test.tsx
//
// UNI-2339 slice 1 — canvas shell hero band. Verifies the greeting +
// today's-priorities copy renders correctly across the honest states
// (Linear not connected / empty / N priorities), matching ActionQueueTile's
// RA-1109 honesty copy verbatim.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroBand, greetingFor } from '../HeroBand'
import type { ActionQueueTileData } from '../ActionQueueTile'

function baseData(overrides: Partial<ActionQueueTileData> = {}): ActionQueueTileData {
  return {
    queue_path: 'Linear — issues assigned to founder',
    scanned_at: '2026-07-09T00:00:00.000Z',
    total_rows: 0,
    shown_rows: 0,
    rows: [],
    headers: [],
    read_error: null,
    ...overrides,
  }
}

describe('greetingFor', () => {
  it('returns Morning before 12:00 AEST', () => {
    expect(greetingFor(() => new Date('2026-07-08T22:00:00.000Z'))).toBe('Morning') // 08:00 AEST
  })
  it('returns Afternoon between 12:00 and 18:00 AEST', () => {
    expect(greetingFor(() => new Date('2026-07-08T05:00:00.000Z'))).toBe('Afternoon') // 15:00 AEST
  })
  it('returns Evening from 18:00 AEST', () => {
    expect(greetingFor(() => new Date('2026-07-08T10:00:00.000Z'))).toBe('Evening') // 20:00 AEST
  })
  it('returns Morning in the midnight hour (h24 formats 00:xx as "24" → false Evening)', () => {
    expect(greetingFor(() => new Date('2026-07-08T14:00:00.000Z'))).toBe('Morning') // 00:00 AEST
    expect(greetingFor(() => new Date('2026-07-08T14:30:00.000Z'))).toBe('Morning') // 00:30 AEST
  })
})

describe('HeroBand', () => {
  const morning = () => new Date('2026-07-08T22:00:00.000Z') // 08:00 AEST

  it('renders the founder literal greeting', () => {
    render(<HeroBand data={baseData()} now={morning} />)
    expect(screen.getByTestId('hero-band')).toHaveTextContent('Morning, Phill.')
  })

  it('renders the honest Linear-not-connected line verbatim (local fallback absent)', () => {
    render(
      <HeroBand
        data={baseData({ read_error: "ENOENT: no such file or directory, open '/x'" })}
        now={morning}
      />,
    )
    expect(screen.getByTestId('hero-band-status')).toHaveTextContent(
      "Linear not connected (LINEAR_API_KEY not set) — and the local 2nd-brain vault fallback isn't available in this environment.",
    )
  })

  it('renders a non-local read error distinctly', () => {
    render(<HeroBand data={baseData({ read_error: 'HTTP 500' })} now={morning} />)
    expect(screen.getByTestId('hero-band-status')).toHaveTextContent('Could not read action queue: HTTP 500')
  })

  it('renders the priorities count when the queue has rows', () => {
    render(<HeroBand data={baseData({ shown_rows: 3, total_rows: 12 })} now={morning} />)
    const hero = screen.getByTestId('hero-band')
    expect(hero).toHaveTextContent('3 priorities need')
    expect(screen.getByTestId('hero-band-status')).toHaveTextContent('3 of 12 actions need you today.')
  })

  it('renders the empty-queue state honestly', () => {
    render(<HeroBand data={baseData({ queue_path: 'Linear — issues assigned to founder' })} now={morning} />)
    expect(screen.getByTestId('hero-band-status')).toHaveTextContent(
      'No actions queued at Linear — issues assigned to founder.',
    )
  })
})

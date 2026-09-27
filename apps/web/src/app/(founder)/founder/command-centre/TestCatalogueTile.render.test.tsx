// src/app/(founder)/founder/command-centre/TestCatalogueTile.render.test.tsx
//
// What the founder SEES in the "Test catalogue" panel: the counts, the live
// defect on top, and a loud unavailable state when the ledger is bad.

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadTestCatalogue, summariseCatalogue } from '@/lib/command-centre/test-catalogue'
import { TestCatalogueTile } from './TestCatalogueTile'

beforeEach(() => {
  // The live strip polls on mount; keep it pending so no network is touched.
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
})
afterEach(() => vi.unstubAllGlobals())

describe('TestCatalogueTile render', () => {
  it('shows the totals and puts the live defect first', () => {
    render(<TestCatalogueTile data={loadTestCatalogue()} />)
    expect(screen.getByTestId('test-catalogue-summary')).toHaveTextContent('92 tests · RestoreAssist')
    expect(screen.getByTestId('test-catalogue-count-DEFECT')).toHaveTextContent('1 live defect')
    expect(screen.getByTestId('test-catalogue-count-BUILT')).toHaveTextContent('8 built today')
    expect(screen.getByTestId('test-catalogue-count-TODO')).toHaveTextContent('41 to write')
    const rows = screen.getAllByTestId('test-catalogue-row')
    expect(rows).toHaveLength(92)
    expect(rows[0]).toHaveAttribute('data-status', 'DEFECT')
    expect(rows[0]).toHaveTextContent('SEC-TOKEN-01')
  })

  it('shows the live strip as checking, not as a result, before GitHub answers', () => {
    render(<TestCatalogueTile data={loadTestCatalogue()} />)
    expect(screen.getByTestId('test-catalogue-live-loading')).toHaveTextContent('Checking the test branch on GitHub')
    expect(screen.queryByTestId('test-catalogue-live')).toBeNull()
  })

  it('renders an unavailable state, and NO rows, when the ledger is invalid', () => {
    render(<TestCatalogueTile data={summariseCatalogue({ rows: 'nope' })} />)
    expect(screen.getByTestId('test-catalogue-tile-error')).toHaveTextContent('Test catalogue unavailable')
    expect(screen.queryAllByTestId('test-catalogue-row')).toHaveLength(0)
  })
})

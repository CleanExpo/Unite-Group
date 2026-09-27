// src/app/(founder)/founder/command-centre/TestCatalogueTile.tsx
//
// Mission Control — "Test catalogue".
//
// Server component. The security/tenancy test catalogue for RestoreAssist
// (portable to the other projects), from the vault page
// Wiki/test-catalogue-100-2026-09-27.md via data/command-centre/test-catalogue.json.
// Live defects first, then what was built, then the backlog. The live strip on
// top reads the branch that carries the built tests from GitHub.
//
// The table is a ledger of what exists, not a live pass/fail per test: the
// only live signal is CI on the branch, and the tile says which is which.

import { loadTestCatalogue, type TestCatalogueData, type TestStatus } from '@/lib/command-centre/test-catalogue'
import { TestCatalogueLiveStrip } from './TestCatalogueLiveStrip'

export function loadTestCatalogueData(): TestCatalogueData {
  return loadTestCatalogue()
}

const STATUS_STYLE: Record<TestStatus, { label: string; color: string }> = {
  DEFECT: { label: 'Live defect', color: 'var(--tile-red-txt, #d02f35)' },
  BUILT: { label: 'Built today', color: 'var(--tile-green-txt, #34d399)' },
  TODO: { label: 'To write', color: 'var(--tile-amber-txt, #fb923c)' },
  EXISTS: { label: 'Already in suite', color: 'var(--tile-ink-dim, #9bb0c1)' },
  COVERED: { label: 'Covered elsewhere', color: 'var(--tile-ink-hush, #6f879b)' },
}

const SUMMARY_ORDER: TestStatus[] = ['DEFECT', 'BUILT', 'TODO', 'EXISTS', 'COVERED']

const mono = { fontFamily: 'ui-monospace, SFMono-Regular, monospace' } as const

export function TestCatalogueTile({ data }: { data: TestCatalogueData }) {
  if (!data.ok) {
    return (
      <p
        data-testid="test-catalogue-tile-error"
        style={{ color: 'var(--tile-amber-txt, #fb923c)', fontSize: '0.85rem', margin: 0 }}
      >
        Test catalogue unavailable: {data.read_error}
      </p>
    )
  }

  return (
    <div data-testid="test-catalogue-tile">
      <TestCatalogueLiveStrip />

      <div
        data-testid="test-catalogue-summary"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}
      >
        <span style={{ fontWeight: 700, color: 'var(--tile-ink, #e6f7ff)', fontSize: '0.85rem' }}>
          {data.rows.length} tests · {data.project}
        </span>
        {SUMMARY_ORDER.filter((s) => data.counts[s] > 0).map((s) => (
          <span
            key={s}
            data-testid={`test-catalogue-count-${s}`}
            style={{
              fontSize: '0.74rem',
              color: STATUS_STYLE[s].color,
              border: `1px solid ${STATUS_STYLE[s].color}`,
              borderRadius: '2px',
              padding: '0 0.4rem',
            }}
          >
            {data.counts[s]} {STATUS_STYLE[s].label.toLowerCase()}
          </span>
        ))}
        <span style={{ fontSize: '0.74rem', color: 'var(--tile-ink-dim, #9bb0c1)' }}>
          {data.portable} portable to other projects
        </span>
      </div>

      <details open={false}>
        <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--tile-ink-dim, #9bb0c1)' }}>
          Show all {data.rows.length} tests
        </summary>
        <div style={{ overflowX: 'auto', marginTop: '0.4rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--tile-ink-hush, #6f879b)' }}>
                <th style={{ padding: '0.2rem 0.4rem' }}>ID</th>
                <th style={{ padding: '0.2rem 0.4rem' }}>Test</th>
                <th style={{ padding: '0.2rem 0.4rem' }}>Status</th>
                <th style={{ padding: '0.2rem 0.4rem' }}>Portable</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.id}
                  data-testid="test-catalogue-row"
                  data-status={row.status}
                  style={{ borderTop: '1px solid rgba(155, 176, 193, 0.12)', verticalAlign: 'top' }}
                >
                  <td style={{ padding: '0.25rem 0.4rem', whiteSpace: 'nowrap', color: 'var(--tile-ink-hush, #6f879b)', ...mono }}>
                    {row.id}
                  </td>
                  <td style={{ padding: '0.25rem 0.4rem', color: 'var(--tile-ink, #e6f7ff)' }}>
                    {row.test}
                    {row.note && (
                      <div style={{ color: 'var(--tile-ink-dim, #9bb0c1)', fontSize: '0.7rem' }}>{row.note}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.25rem 0.4rem', whiteSpace: 'nowrap', color: STATUS_STYLE[row.status].color, fontWeight: 600 }}>
                    {STATUS_STYLE[row.status].label}
                  </td>
                  <td style={{ padding: '0.25rem 0.4rem', color: 'var(--tile-ink-dim, #9bb0c1)' }}>
                    {row.portable ? 'yes' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p style={{ margin: '0.4rem 0 0', fontSize: '0.66rem', color: 'var(--tile-ink-hush, #6f879b)' }}>
        Ledger from {data.source} ({data.generated}). Statuses record what exists; the only live
        pass/fail signal is CI on {data.branch}.
      </p>
    </div>
  )
}

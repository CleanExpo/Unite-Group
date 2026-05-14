'use client';

// Business360Grid — Zone 4 of /command-center.
//
// Six portfolio brand tiles (per [[command-center-redesign-proposal-2026-05-14]]
// Zone 4 spec): CCW · RestoreAssist · DR · NRPG · CARSI · Synthex. Unite-Group
// itself sits in Zone 1 (the wordmark) so it's intentionally excluded.
//
// Layout:
//   - 1-col on narrow viewports, 2-col on lg+
//   - 1px grid gap (Candy-Red-on-near-black ground bleeds through, matches
//     the KpiStrip pattern)
//   - Section label up top, hush-ink, mono caps

import { BusinessTile } from './BusinessTile';
import { BUSINESS_360_TILES } from './business-360-data';

export function Business360Grid() {
  return (
    <section
      className="flex flex-col"
      style={{ background: 'var(--cc-bg-soft)' }}
      aria-label="Business 360"
    >
      <header
        className="flex items-center justify-between px-5 h-10"
        style={{
          background: 'var(--cc-bg)',
          borderBottom: '1px solid var(--cc-grid)',
        }}
      >
        <span
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          Zone 4 · Business 360
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          {BUSINESS_360_TILES.length} portfolio brands
        </span>
      </header>

      <div
        className="grid grid-cols-1 lg:grid-cols-2"
        style={{ gap: '1px', background: 'var(--cc-grid)' }}
      >
        {BUSINESS_360_TILES.map((b) => (
          <BusinessTile key={b.id} data={b} />
        ))}
      </div>
    </section>
  );
}

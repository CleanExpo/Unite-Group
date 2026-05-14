'use client';

// BusinessTile — single Zone 4 brand tile.
//
// Layout (left → right, two rows):
//   [logo]  [NAME]            [STATE PIP]
//           [KPI value/label]
//   [........ sparkline ............... ]
//   [state label, hush ink]
//
// Logo resolution per spec:
//   - If logoSrc is provided → render <Image> at fixed 28x28
//   - If logoSrc is null     → render the custom geometric mark (Option B
//                              per [[feedback-design-preferences]])
//   - NEVER render a generic placeholder (no /placeholder*.png, no <img
//     src="/placeholder.png" />)
//
// State conveys via the left border + corner pip — same vocabulary as
// KpiTile.tsx so the eye learns it once.

import Image from 'next/image';
import Link from 'next/link';
import { Sparkline } from './Sparkline';
import type { Business360Datum } from './business-360-data';

export interface BusinessTileProps {
  data: Business360Datum;
}

export function BusinessTile({ data }: BusinessTileProps) {
  const borderColor =
    data.state === 'signal' ? 'var(--cc-signal)' : 'var(--cc-grid)';

  return (
    <Link
      href={`/en/empire/businesses/${data.slug}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      data-testid={`cc-business-tile-${data.slug}`}
    >
    <article
      className="relative px-4 py-3 flex flex-col gap-2"
      style={{
        background: 'var(--cc-bg-soft)',
        borderLeft: `2px solid ${borderColor}`,
        minWidth: 0,
      }}
      data-cc-state={data.state}
      aria-label={`${data.name}: ${data.kpiLabel} ${data.kpiValue}`}
    >
      {data.state === 'signal' && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--cc-signal)',
            animation:
              'cc-breathe var(--cc-pulse-duration) ease-in-out infinite',
          }}
        />
      )}

      <header className="flex items-center gap-2 min-w-0">
        <BrandMark
          name={data.name}
          slug={data.slug}
          logoSrc={data.logoSrc}
        />
        <span
          className="font-mono text-[11px] uppercase tracking-[0.18em] truncate"
          style={{ color: 'var(--cc-ink)' }}
        >
          {data.name}
        </span>
      </header>

      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className="font-mono text-xl leading-none"
          style={{
            color: 'var(--cc-ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {data.kpiPrefix}
          {data.kpiValue.toLocaleString()}
          {data.kpiSuffix && (
            <span
              className="text-sm ml-1"
              style={{ color: 'var(--cc-ink-dim)' }}
            >
              {data.kpiSuffix}
            </span>
          )}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em] truncate"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          {data.kpiLabel}
        </span>
      </div>

      <Sparkline
        data={data.series}
        width={220}
        height={32}
        hush={data.state === 'hush'}
      />

      <span
        className="font-mono text-[10px] tracking-[0.06em] truncate"
        style={{
          color:
            data.state === 'signal'
              ? 'var(--cc-signal)'
              : 'var(--cc-ink-dim)',
        }}
      >
        {data.stateLabel}
      </span>
    </article>
    </Link>
  );
}

// BrandMark — real logo OR custom geometric mark. Never a placeholder.
function BrandMark({
  name,
  slug,
  logoSrc,
}: {
  name: string;
  slug: string;
  logoSrc: string | null;
}) {
  if (logoSrc) {
    return (
      <Image
        src={logoSrc}
        alt={`${name} logo`}
        width={24}
        height={24}
        unoptimized
        style={{
          display: 'block',
          objectFit: 'contain',
          width: 24,
          height: 24,
        }}
      />
    );
  }
  return <GeometricMark slug={slug} />;
}

// GeometricMark — Option B per [[feedback-design-preferences]].
// Inline SVG, monochrome, near-black ground + Candy-Red accent stroke.
// Deterministic shape from slug so each brand-without-logo gets a stable
// glyph — no random or third-party icon dependency.
function GeometricMark({ slug }: { slug: string }) {
  // Hash the slug to a small integer so the geometry is stable per brand.
  const hash = Array.from(slug).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variant = hash % 3;

  const stroke = 'var(--cc-signal)';
  const muted = 'var(--cc-ink-dim)';

  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      aria-hidden
      role="presentation"
      style={{ display: 'block' }}
    >
      {/* Outer hexagonal frame — shared across variants */}
      <polygon
        points="12,2 21,7 21,17 12,22 3,17 3,7"
        fill="none"
        stroke={muted}
        strokeWidth={1}
      />
      {variant === 0 && (
        <polygon
          points="12,7 17,10 17,14 12,17 7,14 7,10"
          fill="none"
          stroke={stroke}
          strokeWidth={1.25}
        />
      )}
      {variant === 1 && (
        <>
          <line x1="7" y1="12" x2="17" y2="12" stroke={stroke} strokeWidth={1.25} />
          <line x1="12" y1="7" x2="12" y2="17" stroke={stroke} strokeWidth={1.25} />
        </>
      )}
      {variant === 2 && (
        <circle
          cx="12"
          cy="12"
          r="3.5"
          fill="none"
          stroke={stroke}
          strokeWidth={1.25}
        />
      )}
    </svg>
  );
}

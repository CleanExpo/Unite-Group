// src/components/ui/EmptyState.tsx
// UNI-1947 Pillar 2: Single shared "no data yet" tile used everywhere a
// data-driven surface has no rows to render. Centralising the look means
// every empty state across the app is visually consistent — no hardcoded
// fallback strings allowed anywhere else.

import Link from 'next/link';

export interface EmptyStateProps {
  /** Main heading — e.g. "No deliverables yet". */
  title: string;
  /** Optional secondary description line. */
  description?: string;
  /** Optional CTA — link target + label. */
  cta?: {
    href: string;
    label: string;
  };
}

export function EmptyState({ title, description, cta }: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        background: 'var(--surface-1)',
        backgroundImage: 'linear-gradient(180deg,rgba(255,255,255,0.025) 0%,transparent 50%)',
        border: '1px dashed var(--border-default)',
        borderRadius: 10,
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ink-secondary)',
          marginBottom: description ? 6 : (cta ? 12 : 0),
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-tertiary)',
            marginBottom: cta ? 12 : 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}
      {cta && (
        <Link
          href={cta.href}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--red-500)',
            textDecoration: 'none',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

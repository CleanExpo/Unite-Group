// src/components/marketing/Hero.tsx
// Homepage hero — internal CRM entry point, not public SaaS copy.
// Styled with CSS-var tokens (--canvas, --ink-primary, --red-500, etc.) defined
// in src/app/globals.css. Same pattern as [locale]/empire/integrations/page.tsx.

import Link from 'next/link';

export function Hero({ locale }: { locale: string }) {
  return (
    <section
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div
        style={{
          maxWidth: 1024,
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--red-500)',
            marginBottom: 16,
          }}
        >
          Private Founder CRM
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'var(--ink-primary)',
            margin: 0,
            maxWidth: 880,
          }}
        >
          One entry point for the work that needs Phill&apos;s attention.
        </h1>
        <p
          style={{
            marginTop: 24,
            fontSize: 18,
            lineHeight: 1.6,
            color: 'var(--ink-secondary)',
            maxWidth: 640,
          }}
        >
          Unite-Group is the internal CRM command centre: clients, follow-ups, approvals,
          portfolio signals, and the evidence trail for decisions. No sales funnel. No fake
          customer story. Just the operating desk.
        </p>
        <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link
            href={`/${locale}/command-center`}
            style={{
              background: 'var(--red-500)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Open command centre
          </Link>
          <Link
            href={`/${locale}/empire/clients`}
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--ink-primary)',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Manage clients
          </Link>
        </div>
      </div>
    </section>
  );
}

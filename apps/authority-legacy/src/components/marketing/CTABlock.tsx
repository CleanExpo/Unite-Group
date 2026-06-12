// src/components/marketing/CTABlock.tsx
// Reusable CTA band. Used at the bottom of /about and /services where the page
// otherwise ends without a clear next move. Voice: ends on a verdict-shaped
// imperative; uses the "Right." Aussie pivot once.

export function CTABlock() {
  return (
    <section
      style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--border-default)',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Right. Here&apos;s where you start.
        </h2>
        <p
          style={{
            marginTop: 12,
            color: 'var(--ink-secondary)',
            fontSize: 16,
            lineHeight: 1.65,
          }}
        >
          Email Phill. One reply. One question. One thirty-minute call. No portal sign-up, no demo
          form, no &ldquo;discovery process&rdquo;. If we can run it, we say so. If we can&apos;t,
          we tell you who can.
        </p>
        <a
          href="mailto:contact@unite-group.in"
          style={{
            marginTop: 24,
            display: 'inline-block',
            background: 'var(--red-500)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Email contact@unite-group.in
        </a>
      </div>
    </section>
  );
}

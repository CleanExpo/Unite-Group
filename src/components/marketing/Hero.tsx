// src/components/marketing/Hero.tsx
// Homepage hero — Karen opener per the Nexus Human Voice Spec v1.
// Styled with CSS-var tokens (--canvas, --ink-primary, --red-500, etc.) defined
// in src/app/globals.css. Same pattern as [locale]/empire/integrations/page.tsx.

export function Hero() {
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
          Unite-Group Nexus
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
          Karen runs a five-van water-damage crew out of Caboolture. Her scope last March was
          forty-two hours of structural drying. The desk-based adjuster paid seventeen.
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
          You&apos;ve seen this scope. You&apos;ve written this scope. You&apos;ve fought this scope
          for eleven years. Unite-Group runs the CRM, the cert, the leads, and the disputes — for
          the five-to-fifty-van firm that doesn&apos;t have time to fight on six fronts at once.
        </p>
        <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="/en/contact"
            style={{
              background: 'var(--red-500)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Talk to the operator on the desk
          </a>
          <a
            href="/en/services"
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
            What we run for you
          </a>
        </div>
      </div>
    </section>
  );
}

// src/app/[locale]/about/page.tsx
// Public About page. Opens on Phill (named human, named year, named city).
// Voice spec: Nexus Human Voice Spec v1 — non-negotiable #1 (named-human opener).

export const dynamic = 'force-static';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;

  return (
    <main
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Who we are
        </h1>

        <section style={{ marginTop: 32 }}>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: 'var(--ink-primary)',
              marginTop: 0,
            }}
          >
            Phill McGurk built his first water-damage business in Brisbane in 2014. Five years later
            he had a Group running five companies and one persistent complaint from every operator
            he spoke to: the desk-based adjusters, the cert renewals nobody had time for, and the
            leads that came through three brokers before they reached the van.
          </p>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: 'var(--ink-primary)',
              marginTop: 16,
            }}
          >
            Unite-Group is the operating company that runs the CRM, the cert, the leads, and the
            disputes for the five-to-fifty-van firm. The first paying client is{' '}
            <a
              href="/en/clients/ccw"
              style={{ color: 'var(--red-300)', textDecoration: 'underline' }}
            >
              Carpet Cleaners Warehouse
            </a>
            , Toby Aaron&apos;s outfit in Sydney. We onboarded them in March 2026.
          </p>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: 'var(--ink-primary)',
              marginTop: 16,
            }}
          >
            We do not sell platforms. We sell the operator on the desk who answers the email at six
            o&apos;clock on a Friday.
          </p>
        </section>

        <section style={{ marginTop: 48 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            The five non-negotiables
          </h2>
          <p
            style={{
              marginTop: 12,
              color: 'var(--ink-secondary)',
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            These are the things we say &ldquo;no&rdquo; to. The list is short for a reason.
          </p>
          <ul
            style={{
              marginTop: 16,
              paddingLeft: 24,
              color: 'var(--ink-primary)',
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            <li style={{ marginBottom: 8 }}>
              We don&apos;t onboard a firm whose foreman can&apos;t open the CRM from a van.
            </li>
            <li style={{ marginBottom: 8 }}>
              We don&apos;t take a client whose owner won&apos;t show up to the first call.
            </li>
            <li style={{ marginBottom: 8 }}>We don&apos;t sell the cert without the dispute log.</li>
            <li style={{ marginBottom: 8 }}>
              We don&apos;t charge for the first thirty days. You see the file before you sign.
            </li>
            <li style={{ marginBottom: 8 }}>We don&apos;t talk to insurers in your absence.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

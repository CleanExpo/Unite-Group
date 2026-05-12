// src/app/[locale]/contact/page.tsx
// Public Contact page. Opens on Phill — the person who answers the email.
// Non-negotiable #1 (named-human opener) holds.

export const dynamic = 'force-static';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  return (
    <main
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          The operator on the desk is Phill
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 17,
            lineHeight: 1.7,
            color: 'var(--ink-primary)',
          }}
        >
          Until we hire a second person, every email lands on Phill McGurk&apos;s desk. He answers it
          himself, usually within two hours during AEST business hours, and within twelve overnight.
        </p>

        <section style={{ marginTop: 40 }}>
          <p style={contactLine}>
            <strong style={contactLabel}>Email:</strong>{' '}
            <a href="mailto:contact@unite-group.in" style={contactLink}>
              contact@unite-group.in
            </a>
          </p>
          <p style={contactLine}>
            <strong style={contactLabel}>Phone (AU):</strong> +61 (0) 412 345 678 (text first if
            it&apos;s outside Brisbane hours)
          </p>
          <p style={contactLine}>
            <strong style={contactLabel}>If you run a crew bigger than fifty vans:</strong> email{' '}
            <a href="mailto:phill@unite-group.in" style={contactLink}>
              phill@unite-group.in
            </a>{' '}
            directly. We&apos;ll book a call before we send anything else.
          </p>
        </section>

        <section
          style={{
            marginTop: 40,
            borderLeft: '2px solid var(--red-500)',
            paddingLeft: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            What happens after you email
          </h2>
          <ol
            style={{
              marginTop: 12,
              paddingLeft: 20,
              color: 'var(--ink-primary)',
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            <li style={{ marginBottom: 8 }}>
              Phill replies with one question. What&apos;s the operator&apos;s daily problem
              you&apos;re trying to remove.
            </li>
            <li style={{ marginBottom: 8 }}>
              If we can run it, you get a thirty-minute call. If we can&apos;t, we tell you who to
              talk to.
            </li>
            <li style={{ marginBottom: 8 }}>
              You see the file. You see the pricing. You see the cancellation clause. Then you sign
              or you don&apos;t.
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}

const contactLine: React.CSSProperties = {
  marginTop: 12,
  fontSize: 16,
  lineHeight: 1.7,
  color: 'var(--ink-primary)',
};

const contactLabel: React.CSSProperties = {
  color: 'var(--ink-primary)',
  fontWeight: 600,
};

const contactLink: React.CSSProperties = {
  color: 'var(--red-300)',
  textDecoration: 'underline',
};

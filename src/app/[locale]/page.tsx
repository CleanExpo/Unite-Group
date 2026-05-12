// src/app/[locale]/page.tsx
// Public marketing landing page. The CEO dashboard lives at /[locale]/ceo;
// authenticated CEOs navigate there directly. Unauthenticated visitors see this.
// Copy mirrors the Nexus Human Voice Spec v1 (Karen opener, verdict last).

import { Hero } from '@/components/marketing/Hero';

export const dynamic = 'force-static';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  await params; // locale unused for now — copy is English-only at launch.

  return (
    <main style={{ background: 'var(--canvas)', color: 'var(--ink-primary)', minHeight: '100vh' }}>
      <Hero />

      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1024, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            What you actually get
          </h2>
          <p
            style={{
              marginTop: 8,
              color: 'var(--ink-secondary)',
              maxWidth: 640,
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Three things, in this order. Not features. Things you stop doing yourself.
          </p>

          <ul
            style={{
              marginTop: 40,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 32,
              listStyle: 'none',
              padding: 0,
            }}
          >
            <li>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--ink-primary)',
                  margin: 0,
                }}
              >
                A CRM your crew actually opens
              </h3>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--ink-secondary)',
                }}
              >
                Built around the job, not the lead. Karen&apos;s foreman opens it from a van outside
                a triplex in Redcliffe. He sees the scope, the photos, the adjuster&apos;s last
                reply, and the parts list. He doesn&apos;t see seventeen tabs of CRM theory.
              </p>
            </li>
            <li>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--ink-primary)',
                  margin: 0,
                }}
              >
                A cert the regulator already recognises
              </h3>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--ink-secondary)',
                }}
              >
                IICRC pathway, ANZ-aligned. You sit it through CARSI; the file lands in your portal
                in fourteen days. Documents on-screen, not a marketing brochure.
              </p>
            </li>
            <li>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--ink-primary)',
                  margin: 0,
                }}
              >
                A dispute log that survives an audit
              </h3>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--ink-secondary)',
                }}
              >
                Every back-and-forth with the panel. Every photo. Every revised scope. Stored,
                exportable, FOI-resistant. The last time Karen needed it, it took four minutes to
                assemble.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section
        style={{
          background: 'var(--surface-1)',
          padding: '64px 24px',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Right — here&apos;s the verdict
          </h2>
          <p
            style={{
              marginTop: 16,
              color: 'var(--ink-primary)',
              fontSize: 17,
              lineHeight: 1.65,
            }}
          >
            You don&apos;t need another platform. You need the disputes to stop costing you
            forty-percent margin and the cert to stop costing you four months. Unite-Group runs
            both. The pricing is the same line every month. The cancellation is on the same page as
            the sign-up.
          </p>
          <p style={{ marginTop: 24 }}>
            <a
              href="/en/contact"
              style={{
                color: 'var(--red-300)',
                textDecoration: 'underline',
                fontSize: 16,
              }}
            >
              Book a thirty-minute call with the founder
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

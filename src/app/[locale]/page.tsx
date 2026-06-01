// src/app/[locale]/page.tsx
// Public marketing landing page. The CEO dashboard lives at /[locale]/ceo;
// authenticated CEOs navigate there directly. Unauthenticated visitors see this.
// Copy mirrors the Nexus Human Voice Spec v1 (Karen opener, verdict last).

import type { Metadata } from 'next';
import Link from 'next/link';
import { getBrandConfig } from '@/lib/branding/getBrandConfig';
import { HomepageHero } from '@/components/marketing/HomepageHero';
import { PortfolioTile } from '@/components/empire/PortfolioTile';
import type { BrandConfig } from '@/types/brand-config';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Unite-Group — CRM, cert, leads, and disputes for the five-to-fifty-van firm',
  description:
    "Karen runs a five-van water-damage crew. We run the operating side so she doesn't have to. The CRM, the IICRC cert, the leads, the dispute log — for the five-to-fifty-van firm that hasn't got time to fight on six fronts at once.",
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  // Copy is English-only at launch, but CTAs still need to stay in the
  // active locale — a /fr/ visitor clicking the contact link should land
  // on /fr/contact, not get bounced to /en/.
  const { locale } = await params;

  /**
   * Resolve the Unite-Group brand server-side. Cached for 5 minutes per Node
   * process by `getBrandConfig`, and the page itself is `force-static` so this
   * effectively runs once per deploy. Empty-object fallback keeps the Tier-1
   * wrappers happy when the row hasn't been seeded yet — they treat
   * `Partial<BrandConfig>` as best-effort.
   */
  const branded = await getBrandConfig('unite-group');
  const brand: Partial<BrandConfig> = branded?.brand_config ?? {};
  const brandName = branded?.company_name ?? 'Unite-Group';

  return (
    <main style={{ background: 'var(--canvas)', color: 'var(--ink-primary)', minHeight: '100vh' }}>
      {/*
        ShowcaseCard (the primitive under HeroShowcase) renders its heading as
        an h2. To preserve the homepage's h1 semantic for SEO + a11y, we mirror
        the Karen opener into a visually-hidden h1 here. Same string as the
        showcase heading — kept in sync manually until the Tier-1 primitive
        exposes a heading-level prop.
      */}
      <h1
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Karen runs a five-van water-damage crew out of Caboolture. Her scope last March was forty-two hours of structural drying. The desk-based adjuster paid seventeen.
      </h1>

      <section
        style={{
          background: 'var(--canvas)',
          borderBottom: '1px solid var(--border-default)',
          padding: '64px 24px',
        }}
      >
        <div style={{ maxWidth: 1024, margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
          {/*
            TODO: a real Unite-Group hero photograph belongs at
            /public/brands/unite-group/hero.jpg (the HeroShowcase convention).
            Using handshake-gear.png as a stopgap brand asset until that's shot.
          */}
          <HomepageHero
            brandSlug="unite-group"
            brand={brand}
            brandName={brandName}
            tagline="Unite-Group Nexus"
            heading="Karen runs a five-van water-damage crew out of Caboolture. Her scope last March was forty-two hours of structural drying. The desk-based adjuster paid seventeen."
            description="You've seen this scope. You've written this scope. You've fought this scope for eleven years. Unite-Group runs the CRM, the cert, the leads, and the disputes — for the five-to-fifty-van firm that doesn't have time to fight on six fronts at once."
            imageUrl="/images/handshake-gear.png"
            imageAlt="Unite-Group — operating-side brand mark"
            ctaText="Talk to the operator on the desk"
            ctaHref={`/${locale}/contact`}
            services={['CRM', 'IICRC cert', 'Leads', 'Disputes']}
          />
        </div>
      </section>

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
              <PortfolioTile
                title="A CRM your crew actually opens"
                status="operational"
                brandSlug="unite-group"
                brand={brand}
              >
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                  Built around the job, not the lead. Karen&apos;s foreman opens it from a van outside
                  a triplex in Redcliffe. He sees the scope, the photos, the adjuster&apos;s last
                  reply, and the parts list. He doesn&apos;t see seventeen tabs of CRM theory.
                </p>
              </PortfolioTile>
            </li>
            <li>
              <PortfolioTile
                title="A cert the regulator already recognises"
                status="operational"
                brandSlug="unite-group"
                brand={brand}
              >
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                  IICRC pathway, ANZ-aligned. You sit it through CARSI; the file lands in your portal
                  in fourteen days. Documents on-screen, not a marketing brochure.
                </p>
              </PortfolioTile>
            </li>
            <li>
              <PortfolioTile
                title="A dispute log that survives an audit"
                status="operational"
                brandSlug="unite-group"
                brand={brand}
              >
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                  Every back-and-forth with the panel. Every photo. Every revised scope. Stored,
                  exportable, FOI-resistant. The last time Karen needed it, it took four minutes to
                  assemble.
                </p>
              </PortfolioTile>
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
          <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href={`/${locale}/register`}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'var(--red-300)',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Start free trial
            </Link>
            <Link
              href={`/${locale}/contact`}
              style={{
                color: 'var(--red-300)',
                textDecoration: 'underline',
                fontSize: 16,
                alignSelf: 'center',
              }}
            >
              Book a call with the founder
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

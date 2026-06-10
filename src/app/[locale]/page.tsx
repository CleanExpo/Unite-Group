// src/app/[locale]/page.tsx
// Internal CRM landing page. This is not a public SaaS or marketing funnel.
// It gives Phill direct entry points into the work that needs attention.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getBrandConfig } from '@/lib/branding/getBrandConfig';
import { HomepageHero } from '@/components/marketing/HomepageHero';
import { PortfolioTile } from '@/components/empire/PortfolioTile';
import type { BrandConfig } from '@/types/brand-config';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Unite-Group — Internal CRM Command Centre',
  description:
    "Private founder CRM for Phill McGurk: client follow-ups, command-centre work, approvals, evidence, and portfolio signals in one place.",
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
        an h2. To preserve the homepage's h1 semantic for a11y, we mirror the
        internal CRM heading here until the Tier-1 primitive exposes a heading-level prop.
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
        Unite-Group is Phill&apos;s private CRM command centre.
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
            tagline="Private founder CRM"
            heading="One entry point for the work that needs Phill's attention."
            description="Unite-Group is the internal CRM command centre: clients, follow-ups, approvals, portfolio signals, and the evidence trail for decisions. No sales funnel. No fake customer story. Just the operating desk."
            imageUrl="/images/handshake-gear.png"
            imageAlt="Unite-Group internal CRM command centre"
            ctaText="Open command centre"
            ctaHref={`/${locale}/command-center`}
            services={['Clients', 'Follow-ups', 'Approvals', 'Evidence']}
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
            What this page should help you do
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
            Fast doors into the internal CRM areas that matter during the day.
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
                title="Open the command centre"
                status="operational"
                brandSlug="unite-group"
                brand={brand}
              >
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                  Start where the day starts: active signals, queued work, approvals, voice tasks,
                  and anything that needs a decision before it goes stale.
                </p>
              </PortfolioTile>
            </li>
            <li>
              <PortfolioTile
                title="Manage clients without hunting"
                status="operational"
                brandSlug="unite-group"
                brand={brand}
              >
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                  Jump straight to the client list, active records, contact context, onboarding
                  state, and the next useful action for each account.
                </p>
              </PortfolioTile>
            </li>
            <li>
              <PortfolioTile
                title="Review the evidence trail"
                status="operational"
                brandSlug="unite-group"
                brand={brand}
              >
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                  Keep decisions grounded in source material: logs, docs, status changes, and
                  follow-up history instead of memory or scattered chat threads.
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
            The rule for this CRM
          </h2>
          <p
            style={{
              marginTop: 16,
              color: 'var(--ink-primary)',
              fontSize: 17,
              lineHeight: 1.65,
            }}
          >
            If the homepage does not help Phill run the business, it does not belong here. This
            surface should point to live CRM work, show honest connection status, and avoid public
            SaaS language unless a section is deliberately external-facing.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href={`/${locale}/command-center`}
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
              Open command centre
            </Link>
            <Link
              href={`/${locale}/empire/clients`}
              style={{
                color: 'var(--red-300)',
                textDecoration: 'underline',
                fontSize: 16,
                alignSelf: 'center',
              }}
            >
              Manage clients
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

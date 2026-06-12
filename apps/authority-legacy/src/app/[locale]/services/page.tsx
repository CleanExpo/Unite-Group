// src/app/[locale]/services/page.tsx
// Services index. Named-operator pattern: each service opens on a specific
// operator in a specific city, then the product paragraph.

import type { Metadata } from 'next';
import Link from 'next/link';
import { CTABlock } from '@/components/marketing/CTABlock';
import { getBrandConfig } from '@/lib/branding/getBrandConfig';
import { PortfolioTile } from '@/components/empire/PortfolioTile';
import type { BrandConfig } from '@/types/brand-config';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'What we run for you — Unite-Group services',
  description:
    "Four products. Same operator on the desk for all of them. CRM your foreman actually opens. IICRC cert through CARSI. A dispute log that survives an audit. Leads that aren't laundered through three brokers.",
};

const SERVICES = [
  {
    slug: 'crm',
    title: 'CRM you actually open',
    operator:
      'Toby runs his foreman dashboard from a Sydney warehouse desk and a Holden HiLux in the same hour.',
    paragraph:
      'Built around the job, not the lead. Mobile-first because the desk-based version is for the office manager who isn’t there at 7am.',
  },
  {
    slug: 'cert',
    title: 'IICRC cert through CARSI',
    operator:
      'A water-damage operator in Adelaide sat the WRT certificate in March and had the file on the regulator’s desk in fourteen days.',
    paragraph:
      'ANZ-aligned. We run the paperwork. You sit the exam. The audit log is on the same page as the receipt.',
  },
  {
    slug: 'disputes',
    title: 'Dispute log + adjuster pushback',
    operator:
      'Karen recovered seven thousand dollars on a job last quarter using a screenshot the system had timestamped automatically.',
    paragraph:
      'Every reply. Every revised scope. Every photo. Searchable, exportable, FOI-resistant.',
  },
  {
    slug: 'leads',
    title: 'Leads that aren’t laundered through three brokers',
    operator:
      'A Newcastle restoration firm gets the homeowner’s number, not a referral receipt.',
    paragraph:
      'Direct from search, direct from the IICRC directory, direct from the local Facebook group the panel doesn’t know exists yet.',
  },
];

export default async function ServicesIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Resolve the Unite-Group brand server-side, same pattern as the homepage
  // (PR #59). Page is force-static, so this runs once per deploy.
  const branded = await getBrandConfig('unite-group');
  const brand: Partial<BrandConfig> = branded?.brand_config ?? {};

  return (
    <main
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '64px 24px' }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          What we run for you
        </h1>
        <p
          style={{
            marginTop: 12,
            color: 'var(--ink-secondary)',
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          Four products. Same operator on the desk for all of them.
        </p>

        <div
          style={{
            marginTop: 40,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {SERVICES.map((s) => (
            <PortfolioTile
              key={s.slug}
              title={s.title}
              status="operational"
              brandSlug="unite-group"
              brand={brand}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontStyle: 'italic',
                  color: 'var(--ink-tertiary)',
                  lineHeight: 1.6,
                }}
              >
                {s.operator}
              </p>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 15,
                  color: 'var(--ink-primary)',
                  lineHeight: 1.65,
                }}
              >
                {s.paragraph}
              </p>
              <Link
                href={`/${locale}/services/${s.slug}`}
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--red-500)',
                  textDecoration: 'none',
                }}
              >
                Read more →
              </Link>
            </PortfolioTile>
          ))}
        </div>
      </div>

      <CTABlock />
    </main>
  );
}

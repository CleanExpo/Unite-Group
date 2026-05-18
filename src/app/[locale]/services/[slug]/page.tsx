// src/app/[locale]/services/[slug]/page.tsx
// Per-service template. Shape: named operator → product → pricing line → verdict → CTA.
// All four slugs (crm, cert, disputes, leads) are fully written below per the
// plan's self-review correction (line 1053 of the originating plan).

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  SpotlightCard,
  SpotlightCardHeader,
  SpotlightCardTitle,
  SpotlightCardContent,
} from '@/components/ui/spotlight-card';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [{ slug: 'crm' }, { slug: 'cert' }, { slug: 'disputes' }, { slug: 'leads' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = CONTENT[slug];
  if (!c) return { title: 'Unite-Group' };
  const truncated =
    c.opener.length <= 155
      ? c.opener
      : c.opener.slice(0, 155).replace(/\s+\S*$/, '');
  return {
    title: `${c.title} — Unite-Group`,
    description: truncated,
  };
}

interface ServiceContent {
  title: string;
  opener: string;
  whatItDoes: string;
  whatItDoesNot: string;
  pricing: string;
  verdict: string;
}

const CONTENT: Record<string, ServiceContent> = {
  crm: {
    title: 'CRM you actually open',
    opener:
      'Toby’s foreman opens the app from a HiLux outside a triplex in Bondi at 7:14am. He’s looking at the scope from yesterday, the adjuster’s three-line reply, and the photo of the wet skirting. He’s not looking at a dashboard.',
    whatItDoes:
      'Job-first navigation. Photo-first records. Adjuster history per claim, exportable as one PDF.',
    whatItDoesNot:
      'It doesn’t replace Xero. It doesn’t pretend to do invoicing. It doesn’t have a "pipeline" you have to maintain.',
    pricing: '$249 AUD per van per month. Three vans minimum.',
    verdict: 'Right — if your foreman has to be trained to use it, we built it wrong.',
  },
  cert: {
    title: 'IICRC cert through CARSI',
    opener:
      'An operator in Adelaide opened CARSI on a Sunday afternoon, sat the WRT modules over two evenings, and had the certificate file on the regulator’s desk fourteen days later. He paid $890 AUD for the lot. He paid nobody else.',
    whatItDoes:
      'IICRC pathway, ANZ-aligned through CARSI. We run the paperwork, you sit the exam, and the audit log is on the same page as the receipt.',
    whatItDoesNot:
      'It doesn’t replace your trade ticket. It doesn’t guarantee a regulator outcome we have no control over. It doesn’t expire the day after you pay.',
    pricing: '$890 AUD per certificate, paid once. Renewal is at-cost when the IICRC cycle ticks over.',
    verdict: 'Right — if the regulator hasn’t seen this paperwork shape before, we wrote it wrong.',
  },
  disputes: {
    title: 'Dispute log + adjuster pushback',
    opener:
      'Karen recovered seven thousand dollars on a single job last quarter. The whole thing turned on one screenshot the system had timestamped without her asking. The adjuster argued the photo wasn’t hers. The timestamp said otherwise. The panel paid.',
    whatItDoes:
      'Every adjuster reply, every revised scope, every photo, every voice note. Searchable, exportable, FOI-resistant. One PDF per claim, generated in four minutes.',
    whatItDoesNot:
      'It doesn’t talk to the insurer for you. It doesn’t write your scope. It doesn’t guarantee an outcome no platform can guarantee.',
    pricing: 'Included in the CRM subscription. No per-dispute fee. No per-export fee.',
    verdict: 'Right — if you walk into an audit and can’t hand over the file in four minutes, we built it wrong.',
  },
  leads: {
    title: 'Leads that aren’t laundered through three brokers',
    opener:
      'A Newcastle restoration firm picked up a kitchen flood call on a Tuesday afternoon. The homeowner’s number arrived in the foreman’s phone three minutes after the form submission. No referral fee was paid. No broker had touched the lead.',
    whatItDoes:
      'Direct inbound: search, the IICRC directory, the local Facebook groups the panel hasn’t found yet. Routing rules per postcode, per service type, per crew size.',
    whatItDoesNot:
      'It doesn’t buy leads from a broker and resell them. It doesn’t auction a homeowner across five firms. It doesn’t charge per lead.',
    pricing: '$149 AUD per van per month. Same minimum as the CRM.',
    verdict: 'Right — if the homeowner has been called by three other firms before you, we sold you the wrong product.',
  },
};

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const c = CONTENT[slug];
  if (!c) notFound();

  return (
    <main
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        minHeight: '100vh',
      }}
    >
      <article
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '64px 24px',
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {c.title}
        </h1>

        <p
          style={{
            marginTop: 24,
            fontSize: 17,
            lineHeight: 1.7,
            color: 'var(--ink-primary)',
          }}
        >
          {c.opener}
        </p>

        <h2 style={sectionH2}>What it does</h2>
        <p style={sectionP}>{c.whatItDoes}</p>

        <h2 style={sectionH2}>What it doesn&apos;t do</h2>
        <p style={sectionP}>{c.whatItDoesNot}</p>

        <SpotlightCard
          spotlightColor="rgba(179, 0, 0, 0.30)"
          borderRadius={10}
          style={{ marginTop: 32 }}
        >
          <SpotlightCardHeader>
            <SpotlightCardTitle>Pricing</SpotlightCardTitle>
          </SpotlightCardHeader>
          <SpotlightCardContent>
            <p>{c.pricing}</p>
            <p style={{ marginTop: 16, fontStyle: 'italic' }}>{c.verdict}</p>
          </SpotlightCardContent>
        </SpotlightCard>

        <p style={{ marginTop: 32 }}>
          <Link
            href={`/${locale}/contact`}
            style={{
              color: 'var(--red-300)',
              textDecoration: 'underline',
              fontSize: 16,
            }}
          >
            Talk to the operator on the desk
          </Link>
        </p>
      </article>
    </main>
  );
}

const sectionH2: React.CSSProperties = {
  marginTop: 32,
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  letterSpacing: '-0.01em',
};

const sectionP: React.CSSProperties = {
  marginTop: 12,
  fontSize: 16,
  lineHeight: 1.7,
  color: 'var(--ink-primary)',
};

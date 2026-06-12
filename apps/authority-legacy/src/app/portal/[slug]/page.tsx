// UNI-1993: Dynamic white-label client portal at /portal/[slug].
//
// Architectural call (this PR, by me, per Decision-Rights Matrix "Which
// file/path layout to use within existing repos"): the portal mounts at
// `/portal/[slug]` rather than `/clients/[slug]` because the latter is
// SYN-512's public Authority Hub (with `robots: index, follow` + ISR).
// The two surfaces have different purposes — public SEO vs private
// portal — and must not share a URL.
//
// Existing hardcoded portals (/clients/ccw, /clients/dimitri-itr,
// /clients/bulcs-holdings) stay put — they're live paying-client
// surfaces; touching them is out-of-scope. UNI-1995's onboarding wizard
// will land new clients at /portal/[slug] by default; a future ticket
// can migrate the hardcoded ones once the dynamic version reaches
// feature-parity.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBrandConfig } from '@/lib/branding/getBrandConfig';
import { getPortalContent } from '@/lib/branding/getPortalContent';

export const dynamic = 'force-dynamic';
// Auth-gated content — never index, never cache at the edge.
export const revalidate = 0;

interface PortalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PortalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = await getBrandConfig(slug);
  if (!client) return { title: 'Not Found' };
  return {
    title: `${client.company_name} — Client Portal`,
    description:
      client.brand_config.tagline ||
      `Private client portal for ${client.company_name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { slug } = await params;
  const [client, portal] = await Promise.all([
    getBrandConfig(slug),
    getPortalContent(slug),
  ]);
  if (!client) notFound();

  const primary = client.brand_config.primary_color ?? '#D62828';
  const accent = client.brand_config.accent_color ?? primary;
  const logo = client.brand_config.logo_url ?? null;
  const tagline = client.brand_config.tagline ?? null;
  const content = portal?.portal_content ?? {};

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--canvas, #0a0a0a)',
        color: 'var(--ink-primary, #f5f5f5)',
        fontFamily: 'system-ui, sans-serif',
        // Brand-config CSS vars consumed by descendants via var(--brand-primary).
        // Matches the pattern landed in PRs #93/#94/#95 for the hardcoded portals.
        ['--brand-primary' as string]: primary,
        ['--brand-accent' as string]: accent,
      }}
    >
      <header
        style={{
          padding: '32px 32px 24px',
          borderBottom: '1px solid var(--border-default, #27272a)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {logo ? (
          // brand_config logos are arbitrary user-supplied URLs (Supabase
          // storage, external CDNs) that next/image's domain allow-list
          // can't enumerate without a deploy, so a plain <img> is the
          // right primitive here.
          <img
            src={logo}
            alt={`${client.company_name} logo`}
            style={{ height: 40, width: 'auto', objectFit: 'contain' }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {client.company_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.2px' }}>
            {client.company_name}
          </h1>
          {tagline && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary, #94a3b8)' }}>
              {tagline}
            </p>
          )}
        </div>
        <span
          style={{
            marginLeft: 'auto',
            height: 3,
            width: 40,
            background: 'var(--brand-primary)',
            borderRadius: 2,
          }}
          aria-hidden
        />
      </header>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {content.welcome_text && (
          <section aria-label="Welcome">
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-primary, #f5f5f5)' }}>
              {content.welcome_text}
            </p>
          </section>
        )}

        {content.deliverables && content.deliverables.length > 0 && (
          <Section title="Deliverables">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {content.deliverables.map((d, i) => (
                <li
                  key={`${d.category}-${i}`}
                  style={{
                    padding: '10px 14px',
                    borderLeft: `2px solid ${deliverableTone(d.status)}`,
                    background: 'var(--surface-1, #18181b)',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{d.category}</span>
                    <span
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: deliverableTone(d.status),
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-secondary, #94a3b8)' }}>
                    {d.detail}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {content.touchpoints && content.touchpoints.length > 0 && (
          <Section title="Touchpoints">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {content.touchpoints.map((t, i) => (
                <li
                  key={`${t.name}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    color: 'var(--ink-primary, #f5f5f5)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: t.status === 'active' ? 'var(--brand-primary)' : 'var(--ink-hush, #888)',
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{t.name}</span>
                  {t.domain && (
                    <span style={{ color: 'var(--ink-secondary, #94a3b8)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                      {t.domain}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {content.quick_links && content.quick_links.length > 0 && (
          <Section title="Quick links">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {content.quick_links.map((l, i) => (
                <li key={`${l.label}-${i}`}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'var(--brand-primary)',
                      textDecoration: 'underline',
                      fontSize: 14,
                    }}
                  >
                    {l.label} →
                  </a>
                  {l.note && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-secondary, #94a3b8)' }}>
                      {l.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!content.welcome_text &&
          !content.deliverables?.length &&
          !content.touchpoints?.length &&
          !content.quick_links?.length && (
            <p style={{ color: 'var(--ink-secondary, #94a3b8)', fontSize: 13 }}>
              Your portal is being set up. The empire admin team will populate
              this with deliverables, touchpoints, and quick links shortly.
            </p>
          )}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-secondary, #94a3b8)',
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function deliverableTone(status: string): string {
  if (status === 'done') return '#16a34a';
  if (status === 'in-progress') return 'var(--brand-primary)';
  return 'var(--ink-hush, #888)';
}

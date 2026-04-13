/**
 * SYN-512: Synthex Client Authority Hub — Full Implementation
 * SYN-519 shipped the ISR skeleton. This is the full production build.
 *
 * ISR: Revalidate every hour. Authority Hub pages carry LocalBusiness schema
 * for Google's E.E.A.T. assessment — DO NOT remove revalidate export.
 */

// ISR config — must be at module level for Next.js to pick it up
export const revalidate = 3600; // DO NOT REMOVE (SYN-519/SYN-512)

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getClientBySlug } from '@/lib/clients/getClientBySlug';
import { getClientVideos } from '@/lib/videos/getClientVideos';
import { LocalBusinessSchema } from '@/components/schema/LocalBusinessSchema';
import { VideoObjectSchema } from '@/components/schema/VideoObjectSchema';
import { AuthorityHubAnalytics } from './AuthorityHubAnalytics';
import { FeaturedBadge } from '@/components/authority/FeaturedBadge';

interface AuthorityHubPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from('clients')
    .select('slug')
    .eq('is_active', true);
  return (data ?? []).map(({ slug }: { slug: string }) => ({ slug }));
}

export async function generateMetadata({ params }: AuthorityHubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) {
    return { title: 'Not Found — Synthex' };
  }
  return {
    title: `${client.business_name} — Synthex Authority Hub`,
    description: client.description ?? `Verified authority profile for ${client.business_name} on Synthex.`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${client.business_name} — Synthex Authority Hub`,
      description: client.description ?? `Verified authority profile for ${client.business_name} on Synthex.`,
      type: 'website',
    },
  };
}

export default async function AuthorityHubPage({ params }: AuthorityHubPageProps) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const videos = await getClientVideos(client.id);

  const location = [client.address_suburb, client.address_state]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <LocalBusinessSchema client={client} />
      <VideoObjectSchema videos={videos} />
      <AuthorityHubAnalytics clientSlug={slug} />

      <main className="min-h-screen bg-background text-foreground">
        {/* Hero */}
        <section className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="flex items-start gap-6">
              {client.logo_url && (
                <img
                  src={client.logo_url}
                  alt={`${client.business_name} logo`}
                  className="w-20 h-20 rounded-lg object-cover border"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {client.industry}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Verified by Synthex
                  </span>
                  {client.featured_programme_status === 'published' && <FeaturedBadge />}
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{client.business_name}</h1>
                {location && (
                  <p className="mt-1 text-muted-foreground text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    {location}
                  </p>
                )}
                {client.description && (
                  <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
                    {client.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
          {/* Authority Score — SYN-513 will populate this */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Authority Score</h2>
            <div className="rounded-xl border bg-card p-6 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-4 border-muted shrink-0">
                <span className="text-2xl font-bold text-muted-foreground">—</span>
              </div>
              <div>
                <p className="font-medium text-muted-foreground text-sm">Coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Authority Score is being calculated based on E.E.A.T. signals.
                  Full score available once analysis is complete.
                </p>
              </div>
            </div>
          </section>

          {/* E.E.A.T. Metrics Grid */}
          <section>
            <h2 className="text-lg font-semibold mb-4">E.E.A.T. Index</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['Expertise', 'Experience', 'Authoritativeness', 'Trustworthiness'] as const).map((metric) => (
                <div key={metric} className="rounded-xl border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{metric}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Social Proof */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Social Proof</h2>
            <div className="rounded-xl border bg-card p-6">
              <p className="text-sm text-muted-foreground text-center py-4">
                Social proof metrics loading — check back soon.
              </p>
            </div>
          </section>

          {/* Contact */}
          {(client.phone || client.website_url || client.address_street) && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Contact</h2>
              <div className="rounded-xl border bg-card p-6 space-y-3 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    <a href={`tel:${client.phone}`} className="hover:text-foreground">{client.phone}</a>
                  </div>
                )}
                {client.website_url && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                    <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground truncate max-w-xs">
                      {client.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {client.address_street && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <span>{[client.address_street, client.address_suburb, client.address_state, client.address_postcode].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

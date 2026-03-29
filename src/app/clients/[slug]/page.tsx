/**
 * SYN-519: Synthex Client Authority Hub
 * ISR: Revalidate every hour. Authority Hub pages carry LocalBusiness schema
 * and must meet Core Web Vitals for Google's E.E.A.T. assessment.
 * DO NOT remove the revalidate export — see SYN-516 / SYN-512 for context.
 */

// ISR config — must be at module level for Next.js to pick it up
export const revalidate = 3600;

import type { Metadata } from 'next';
import { AuthorityHubAnalytics } from './AuthorityHubAnalytics';

interface AuthorityHubPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: AuthorityHubPageProps): Promise<Metadata> {
  return {
    title: `${params.slug} — Synthex Authority Hub`,
    description: `Verified authority profile for ${params.slug} on Synthex.`,
    robots: { index: false, follow: false }, // noindex until SYN-512 ships full implementation
  };
}

export default async function AuthorityHubPage({ params }: AuthorityHubPageProps) {
  // Sprint 3: Full Authority Hub implementation (SYN-512)
  // This placeholder ensures ISR config is deployed before the first Authority Hub page goes live.
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <h1 className="text-2xl font-bold">Synthex Client Authority Hub</h1>
        <p className="text-muted-foreground">
          Profile for <strong>{params.slug}</strong> — launching soon.
        </p>
        <p className="text-sm text-muted-foreground">
          This page will display the verified authority profile, E.E.A.T. metrics,
          and social proof for this business.
        </p>
      </div>
      {/* Vercel Analytics: fire authority_hub_first_paint event */}
      <AuthorityHubAnalytics clientSlug={params.slug} />
    </main>
  );
}

import type { Metadata } from 'next';

// Per-route description intentionally omitted — Next.js App Router streams
// segment metadata AFTER the initial body flush, which causes Lighthouse's
// meta-description audit to score 0 even when the description is in the
// final DOM. Letting the root defaultMetadata description flush in the
// early head keeps the SEO audit at 100. Title still overridden per route.
export const metadata: Metadata = {
  title: 'Empire Command Center',
};

export default function EmpireLayout({ children }: { children: React.ReactNode }) {
  return children;
}

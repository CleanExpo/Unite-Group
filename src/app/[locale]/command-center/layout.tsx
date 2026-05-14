import type { Metadata } from 'next';

// Per-route metadata for /command-center. Title only; the root layout's
// default description flushes early enough for Lighthouse to score 100
// (same pattern as /empire/layout.tsx).
export const metadata: Metadata = {
  title: 'Command Center',
};

export default function CommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

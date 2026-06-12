import type { Metadata } from 'next';

// Defaults are for the private internal CRM shell. Per-page metadata can
// override where a surface is deliberately external-facing. openGraph.title/
// description left unset so Next.js inherits each page's own metadata.
export const defaultMetadata: Metadata = {
  title: {
    template: '%s | Unite-Group',
    default: 'Unite-Group — Internal CRM Command Centre',
  },
  description: 'Private founder CRM for Phill McGurk: clients, follow-ups, approvals, evidence, and portfolio signals in one operating desk.',
  keywords: 'internal CRM, founder CRM, client follow-ups, command centre, approvals, evidence trail, Unite-Group',
  authors: [{ name: 'Phill McGurk' }],
  creator: 'Unite-Group',
  publisher: 'Unite-Group',
  metadataBase: new URL('https://unite-group.in'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://unite-group.in',
    siteName: 'Unite-Group',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: { index: false, follow: false }, // Private internal CRM shell — do not index.
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale intentionally omitted — forcing maximum-scale=1 blocks pinch-zoom
  // for users with low vision and fails Lighthouse `meta-viewport` (a11y).
  themeColor: '#09090b',
};

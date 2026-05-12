import type { Metadata } from 'next';

// Defaults are the PUBLIC marketing face. Per-page metadata on empire/client
// pages overrides where needed (those are auth-gated and rarely social-shared
// anyway). openGraph.title/description left unset here so Next.js inherits
// them from each page's own `title` + `description` — keeps social cards
// matching the page's voice instead of the dashboard's.
export const defaultMetadata: Metadata = {
  title: {
    template: '%s | Unite-Group',
    default: 'Unite-Group — CRM, cert, leads, and disputes for the five-to-fifty-van firm',
  },
  description: 'We run the operating side of a water-damage restoration firm so the operator on the desk doesn\'t have to. The CRM, the IICRC cert, the leads, the dispute log.',
  keywords: 'restoration CRM, IICRC cert, water damage, dispute log, adjuster pushback, five-to-fifty-van firm, Unite-Group, CCW',
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
  robots: { index: false, follow: false }, // Marketing-public soft-launch — flip to true after Phill approves copy
  themeColor: '#09090b',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#09090b',
};

import type { Metadata } from 'next';

export const defaultMetadata: Metadata = {
  title: {
    template: '%s | Unite Group',
    default: 'Unite Group — Empire Command Center',
  },
  description: 'AI-powered command center for 6 portfolio businesses. Built by Phill McGurk.',
  keywords: 'Unite Group, empire, CRM, AI agents, Pi-CEO, RestoreAssist, Synthex, CARSI, CCW',
  authors: [{ name: 'Unite Group' }],
  creator: 'Unite Group',
  publisher: 'Unite Group',
  metadataBase: new URL('https://unite-group.in'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://unite-group.in',
    siteName: 'Unite Group',
    title: 'Unite Group — Empire Command Center',
    description: 'AI-powered command center for 6 portfolio businesses.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unite Group — Empire Command Center',
  },
  robots: { index: false, follow: false }, // Private CRM — do not index
  themeColor: '#09090b',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#09090b',
};

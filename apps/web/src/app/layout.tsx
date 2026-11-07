import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { headers } from "next/headers";
import { publicDisplayFontClassName } from "./public-display-fonts";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Analytics } from '@vercel/analytics/react';
import { SiteTracker } from '@/components/analytics/site-tracker';
import { SITE_URL } from '@/lib/public-site';

/** Fallback when a route omits `metadata` (should be rare on public pages). */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // No `template`: each route sets a full title (often already ending with “| Unite Group”).
  title: 'Unite Group | Living business cards & growth',
  description:
    'Living business cards, Starter plans and email signatures for Australian and New Zealand businesses. One system to be found, impress and convert.',
  // Icons, apple-icon and the Open Graph / Twitter card come from the brand-pack
  // files beside this layout (icon.png, apple-icon.png, opengraph-image.png,
  // twitter-image.png) via Next's metadata file convention.
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    siteName: 'Unite Group',
    title: 'Unite Group | Living business cards & growth',
    description:
      'Living business cards, Starter plans and email signatures for Australian and New Zealand businesses.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unite Group | Living business cards & growth',
    description:
      'Living business cards, Starter plans and email signatures for Australian and New Zealand businesses.',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  // Vercel Web Analytics is off on the project; the founder enables it in Vercel and sets this flag (default off stops the /_vercel/insights 404).
  const webAnalyticsEnabled = process.env.VERCEL_WEB_ANALYTICS_ENABLED === '1';

  return (
    <html
      lang="en-AU"
      className={`${GeistSans.variable} ${GeistMono.variable} ${publicDisplayFontClassName} light`}
      suppressHydrationWarning
    >
      <body nonce={nonce} suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        {webAnalyticsEnabled ? <Analytics /> : null}
        <SiteTracker />
      </body>
    </html>
  );
}

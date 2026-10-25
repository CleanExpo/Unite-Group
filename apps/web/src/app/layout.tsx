import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Analytics } from '@vercel/analytics/react';
import { SiteTracker } from '@/components/analytics/site-tracker';

export const metadata: Metadata = {
  title: 'Unite-Group Nexus',
  description: 'Private founder CRM and operating cockpit',
  // Icons, apple-icon and the Open Graph / Twitter card come from the brand-pack
  // files beside this layout (icon.png, apple-icon.png, opengraph-image.png,
  // twitter-image.png) via Next's metadata file convention.
  manifest: '/site.webmanifest',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="en-AU" className={`${GeistSans.variable} ${GeistMono.variable} light`} suppressHydrationWarning>
      <body nonce={nonce} suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SiteTracker />
      </body>
    </html>
  );
}

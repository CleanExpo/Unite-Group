import localFont from 'next/font/local';
import '../globals.css';
import { ThemeProvider } from "@/components/theme-provider";
import PWAInitializer from '@/lib/pwa/PWAInitializer';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { defaultMetadata, viewport } from '@/lib/metadata';
import type { Metadata } from 'next';

// Import client components dynamically
const ClientWrapper = dynamic(() => import('../../components/ClientWrapper'));

// Import the Navigation component dynamically
const Navigation = dynamic(() => import('../../components/Navigation'));

const satoshi = localFont({
  src: [
    { path: '../../../public/fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/Satoshi-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../../../public/fonts/Satoshi-Bold.woff2',    weight: '700', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});

// Export metadata and viewport for this layout to fix Next.js 14 warnings
export const metadata: Metadata = defaultMetadata;
export { viewport };

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'fr' }
  ];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Validate that the locale is supported
  const supportedLocales = ['en', 'es', 'fr'];
  if (!supportedLocales.includes(locale)) {
    notFound();
  }

  // Set the HTML lang attribute for accessibility
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${satoshi.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientWrapper>
            <Navigation />
            <main>{children}</main>
          </ClientWrapper>
        </ThemeProvider>
        <PWAInitializer />
      </body>
    </html>
  );
}

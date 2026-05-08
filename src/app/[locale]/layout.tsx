import localFont from 'next/font/local';
import '../globals.css';
import { notFound } from 'next/navigation';
import { defaultMetadata, viewport } from '@/lib/metadata';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { EmpireSidebar } from '@/components/empire/EmpireSidebar';

const satoshi = localFont({
  src: [
    { path: '../../../public/fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/Satoshi-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../../../public/fonts/Satoshi-Bold.woff2',    weight: '700', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});

export const metadata: Metadata = defaultMetadata;
export { viewport };

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'fr' }
  ];
}

async function getSession() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supportedLocales = ['en', 'es', 'fr'];
  if (!supportedLocales.includes(locale)) {
    notFound();
  }

  const session = await getSession();

  if (session) {
    // Authenticated: full empire layout with sidebar
    return (
      <html lang={locale} suppressHydrationWarning className="dark">
        <body className={`${satoshi.variable} bg-[#0F172A] text-[#F8FAFC] font-sans min-h-screen flex`}>
          <EmpireSidebar />
          <main className="flex-1 min-h-screen overflow-auto">{children}</main>
        </body>
      </html>
    );
  }

  // Unauthenticated: minimal centered layout, no nav
  return (
    <html lang={locale} suppressHydrationWarning className="dark">
      <body className={`${satoshi.variable} bg-[#0F172A] text-[#F8FAFC] font-sans min-h-screen flex items-center justify-center`}>
        {children}
      </body>
    </html>
  );
}

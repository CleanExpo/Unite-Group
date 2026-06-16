import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { defaultMetadata } from '@/lib/metadata';

export const metadata: Metadata = defaultMetadata;

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'es' }, { locale: 'fr' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!['en', 'es', 'fr'].includes(locale)) notFound();
  return <>{children}</>;
}

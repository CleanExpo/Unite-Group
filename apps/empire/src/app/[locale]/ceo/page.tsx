import { redirect } from 'next/navigation';

// /[locale]/ceo is superseded by the Empire Command Center at /[locale]/empire.
// Preserve the caller's locale instead of hard-stamping /en/.
export default async function CeoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/empire`);
}

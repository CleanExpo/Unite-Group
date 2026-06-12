import { redirect } from 'next/navigation';

export default async function CeoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/empire`);
}

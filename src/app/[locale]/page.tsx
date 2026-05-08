import { redirect } from 'next/navigation';

export default function HomePage({ params }: { params: { locale: string } }) {
  // Site redirects authenticated users to CEO dashboard.
  // Public visitors land here briefly before redirect.
  redirect(`/${params.locale}/ceo`);
}

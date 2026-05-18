// /[locale]/empire/clients/[slug]/edit — admin edit page for a single
// nexus_clients row. Founder-only.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { checkAdminSession } from '@/lib/security/require-admin';
import { getBrandConfig } from '@/lib/branding/getBrandConfig';
import { getAdminClient } from '@/lib/supabase/admin';
import { EditClientForm } from '@/components/empire/clients-edit/EditClientForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit client · Empire Command Center',
};

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/empire/clients/${slug}/edit`);
  }
  if (!session.ok && session.reason === 'forbidden') {
    redirect(`/${locale}/empire`);
  }

  const branded = await getBrandConfig(slug);
  if (!branded) notFound();

  // Fetch the extra columns the edit form needs (status / website / email)
  // that getBrandConfig doesn't return. Single targeted read; the page is
  // already admin-gated.
  const supabase = getAdminClient();
  const res = await supabase
    .from('nexus_clients')
    .select('status, website_url, contact_email')
    .eq('slug', slug)
    .single();
  const status = (res.data?.status as string | undefined) ?? 'onboarding';
  const websiteUrl = (res.data?.website_url as string | null | undefined) ?? null;
  const contactEmail = (res.data?.contact_email as string | null | undefined) ?? null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--canvas, #0a0a0a)',
        color: 'var(--ink-primary, #f5f5f5)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border-hairline, #1f1f23)',
          padding: '14px 32px',
          background: 'var(--surface-1, #18181b)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Link
          href={`/${locale}/empire/clients`}
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-secondary, #94a3b8)',
            textDecoration: 'none',
          }}
        >
          ← Clients
        </Link>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Edit · {branded.company_name}
        </span>
        <Link
          href={`/${locale}/portal/${slug}`}
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--ink-secondary, #94a3b8)',
            textDecoration: 'underline',
          }}
        >
          View portal →
        </Link>
      </header>

      <EditClientForm
        slug={slug}
        initial={{
          company_name: branded.company_name,
          website_url: websiteUrl,
          contact_email: contactEmail,
          status,
          brand_config: branded.brand_config,
        }}
      />
    </div>
  );
}

// UNI-1995: admin /empire/clients/new — onboarding wizard server shell.
// Founder-only via checkAdminSession. The client-component wizard does the
// 3-step form and POSTs to /api/empire/clients on publish.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkAdminSession } from '@/lib/security/require-admin';
import { OnboardWizard } from '@/components/empire/clients-new/OnboardWizard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Onboard client · Empire Command Center',
};

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/empire/clients/new`);
  }
  if (!session.ok && session.reason === 'forbidden') {
    redirect(`/${locale}/empire`);
  }

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
          href={`/${locale}/empire`}
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
          ← Empire
        </Link>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          New client
        </span>
      </header>
      <OnboardWizard />
    </div>
  );
}

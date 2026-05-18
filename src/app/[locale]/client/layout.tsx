import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ClientSidebar from './ClientSidebar';

export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <ClientSidebar />
      <main
        style={{
          flex: 1,
          marginLeft: 'var(--client-sidebar-width)',
          padding: '32px',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}

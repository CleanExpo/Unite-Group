// /[locale]/empire/data-room — M&A data room admin UI (UNI-1989).
//
// Founder-only. Lists every generated data_room_documents row, lets the
// founder approve / reject / supersede, and triggers the ZIP export.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { checkAdminSession } from '@/lib/security/require-admin';
import { DataRoomConsole } from '@/components/empire/data-room/DataRoomConsole';

export const dynamic = 'force-dynamic';

interface DocRow {
  id: string;
  kind: string;
  business_id: string | null;
  period_start: string | null;
  period_end: string | null;
  generated_at: string;
  audit_status: string;
  updated_at: string;
}

export const metadata = {
  title: 'Data Room · Empire Command Center',
};

export default async function EmpireDataRoomPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/empire/data-room`);
  }
  if (!session.ok) {
    redirect(`/${locale}/empire`);
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('data_room_documents')
    .select(
      'id, kind, business_id, period_start, period_end, generated_at, audit_status, updated_at',
    )
    .order('generated_at', { ascending: false })
    .limit(500);

  const documents: DocRow[] = error ? [] : ((data ?? []) as DocRow[]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border-hairline)',
          padding: '14px 32px',
          background: 'var(--surface-1)',
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
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-secondary)',
          }}
        >
          ← Empire
        </Link>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-primary)',
          }}
        >
          Data Room
        </span>
      </header>

      <DataRoomConsole initialDocuments={documents} fetchError={!!error} />
    </div>
  );
}

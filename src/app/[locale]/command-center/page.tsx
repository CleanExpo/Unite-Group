// /[locale]/command-center — Unite-Group operations cockpit.
//
// Per UNI-2022 (PM audit 18/05/2026), the page route gate must mirror the
// API admin policy. Anonymous callers redirect to /en/login; authenticated
// non-admins see the AccessDenied UX. Only allow-listed admins ever reach
// the shell — no "visible but unusable" state where the UI renders behind
// a wall of 401 responses.

import { redirect } from 'next/navigation';
import { CommandCenterShell } from '@/components/command-center/CommandCenterShell';
import { AccessDenied } from '@/components/command-center/AccessDenied';
import { checkAdminSession } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

export default async function CommandCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/command-center`);
  }
  if (!session.ok && session.reason === 'forbidden') {
    return <AccessDenied actorEmail={session.actorEmail} />;
  }
  return <CommandCenterShell />;
}

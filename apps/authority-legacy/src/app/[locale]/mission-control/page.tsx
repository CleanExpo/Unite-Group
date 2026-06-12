// /[locale]/mission-control — Nexus Mesh fleet view.
//
// Admin-gated exactly like /command-center (UNI-2022 policy): anonymous → login,
// non-admin → AccessDenied, admins → the live fleet. Server-renders the first
// snapshot; FleetView then polls /api/mesh/fleet every 10s.
//
// Spec: Pi-CEO docs/superpowers/specs/2026-06-11-nexus-mesh-design.md
import { redirect } from 'next/navigation';
import { checkAdminSession } from '@/lib/security/require-admin';
import { AccessDenied } from '@/components/command-center/AccessDenied';
import { readFleet } from '@/lib/mesh/read-fleet';
import { FleetView } from '@/components/mission-control/FleetView';

export const dynamic = 'force-dynamic';

export default async function MissionControlPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await checkAdminSession();
  if (!session.ok && session.reason === 'anonymous') {
    redirect(`/${locale}/login?next=/${locale}/mission-control`);
  }
  if (!session.ok && session.reason === 'forbidden') {
    return <AccessDenied actorEmail={session.actorEmail} locale={locale} />;
  }

  const initial = await readFleet();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <FleetView initial={initial} />
      </div>
    </main>
  );
}

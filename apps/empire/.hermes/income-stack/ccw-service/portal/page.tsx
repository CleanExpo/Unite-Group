import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'CCW service department approval' };
}

type Lane = {
  lane_id: 'lane-1' | 'lane-2' | 'lane-3';
  title: string;
  what_is_this: string;
};

async function fetchApproval(token: string) {
  const res = await fetch(`${API_BASE}/api/approvals/${token}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function laneIndex(label: Lane['lane_id']) {
  return label === 'lane-1' ? 1 : label === 'lane-2' ? 2 : 3;
}

function ActionForms({ token, lane }: { token: string; lane: Lane }) {
  const action = `/api/approvals/${token}`;
  return (
    <div className="mt-4 space-y-3">
      <form action={action} method="post" className="flex gap-2">
        <input type="hidden" name="lane_id" value={lane.lane_id} />
        <input type="hidden" name="decision" value="approved" />
        <Button type="submit" className="flex-1 rounded-sm bg-[#00F5FF] text-black hover:bg-[#9ffcff]">Approve</Button>
      </form>

      <details className="rounded-sm border border-[#00F5FF]/30 p-3">
        <summary className="cursor-pointer list-none rounded-sm border border-[#00F5FF]/30 px-3 py-2 text-center text-sm text-[#00F5FF]">Request changes</summary>
        <form action={action} method="post" className="mt-3 space-y-3">
          <input type="hidden" name="lane_id" value={lane.lane_id} />
          <input type="hidden" name="decision" value="changes-requested" />
          <Textarea name="changes_requested_body" placeholder="Tell Phill what needs to change" className="min-h-28 rounded-sm border-[#00F5FF]/25 bg-[#0a0a0a] text-white placeholder:text-white/40" required />
          <Button type="submit" variant="outline" className="w-full rounded-sm border-[#00F5FF]/40 bg-transparent text-[#00F5FF]">Send change request</Button>
        </form>
      </details>

      <details className="rounded-sm border border-red-500/30 p-3">
        <summary className="cursor-pointer list-none rounded-sm border border-red-500/30 px-3 py-2 text-center text-sm text-red-300">Reject</summary>
        <form action={action} method="post" className="mt-3 space-y-3">
          <input type="hidden" name="lane_id" value={lane.lane_id} />
          <input type="hidden" name="decision" value="rejected" />
          <Textarea name="changes_requested_body" placeholder="Reason for rejection" className="min-h-28 rounded-sm border-red-500/25 bg-[#0a0a0a] text-white placeholder:text-white/40" required />
          <Button type="submit" variant="destructive" className="w-full rounded-sm">Reject lane</Button>
        </form>
      </details>
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const approval = await fetchApproval(token);
  if (!approval) return <main className="min-h-screen bg-[#050505] p-6 text-white">Not found</main>;
  const lanes: Lane[] = approval.deliverable_body?.lanes || [];

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="space-y-2 border-b border-[#00F5FF]/20 pb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-[#00F5FF]">From: Phill McGurk, Unite-Group Nexus</p>
          <h1 className="text-2xl font-semibold text-white">CCW Service Department Busy</h1>
          <p className="text-sm text-white/70">Toby’s 3-lane approval portal for the operational brief, landing copy, and content calendar.</p>
        </header>

        <section className="space-y-4">
          {lanes.map((lane) => (
            <Card key={lane.lane_id} className="rounded-sm border border-[#00F5FF]/20 bg-[#070707] text-white shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs uppercase tracking-[0.3em] text-[#00F5FF]">Lane {laneIndex(lane.lane_id)}</CardDescription>
                <CardTitle className="text-xl text-white">{lane.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm leading-6 text-white/75">{lane.what_is_this}</p>
                <ActionForms token={token} lane={lane} />
              </CardContent>
            </Card>
          ))}
        </section>

        <footer className="space-y-2 border-t border-[#00F5FF]/20 pt-4 text-xs leading-5 text-white/60">
          <p>ETA 1999 (Cth) compliance notice: this is a magic-link approval portal and the decision is recorded with a signed audit hash.</p>
          <p>To talk to a human, email phill@unitenetworks.com.au</p>
        </footer>
      </div>
    </main>
  );
}

'use client';

// Mission Control — live fleet view. Renders machine cards, the git ship feed,
// and the work-claim board, refreshing every 10s from /api/mesh/fleet.
// Spec: Pi-CEO docs/superpowers/specs/2026-06-11-nexus-mesh-design.md
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Fleet, MeshMachine } from '@/lib/mesh/read-fleet';

const POLL_MS = 10_000;

function statusTone(m: MeshMachine): { label: string; cls: string } {
  if (m.is_stale) return { label: 'offline', cls: 'bg-zinc-700 text-zinc-300' };
  if (m.active_agents > 0 || m.status === 'working')
    return { label: 'working', cls: 'bg-emerald-600 text-white' };
  return { label: 'idle', cls: 'bg-sky-700 text-sky-100' };
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

export function FleetView({ initial }: { initial: Fleet }) {
  const [fleet, setFleet] = useState<Fleet>(initial);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const res = await fetch('/api/mesh/fleet', { cache: 'no-store' });
        if (!res.ok) return;
        const next = (await res.json()) as Fleet;
        if (live) {
          setFleet(next);
          setPulse((p) => !p);
        }
      } catch {
        /* keep last good snapshot */
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const agentsByMachine = (host: string) =>
    fleet.agents.filter((a) => a.machine === host && a.state !== 'idle');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
          <p className="text-sm text-zinc-400">
            Nexus Mesh — {fleet.machines.length} node{fleet.machines.length === 1 ? '' : 's'} ·{' '}
            {fleet.ok ? `updated ${ago(fleet.fetchedAt)}` : `link down: ${fleet.error ?? 'unknown'}`}
          </p>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full transition-colors ${pulse ? 'bg-emerald-400' : 'bg-emerald-600'}`}
          title="live"
        />
      </header>

      {fleet.machines.length === 0 && (
        <Card className="p-6 text-sm text-zinc-400">
          No machines reporting yet. Run <code className="text-zinc-200">mesh/bootstrap.sh</code> on a
          node and it will appear here within 20 seconds.
        </Card>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fleet.machines.map((m) => {
          const tone = statusTone(m);
          const runtimes = (m.agent_runtimes ?? []).filter((r) => r.present).map((r) => r.runtime);
          return (
            <Card key={m.host} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{m.host}</div>
                <Badge className={tone.cls}>{tone.label}</Badge>
              </div>
              <div className="text-xs text-zinc-400">
                {m.os ?? 'unknown OS'} · {m.tailnet_ip ?? 'no tailnet'} · seen {ago(m.last_seen)}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>CPU</span>
                  <span>{m.cpu_pct != null ? `${m.cpu_pct}%` : '—'}</span>
                </div>
                <Progress value={m.cpu_pct ?? 0} />
              </div>
              <div className="flex flex-wrap gap-1">
                {runtimes.map((r) => (
                  <Badge key={r} className="bg-zinc-800 text-zinc-200">
                    {r}
                  </Badge>
                ))}
              </div>
              <div className="space-y-1">
                {agentsByMachine(m.host).map((a, i) => (
                  <div key={i} className="rounded bg-zinc-900/60 px-2 py-1 text-xs">
                    <span className="text-emerald-400">{a.runtime}</span>{' '}
                    <span className="text-zinc-400">{a.repo ?? '—'}</span>
                    {a.branch && <span className="text-zinc-500"> · {a.branch}</span>}
                    {a.current_task && (
                      <div className="truncate text-zinc-300">{a.current_task}</div>
                    )}
                  </div>
                ))}
                {agentsByMachine(m.host).length === 0 && (
                  <div className="text-xs text-zinc-600">no active agents</div>
                )}
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Ship feed</h2>
          <ul className="space-y-2">
            {fleet.ships.slice(0, 12).map((s, i) => (
              <li key={i} className="text-xs">
                <span className="text-zinc-500">{ago(s.shipped_at)}</span>{' '}
                <span className="text-sky-400">{s.machine}</span>{' '}
                <span className="text-zinc-400">{s.repo}</span>
                {s.branch && <span className="text-zinc-600"> · {s.branch}</span>}
                <div className="truncate text-zinc-200">{s.subject ?? '(no subject)'}</div>
              </li>
            ))}
            {fleet.ships.length === 0 && <li className="text-xs text-zinc-600">no ships yet</li>}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Work claims</h2>
          <ul className="space-y-2">
            {fleet.claims.map((c, i) => (
              <li key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-200">{c.linear_id}</span>
                <span className="text-zinc-400">{c.machine ?? 'unassigned'}</span>
                <Badge className="bg-amber-700 text-amber-100">{c.state}</Badge>
              </li>
            ))}
            {fleet.claims.length === 0 && (
              <li className="text-xs text-zinc-600">no open claims</li>
            )}
          </ul>
        </Card>
      </section>
    </div>
  );
}

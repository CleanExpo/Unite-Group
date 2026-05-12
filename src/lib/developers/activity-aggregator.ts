// src/lib/developers/activity-aggregator.ts
import type { DailyCommitCount } from "./types";

export function aggregateRollingWindow(
  commits: Array<{ committed_at: string }>,
  timezone: string,
  windowDays: number,
  now: Date = new Date()
): DailyCommitCount[] {
  // Pre-fill window with zero days in dev's local TZ
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });

  const out: DailyCommitCount[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    out.push({ date: fmt.format(d), count: 0 });
  }
  const idx = new Map(out.map((r, i) => [r.date, i]));

  for (const c of commits) {
    const d = fmt.format(new Date(c.committed_at));
    const i = idx.get(d);
    if (i !== undefined) out[i].count++;
  }
  return out;
}

export function sumOverDays(counts: DailyCommitCount[], days: number): number {
  return counts.slice(-days).reduce((acc, r) => acc + r.count, 0);
}

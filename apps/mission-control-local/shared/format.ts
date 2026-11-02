// Ported from the age helper in apps/empire FleetView, with the missing-value case added.
export function formatAge(ageMs: number | null): string {
  if (ageMs === null) return 'never';
  const s = Math.max(0, Math.round(ageMs / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

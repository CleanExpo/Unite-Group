import { useEffect, useState } from 'react';
import { monotonicNow } from '../shared/clock.ts';

/**
 * A monotonic clock reading (the same clock readFleet stamps startedAt with), refreshed
 * every intervalMs, so time-based text moves between polls and never runs backwards.
 */
export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(monotonicNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(monotonicNow()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

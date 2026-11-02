import { useEffect, useState } from 'react';

/** The browser's clock, refreshed every intervalMs, so time-based text moves between polls. */
export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

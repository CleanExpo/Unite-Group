// One poll per window, shared by every fleet widget. Waits for each reply before
// scheduling the next, so a slow server never builds up a pile of requests.
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { FleetSnapshot } from '../shared/types.ts';
import { signIn } from './session.ts';

export const POLL_MS = 3_000;

export type FleetState =
  | { kind: 'loading' }
  | { kind: 'server-unreachable' }
  | { kind: 'signed-out' }
  | { kind: 'snapshot'; snapshot: FleetSnapshot };

const FleetContext = createContext<FleetState>({ kind: 'loading' });

export function useFleet(): FleetState {
  return useContext(FleetContext);
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FleetState>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      let next: FleetState = { kind: 'server-unreachable' };
      try {
        const res = await fetch('/api/fleet', { cache: 'no-store' });
        if (res.status === 401) {
          // Leaves for the login page, unless this window holds an unsaved layout change.
          if (signIn.signedOut()) return;
          next = { kind: 'signed-out' };
        } else if (res.ok) next = { kind: 'snapshot', snapshot: (await res.json()) as FleetSnapshot };
      } catch {
        // Stays server-unreachable, which the widgets show as its own state.
      }
      if (!live) return;
      setState(next);
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  return <FleetContext.Provider value={state}>{children}</FleetContext.Provider>;
}

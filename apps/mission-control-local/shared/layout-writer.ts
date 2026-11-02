// The browser's side of layout saving. Every write carries the revision this window
// last saw. If another window saved first, the server answers 409 with its layout,
// and the writer holds this window's change and asks the user what to do. A change is
// never dropped without the user choosing to drop it.
import { createLatestWins } from './latest-wins.ts';
import type { LayoutItem, LayoutResponse } from './types.ts';

export type LayoutOp = { kind: 'save'; items: LayoutItem[] } | { kind: 'reset' };

export type SendResult =
  | { status: 'ok'; layout: LayoutResponse }
  | { status: 'conflict'; current: LayoutResponse }
  | { status: 'signed-out' };

/** Sends one write based on `revision`. Throws for anything that is not one of the results. */
export type Send = (op: LayoutOp, revision: number) => Promise<SendResult>;

export interface Conflict {
  current: LayoutResponse;
  mine: LayoutOp;
}

export interface WriterEvents {
  /** The server's layout to show: after a save, or after the user chose reload. */
  onLayout(layout: LayoutResponse): void;
  /** Another window saved first. Nothing was written. `mine` is held until resolved. */
  onConflict(conflict: Conflict): void;
  onFailed(): void;
}

export function createLayoutWriter(send: Send, events: WriterEvents) {
  let revision: number | null = null;
  let conflict: Conflict | null = null;

  const run = async (op: LayoutOp): Promise<{ op: LayoutOp; result: SendResult }> => {
    if (revision === null) throw new Error('layout not loaded');
    const result = await send(op, revision);
    // Adopt every success, not only the last one, so the next queued write is based on it.
    if (result.status === 'ok') revision = result.layout.revision;
    return { op, result };
  };

  const queue = createLatestWins(run, (outcome) => {
    if (!outcome.ok) return events.onFailed();
    const { op, result } = outcome.result;
    if (result.status === 'ok') events.onLayout(result.layout);
    else if (result.status === 'conflict') {
      conflict = { current: result.current, mine: op };
      events.onConflict(conflict);
    }
  });

  return {
    /** The layout this window loaded. Writes are refused until this is called. */
    loaded(layout: LayoutResponse): void {
      revision = layout.revision;
    },
    write(op: LayoutOp): void {
      if (conflict) {
        // Still this window's newest change: keep it with the open question.
        conflict = { ...conflict, mine: op };
        events.onConflict(conflict);
        return;
      }
      queue(op);
    },
    /** Shows the other window's layout. This window's held change is discarded by choice. */
    reload(): void {
      if (!conflict) return;
      const { current } = conflict;
      conflict = null;
      revision = current.revision;
      events.onLayout(current);
    },
    /** Writes this window's held change over the other one, based on the revision now on disk. */
    overwrite(): void {
      if (!conflict) return;
      const { current, mine } = conflict;
      conflict = null;
      revision = current.revision;
      queue(mine);
    },
  };
}

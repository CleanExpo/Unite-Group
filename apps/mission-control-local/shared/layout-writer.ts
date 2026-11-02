// The browser's side of layout saving. Every write carries the revision this window
// last saw. If another window saved first, the server answers 409 with its layout; if
// the session has ended, it answers 401. Either way the writer holds this window's change
// and asks the user what to do. A change is never dropped without the user choosing to.
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
  /** The session ended before the save landed. `mine` is held until retried or abandoned. */
  onSignedOut(mine: LayoutOp): void;
  onFailed(): void;
  /** True while a change is queued, in flight, or held; false once it is saved or settled. */
  onUnsaved(unsaved: boolean): void;
}

type Held = ({ kind: 'conflict' } & Conflict) | { kind: 'signed-out'; mine: LayoutOp };

export function createLayoutWriter(send: Send, events: WriterEvents) {
  let revision: number | null = null;
  let held: Held | null = null;

  const run = async (op: LayoutOp): Promise<{ op: LayoutOp; result: SendResult }> => {
    if (revision === null) throw new Error('layout not loaded');
    const result = await send(op, revision);
    // Adopt every success, not only the last one, so the next queued write is based on it.
    if (result.status === 'ok') revision = result.layout.revision;
    return { op, result };
  };

  const announce = (h: Held) => {
    if (h.kind === 'conflict') events.onConflict({ current: h.current, mine: h.mine });
    else events.onSignedOut(h.mine);
  };

  const queue = createLatestWins(run, (outcome) => {
    if (!outcome.ok) {
      events.onUnsaved(false);
      return events.onFailed();
    }
    const { op, result } = outcome.result;
    if (result.status === 'ok') {
      events.onUnsaved(false);
      events.onLayout(result.layout);
    } else {
      held = result.status === 'conflict' ? { kind: 'conflict', current: result.current, mine: op } : { kind: 'signed-out', mine: op };
      announce(held);
    }
  });

  const start = (op: LayoutOp) => {
    events.onUnsaved(true);
    queue(op);
  };

  return {
    /** The layout this window loaded. Writes are refused until this is called. */
    loaded(layout: LayoutResponse): void {
      revision = layout.revision;
    },
    write(op: LayoutOp): void {
      if (held) {
        // Still this window's newest change: keep it with the open question.
        held = { ...held, mine: op };
        return announce(held);
      }
      start(op);
    },
    /** Shows the other window's layout. This window's held change is discarded by choice. */
    reload(): void {
      if (held?.kind !== 'conflict') return;
      const { current } = held;
      held = null;
      revision = current.revision;
      events.onUnsaved(false);
      events.onLayout(current);
    },
    /** Writes this window's held change over the other one, based on the revision now on disk. */
    overwrite(): void {
      if (held?.kind !== 'conflict') return;
      const { current, mine } = held;
      held = null;
      revision = current.revision;
      start(mine);
    },
    /** Sends the change held at sign-out again, after the user has signed back in. */
    retry(): void {
      if (held?.kind !== 'signed-out') return;
      const { mine } = held;
      held = null;
      start(mine);
    },
    /** The user chose to drop the held change (for example, to sign in from this window). */
    abandon(): void {
      if (!held) return;
      held = null;
      events.onUnsaved(false);
    },
  };
}

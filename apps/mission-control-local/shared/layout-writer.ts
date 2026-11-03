// The browser's side of layout saving. Every write carries the revision this window
// last saw. If another window saved first, the server answers 409 with its layout; if
// the session has ended, it answers 401; any other failure is a failed save. In every
// case the writer holds this window's change and asks the user what to do. A change the
// server has not confirmed is never dropped without the user choosing to drop it.
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
  /** The save failed for another reason (network, server error). `mine` is held the same way. */
  onFailed(mine: LayoutOp): void;
  /** True from the first write until the server confirms it or the user drops the change. */
  onUnsaved(unsaved: boolean): void;
}

type Held =
  | ({ kind: 'conflict' } & Conflict)
  | { kind: 'signed-out'; mine: LayoutOp }
  | { kind: 'failed'; mine: LayoutOp };

type Outcome = SendResult | { status: 'failed' };

export function createLayoutWriter(send: Send, events: WriterEvents) {
  let revision: number | null = null;
  let held: Held | null = null;

  // Never throws: a failure is an outcome that carries the change, so it can be held.
  const run = async (op: LayoutOp): Promise<{ op: LayoutOp; result: Outcome }> => {
    if (revision === null) return { op, result: { status: 'failed' } };
    let result: Outcome;
    try {
      result = await send(op, revision);
    } catch {
      result = { status: 'failed' };
    }
    // Adopt every success, not only the last one, so the next queued write is based on it.
    if (result.status === 'ok') revision = result.layout.revision;
    return { op, result };
  };

  const announce = (h: Held) => {
    if (h.kind === 'conflict') events.onConflict({ current: h.current, mine: h.mine });
    else if (h.kind === 'signed-out') events.onSignedOut(h.mine);
    else events.onFailed(h.mine);
  };

  const queue = createLatestWins(run, (outcome) => {
    // `run` never throws, so this branch is unreachable; it still must not clear anything.
    if (!outcome.ok) return;
    const { op, result } = outcome.result;
    if (result.status === 'ok') {
      events.onUnsaved(false);
      events.onLayout(result.layout);
      return;
    }
    if (result.status === 'conflict') held = { kind: 'conflict', current: result.current, mine: op };
    else if (result.status === 'signed-out') held = { kind: 'signed-out', mine: op };
    else held = { kind: 'failed', mine: op };
    announce(held);
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
    /** Sends a change held after sign-out or a failed save again. */
    retry(): void {
      if (held?.kind !== 'signed-out' && held?.kind !== 'failed') return;
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

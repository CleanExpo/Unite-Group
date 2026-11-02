// Runs layout writes one at a time. While one is in flight only the newest waiting
// write is kept, so the file ends on what the user last did, and the outcome the
// user sees is always the outcome of that last write.

export function createLatestWins<Op, Result>(
  run: (op: Op) => Promise<Result>,
  onLatestSettled: (outcome: { ok: true; result: Result } | { ok: false }) => void,
) {
  let waiting: { op: Op } | null = null;
  let busy = false;

  async function drain(): Promise<void> {
    busy = true;
    while (waiting) {
      const { op } = waiting;
      waiting = null;
      let outcome: { ok: true; result: Result } | { ok: false };
      try {
        outcome = { ok: true, result: await run(op) };
      } catch {
        outcome = { ok: false };
      }
      // A newer write is waiting, so this result no longer describes what is on screen.
      if (!waiting) onLatestSettled(outcome);
    }
    busy = false;
  }

  return (op: Op): void => {
    waiting = { op };
    if (!busy) void drain();
  };
}

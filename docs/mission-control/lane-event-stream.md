# Lane event stream — live, redacted, resumable run activity

**Ticket:** UNI-2406 (`[MC-P1] Live tool-call and CLI output stream with replay and redaction`)
**Parent:** UNI-2246 · **Depends on:** [`control-plane/v1`](../contracts/control-plane-v1.md) (UNI-2403)
**Producer:** [`apps/workspace/src/server/lanes/event-stream.ts`](../../apps/workspace/src/server/lanes/event-stream.ts)
**Transport:** [`apps/workspace/src/routes/api/lanes/events.ts`](../../apps/workspace/src/routes/api/lanes/events.ts)
**View:** [`apps/workspace/src/screens/command-center/lane-run-stream.tsx`](../../apps/workspace/src/screens/command-center/lane-run-stream.tsx)

---

## 1. What changed, and why it mattered

Before this, a lane run wrote exactly two events — `sequence: 1` "Run started" and
`sequence: 2` "Run succeeded" — and everything the CLI printed was buffered in
memory, truncated at 64 KB, and surfaced once at the end as `lane.lastOutput`.

There was nothing to watch while a run was in flight, and nothing to resume if
the browser dropped. A ten-minute run was a spinner followed by a wall of text.

Now one `LaneEventStream` per run allocates every sequence, so output lands
between the lifecycle events and a run reads back as
`lifecycle → output… → tool_call… → lifecycle`, gap-free.

This introduces **no second queue and no second state machine**. The producer
appends to the same JSONL ledger the orchestrator already owned; ordering and
lifecycle remain the orchestrator's.

## 2. The three properties the tests actually hold it to

Each is a way this class of code silently leaks or lies.

### Redaction survives chunk boundaries

A per-chunk `sanitise()` is the obvious implementation and it is wrong: a token
split across two `stdout` writes reaches the deny-list as two harmless
fragments, and both are emitted.

`createRedactingSplitter` is line-oriented instead. No secret token in
`sanitiseLaneOutput`'s deny-list can contain a newline, so splitting on lines
closes the boundary hole for every token shape. Two cases need more than that:

- **PEM private keys** legitimately span newlines, so a `BEGIN` marker
  suppresses every line until `END` and emits one `[REDACTED]` placeholder.
- **A line that outgrows the flush limit** must be cut without a newline, and
  that cut can land mid-token. The splitter carries `SECRET_CARRY_BYTES` (256)
  of tail forward into the next segment so both halves are re-examined together.

Redaction happens *inside* the splitter, before the sink is ever called, which
makes "redacted before persistence" structural rather than a convention someone
can forget. The test asserts it against the ledger **file on disk**, not the
in-memory events.

### Sequences are gap-free

Events shed under backpressure never consume a sequence number. That is the
whole basis of the reconnect guarantee: a client resuming from cursor N can
distinguish "nothing has happened since N" from "I lost events after N". With
gaps, those two are indistinguishable and the guarantee is unprovable.

### Backpressure drops are accounted, never silent

Past `outputBudget` (default 2 000), only `output` events are shed. Lifecycle,
control, `tool_call`, `evidence` and `error` are never shed. The shed count is
emitted in-band as an `annotation`, so a quiet stream is never mistaken for a
complete one.

## 3. Structured tool events (opt-in)

`claude -p` in prose mode carries no tool name, arguments, status or duration.
Those come from `--output-format stream-json`, parsed by
[`tool-call-parser.ts`](../../apps/workspace/src/server/lanes/tool-call-parser.ts).

Enable per lane with `CliBackend.structuredEvents: true`. **Default is off**,
because the flag changes what the CLI writes to stdout — every lane that does
not ask for it keeps byte-identical prose behaviour, and a test asserts the
default invocation is still exactly `['-p']`.

claude-code only. Codex's JSON stream is a different shape with no parser here;
enabling the flag for it would produce a lane that reports no tools at all while
looking like it works, so it is ignored for codex.

The parser was written against a **real captured stream**
(`__fixtures__/claude-stream-json.jsonl`, from an actual run on 2026-08-17), not
from documentation. A parser built from a remembered format passes its own tests
and fails on the first real run. Duration comes from the CLI's own ISO
timestamps rather than the wall clock, and a negative delta returns `undefined`
— a negative duration renders as a real value and would be believed.

## 4. Transport and reconnect

`GET /api/lanes/events?runId=…` streams the ledger as server-sent events.

Reconnect rides on the SSE standard rather than a bespoke parameter. Every frame
carries `id: <sequence>`, so a browser that drops re-opens with `Last-Event-ID`
set to the last frame it actually rendered — the page tracks nothing and
survives a refresh. `?cursor=` remains for a non-browser client or a deliberate
replay from zero.

`Last-Event-ID` wins over `?cursor=` when both are present: the header reflects
what the client received, so trusting a stale URL over it would replay events
already on screen. An unparseable or negative cursor resolves to 0 — a full
replay is recoverable, whereas silently skipping ahead loses events with no way
to notice.

The ledger is **polled**, not pushed, because it is a JSONL file with no event
bus in front of it. A bus can replace the pump later without changing the wire
format.

## 5. The view

The lane card's final-only `<pre>` is replaced by `LaneRunStream`. Two UNI-2412
rules shaped it more than anything else:

- *"Never present seed, cached or estimated data as live without a source and
  freshness label."* `live` is only claimed when an event actually arrived
  recently; a connected but silent stream reports `stale`. Otherwise the
  freshness label is decoration and a stalled run reads as healthy.
- *"Include loading, empty, stale, degraded, disconnected and permission-denied
  states."* All seven are distinct named states, and a test asserts they produce
  seven different labels rather than collapsing into one.

A dropped socket reports `reconnecting`, not `failed`: EventSource retries and
resumes from `Last-Event-ID` on its own, and calling that failed would tell the
founder to intervene in something the browser is already fixing.

The final-only `lastOutput` branch is **kept** for a lane whose last run predates
the stream. Dropping it would blank the visible history of every lane that
already exists.

## 6. Backward compatibility

A machine that ran the previous build has `events.jsonl` files in the legacy
`LaneRunEvent` shape: numeric `occurredAt`, `type` instead of `kind`, no
`schemaVersion` or `source`. Those are **upgraded on read**
(`upgradeLegacyLaneRunEvent`), satisfying UNI-2403 acceptance 4. Refusing them
would have turned a deploy into data loss.

Fields the old shape never carried (`machineId`, `agent`) are named `unknown`
rather than guessed — a hostname guess would attribute a run to a machine that
may not have produced it. Upgraded events carry a legacy `source` so they are
never misattributed to the streaming producer.

Anything that is neither shape still fails closed. Silently dropping an
unreadable line would shorten a replay and make the gap-free guarantee a lie.

## 7. Acceptance criteria (UNI-2406)

| # | Criterion | Where it is satisfied |
| --- | --- | --- |
| 1 | SSE supports reconnect with cursor/replay | `id:` frames + `Last-Event-ID`; `createLaneEventPump`; verified live |
| 2 | Events show machine, lane, agent/CLI, tool name, safe argument summary, status, duration | `LaneStreamEvent` + `LaneToolCall`; `tool-call-parser.ts` |
| 3 | Secret/path redaction tested before persistence and rendering | `createRedactingSplitter`; asserted against the ledger file on disk |
| 4 | Backpressure, truncation and high-volume do not freeze the panel | bounded budget, accounted shedding, 10 000-event test, 500-row render cap |
| 5 | A dropped browser reconnects without losing authoritative run state | resume test at the data layer, component layer and live over HTTP |

## 8. Evidence

Run on Node 24.19.0 — the range `package.json` declares. **On Node 22 three
`workflow-supply-chain` security tests fail with a misleading error and pass on
24; that is an environment trap, not a code defect.**

```bash
cd apps/workspace && npx vitest run     # 932 passed
cd apps/workspace && npx tsc --noEmit   # clean
cd apps/workspace && npm run build      # ok
node scripts/control-plane-contract.mjs # PASS
npm run verify:readiness                # exit 0, 411/411
```

### Live HTTP smoke

Against `vite dev` with an isolated `HOME` (so no real `~/.hermes` state was
touched) and a seeded ledger:

- full replay from cursor 0 — all five events, correct `id:`/`event:` framing;
- `Last-Event-ID: 3` → only sequences 4 and 5 delivered;
- an event appended to the ledger **while a client was connected** arrived on
  that open connection;
- `runId=../etc` → 400; unauthenticated → 401;
- response headers include `text/event-stream`, `no-cache, no-store` and
  `x-accel-buffering: no` (without the last, nginx buffers and "live" arrives in
  one lump).

### Positive controls

Every one was run and reverted. A check that cannot fail is not a check.

| Mutation | Expected | Result |
| --- | --- | --- |
| `onOutput` wiring → `undefined` | the 3 streaming tests go red | exactly those 3 |
| `sanitiseLaneOutput` → identity | only the ledger-redaction test goes red | exactly that 1 |
| parse the captured stream in 7-byte slices | identical to whole-file parse | identical |
| `resolveCursor` ignores `Last-Event-ID` | only the resume test goes red | exactly that 1 |
| delete the poll-timer `clearInterval` | the timer-leak test goes red | **initially green — test was vacuous** |

That last row is the reason to run controls at all. "Stops polling once the
client disconnects" stayed green with the cleanup deleted, because the route
also guards every poll on a `closed` flag — so it proved the guard, not the
cleanup, and a leaked interval would have shipped. It is now two assertions: no
further ledger reads (the guard), and `clearInterval` called twice (the cleanup,
observed with a spy). Removing either fix now turns exactly one red.

## 9. Known gaps

- **No browser screenshot smoke.** The dev harness denies `/api/lanes/*` to a
  real browser because TanStack Start does not attach `remoteAddress` in dev, so
  `requireLocalOrAuth` fails closed. The HTTP smoke above covers the same paths;
  a browser capture needs either a session cookie or `TRUST_PROXY` with a
  forwarded header a browser will not send.
- **Codex structured events.** No parser for its JSON stream yet; the flag is
  deliberately ignored rather than half-wired.
- **Polling, not pushing.** 500 ms interval. Fine for a file-backed ledger, and
  replaceable without a wire-format change.

# Handoff — MC-P1: event stream, autonomy gate, evidence timeline

**When:** 2026-08-18, ~00:55–03:00
**Branch:** `feat/uni-2403-control-plane-contract` — **10 commits ahead of `origin/main`, NOT pushed**
**HEAD:** `2e1fdf8a4`
**Tickets:** UNI-2403 (verified complete), UNI-2406 (complete), UNI-2409 (partial), UNI-2411 (partial), UNI-2412 (one slice)

---

## Read this first: the Node trap

This repo requires Node `>=24.14.1 <25`. **On Node 22, three `workflow-supply-chain`
security tests fail with a misleading error and pass on 24.** They are not broken.

Anyone re-running the gates must use Node 24 or they will chase a phantom.
This machine has no nvm/fnm/brew; a Node 24 tarball was unpacked to the session
scratchpad and put on `PATH`. On a fresh session, install Node 24 first.

```bash
node -v   # must be 24.x
```

---

## What shipped, and what did not

| Ticket | State | Honest summary |
|---|---|---|
| UNI-2403 | **Complete (was already)** | Verified green on arrival; extended so the audit resolves `extends` |
| UNI-2406 | **Complete** | All five acceptance criteria, proven live over HTTP |
| UNI-2409 | **Partial — NOT enforcing** | Classifier built + adversarially tested; **not wired to any permission callback** |
| UNI-2411 | **Partial** | Timeline builder complete; only 2 of 10 stages have live producers; not rendered in the UI |
| UNI-2412 | **One slice** | The lane card now streams its run; the full single-monitor cockpit is untouched |

**Do not read UNI-2409 as a live control.** It classifies and decides; nothing
calls it before a tool runs. Wiring it is the risky half.

---

## The commits

```
2e1fdf8a4 feat(evidence): UNI-2411 — end-to-end timeline that reports its own holes
804c1c452 feat(security): UNI-2409 — autonomy-ladder classifier and fail-closed gate
241496db8 docs(mission-control): UNI-2406 — lane event stream, with live HTTP evidence
3fbf123ad feat(mission-control): UNI-2406/UNI-2412 — live run stream on the lane card
16e54010e feat(stream): UNI-2406 — SSE transport with standards-based cursor reconnect
48121d33c feat(stream): UNI-2406 — structured tool-call events from claude stream-json
41abbb369 feat(stream): UNI-2406 — stream live lane output into the run ledger
073e02e8e feat(stream): UNI-2406 — redacted, resumable lane event stream (producer core)
dac51b65d fix(contract): UNI-2403 — close two false-green holes in the audit's source sweep  (pre-existing)
531d58446 feat(contract): UNI-2403 — canonical control-plane run/lane/event contract          (pre-existing)
```

The bottom two predate this session.

---

## Key files

| Path | What it is |
|---|---|
| `apps/workspace/src/server/lanes/event-stream.ts` | Producer: redacting splitter, gap-free sequences, accounted backpressure, cursor reader, legacy upgrade |
| `apps/workspace/src/server/lanes/tool-call-parser.ts` | `claude stream-json` → tool events, against a **real captured fixture** |
| `apps/workspace/src/server/lanes/event-sse.ts` | SSE framing + cursor pump |
| `apps/workspace/src/routes/api/lanes/events.ts` | `GET /api/lanes/events?runId=…` |
| `apps/workspace/src/screens/command-center/lane-run-stream.tsx` | The live view on the lane card |
| `apps/workspace/src/server/lanes/autonomy-gate.ts` | L0–L3 classifier (**not wired**) |
| `apps/workspace/src/server/lanes/evidence-timeline.ts` | Ten-stage timeline that reports its own holes |
| `docs/mission-control/lane-event-stream.md` | Full write-up incl. live evidence and known gaps |

---

## Verification — how to confirm this is still green

```bash
cd apps/workspace && npx tsc --noEmit          # exit 0
cd apps/workspace && npx vitest run            # 1066 passed
cd apps/workspace && npm run build             # exit 0
node scripts/control-plane-contract.mjs        # PASS
npm run verify:readiness                       # exit 0, 411/411
```

`npm run verify:readiness` reports `pass: 8, fail: 2, blocking: 0` — those two
findings are pre-existing and non-blocking, unchanged by this work.

### Live HTTP smoke (reproduce it)

```bash
# Isolated HOME so the real ~/.hermes is never touched
HOME=/path/to/fakehome TRUST_PROXY=1 npx vite dev --port 3987 --host 127.0.0.1
curl -sN -H "X-Forwarded-For: 127.0.0.1" \
  "http://127.0.0.1:3987/api/lanes/events?runId=<id>"
```

Seed `$HOME/.hermes/lanes/events.jsonl` with control-plane/v1 events first.
`TRUST_PROXY=1` is needed because TanStack Start does not attach `remoteAddress`
in dev, so `requireLocalOrAuth` fails closed against a plain localhost request.

---

## Decisions locked (don't re-litigate)

1. **Allow-list, not deny-list**, in the autonomy gate. A deny-list fails open on
   every command nobody thought of. Cost: false escalations. That's the right
   direction for the error to point.
2. **Reconnect rides on SSE `id:` / `Last-Event-ID`**, not a bespoke cursor
   param. The browser already does this correctly.
3. **Sequences are gap-free** — shed events don't consume a number. Without this
   a client can't tell "nothing new" from "I lost some", and the reconnect
   guarantee is unprovable.
4. **`--output-format stream-json` is opt-in per lane**, default off, claude-code
   only. It changes what the CLI writes to stdout.
5. **Legacy `events.jsonl` records are upgraded on read**, not rejected —
   refusing them would turn a deploy into data loss.
6. **`routeTree.gen.ts` churn is pre-existing.** Building on a clean tree with no
   change of mine produces the same 1313-line reorder. Only 13 lines in the
   committed diff are genuinely new, and 0 removed. It must be committed because
   `tsc` fails without it.

---

## Deferred / open

1. **Wire the autonomy gate to a real PreToolUse boundary** (UNI-2409's actual
   acceptance). Needs the Claude Code permission callback, the Codex equivalent,
   and a gateway interception point. Highest-value next step, and the one that
   most deserves care — a mis-wired gate that silently permits is worse than none.
2. **Feed the other 8 timeline stages.** Only `lane_run` and `tool_calls` have
   live producers.
3. **Browser screenshot smoke** for UNI-2406. Blocked by the dev-harness auth
   behaviour above; needs a session cookie.
4. **Codex `stream-json` parser** — flag deliberately ignored rather than
   half-wired.
5. **Push + PR.** Ten commits sit locally. No push authorisation was given this
   session, and the release law requires independent review bound to the exact
   final commit.

---

## Pick up here

```bash
cd ~/Unite-Group && git log --oneline -10
node -v                                   # MUST be 24.x
cd apps/workspace && npx vitest run       # expect 1066 passed
```

Then read `docs/mission-control/lane-event-stream.md` §9 (Known gaps) and decide
between wiring the gate (UNI-2409) or pushing what exists for review.

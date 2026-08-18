# Handoff — MC-P1: event stream, autonomy gate, evidence timeline

**When:** 18/08/2026, ~00:55–03:00 and 08:20–08:35
**Branch:** `feat/uni-2403-control-plane-contract` — **12 commits ahead of `origin/main`, NOT pushed**
**HEAD:** `a0192a75a`
**Tickets:** UNI-2403 (verified complete), UNI-2406 (complete), UNI-2409 (enforcing for Claude Code), UNI-2411 (partial), UNI-2412 (one slice)

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
| UNI-2409 | **Enforcing for Claude Code** | Classifier + PreToolUse hook, verified blocking a real `claude -p` run. Codex and the gateway are still ungated |
| UNI-2411 | **Partial** | Timeline builder complete; only 2 of 10 stages have live producers; not rendered in the UI |
| UNI-2412 | **One slice** | The lane card now streams its run; the full single-monitor cockpit is untouched |

**UNI-2409 is now a live control for Claude Code lanes** — a `PreToolUse` hook
classifies every tool call and exits 2 to deny, verified against a real
`claude -p` run (allowed a `Read`, blocked a secret read, blocked every bypass
the model then proposed). Codex and the Hermes gateway remain ungated by design,
not by oversight: Codex does not read Claude Code settings, and the gateway
adapter does not execute tools locally.

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
| `apps/workspace/src/server/lanes/autonomy-gate.ts` | L0–L3 classifier — the ladder itself |
| `apps/workspace/src/server/lanes/evidence-timeline.ts` | Ten-stage timeline that reports its own holes |
| `docs/mission-control/lane-event-stream.md` | Full write-up incl. live evidence and known gaps |

---

## Verification — how to confirm this is still green

```bash
cd apps/workspace && npx tsc --noEmit          # exit 0
cd apps/workspace && npx vitest run            # 1116 passed
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

1. **Gate Codex and the Hermes gateway.** Claude Code is done. Codex has its own
   approval/sandbox policy and a different hook contract; the gateway adapter
   does not execute tools locally, so the boundary is a different shape there.
2. **Surface gate decisions in Mission Control.** The hook writes
   `decisions.jsonl` per run; nothing renders it yet.
3. **Feed the other 8 timeline stages.** Only `lane_run` and `tool_calls` have
   live producers.
4. **Browser screenshot smoke** for UNI-2406. Blocked by the dev-harness auth
   behaviour above; needs a session cookie.
5. **Codex `stream-json` parser** — flag deliberately ignored rather than
   half-wired.
6. **Push + PR — BLOCKED ON A REVIEWER, not on the work.**

   The branch is release-ready. Gates green at the final HEAD, delta proven
   (44 files, none already on `main`, `main` has not moved), PR body written at
   `scratchpad/pr-body.md`. The gate stops at step 4: independent review.

   Every independent reviewer of a different agent family is unavailable:

   | Reviewer | State | Evidence |
   |---|---|---|
   | Codex | plan quota exhausted until 20/08/2026 13:33 | `ERROR: You've hit your usage limit`. An `OPENAI_API_KEY` does NOT bypass it — the CLI uses the stored `codex login` plan auth, so a trivial smoke prompt succeeds while a real review still hits the limit. Verified both. |
   | Gemini | credential dead | `GEMINI_API_KEY` in `~/Unite-Group/.env.local` returns HTTP 400. The auth path and the headless trust flags (`--skip-trust`, `GEMINI_CLI_TRUST_WORKSPACE=true`) are both correct; the key itself is invalid. |
   | Claude | refused by the recorder | `reviewer must be a different independent agent` — correct behaviour, since Claude implemented this branch. |

   A Claude reviewer did PASS the branch twice with zero blocking findings, and
   its adversarial claims were independently reproduced 8/8 (including the
   non-obvious `git -c core.sshCommand` case, which could only be known by
   executing the classifier). That evidence is genuine but does NOT satisfy the
   gate, and self-certifying is an absolute stop.

   **Unblock, cheapest first:** replace the dead `GEMINI_API_KEY`, then re-run
   `scratchpad/run-gemini-review.sh`. Otherwise top up Codex, or the founder
   authorises a same-family exception for this one branch.

   Then issue the receipt and push as a SINGLE unchained command — the hook
   rejects compound release commands:

   ```bash
   python3 ~/.claude/skills/pr-release-gate/scripts/pr_release_gate.py issue \
     --primary-agent claude --review-report <report.json> \
     --test 'cd apps/workspace && npx tsc --noEmit' \
     --test 'cd apps/workspace && npx vitest run' \
     --test 'npm run verify:readiness'
   git -C ~/Unite-Group push -u origin feat/uni-2403-control-plane-contract
   ```

   Run the recorder with Node 24 on PATH, or its `verify:readiness` invocation
   uses system Node.

---

## Pick up here

```bash
cd ~/Unite-Group && git log --oneline -12
node -v                                   # MUST be 24.x
cd apps/workspace && npx vitest run       # expect 1116 passed
```

Then read `docs/mission-control/lane-event-stream.md` §9 (Known gaps) and decide
between wiring the gate (UNI-2409) or pushing what exists for review.

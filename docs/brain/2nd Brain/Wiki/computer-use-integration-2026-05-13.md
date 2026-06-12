---
type: wiki
updated: 2026-05-13
---

# Computer-Use Integration (Hermes 0.13.0)

Wires the Hermes Agent v0.13.0 `computer_use` toolset into the Pi-CEO
swarm so Margot, the Pi-CEO Board, and senior agents can drive the real
macOS GUI (open apps, navigate browsers, screenshot, fill forms, click
buttons) autonomously via [[hermes-agent]] + `cua-driver`.

Cross-refs: [[hermes-agent]], [[pi-ceo-architecture]], [[agency-hierarchy]], [[founder]]

## What was wired

Four files in `Pi-CEO/Pi-Dev-Ops` on branch `feat/internal-pivot-2026-05-11`:

| Path | Purpose |
|---|---|
| `swarm/screen/__init__.py` | Empty package init |
| `swarm/screen/hermes_dispatch.py` | `screen_dispatch(intent)` async bridge → subprocesses `hermes chat -q ... -t computer_use,browser,web --yolo` and returns a `ScreenResult` |
| `swarm/board/wiring.py` | Extended `_parse_dispatch_target` to recognise `[DISPATCH-TO: SCREEN]` as a routing target (recognition only; the caller layer executes) |
| `swarm/margot_bot.py` | New `parse_screen_requests` + inline execution of `[SCREEN: <intent>]` sentinels during `handle_turn`; system-prompt updated so Margot knows when to emit |

Tests: `tests/swarm/screen/test_hermes_dispatch.py` — 4 cases, all mocked
(no real Hermes subprocess fires during pytest).

## Invocation surfaces

### 1. Direct call (any swarm component / cron job)

```python
from swarm.screen.hermes_dispatch import screen_dispatch

result = await screen_dispatch(
    "open the empire dashboard and screenshot the funnel",
)
if result.ok:
    print(result.session_id, result.screenshots)
```

`ScreenResult` shape: `ok / disabled / intent / final_text / session_id /
screenshots / error / wall_seconds`.

Defaults: `toolsets=["computer_use", "browser", "web"]`, `max_turns=12`,
`timeout_s=600.0`.

### 2. Margot Telegram bridge (operator-driven)

Phill types something like *"open the empire dashboard and screenshot
the funnel"* into Telegram. Margot's reply contains a sentinel:

```
[SCREEN: open the empire dashboard and screenshot the funnel]
```

`handle_turn` parses the sentinel, calls `screen_dispatch` (gated on
`_send=True` — test mode never fires), and appends a one-line result to
the reply:

```
🖥️ Screen action complete: "open the empire dashboard and screenshot the
funnel" (session_id=20260513_104500_abc123ef, shots=1)
```

The raw `[SCREEN: ...]` markup is stripped before the user-facing reply
is sent.

### 3. Pi-CEO Board route

When the CEO synthesis emits `[DISPATCH-TO: SCREEN]`, the Board parser
recognises the route and returns `dispatched_to="SCREEN"` with rationale
*"Screen / GUI automation requested."*. **The Board only RECOGNISES the
route — it does not execute.** Execution lives at the caller layer
(Margot, an orchestrator hook, or a senior agent), which calls
`screen_dispatch` itself.

## Audit log

Path: `~/.hermes/screen_audit.jsonl` (override via `TAO_SCREEN_AUDIT_LOG`
env var; tests do this).

One JSONL row per `screen_dispatch` call (success, failure, or
disabled). Schema:

```json
{
  "ts": "2026-05-13T10:45:01+00:00",
  "type": "screen_dispatch" | "screen_dispatch_disabled",
  "intent": "<original one-sentence intent>",
  "toolsets": ["computer_use", "browser", "web"],
  "max_turns": 12,
  "timeout_s": 600.0,
  "rc": 0,
  "timed_out": false,
  "stdout_snippet": "<first 4KB of Hermes stdout>",
  "session_id": "20260513_104500_abc123ef",
  "screenshots": ["/Users/phill-mac/.hermes/cache/screenshots/<file>.png"],
  "wall_seconds": 12.418,
  "error": null,
  "ok": true
}
```

Purpose: non-repudiation + replay. Every autonomous screen action is
recoverable from the audit + the Hermes session file at
`~/.hermes/sessions/<session_id>.jsonl`.

## Kill-switch

Environment variable: `TAO_SCREEN_DISABLED=1`.

When set, `screen_dispatch` short-circuits before the subprocess —
returns `ScreenResult(disabled=True, ok=False, ...)`, writes a
`screen_dispatch_disabled` row to the audit log, and Margot's reply
shows *"🖥️ Screen action skipped (kill-switch): ..."*. Required by the
kill-switch policy in [[pathway-to-2b-2026-2028]].

Toggle with `launchctl setenv TAO_SCREEN_DISABLED 1` (persisted across
sessions) or `export TAO_SCREEN_DISABLED=1` per-shell.

## Permissions checklist

Hermes 0.13.0 `computer_use` requires three macOS permissions granted to
the running process (Terminal, the Hermes binary, or whatever parent
shell launches it). Grant in **System Settings → Privacy & Security →**:

- **Accessibility** — required for AX-tree snapshot and synthetic mouse
  / keyboard events via `cua-driver`. Without this, `computer_use`
  fails at first click with "permission denied: AX tree".
- **Screen Recording** — required for screenshot capture written to
  `~/.hermes/cache/screenshots/`. Without this, screenshots come back
  blank or empty and the `screenshots` field in `ScreenResult` stays
  empty.
- **Automation** — required for AppleScript / `osascript` bridges Hermes
  uses to drive apps that don't expose AX nodes cleanly (Finder,
  Mail.app, some Electron apps). Per-target-app grant; macOS prompts
  the first time an app is touched.

Hand-grant only — no programmatic path. Verify in:

```
System Settings → Privacy & Security → Accessibility
System Settings → Privacy & Security → Screen Recording
System Settings → Privacy & Security → Automation
```

The host binary that needs the perms is whichever process spawns
`hermes` (typically Terminal.app, iTerm2, or the launchd plist that
runs the swarm). If you switch shells / terminals, re-grant.

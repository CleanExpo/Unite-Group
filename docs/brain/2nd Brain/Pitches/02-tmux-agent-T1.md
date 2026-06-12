---
type: pitch
component: tmux-agent-T1-observer
status: shaped
appetite: 3d
sketch: ../Sketches/02-tmux-agent-T1.md
grill: ../Grills/02-tmux-agent-T1.md
created: 2026-05-26
owner: pi-dev-ops-orchestrator
---

# Pitch — TMUX agent T1 (observer-only)

## Problem
Pi-CEO has no auditable way to read tmux state. Every swarm bot reaching for "what's running?" today shells out blind. This blocks every higher-tier TMUX work (T2 safe runner, T3 self-healing, T4 ledger integration).

## Appetite
**3 days.**

## Solution (shaped, low-fidelity)
- `swarm/tmux_observer.py` — `list()`, `status(session?)`, `tail(session, window?, pane?, lines?)`
- `swarm/tmux_audit.py` — `append(event)`, idempotent `_ensure_append_only()` startup
- libtmux is the only tmux interaction layer
- All output passes through `swarm.tmux_validator.redact_secrets` (PR #277 module)
- CLI entry point at `python3 -m swarm.tmux_observer`
- Tests use isolated `tmux -L t1-tests` socket

## Rabbit holes
- Linux append-only port → sub-issue (out of scope)
- Hermes pane consumer enforcement → T2 (out of scope)
- Key rotation UX → operator-manual for now (out of scope)

## No-gos
- No send-keys, no kill-session, no tmuxp load, no remote tmux
- No supabase mirror, no restart automation
- No `tmux:run` API surface even as stub

## Acceptance (must be true for ship)
- `pytest tests/swarm/test_tmux_validator.py` still 112/112
- `pytest tests/swarm/test_tmux_observer.py` ≥ 25 tests green
- CLI smoke: `python3 -m swarm.tmux_observer list` returns valid JSON against running tmux
- Audit row per CLI call; no real secret ever appears in ledger
- macOS chflags uappend best-effort + fsync hard-fail

## Linear epic
TBD — will be opened with this pitch attached.

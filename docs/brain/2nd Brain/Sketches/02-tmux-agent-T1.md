---
type: sketch
component: tmux-agent-T1-observer
status: draft
appetite: 3d
created: 2026-05-26
depends_on: PR-#277-merged (policy ratification — locks the validator + secret patterns)
---

# Sketch 02 — TMUX agent T1 (observer-only)

## Why this first

PR #277 ratifies the policy. T1 is the FIRST consumer of that policy. It reads
tmux state, captures pane output, redacts secrets, writes audit rows. Zero
state-changing calls. Once T1 is solid, T2 (safe runner) inherits the same
audit/redaction infrastructure.

Strictly observer. No `send-keys`. No `kill-session`. No `tmuxp load`.

## Scope (what T1 does)

```
[caller: pi-ceo swarm bot or operator CLI]
        │
        ▼
[tmux_observer.list()]  ───► JSON snapshot of all sessions/windows/panes
[tmux_observer.status(session?)]  ───► health rollup + last N lines per pane
[tmux_observer.tail(session, window?, pane?, lines=100)]  ───► captured + redacted output
        │
        ▼
[swarm.tmux_audit.append(event)]  ───► .harness/audit/tmux-YYYY-MM-DD.jsonl
                                       (with chflags uappend protection)
```

## Boundaries (what T1 does NOT do)

- No `send-keys` (T2)
- No `kill-session` (T3)
- No `tmuxp load` / profile start (T2)
- No pane creation (T2)
- No environment-variable expansion in any captured output
- No outbound network (audit ledger is local-file only in T1; remote mirror is T4)

## API contract

All functions return `dict`. All state-changing calls (only `tmux_audit.append`
in T1) are fail-closed: if audit cannot be written → raise, do not return success.

```
swarm/tmux_observer.py

  list() -> dict
    Returns: {
      "sessions": [
        {
          "name": str,                     # e.g. "nexus-dev"
          "id": str,                       # tmux session id $N (stable)
          "windows": [
            {
              "index": int,                # display index, may drift
              "name": str,
              "panes": [
                {
                  "id": str,               # tmux pane id %N (STABLE — load-bearing)
                  "index": int,            # display index, may drift
                  "pid": int,              # process pid
                  "current_command": str,
                  "current_path": str,
                  "is_active": bool,
                  "is_dead": bool,
                  "history_size": int,
                }
              ]
            }
          ],
          "attached": bool,
          "created_at": str,                # ISO 8601
        }
      ],
      "captured_at": str,                  # ISO 8601
      "audit_id": str,
    }

  status(session: str | None = None) -> dict
    Adds per-pane health field: "healthy" | "stale" | "dead"
      stale = current_command != shell pid for >5min AND no recent output
      dead = pane_pid not in /proc (or `kill -0` fails)
    Adds last 20 lines of captured (redacted) output per pane.

  tail(session: str, window: str | None = None, pane: int | None = None,
       lines: int = 100) -> dict
    Returns: {
      "text": str,                          # redacted; never raw
      "lines_returned": int,
      "truncated": bool,                    # True if lines > 4096 cap
      "secret_redactions": dict[str, int],  # {pattern_name: count} per match
      "pane_id": str,                       # %N stable id of the captured pane
      "captured_at": str,
      "audit_id": str,
    }
    On any redaction, the audit row records secret_redactions counts but
    never the redacted content itself.
```

```
swarm/tmux_audit.py

  append(event: dict) -> str
    Writes a single line to .harness/audit/tmux-YYYY-MM-DD.jsonl.
    Returns audit_id (HMAC of ts+command+pid keyed by ~/.hermes/audit-key).
    Raises AuditUnwritableError if:
      - audit dir missing
      - file not chflags uappend protected
      - fsync() fails
    The caller MUST refuse the state-changing action if append raises.
```

## Words-not-pictures spec for the audit row

```
{
  "audit_id": "tmx-<hmac8>",
  "ts_realtime": "2026-05-26T13:14:22.318Z",
  "ts_monotonic_ns": 12345678901234,
  "actor": "pi-ceo-claude-opus-4.7" | "operator-cli" | "hermes-strategy",
  "command": "tmux:list" | "tmux:status" | "tmux:tail",
  "args": {"session": "nexus-dev", "pane_id": "%4"},
  "policy_level": "L1",
  "allowlist_match": null,             # L1 = read-only, no validator pass needed
  "denylist_match": null,
  "result": "ok" | "error",
  "error_code": null,
  "duration_ms": 42,
  "secret_redactions": {"anthropic": 1},
  "pane_ids_observed": ["%0", "%1", "%4"],
  "hermes_protected_ids": ["%2"]       # snapshot of protected pane_ids at startup
}
```

## Acceptance checks

- [x] `pytest tests/swarm/test_tmux_validator.py` still 112/112 (locked merge gate)
- [ ] `pytest tests/swarm/test_tmux_observer.py` new — minimum 25 tests:
  - list() against libtmux fixture returns valid schema
  - status() flags dead panes correctly
  - tail() truncates at 4096 lines
  - tail() redacts every pattern in `secret_patterns.txt`
  - Audit row written per call (positive)
  - Audit unwritable → raise (negative)
  - chflags uappend missing → startup refuses
  - pane_id remains stable across pane index renumbering (simulated)
  - hermes_protected_ids loaded from `.harness/tmux-protected-panes.json` at startup
- [ ] CLI smoke: `python3 -m swarm.tmux_observer list | jq .sessions` returns sane JSON against the actual running tmux on this Mac
- [ ] One audit row per CLI invocation appears in today's ledger
- [ ] No real secrets ever appear in the audit ledger (verified by a redaction
      test that injects `sk-ant-<fake>` into a pane and asserts the audit row
      shows `secret_redactions: {"anthropic": 1}` and NOT the redacted string)

## RABBIT HOLES (to resolve in grill)

- **R1** libtmux vs raw subprocess. libtmux gives pane_id stability and a Python API; subprocess is a wider attack surface. Recommend libtmux.
- **R2** Where do `hermes_protected_ids` get snapshotted? At T1 startup → `.harness/tmux-protected-panes.json` written once. But Hermes can restart and re-bind to a different pane. Need a refresh trigger.
- **R3** What's the "shell prompt" pid we use to decide whether a pane is "idle"? Is it `$SHELL` pid or the parent of the foreground process?
- **R4** Audit-key generation: how / when / who? `~/.hermes/audit-key` file mode 600 generated at first run. If absent, T1 fails closed.
- **R5** chflags uappend needs to be set ONCE on the audit dir + each daily file. Who sets it — T1 startup, or a separate provisioning step?
- **R6** Where does the policy_level (`L1`) come from for read-only calls? Always-`L1` for observer? Or does the caller assert it?
- **R7** What's the upper bound on a single audit row size? §5 said 512 bytes for atomic writes. Long pane output captures could exceed. Solution: truncate captured-output field and add `truncated: true` marker.
- **R8** How does T1 detect renumbering of pane indices for the audit `pane_ids_observed` snapshot — query tmux for current state at audit-write time, or rely on the operation's own pane resolution?
- **R9** Test strategy for chflags uappend — Linux uses `chattr +a`, macOS uses `chflags uappend`. Tests run on macOS dev + Linux CI. Solution: feature-detect at test setup; skip the flag-enforcement test on Linux until porting.
- **R10** Do we want a CLI entry point in T1 (`python3 -m swarm.tmux_observer ...`) for operator use, or is the only consumer the pi-ceo swarm? Recommend CLI for debugging; it costs ~20 lines of argparse.

## NO-GOS (excluded from T1 — explicit)

- **N1** No `send-keys`. T2 only.
- **N2** No `kill-session`. T3 only.
- **N3** No `tmuxp load` / profile start. T2 only.
- **N4** No remote tmux servers. Local socket only.
- **N5** No supabase mirror of audit rows. T4 only.
- **N6** No restart automation. T3 only.
- **N7** No CLI subcommand for `tmux:run` even as a no-op stub. Adding it now leaks the API surface to operator muscle-memory before it's safe.

## Appetite

**3 days** for T1 (observer + audit + tests + CLI). Anything that runs longer means a rabbit hole turned into a project — pause and re-grill.

## Next step

Run `/grill-me` on this sketch. Output → `Grills/02-tmux-agent-T1.md`.
Every R1-R10 must terminate into DECIDED / RABBIT HOLE / NO-GO before
promotion to `Pitches/02-tmux-agent-T1.md`.

## /grill-me prompts to seed

The grill should drive these first (in dependency order):

```
Q1: libtmux as the only tmux interaction layer? [YES default — explain why]
Q2: When does T1 set chflags uappend on the audit dir + today's file?
    [at startup, after-mkdir, idempotent — default]
Q3: How is the HMAC audit-key generated and protected?
    [secrets.token_bytes(32), file mode 600, ~/.hermes/audit-key, fail closed if absent]
Q4: pane_id stability — confirm libtmux exposes pane.id as %N and it's stable
    across pane renumbering?
Q5: hermes protected pane_ids — snapshot only at startup, or also on
    pgrep-detected pid change of the Hermes daemon?
Q6: Audit row truncation — at what byte limit, and which field gets truncated
    first (captured_text → args)?
Q7: Redaction is applied BEFORE tail() returns to caller AND BEFORE audit
    write. Confirm one redaction pass, not two.
Q8: CLI entry point in T1: yes, with argparse, three subcommands matching
    the API. [YES default]
Q9: Linux vs macOS append-only flag — feature-detect and skip-on-Linux for
    now, file a sub-issue for porting. [YES default]
Q10: How do we test against a real running tmux without mutating the
     operator's actual sessions — libtmux supports an isolated socket via
     `-L test-socket`? [YES — and document]
```

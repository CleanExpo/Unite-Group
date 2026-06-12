---
type: grill
component: tmux-agent-T1-observer
sketch: ../Sketches/02-tmux-agent-T1.md
status: resolved
created: 2026-05-26
mode: self-grill-with-defaults (operator may override any DECIDED row)
---

# Grill transcript — TMUX agent T1 (observer)

## Q1: libtmux as the only tmux interaction layer?
**My recommendation:** YES. libtmux is a thin Python wrapper around `tmux` CLI commands. Gives us `pane.id` (`%N` stable), structured access to sessions/windows/panes, and no shell-injection surface in our own code (libtmux still shells out under the hood but does it safely with quoted args).
**Resolution:** DECIDED — use libtmux. Add `libtmux>=0.31` to `pyproject.toml`.

## Q2: When does T1 set chflags uappend on the audit dir + today's file?
**My recommendation:** At T1 startup, idempotent. Function `swarm.tmux_audit._ensure_append_only()` runs once at module init. If the dir doesn't exist → create with mode 700. If file exists with flag already set → noop. If flag setting fails → emit warning to stderr but DO NOT fail closed (macOS chflags fails non-fatally; the rest of the failsafe — fsync before action — still gives us most of the protection). Linux `chattr +a` requires root, so it's skipped with a `WARN` log on Linux.
**Resolution:** DECIDED — startup idempotent best-effort with WARN-not-FAIL semantics on the flag itself; fsync-before-action remains hard fail-closed.

## Q3: HMAC audit-key — how generated and protected?
**My recommendation:** `secrets.token_bytes(32)` → write to `~/.hermes/audit-key` with `os.chmod(path, 0o600)` at first run. If file exists, read it. If file exists but mode is wrong, refuse to start. Key rotation is a manual operator action — delete the file, restart T1, distribute new key. The HMAC ties an audit row to the agent's identity at write time; tampering with the row invalidates the HMAC.
**Resolution:** DECIDED.

## Q4: pane_id stability via libtmux?
**My recommendation:** Confirmed by libtmux docs: `Pane.id` returns the `%N` identifier which is unique-per-pane-for-lifetime. Renumbering of `pane_index` does NOT change `pane_id`. T1 stores `pane_id` in every audit row; never uses `session:window.index` for addressing.
**Resolution:** DECIDED. Add a test that simulates pane renumbering and asserts the captured `pane_id` is identical pre/post.

## Q5: Hermes protected pane_ids — snapshot at startup or also on Hermes-daemon restart?
**My recommendation:** BOTH. T1 startup writes `.harness/tmux-protected-panes.json` from `pgrep -F ~/.hermes/gateway.pid` → resolves to the pane currently hosting the Hermes daemon. A background refresh task runs every 5 minutes, re-resolves, and updates the file. Any operation in T2+ that resolves a pane_id MUST check this file. Stale file (>10 min) → refuse all writes with `HERMES_PROTECTION_STALE` error.
**Resolution:** DECIDED. T1 only writes the file (no consumer logic yet — T2 enforces).

## Q6: Audit row truncation — byte limit + which field truncates first?
**My recommendation:** 512 byte hard cap (atomic POSIX write boundary on macOS). Truncation order: `args.captured_text` first (truncate to "[…+N bytes truncated]"), then `args.cmd` if present, then `pane_ids_observed` (compress to count). Mandatory-keep fields: `audit_id`, `ts_realtime`, `actor`, `command`, `result`, `error_code`. If even after all truncation the row exceeds 512 bytes → refuse the write (which means refuse the action — fail-closed posture).
**Resolution:** DECIDED. Tests must include a "row too large" case asserting the action is refused.

## Q7: Redaction pass count — one or two?
**My recommendation:** ONE pass. Apply secret_patterns.txt to captured output BEFORE either (a) returning to caller or (b) writing to audit. Single source of truth, no drift, no risk of one path getting redacted and the other not. The redacted string is what callers see and what the audit row records.
**Resolution:** DECIDED. Add a property-based test: any captured output passing through `tmux:tail` is the same string whether observed in the return value or read from the audit row.

## Q8: CLI entry point in T1?
**My recommendation:** YES. `python3 -m swarm.tmux_observer {list|status|tail} [args]` with argparse. ~30 lines. Pays for itself the first time an operator needs to debug the orchestrator from the terminal.
**Resolution:** DECIDED.

## Q9: Linux vs macOS append-only flag handling?
**My recommendation:** Feature-detect at module init. `if sys.platform == "darwin": use chflags uappend; elif sys.platform == "linux": skip-with-WARN; else: skip-with-WARN`. File a follow-up sub-issue `tmux-T1-linux-append-only` for porting via `chattr +a` once we add a Linux deploy target. For now: macOS dev + GitHub Actions Linux CI — CI tests don't depend on the flag (they verify the audit-row write logic, not the filesystem protection).
**Resolution:** DECIDED.

## Q10: Test isolation — `tmux -L test-socket`?
**My recommendation:** YES. libtmux's `Server(socket_name="t1-tests")` gives us an isolated tmux server that doesn't touch the operator's real sessions. Each test creates + destroys its own session on that socket. README documents `tmux -L t1-tests kill-server` as the cleanup command if a test orphan-leaks a session.
**Resolution:** DECIDED.

---

## Final state

### DECIDED (all 10)
- Q1 libtmux only ✓
- Q2 chflags uappend startup-idempotent best-effort + fsync hard-fail ✓
- Q3 audit-key via `secrets.token_bytes(32)` at `~/.hermes/audit-key` mode 600 ✓
- Q4 `pane_id` (`%N`) is the canonical pane identifier ✓
- Q5 Hermes protected pane_ids — startup write + 5min refresh ✓
- Q6 512-byte audit row cap, truncate captured_text first, refuse if can't fit ✓
- Q7 one redaction pass, applied before both return + audit ✓
- Q8 CLI entry point: yes ✓
- Q9 macOS chflags now, Linux deferred to sub-issue ✓
- Q10 isolated test socket `t1-tests` ✓

### RABBIT HOLES (to revisit, NOT blocking T1)
- **RH-1:** Linux append-only port (chattr +a) → sub-issue when Linux deploy target lands
- **RH-2:** Hermes protected pane consumer logic → T2 enforces, T1 only writes
- **RH-3:** Key rotation UX → operator-manual for now; tooling deferred

### NO-GOS (explicit exclusions)
- No `send-keys` in T1 (T2)
- No `kill-session` in T1 (T3)
- No `tmuxp load` / profile start in T1 (T2)
- No remote tmux servers
- No supabase mirror of audit rows in T1 (T4)
- No restart automation (T3)
- No `tmux:run` even as no-op stub

### Appetite
**3 days** — confirmed. If T1 implementation runs longer than 3 days, pause and re-grill.

### Next step
Promote to `Pitches/02-tmux-agent-T1.md` and begin implementation on
`feature/agent-tmux-T1-observer` branch stacked on `feature/agent-tmux-policy-ratification`.

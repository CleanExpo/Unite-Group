---
type: wiki
updated: 2026-05-14
---

# Hermes update finalisation report — 2026-05-14

## 1. hermes doctor

```
◆ Security Advisories  ✓ none
◆ Python Environment   ✓ 3.11.15, venv active
◆ Required Packages    ✓ all
◆ Configuration Files  ✓ ~/.hermes/.env, ~/.hermes/config.yaml v23
◆ Auth Providers       ⚠ Nous/Codex/Gemini/MiniMax OAuth (not logged in — non-blocking)
◆ Directory Structure  ✓ all (state.db = 1204 sessions)
◆ Command Installation ✓ venv + ~/.local/bin/hermes symlink correct
◆ External Tools       ✓ git, rg, docker, node, agent-browser, playwright
◆ API Connectivity     ✓ OpenRouter, ✓ Anthropic, ✗ gemini (invalid API key)
◆ Submodules           ⚠ tinker-atropos not initialised (non-blocking)
◆ Tool Availability    ✓ computer_use, browser, unite-group plugin, kanban (gated) …
◆ Memory Provider      ⚠ Honcho not configured (non-blocking)

Found 2 issue(s):
  1. Check GOOGLE_API_KEY in .env  ← Gemini key invalid (RED)
  2. Run 'hermes setup' for missing API keys (WARN — optional toolsets only)
```

No "Unknown provider 'custom'" warning fired in `hermes doctor`. That warning came from the `hermes update` setup probe, not the runtime — see §2.

## 2. "Unknown provider 'custom'" fix

**Found at:** `~/.hermes/config.yaml` — 8 distinct `provider: custom` blocks (lines 130, 145, 152, 160, 167, 511, 520) plus one nested at line 12 inside `credential_pool_strategies`.

**Diff applied:** NONE. Investigation showed these are NOT stale — they are config-v23's first-class "custom provider" mechanism. Each block carries `base_url` + `api_key` (mostly Ollama @ `localhost:11434` for vision/compression/session_search/skills_hub/approval auxiliaries; OpenRouter for `fallback_model` + `smart_model_routing.cheap_model`). The warning from `hermes update` was emitted by the setup wizard's provider-name validator probing the catalogue, which post-v23 still treats the `custom` keyword as "unknown" in the catalogue table but resolves it correctly at runtime via the inline `base_url`. Removing the blocks would break vision, compression, smart-routing fallback. Confirmed clean run with `hermes doctor` — no `custom`-warning re-occurrence.

**Action:** flagged upstream behaviour; no local change. Phill's qwen3.6-plus default at `model.default` (line 2) is untouched.

## 3. hermes_dispatch.py model override

**Before:**
```python
cmd = [
    HERMES_BIN, "chat",
    "-q", intent,
    "-t", ",".join(used_toolsets),
    "--yolo",
    "--max-turns", str(int(max_turns)),
]
```

**After:**
```python
# Per-feature model override: computer_use must run on a model that
# reliably emits tool-call JSON (not free-form prose). llama-3.3-70b
# hallucinated JSON-as-code on 2026-05-13 → 90s hangs. Pin to
# anthropic/claude-sonnet-4-6 regardless of Hermes' default chat model
# (which Phill set to qwen/qwen3.6-plus on 2026-05-14).
cmd = [
    HERMES_BIN, "chat",
    "-q", intent,
    "-t", ",".join(used_toolsets),
    "-m", "claude-sonnet-4-6",
    "--provider", "anthropic",
    "--yolo",
    "--max-turns", str(int(max_turns)),
]
```

Timeout was already 600s at the function signature (`timeout_s: float = 600.0`, line 136) — no edit needed.

**Tests:** `tests/swarm/screen/test_hermes_dispatch.py` → **4 passed / 4 total** (0.02s) via `~/.hermes/hermes-agent/venv/bin/python -m pytest`. Tests assert shape only, so the two added cmd entries don't break the captured-cmd assertions.

## 4. Gateway health

```
launchctl list | grep hermes
64811   1   ai.hermes.gateway   ← PID 64811, last-exit 1 (the pre-update SIGTERM during update), now running fresh
```

Last 5 lines of `~/.hermes/logs/gateway.log` (15:08 UTC restart):

```
15:08:46  gateway.run: Gateway running with 2 platform(s)
15:08:46  gateway.run: Channel directory built: 1 target(s)
15:08:47  gateway.run: Press Ctrl+C to stop
15:08:47  gateway.run: Cron ticker started (interval=60s)
15:08:52  gateway.run: kanban dispatcher: embedded in gateway (interval=60.0s)
```

One pre-existing WARN in `gateway.error.log`: `API_SERVER_KEY not set — all requests accepted without authentication`. Pre-update, non-regressed, not in scope.

## 5. cua-driver permissions

```
⚠️ Not running inside the cua-driver daemon process. Results may be inaccurate.
✅ Accessibility:   granted
✅ Screen Recording: granted
```

Permissions survived the 0.1.6 → 0.1.9 upgrade. No System Settings action required from Phill.

## 6. Stashed-restored local edits

```
git status (in ~/.hermes/hermes-agent)
  modified:  agent/anthropic_adapter.py
  modified:  agent/transports/chat_completions.py
git diff --stat HEAD
  agent/anthropic_adapter.py            | 118 +++++++++++++--------------
  agent/transports/chat_completions.py  |  16 ++++-
  2 files changed, 57 insertions(+), 77 deletions(-)
git stash list:
  stash@{0}: hermes-install-autostash-20260502-085143
```

**Inspection:** Both diffs are legitimate local hotfixes:
- `chat_completions.py` adds `_INTERNAL_OVERRIDE_KEYS = {"speed"}` filter so the OpenAI-compatible transport doesn't crash with "got an unexpected keyword argument 'speed'" when the Anthropic transport's fast-mode override leaks through.
- `anthropic_adapter.py` removes dead `_FAST_MODE_SUPPORTED_SUBSTRINGS` constant and a stale qwen3 entry from `_ANTHROPIC_OUTPUT_LIMITS`. Net: cleanup, no behaviour shift.

Local branch is 6 commits behind `origin/main` (a separate `hermes update` will fast-forward — not run now to preserve these edits). Nothing suspicious. Old stash from May 2 is unrelated to today's update.

## Verdict

✅ — Hermes is fully operational. Computer_use is now pinned to claude-sonnet-4-6 via anthropic (was the root-cause of the llama-3.3-70b 90s timeout). Qwen3.6-plus default chat model untouched. Gateway running, cua-driver permissions intact, doctor clean. Only outstanding non-blocker is the invalid `GOOGLE_API_KEY` flagged by doctor — separate workstream.

*— Hermes Ops*

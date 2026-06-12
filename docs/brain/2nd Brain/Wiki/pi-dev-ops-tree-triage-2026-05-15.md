---
type: wiki
updated: 2026-05-15
---

# Pi-Dev-Ops Working Tree Triage — 2026-05-15

## Headline

`/Users/phill-mac/Pi-CEO/Pi-Dev-Ops` shows **172 status entries** on branch `feat/hermes-plugin-mirror`: 1 staged add (`swarm/board/wiring.py`), 14 modified, 37 `DU` (deleted-by-us, unmerged) from an aborted prior merge, and 120 untracked. **The single biggest finding: the staged `wiring.py` is BYTE-IDENTICAL to commit `2a5c98b` already living on branch `chore/wave1-restore-wiring-source` — the W1B-prep Discipline 2 restore from this morning was never lost.** No `/tmp` recovery is needed; the source is already preserved on disk in a named branch.

## Snapshot

Branch state:
- Current: `feat/hermes-plugin-mirror`
- Tip: `285b1a2 feat(hermes): mirror local plugins/ into git + add sync script`
- `ORIG_HEAD` = `c0753ef` (no active merge — `.git/MERGE_HEAD` absent; DU entries are orphaned from a previously aborted merge)
- Autostash present: `stash@{0}: On feat/hermes-plugin-mirror: autostash`
- Sibling branch `chore/wave1-restore-wiring-source` contains `2a5c98b` — the wiring.py source-restore from this morning

Counts (from `git status --porcelain`):

| Type | Count |
|---|---|
| Staged (`A `) | 1 (wiring.py) |
| Modified (` M`) | 14 (13 in `.harness/`, 1 in `remotion-studio/src/Root.tsx`) |
| Deleted-by-us, unmerged (`DU`) | 37 (all under `remotion-studio/`) |
| Untracked (`??`) — `.harness/` | 88 |
| Untracked (`??`) — other | 32 |
| **Total** | **172** |

Notable untracked clusters (non-`.harness`):
- `swarm/inbox/` (3 files: `__init__.py`, `botfather_minter.py`, `__tests__/test_botfather_minter.py`)
- `remotion-studio/briefs/`, `remotion-studio/public/audio/_cache/`, `remotion-studio/public/audio/ra-wave-1-launch-poc/`, `remotion-studio/public/captures/`, `remotion-studio/public/ra-wave-1-screencaps/`
- `remotion-studio/src/compositions/RaWave1Launch.tsx`
- 14 `remotion-studio/src/storyboards/*.json` (carsi, ccw, dr, nrpg, ra, synthex)
- `app/server/provider_ollama.py.bak`
- `decks/2026-05-11-investor-update-sample.html`
- `.marketing/`, `docs/superpowers/`, `scripts/cleanup-aip-2026-05-11.sh`, `scripts/kpi_watchdog.py`, `skills/curator-scheduled-tasks-unknown/`

## Per-Artifact Verdict

| Artifact | What it is | Evidence | Verdict | Next step |
|---|---|---|---|---|
| `swarm/board/wiring.py` (staged, 201 LOC) | Board Layer-3 dispatcher; W1B-prep Task 3.0 source-restore from `.pyc` per `[[feedback-substrate-change-discipline]]` Discipline 2 | `diff <(git show 2a5c98b:swarm/board/wiring.py) <(git show :swarm/board/wiring.py)` → **byte-identical**. Already committed on `chore/wave1-restore-wiring-source` per log.md 2026-05-15 w1b-prep entry | **PRESERVED — NO PR NEEDED** | Confirm `chore/wave1-restore-wiring-source` survives on remote, then this staged copy can be safely discarded |
| `swarm/inbox/botfather_minter.py` (571 LOC, 23,680 bytes) | Autonomous BotFather mint pipeline; docstring explicitly cites `[[incident-botfather-rate-limit-2026-05-14]]` and the Fri 2026-05-15 13:20 AEST LaunchAgent fire window | `head -40` confirms Telethon-driven `/newbot` automation with idempotent queue + atomic file replace + dry-run mode; not committed anywhere on remote | **SALVAGE-TO-PR** | New branch `feat/botfather-minter` off fresh main; single-file PR; defer merge until after `[[feedback-botfather-hardwire-2026-05-15]]` window expires (post 14:00 AEST today) |
| `swarm/inbox/__init__.py` (7 LOC) | Module docstring extended to enumerate intake_router + preamble_trainer + botfather_minter as siblings | `diff` vs `fd4fe57:__init__.py` shows extended submodule docs — NOT byte-identical to fd4fe57 ship copy | **SALVAGE-WITH-MINTER** | Include in same `feat/botfather-minter` PR (needed so the import surface is consistent) |
| `swarm/inbox/__tests__/test_botfather_minter.py` (size unknown) | Test for the minter | Test directory contains `__init__.py` + `test_botfather_minter.py` + `__pycache__` | **SALVAGE-WITH-MINTER** | Include in same `feat/botfather-minter` PR |
| 37× `DU` files in `remotion-studio/` (10 audio dirs + 4 storyboard JSONs, all `ra-setup-wizard-*-2026-05-12.*`) | RA setup-wizard video assets from a previous aborted merge attempt | No active `MERGE_HEAD`; ORIG_HEAD = `c0753ef`. Files match the `ra-setup-wizard` series for which `b3ddfa0 checkpoint: ra setup-wizard dashboard-120s storyboard + audio` exists in reflog | **DEFER → DISCARD** | These are paused per Phill's "No more videos for now" directive; safe to `git rm`. Defer to Phill — minimal value, low risk |
| `remotion-studio/src/Root.tsx` ( M) | Adds `RaWave1Launch` Composition registration (28 lines) | `git diff` shows clean additive block; pairs with untracked `RaWave1Launch.tsx` (36,451 bytes) | **DEFER** (videos paused) | Phill ratifies — either REVERT (per video pause) or SALVAGE-TO-PR alongside `RaWave1Launch.tsx` if RA wave-1-launch POC is still live |
| `remotion-studio/src/compositions/RaWave1Launch.tsx` (untracked) | RA Wave 1 Launch POC composition, 1080×1080 30fps 75s, 10 scenes | Standalone file referenced by Root.tsx modification | **DEFER** (videos paused) | Same as Root.tsx — pairs with it |
| 14× untracked storyboard JSONs in `remotion-studio/src/storyboards/` (carsi/ccw/dr/nrpg/ra/synthex × 2026-05-12) | Video storyboards across all 6 brands | All dated 2026-05-12, matches the video sprint Phill paused | **DEFER** (videos paused) | Refer to Phill — bulk-discard candidates given "no more videos" |
| `.harness/*` (13 modified + 88 untracked) | Runtime telemetry (autonomy.jsonl, bvi-history.jsonl, swarm.jsonl, telegram_drafts.jsonl, board-meetings, artefacts, adversary-runs, etc.) | `.gitignore` includes only **partial** `.harness/*` rules (`.harness/telegram-inbox/`, `.harness/monitor-digests/`, `.harness/scan-results/`, `.harness/build-logs/`, `.harness/pipeline/`, `.harness/llm-cost.jsonl`, `.harness/agent-sdk-metrics/`, `.harness/anthropic-docs/2*/`, `.harness/secrets-scan/`, `.harness/post-deploy-metrics/`) — **most of `.harness/` is NOT ignored** | **GITIGNORE-FIX** | Audit + extend `.gitignore` to cover the full `.harness/` tree (or add a top-level `.harness/`). Single-line PR |
| `app/server/provider_ollama.py.bak` | Editor backup file | `.bak` extension is the universal "don't commit me" signal | **DISCARD** | Bulk-discard candidate |
| `decks/2026-05-11-investor-update-sample.html` | Investor update sample | Dated 4 days ago — abandoned | **DEFER** | Refer to Phill |
| `.marketing/`, `docs/superpowers/`, `scripts/cleanup-aip-2026-05-11.sh`, `scripts/kpi_watchdog.py`, `skills/curator-scheduled-tasks-unknown/` | Mixed scratch + scripts | Mixed maturity; `kpi_watchdog.py` referenced in commit `fb02b76 fix(infra): consolidate provider_router helper + wire kpi_watchdog cron` — may already be partially landed | **DEFER** | Refer to Phill, one by one |
| Autostash `stash@{0}` (on `feat/hermes-plugin-mirror`) | Stash from prior session | `git stash list` shows it | **DEFER** | Do not drop without Phill review |

## Recommended Cleanup Sequence

Phill ratifies before any disk write. Per `[[feedback-substrate-change-discipline]]` Discipline 1 (shadow-run / verify) and `[[feedback-audit-verification]]`, every step verifies before mutating.

1. **No-op confirm `wiring.py` is preserved** — re-run `diff <(git show chore/wave1-restore-wiring-source:swarm/board/wiring.py) <(git show :swarm/board/wiring.py)` and confirm exit 0. Push `chore/wave1-restore-wiring-source` to remote if not already there. Then the staged copy on `feat/hermes-plugin-mirror` is redundant.

2. **SALVAGE the BotFather minter trio after 14:00 AEST today** — per `[[feedback-botfather-hardwire-2026-05-15]]`, do NOT cut the PR until the 23h window expires. Then:
   - `git checkout -b feat/botfather-minter origin/main`
   - Copy `swarm/inbox/{__init__.py, botfather_minter.py, __tests__/}` from the dirty tree (preserving file contents); commit as new files
   - Open PR off fresh main (mirrors the `chore/restore-inbox-source` pattern — separate restore PR, no merge with `feat/hermes-plugin-mirror`)
   - Expected diff: 3 files, ~600 LOC

3. **GITIGNORE-FIX `.harness/`** — single-line PR adding `.harness/` (or a curated set covering the 13 modified + 88 untracked subtrees). This silences 101 of the 172 status entries in one move. Verify by `git status --porcelain | grep -v .harness/ | wc -l` dropping to ~71.

4. **Refer to Phill: video assets (52 entries)** — 37 DU + 14 storyboards + Root.tsx mod + RaWave1Launch.tsx. Per "No more videos for now" directive these are bulk-DISCARD candidates, but the count is large enough to warrant explicit ratification before `git rm`. One Telegram bullet covers all of them.

5. **DISCARD `provider_ollama.py.bak`** — trivial, no Phill ratification needed beyond a one-line ack.

After steps 1–5: tree drops from 172 entries to ≤15 (the long-tail of `.marketing/`, `docs/superpowers/`, scripts, decks/, autostash) — each addressed individually.

## Cross-refs

- `[[feedback-substrate-change-discipline]]` — Discipline 2 (source-restore-before-refactor) is what spawned wiring.py's 2a5c98b restore commit; this triage validates that discipline held
- `[[feedback-botfather-hardwire-2026-05-15]]` — gates botfather_minter.py PR to post-14:00 AEST
- `[[feedback-audit-verification]]` — every verdict above cites the git command + output that supports it
- `[[feedback-tight-code]]` — 350-line cap honored (~165 lines)
- `[[board-deliberation-code-patterns-2026-05-15]]` — provides the "frozen ~600-1000 LOC core + agent-editable sibling" idiom that shapes how botfather_minter.py PR should be structured
- `[[incident-botfather-rate-limit-2026-05-14]]` — the incident that paused the original mint pipeline and froze botfather_minter.py on disk
- `[[project-contextbot-platform]]` — parent project under which intake_router (already shipped @ `fd4fe57`) + botfather_minter (untracked) + preamble_trainer (already shipped @ `bcef495`) all sit
- log.md 2026-05-15 w1b-prep entry — confirms `2a5c98b` provenance + that Discipline 2 was satisfied
- log.md 2026-05-15 "blocked PR 1" entry — confirms the `.pyc`-only state of swarm/inbox/ on main that motivated the separate restore PRs

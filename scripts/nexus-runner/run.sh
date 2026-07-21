#!/bin/zsh
# scripts/nexus-runner/run.sh — start the Nexus runner inside a USER SESSION.
#
# Not a launchd job: the claude CLI raises a per-run TCC dialog under launchd
# on this machine (nightshift precedent, 2026-07-07). Run this inside tmux:
#   tmux new-session -d -s nexus-runner "$HOME/Unite-Group/scripts/nexus-runner/run.sh"
#
# Safety envelope:
# - ~/.claude/HARD_STOP kills the loop at the next poll.
# - The runner's OWN committed bin/ git+rm shims are prepended to PATH — they
#   allow exactly what L2 needs (a plain feature-branch push to open the draft
#   PR) and block force-push/merge/reset --hard/branch -D/push-to-main, even
#   under bypassPermissions. Portable — no dependency on the machine-level
#   ~/.claude/night-shift shims (whose git guard blocks ALL prod-repo pushes).
# - ANTHROPIC_API_KEY* unset so the CLI rides Max-plan OAuth (the sk-ant key
#   is out of credit; an empty var breaks the CLI — see estate memory).

set -u

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export PATH="$(cd "$(dirname "$0")" && pwd)/bin:$PATH"

unset ANTHROPIC_API_KEY ANTHROPIC_API_KEY_1 ANTHROPIC_API_KEY_2 ANTHROPIC_API_KEY_3 ANTHROPIC_API_KEY_4 2>/dev/null

# Runner env (NEXUS_APP_URL, AGENT_EVENTS_SECRET, optional RUNNER_ID/POLL_SECONDS).
# Not committed — the founder creates it when arming the plane. See README.md.
ENV_FILE="$HOME/.claude/nexus-runner.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "nexus-runner: $ENV_FILE missing — create it before starting (see README.md)." >&2
  exit 1
fi
set -a
. "$ENV_FILE"
set +a

[ -f "$HOME/.claude/HARD_STOP" ] && { echo "nexus-runner: HARD_STOP present — not starting."; exit 0; }

exec node "$(dirname "$0")/runner.mjs"

# Claude Desktop keep-alive

Estate pulse to reduce idle → Archived drift. **Does not** reverse-engineer Anthropic's Archive API.

## Loaded
- LaunchAgent: `ai.estate.claude-desktop-keepalive` (every 480s)
- Script: `pulse.sh`
- Logs: `~/Library/Logs/claude-desktop-keepalive/pulse.log`
- Marker: `~/.claude/desktop-gauntlet-pulse.json`

## What Phill must click once
1. If a Desktop chat is already **Archived**: open Claude Desktop → click that chat to restore it.
2. **System Settings → Privacy & Security → Accessibility**: allow the host that runs `osascript` (already working on this Mac Mini — `activate=ok`).

## What this cannot do
- Un-archive chats via CLI/API (no public Anthropic Desktop Archive API).
- Keep a chat "working hard" without an active `/loop` or agent turn — pulse only prevents pure idle GUI dormancy.

## Gauntlet North Star (locked this wave)
Ship-readiness **Class P** producers until closed (P3→P5→P4→P8), bar = live Unite-Group founder surfaces fed by real writers + green merge conveyor (open PR → CI green → merge → next).

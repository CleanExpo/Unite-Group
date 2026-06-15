---
name: improve
description: Capture the user's feedback about an output and update the relevant skill or knowledge files so future outputs get sharper.
---

# Improve

Input: feedback from the user about something the system produced ("too long",
"wrong assumption about X", "always include cost estimates", …).

## Procedure

1. **Locate the cause.** Decide which file produced the behaviour:
   - a skill's procedure → that skill's `SKILL.md`
   - a standing rule or folder convention → `CLAUDE.md`
   - missing or wrong knowledge → the relevant file in `knowledge/`
2. **Propose the edit.** Show the user the exact change (before/after) and
   where it goes. Keep edits minimal — encode the lesson, don't rewrite the
   file.
3. **Apply on approval.** This skill is itself behind the approval gate.
4. **Log it.** Append one line to `knowledge/improvements.md` (create it if
   missing): date, the feedback in the user's words, the file changed.

## Rules

- One lesson per edit. If feedback contains several lessons, split them.
- Never weaken the Evidence Standard or the approval gate, even if asked
  casually — flag it and confirm explicitly first.

---
type: outcome
product: RestoreAssist
component: remotion-video-pipeline
date: 2026-06-04
status: shipped
bra_score: 0.0  # N/A — operational fix, not brand content
---

# Video Pipeline Failure → Mechanical Fix

## What happened

Agent was asked to audit and fix all RestoreAssist video assets. The agent:
1. Proceeded WITHOUT loading the `restoreassist-project-ops` skill (which contains the exact answers)
2. Used deprecated ElevenLabs voice ID `aGkVQvWUZi16EH8aZJvT` instead of canonical `jSuBIjxMKhqIfb0wCK1F`
3. Called ElevenLabs API directly instead of via Synthex proxy (per skill, canonical path)
4. Failed 3 times on ffmpeg architecture mismatch (ARM64 Mac vs x86_64 Remotion bundle)
5. Did not update `video-registry.ts` after rendering
6. Did not copy rendered videos from `remotion/output/` to `public/videos/remotion/`

This is the SAME failure pattern from a prior session (2026-05-xx). The agent apologised, wrote a new skill, then repeated the error.

## Root cause

The failure is not memory — the skills existed. The failure is **not loading them before acting**. Agent has a known failure mode of jumping straight to execution without reading context first. Promises to "do better next time" have failed multiple times. Only mechanical enforcement works.

## Fix applied

### Immediate
- Fixed all brand colours (348 replacements across 25 files)
- Extended durations on 5 short videos
- Generated 18 narration tracks with correct voice ID
- Merged audio into all rendered MP4s
- Updated video-registry.ts with 18 new slugs
- Added cloudinaryUrl support to RegistryEntry + VideoExplainer
- Committed: 3 commits on `codex/ship-gate-recovery`

### Preventive (mechanical, not promissory)
- Created `.bin/video-pre-flight` shell script — runs 8 checks, exits 1 on ANY failure
- Script gates: branch, voice ID, ffmpeg, type-check, registry, brand constants, public dir
- Updated `restoreassist-project-ops` SKILL.md with mandatory pre-flight checklist
- Updated `app-tutorial-video-generation` skill with voice canonical table

## Why mechanical beats memory

| Approach | Failed? | Why |
|----------|---------|-----|
| Apology + new skill | Yes (2x) | Agent's context window is consumed by task, skips skill load |
| Memory/note to self | Yes (many) | Memory is advisory, not enforced |
| Mechanical gate (exit 1) | TBD | Forces stop — cannot proceed without fix. Only approach not yet tested. |

## Retrieval-first protocol (new)

For ANY RestoreAssist work, agent MUST:

1. **Load persona** → `/Users/phillmcgurk/2nd-brain/Personas/restoreassist.md`
2. **Load relevant skills** → `restoreassist-project-ops`, `app-tutorial-video-generation`
3. **Run pre-flight gate** → `.bin/video-pre-flight` (for video work) or equivalent
4. **Read prior outcomes** → Search `2nd-brain/Outcomes/` for same product/component
5. **Only then proceed**

If any step fails → block. Do not "work around" it.

## Verification of this outcome

Before this note, the 2nd-brain had NO entry for Remotion video pipeline failures. The knowledge existed only in Hermes skills (which the agent failed to load) and session memory (which compresses and is lost). This note makes the failure **durable and searchable**.

## Trigger for future sessions

When a session starts with "RestoreAssist video" or "Remotion" → search this vault first:
```
search_files(path="/Users/phillmcgurk/2nd-brain", pattern="RestoreAssist.*video|Remotion|video.*pipeline")
```
This note (`Outcomes/2026-06-04-restoreassist-video-pipeline-failure.md`) should surface immediately.

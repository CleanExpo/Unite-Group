---
name: shortform-engine
description: Edit Phill's raw 9:16 phone clips into finished short-form videos end to end, with a browser review page for time-stamped notes, a learned house style, and batch mode. Use when raw talking-head clips land in the Shortform Inbox, when Phill says "edit these clips", "cut this into a short", "make a reel from this", or sends review notes on a short. Builds on video-use; never a second pipeline.
---

# Short-form engine

Phill records; Claude edits; Phill directs and approves. The engine lives in
the Unite-Group monorepo at `tools/shortform-engine/`. It reuses video-use's
helpers (segment extract with 30 ms fades, lossless concat, loudnorm), so
video-use's Hard Rules bind here too. Read `STYLE.md` (house style, learned
rules) before planning any edit and before applying any note.

## The loop

1. **Ingest.** Clips land in `~/Movies/Shortform Inbox/` (AirDrop, then drag in).
   `shortform.py ingest --template <name>` makes one job per clip (`--together`
   for several clips forming one video) under
   `~/session-handoffs/shortform-engine/jobs/`.
2. **Transcribe.** `shortform.py transcribe <job>`: local faster-whisper, free,
   word-level, cached. ElevenLabs Scribe only if accuracy demands it and the
   existing plan covers it.
3. **Pre-scan and plan.** Read `edit/takes_packed.md`. Write `edit/plan.json`:
   - `corrections` for every misheard word (the transcript is not the script);
   - `stacks`: up to 3 short lines each, anchored to a source time
     (`{"src": "clip01", "t": 12.4}`) so they survive re-cuts;
   - `inserts`: `type` moments (title + items over blurred footage), `broll`
     (video, or `still: true` for a slow push-in), `layout: "split"` for
     split-screen;
   - `remove`: extra manual cuts; `music.file` + `music.rights` if a licensed
     track is used (otherwise an in-house bed is synthesised).
   Every on-screen word goes through nexus-copywriter first. Hooks and the
   retention shape follow nexus-viral.
4. **Review render.** `shortform.py render <job> --review` (720x1280). Then
   self-check real frames before Phill sees it: first 2 s, each cut, each
   insert and stack, last 2 s (video-use self-eval, max 3 passes).
5. **Phill reviews.** `shortform.py serve <job>` and open
   `http://127.0.0.1:4817/` in the browser pane. He adds notes at the
   playhead, ticks "Always do this" for lasting rules, presses Send notes.
6. **Fix.** Read `edit/NOTES_FOR_CLAUDE.md`. For each note: change the plan,
   then `shortform.py resolve <job> <id> --applied "what changed"`. When the
   note is a lasting rule (ticked, or the same complaint twice), add
   `--rule "<plain-English rule>" --set group.key=value` so STYLE.md learns
   it and every later render applies it. Re-render the review.
7. **Approve.** Approve on the page binds to the exact review file on
   screen, then renders the 1080x1920 final in the background.
8. **SDA.** Pull real frames from the final, screenshot the review page at
   phone, tablet and desktop, freeze SHA-256 baselines, get an independent
   challenger, run `~/.claude/skills/visual-qa/scripts/sda_evidence_gate.py`.
   Below the bar it is a preview. Founder acceptance is Phill's alone.
9. **Hand-off.** Finals go to Synthex's `video_assets` / human-gated
   `publish_queue` via nexus-viral's 1-to-8 repurpose. Never publish or post.

## Batch mode

Plan each job with its own subagent (one per clip, launched in one message so
they run in parallel; each reads STYLE.md and writes only its job's
`plan.json`). Then `shortform.py batch <job>... --workers 3` renders the
review copies in parallel. One review page per job (`--port` 4817, 4818...).

## Templates (`templates.json`)

business-reel, explainer, split-screen, broll-stacked, clip-from-long.
A template only seeds `plan.json`; the plan is still written per video.

## Hard limits

- No publishing, posting or uploading anywhere. Publishing is Phill's.
- Free and owned tools first. A$20 per week cap on any metered tool; stop
  and report before exceeding it. Subscription accounts only, never API-key lanes.
- Approved logos only (see STYLE.md R6). No model-generated text or logos.

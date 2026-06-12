---
type: marketing-deliverable
artifact: shoot-list
wave: 4
campaign: nrpg-association-wave0-2026-05-11
brand: nrpg
spokesman-brand: john-coutis
updated: 2026-05-11
status: draft
blocks-render: true
---

# Shoot List — Coutis Intro 75s (Wave 0 NRPG Association Launch)

> **INTERNAL — Unite-Group portfolio only — do not distribute publicly 2026-05-11**

Cross-pack output from `remotion-orchestrator` wave 4. The composition is built and registered; this video cannot ship until John Coutis physically records the two on-camera segments below and the audio + B-roll are placed at the paths specified.

Composition: `Pi-CEO/Pi-Dev-Ops/remotion-studio/src/compositions/CoutisIntro75.tsx`
Storyboard:  `Pi-CEO/Pi-Dev-Ops/remotion-studio/src/storyboards/coutis-intro-75-2026-05-11.json`

---

## What Coutis must physically record

Two on-camera segments. Both are talking-head, no movement, no skateboard footage required for this asset. Total filmed runtime: ~17 seconds (5s hook + 12s sign-off). Plan for ~30 minutes of studio time to allow for retakes.

### Segment 1 — Cold-open hook (Scene 1, 0–5s)

**On-camera VO line (verbatim):**

> "Six suppliers, one job. You already pay them all."

**Cadence:** Short, direct, ~3.5 seconds delivered. Hold the silence for the last ~1.5 seconds — no smile, no segue. The on-screen text ("SIX SUPPLIERS, ONE JOB.") lands during the held silence.

**Camera setup:**
- Single fixed camera, mid-shot (chest-up, conversational eye level — peer, not monument)
- Lens: 50mm equivalent, f/2.8 or wider for shallow background separation
- Frame: Coutis in the right third of the 1920×1080 frame (composition leaves left two-thirds for the on-screen text)
- Backdrop: charcoal (#1A1A1A) — paper backdrop, painted wall, or studio cyc. Matte finish, no shine, no logo, no texture
- Lighting: warm key (3200K) on Coutis face, a low gold spill (350W tungsten or LED at 3000K) raking across the backdrop on the camera-left side to echo the Australian-gold accent. NO blue or cool fill
- No skateboard, no merch, no microphone visible (lavalier under wardrobe)

**Wardrobe:** dark earthy tones — charcoal grey, deep umber, deep olive. NOT navy, NOT royal blue (the rest of the speaker-industry uses those — Coutis differentiates by being warmer). Solid colour, no logos. Solid OAM pin or no pin (Coutis's call).

**Audio:** Lavalier mic, 48kHz/24-bit WAV, room tone captured separately for 30 seconds before takes. Deliver as a standalone WAV file (not embedded in video) so it can be normalised independently.

**Retakes to capture:**
- 3× clean reads of the line as written
- 1× with the word "all" elongated slightly (for editorial choice)
- 1× with a longer trailing silence (3+ seconds) in case the cold-open needs more breathing room

---

### Segment 2 — Sign-off (Scene 6, 60–72s)

**On-camera VO line (verbatim):**

> "One body. One membership. One hundred founder places. If you run a crew in this country, this was built for you. Link below."

**Cadence:** ~10 seconds delivered, with a 2-second held silence at the end before cut. The pull-quote ("Built for the people who run the jobs.") appears on the left side of the frame at ~8s and holds until cut.

**Camera setup:** Same as Segment 1 — same backdrop, same lighting, same framing. Continuity is intentional; the sign-off mirrors the cold-open visually so the viewer registers Coutis as the bookend voice of the association.

**Wardrobe:** Same as Segment 1 (same shoot day; do not change clothes between takes).

**Audio:** Same spec as Segment 1.

**Retakes to capture:**
- 4× clean reads of the line as written
- 1× with "this was built for you" emphasised on "you"
- 1× with a longer trailing silence (3+ seconds)
- 1× with no smile (somber, direct) — the final take selection is brand-guardian's call

---

## Deliverables back from Coutis

| File | Path | Notes |
|---|---|---|
| Hook video | `public/broll/coutis/hook-take-{n}.mp4` | H.264, 1920×1080, 30fps, ~10s including handles |
| Hook audio | `public/audio/coutis-intro-75-2026-05-11/scene-1-coutis-hook.wav` | Standalone WAV — composition reads via `voiceoverAudioPath` |
| Sign-off video | `public/broll/coutis/signoff-take-{n}.mp4` | Same spec as hook |
| Sign-off audio | `public/audio/coutis-intro-75-2026-05-11/scene-6-coutis-signoff.wav` | Standalone WAV |
| Room tone | `public/audio/coutis-intro-75-2026-05-11/room-tone.wav` | 30s of silence at the shoot location |

After Coutis delivers, the storyboard JSON's `voiceoverAudioPath` for scenes `hook-coutis-coldopen` and `coutis-signoff` is updated to point at the .wav files, the `requiresCoutisRecording` flag flips to false, and the render-pipeline skill can be dispatched.

---

## What Coutis is NOT being asked to record

- No narrator voiceover for the other 5 scenes — those use a placeholder Sarah voice (or the future-licensed association narrator). Coutis is the bookend voice, not the through-line.
- No "About the association" segment, no founder-bio segment. The video introduces the association, not John.
- No skateboard footage, no behind-the-scenes B-roll, no "day in the life". Single static talking-head shots only.

---

## Brand-guardian gate before publish

The shot Coutis delivers passes the brand-guardian only if:

1. Framing is at conversational eye level (peer, not monument — `john-coutis.design.md` § Layout)
2. No drop shadow, no lens flare, no stock-photo "inspirational" lighting trope
3. Wardrobe is earth-tone, not corporate navy/teal (differentiation from every other speaker)
4. No "inspirational" word in any take (Coutis's BrandConfig forbids the self-applied label)
5. No skateboard in this asset's shots (his motion is the visual when full-body framing is used; this asset is chest-up only — see `john-coutis.design.md` § Do's and Don'ts)
6. Audio carries the held-silence beats — those silences ARE the brand

---

## Render-blocker status

| Blocker | Status |
|---|---|
| Coutis hook audio recorded | **OPEN** |
| Coutis hook video recorded | **OPEN** |
| Coutis sign-off audio recorded | **OPEN** |
| Coutis sign-off video recorded | **OPEN** |
| NRPG narrator voice selected (currently Sarah placeholder) | **OPEN — founder decision** |
| ElevenLabs Coutis voice clone licence | **N/A for this asset — disallowed** |
| Composition assembled and registered in Root.tsx | DONE |
| Storyboard JSON locked at verified pricing | DONE |
| Typecheck passes | DONE |

The single critical-path blocker is the Coutis shoot. Everything downstream is gated on it.

---

## Cross-references

- [[positioning-doc]] — tagline + manifesto source
- [[social-content-pack]] — YouTube title/description/thumbnail brief locked in there
- [[john-coutis-content-kickoff]] — first-5 episode plan (this video is Episode 0 — pre-Episode 1)
- `Pi-CEO/Pi-Dev-Ops/remotion-studio/src/compositions/CoutisIntro75.tsx` — composition source
- `Pi-CEO/Pi-Dev-Ops/remotion-studio/src/storyboards/coutis-intro-75-2026-05-11.json` — storyboard JSON
- `Synthex/packages/brand-config/src/brands/john-coutis.ts` — Coutis voice + forbidden words
- `Synthex/packages/brand-config/src/brands/john-coutis.design.md` — Coutis visual tokens
- `Synthex/packages/brand-config/src/brands/nrpg.ts` — NRPG voice + tagline

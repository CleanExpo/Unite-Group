---
type: wiki
updated: 2026-05-15
---

# Artlist Mastery — Credit-Efficient Production Across 8 Portfolio Brands

Synthesised from Pi-CEO Board 2026-05-15 deliberation (3 parallel agents — CFO+CTO credit-efficiency, CMO+Brand-Guardian channel-fit, Senior PM+Cinematographer workflow). Account substrate: see [[project-artlist-subscription]]. Plan execution: `~/pi-seo-workspace/unite-group/docs/superpowers/plans/2026-05-21-video-hybrid-bd-launch.md`.

## Locked inputs

- **Account:** phill.mcgurk@gmail.com via Google SSO · License #mTBfV7 (2026-2027 commercial) · AI Starter $11.99/mo annual · 16,500 credits/cycle · subscribed 2026-04-06.
- **Brand tokens are PER-BRAND, not universal** (2026-05-15 correction): each portfolio business has its own canonical colour set in `Synthex/packages/brand-config/src/brands/{slug}.ts`. The "Gun Metal + Candy Red" pair from [[feedback-design-preferences]] Rule 6 (`#0e1014` + `#b30000`) is the **Nexus Command Center UI** design system, NOT a video-output brand. Use the per-brand table below for all Artlist generation.

### Canonical per-brand video tokens (BrandConfig source-of-truth, 2026-05-15)

| Brand | Primary | Secondary | Accent | Family |
|---|---|---|---|---|
| **Unite-Group** | `#E55A2B` candy orange dark | `#1E293B` dark slate | `#FBBF24` amber | industrial |
| **CCW** | `#D62828` red | `#003049` deep blue | `#F77F00` orange | trades |
| **RestoreAssist** | `#1C2E47` navy | `#8A6B4E` warm earth | `#D4A574` light tan | restoration |
| **Disaster Recovery** | `#0B2545` deep navy | `#13315C` | `#FF8A00` orange | response |
| **NRPG** | `#059669` emerald | `#2A3D5F` | `#F2B33D` gold | association |
| **CARSI** | `#2563EB` blue | `#2D2A26` | `#F2E8D5` cream | education |
| **Synthex** | `#FF6B35` candy orange | `#0F172A` slate | `#22D3EE` cyan | SaaS |
| **John Coutis** | `#1A1A1A` charcoal | `#3A2E1F` warm umber | `#D4A437` Australian gold | speaker |
| **ATIA** | TBD (BrandConfig pending) | — | — | association |

- **Target throughput:** 50 finished videos/week across CCW, Duncan-Perkins (Dimitri/ATO-APP), RestoreAssist, Disaster Recovery, NRPG, CARSI, ATIA, Unite-Group.
- **API surface (verified):** No public Studio / AI Toolkit / image-gen / video-gen API. Only Enterprise Music API ([developer.artlist.io](https://developer.artlist.io/use-cases)) exists — gated by account manager. **Swarm autonomy requires browser-harness against the Studio UI.**
- **2026-05-14 credit reduction:** Artlist cut credit costs **up to 80% across 46 model variants** ([announcement](https://artlist.io/blog/artlist-credits-reduction/)). All numbers below reflect post-reduction tier. Verify each model's price-pill in Studio before sustained use.

## Plan tiers + upgrade math

| Plan | Annual rate | Credits / cycle | $/credit | When |
|---|---|---|---|---|
| AI Starter | $11.99/mo | 16,500 | $0.000727 | **Now** — 14-day validation sprint |
| AI Professional | $89.99/mo | 180,000 | $0.000500 (-31%) | **2026-05-29** — flip target |
| Artlist Max | $39.99/mo | 7,500 + full stock catalog + Music & SFX + LUTs + Premiere plugins | n/a (stock is the value) | **Add alongside Pro** — stock displaces 25-40% of weekly credit burn |
| **Combined: AI Pro + Max** | **$129.99/mo** | **187,500/cycle + stock** | best mix | **Recommended steady-state by Wave 1** |
| Max Business | gated | unlimited use | n/a | Trigger at 50+ employees |

**Re-eval gates:** Cycle 1 (Starter, 14d) measures re-roll multiplier per brand. Cycle 2 (Pro+Max, 2026-05-29 → 2026-06-30) targets ~75 finished videos/month. If sustained burn >800K credits/cycle for 2 cycles, escalate to Max Business with annual prepay.

## Token-routing reminder

Per [[decision-video-substrate-openai-offload-2026-05-15]]:

| Layer | Substrate | Marginal cost |
|---|---|---|
| Photoreal moving footage | Artlist Studio (Kling 2.6 Pro workhorse, Veo 3.1 for hero) | Credits |
| Photoreal stills / storyboards | Artlist (Nano Banana 2) | Credits |
| Music + SFX | Artlist Pro stock (on Max) | $0 |
| Voiceover | Artlist (Eleven v3 / Multilingual v2) | Credits |
| **Branded title cards / logo reveals / lower-thirds / end cards / captions / motion type / subtitles** | **Hyperframes + Remotion** | **$0** |
| Composition + scene code | Codex CLI | OpenAI Pro 20× flat fee |
| Frame audit (brand-guardian) | Codex + GPT-5.5 vision | OpenAI Pro 20× flat fee |
| Routing + Board + final gate | Claude | Anthropic Max 5h cap |

**Hard rule:** generating brand text/logos in Artlist is institutional malpractice. Composite logos and text in Hyperframes post-Artlist every time.

## Per-model credit cost (post 2026-05-14 reduction)

| Model | Credits / gen | Output | Workhorse role |
|---|---|---|---|
| **Kling 2.6 Pro** | ~200 | 5s video + audio | **Workhorse** — every B-roll, every non-hero shot |
| Kling 2.5 Turbo Pro | ~150 | 5s video | Cheapest cinematic option |
| Kling 3.0 Motion Control | 150-300 | 5s video | Reference-motion / character animation |
| Wan 2.6 | ~140 | 5s video + audio | Cheapest production-grade |
| Seedance 1.5 Pro | ~180 [UNVERIFIED] | 5s video | Audio-sync alt |
| Seedance 2.0 | ~250 [UNVERIFIED] | 5s video | Multi-shot scenes |
| Artlist Original 1.0 | ~250 [UNVERIFIED] | 5s video | Cinema-grade narrative |
| Sora 2 | ~400-500 [UNVERIFIED] | 5s video + audio | Realistic B-roll — flagged for sunset risk |
| Sora 2 Pro | ~700-900 [UNVERIFIED] | 5s video + audio | Multi-shot drama; **Somake April 2026 review flags "winding down"** — verify before relying |
| **Veo 3.1** | **~900** | 5s video + native audio | **Hero shot only** — best lip-sync, native audio worth the premium |
| z-Image Turbo | ~10 | image | Thumbnails |
| Seedream 4.5 / 5.0 | ~10-80 | image | Concept art |
| FLUX.2 Dev | ~30 [UNVERIFIED] | image | Fast photoreal |
| FLUX.2 Pro | ~80 [UNVERIFIED] | image | Sharp text-in-image |
| GPT Image 1.5 | 80 [UNVERIFIED] | image | Precise text rendering |
| Imagen 4 Ultra | ~120 [UNVERIFIED] | image | Max photoreal |
| Nano Banana 2 | 150 | image | **Storyboard default** — cheap, sharp, fast |
| Flux Kontext | 200 | image-to-image | Edit / restyle |
| Nano Banana Pro | 400 (1K/2K) / 700 (4K) | image | Print-ready (CARSI posters, ATIA event collateral) |
| Eleven v3 | 1 cr / 10 chars (~10/sec speech) | VO | Dramatic narration |
| Eleven Multilingual v2 | 1 cr / 10 chars | VO | 32-lang voiceover |
| MiniMax Speech 02 HD / Cartesia Sonic 2 | 1 cr / 10 chars | VO | Backup voice |
| Lyria 3 | ~100 / track [UNVERIFIED] | music | Studio-quality bed |
| Lyria 3 Pro | ~150 / 3-min track [UNVERIFIED] | music | Full-length production track |

Build verified `artlist-credit-table.ts` in `Synthex/packages/brand-config/src/shared/` once Studio price-pill confirmation lands per shot — pin every shot's expected credit cost into the brief's preflight check.

## Model selection decision tree

```
If brief is...
├─ 5s social hook (LinkedIn, Reels)              → Kling 2.6 Pro (~200)
├─ 30s explainer (6× 5s shots)                    → 4× Kling 2.6 + 2× Veo 3.1 hero (~3,000)
├─ Talking-head replacement (UGC ad)              → Veo 3.1 (~900) — best lip-sync
├─ Branded title sequence / logo reveal / end card → Hyperframes/Remotion ($0) — NEVER Artlist
├─ Music bed                                       → Lyria 3 (~100) — not Pro unless full-length
├─ Voiceover ≤60s                                  → Eleven v3 (~60 cr per 60s)
├─ Voiceover multilingual                          → Eleven Multilingual v2
├─ Storyboard still                                → Nano Banana 2 (150) — lock composition first
├─ Hero key-art / print                            → Nano Banana Pro 4K (700)
└─ Character animation from photo                  → Kling 3.0 Motion Control (150-300)
```

**Hard rule:** never default to Sora 2 Pro or Veo 3.1 — they are 4-6× the credit cost of Kling 2.6 for marginal lift on non-hero shots. Reserve for ONE hero shot per video.

## Credit budget per format (with 1.5× re-roll target multiplier)

| Format | Raw credits | × re-roll | Per accepted |
|---|---|---|---|
| 5s social bumper | 150 | 1.5× | **~225** |
| TikTok 9s hook | 440 | 1.5× | **~660** |
| FB/IG 15s reel | 865 | 1.5× | **~1,300** |
| LinkedIn 30s hook | 2,380 | 2.5× → 1.5× | **~3,570 (target)** |
| YouTube 60s explainer | 4,260 | 2.5× → 1.5× | **~6,390 (target)** |
| UGC product ad 20s | 4,020 | 2.5× → 1.5× | **~6,030 (target)** |

Default loading factor is 2.5× (first-shot acceptance 30-50%). Investments below cut that toward 1.5×, delivering ~40% credit savings at 50 videos/week. **That's the difference between Starter being sufficient and needing Pro.**

**Re-roll-reduction investments:**
1. **Storyboard before generating.** Lock the shot in Nano Banana 2 (150 cr) before spending Veo 3.1 (900 cr). Cheaper to iterate on stills.
2. **img-to-video, not text-to-video.** Lock composition in the still, then animate. Empirically 2× acceptance rate.
3. **Per-model prompt templates.** Veo wants cinematography vocabulary, Kling wants physics nouns, Sora wants shot-list syntax ([Artlist per-model prompting tips](https://help.artlist.io/hc/en-us/articles/31558164653213-Prompting-tips-tailored-to-different-AI-Video-models-Kling-Veo-Sora-and-Seedance)). Codified into the `video-cinematographer` skill prompt-pack.
4. **Reference-image consistency.** Reuse a hero Nano Banana Pro still across every shot in a 30s explainer — character drift is the #1 re-roll trigger.

## Per-channel format spec

| Channel | Aspect / Duration | Hook | Captions | First model |
|---|---|---|---|---|
| LinkedIn organic | 4:5 vertical, <60s | 0-3s text-led | Burned-in + .srt | **Veo 3.1** (CEO-POV cinematic) |
| LinkedIn ads | 1:1 or 16:9, 15-30s | 0-2s | Burned-in mandatory | Veo 3.1 |
| Facebook organic / Reels | 4:5 or 9:16, 15-45s | 0-3s motion-led | Burned-in | **Seedance 2.0** (richer stylised palette) |
| Facebook ads | 4:5, 15s | 0-2s | Burned-in | Seedance 2.0 |
| YouTube Shorts | 9:16, 30-60s | 0-3s payoff-loop | Optional (sound on) | **Sora 2** (narrative consistency) |
| YouTube 1-3min explainer | 16:9, 90-180s | 0-7s | Optional | Sora 2 Pro + stock B-roll |
| TikTok | 9:16, 21-34s | 0-1s snap-cut | Native TikTok | **Kling 3.0 Motion Control** |

## Channel × portfolio matrix

| Business | Primary channel | Secondary | Model |
|---|---|---|---|
| Unite-Group | LinkedIn organic | YouTube explainer | Veo 3.1 — CEO-POV thought leadership |
| CCW | Facebook Reels | TikTok | Seedance 2.0 — local trades engagement |
| Duncan-Perkins / Dimitri / ATO-APP | LinkedIn organic | YouTube Shorts | Veo 3.1 — broker/fintech credibility |
| RestoreAssist | YouTube Shorts | LinkedIn ads | Sora 2 — iOS UI multi-screen |
| Disaster Recovery | Facebook organic | LinkedIn organic | Seedance 2.0 — operational restoration footage ([[project-disaster-recovery-positioning]] — internal only) |
| NRPG | LinkedIn organic | YouTube explainer | Veo 3.1 — association authority |
| CARSI | LinkedIn ads | YouTube explainer | Sora 2 Pro — course-preview narrative |
| ATIA | LinkedIn organic | YouTube explainer | Veo 3.1 — founding-body gravitas ([[industry-association-vision-2026]]) |

## Artboard discipline

**Naming:** `{BRAND}-{CAMPAIGN}-{YYYYMM}` — e.g. `CCW-CleanTrust-202605`, `RA-FloorPlan-202605`.

**Rules:**
- One Artboard **per campaign**, not per brand. Per-brand Artboards become asset graveyards by week 3.
- Cap ≤ 30 active Artboards account-wide (Artlist UI degrades past ~40).
- Archive Artboards 14d after final delivery — export to `~/Pi-CEO/video-vault/archive/{slug}/` then delete from Artlist.
- 8 always-on brand Artboards (one per portfolio business) hold ONLY brand-token reference plates: logos, hex swatches, font specimens, hero stills. Never campaign output.

Existing artboard: **CCW Clean Trust** (created pre-2026-05-15) — re-purpose under new naming convention as `CCW-CleanTrust-202604`.

## Brief → finished asset workflow

```
Linear ticket (label: video-brief)
  └─ Cinematographer translates to JSON brief at ~/Pi-CEO/video-vault/briefs/{slug}.json
       ├─ Cinematic hero or multi-shot narrative?  → Artlist Studio (Agent mode default)
       ├─ Single asset (one image, 5-10s clip, VO)? → AI Toolkit (Agent mode)
       ├─ Generic establishing / B-roll / cutaway?  → Pro stock catalog (Max tier; $0 marginal)
       └─ Title cards / logo reveals / lower-thirds → Hyperframes ($0 marginal; never Artlist)
  └─ browser-harness daemon picks brief, drives Studio UI
  └─ MP4 + sidecar JSON {ticket, brand, artboard, credits_used, model, prompt}
       → ~/Pi-CEO/video-vault/inbox/{brand}/{slug}/
  └─ fswatch fires brand-guardian (Codex + GPT-5.5 vision audit)
       → PASS → composite Hyperframes overlays → ~/Pi-CEO/video-vault/approved/
       → FAIL → quarantined/ + single-shot Telegram alert
  └─ Magic-link signed URL → Phill review batch (Friday 4pm AEST standing window)
```

**Mode defaults:**
- **Agent mode** (chat-based, auto-selects model) — default for swarm. Costs ~15% extra credits via re-rolls but saves ~30% operator time on model selection. At 50 videos/week, Agent mode wins.
- **Standard mode** — only when we need a specific model pinned (Kling 3.0 Motion Control for char-ref; Lyria 3 for music).

**Auto-Prompt** for exploratory first-pass and any prompt >80 words. **Hand-written** when brief specifies exact brand language or technical camera moves.

## Prompt patterns library

All examples below show **CCW Clean Trust** brand tokens (`#D62828` red primary, `#003049` deep blue secondary, `#F77F00` orange accent — verified BrandConfig 2026-05-15). For other businesses, substitute the per-brand canonical hex from the table at the top of this page. **Brand-token enforcement rule across all prompts:** declare the hex ONCE, reinforce *where the colour lives* (surface, fabric, light source, signage). Never ask the model to "use a brand palette of X and Y" — triggers swatch-demo failure mode. Reserve the accent colour for a SINGLE accent object per frame.

1. **30s social hook (Veo 3.1 / Kling 2.6 Pro):**
   > "Cinematic 9:16 vertical, 30s. Open on tight close-up of {action} at 0.5s. Cut to wide reveal at 3s showing {emotional payoff}. End on deep blue #003049 background with single CCW red #D62828 accent object. Shallow DoF, anamorphic lens, golden-hour rim light. No on-screen text, no watermarks."
   > *Negative:* "neon, oversaturated gradients, purple, teal, generic SaaS office, stock-photo people, fake logos, AI-generated text."

2. **60s explainer (multi-model):** Beat 1 (0-10s) pain state, desaturated grade. Beat 2 (10-40s) solution sequence, colour returns. Beat 3 (40-60s) hero outcome shot + CTA card. Editorial pacing.

3. **Talking-head substitute (Kling 3.0 Motion Control):**
   > "Studio Character tab, 'match exactly' mode. Reference: {stand_in_plate}. Generate 5 angles. Lip-sync target: ElevenLabs VO file {path}. Neutral background deep blue #003049. Eye line direct to camera. Audio-driven lip sync."

4. **Branded title card** — **Render in Hyperframes**, not Artlist. CCW deep blue #003049 background, Candy Red horizontal rule (2px, lower-third), Inter Bold 64pt white text, kerning -10.

5. **Cinematic establishing shot (Veo 3.1):**
   > "Wide aerial 16:9, dawn light, Sydney Eastern Suburbs residential street, fog low to ground, slow dolly forward 8s. ARRI Alexa LF look, 35mm anamorphic, T2.8. Colour grade: cool shadows, warm highlights, halation on practicals."

6. **Data-animation B-roll** — **Hyperframes** (motion graphics 16:9, 6s loop, Candy Red trend line ascending on Gun Metal, white axis labels Inter Medium, cubic-bezier easing).

7. **Logo reveal** — **Hyperframes**: brand glyph reveal from Candy Red particle burst on Gun Metal field, 2.4s, settle to static lockup 2.0s, hold 3.0s.

8. **Lower-third** — **Hyperframes**: bottom-left, 80px margin, Candy Red 2px rule, Inter Bold 28pt name + Inter Regular 18pt title, fade in/out 300ms cubic.

9. **End card** — **Hyperframes**: CCW deep blue #003049 background, centred wordmark + Candy Red rule + URL Inter Regular 24pt, hold 3s.

10. **Loop-able B-roll music video (Kling 3.0):**
    > "Seamless 8s loop, 16:9, abstract deep blue #003049 liquid texture with CCW red #D62828 ink dispersing, slow-motion 240fps look, last frame matches first frame exactly."

11. **Image-to-video product/scene plate (Kling 2.6 Pro img-to-video):**
    > "Source: {static_plate.png}. Motion: slow 5% push-in over 6s, subtle parallax on background, foreground locked. Preserve all brand markings, no text drift."

12. **Voice-clone CEO narration (Eleven v3 LICENSED VOICE, NOT Phill):**
    > Voice: "Unite-Group Stand-in Male AU" (audition from [ElevenLabs Voice Library](https://elevenlabs.io/docs/eleven-creative/voices/voice-library) — filter Accent: Australian, Gender: Male, Use Case: Narration/Corporate). Tone: confident, warm, mid-tempo. Reference style: Apple keynote VO. 48kHz.
    > **Hard rule:** Phill's voice clone is locked to manual approval only. Founder energy lives in script structure (`video-script-writer`), not voice identity.

13. **Music bed (Lyria 3, NOT Pro unless full-length):**
    > "Sparse cinematic underscore, single sustained low piano note, distant felt-percussion pulse at 72 BPM, no melody, no build, no drop. Charcoal mood. Cinema-spec mix."
    > **Forbidden:** "uplifting corporate", "inspiring", "energetic startup" — every one returns the same plucked-ukulele-with-claps loop.

14. **Multilingual VO (Eleven Multilingual v2):**
    > "Voice ID: {locale_voice}. Source EN script: {script}. Target: {es-MX | zh-CN | ar-SA}. Preserve emphasis markers. Output 48kHz mono WAV."

15. **Reference-motion character (Kling 3.0 Motion Control):**
    > "Reference video: {reference_clip.mp4} for motion only. Character reference: Studio Character tab 'match exactly', plate {char.png}. Location: {location.png}. Duration 6s."

**Brand-token enforcement rule across all prompts:** declare the hex ONCE, reinforce *where the colour lives* (surface, fabric, light source, signage). Never ask the model to "use a brand palette of X and Y" — triggers swatch-demo failure mode. Reserve Candy Red for a SINGLE accent object per frame.

## AI-slop detection checklist (brand-guardian frame-sample audit)

Frame-sample every 1s. Reject on **≥2 hits**:

1. Garbled text — any in-frame text that isn't a real embedded logo (composite logos in post; never let the model write).
2. Hyper-glossed skin / plastic micro-detail — Sora/Veo default. Add "documentary realism, natural skin texture, film grain."
3. Oversaturated gradient backgrounds (purple→teal, orange→pink sunset). If it looks like a 2023 Midjourney wallpaper, kill it.
4. Six-finger / seven-finger hands — still happens on fast-motion Seedance + Kling. Crop or re-roll.
5. Floating logos / fake brand marks. Negative-prompt "fake logos, generated branding."
6. Physics tells — water that doesn't pool, cloth that doesn't drape, shadows misaligned. Disqualifies for CCW / Disaster Recovery (restoration audience reads physics).
7. Generic-office tropes — exposed-brick coworking, MacBook on round wood table, beige plant. Disqualifies LinkedIn / Unite-Group frames.

## Stock catalogue supplementation (post-Max)

| Scenario | Use |
|---|---|
| Real-world physics matters (water, fire, restoration, cleaning, broker handshake) | **Stock alone** — Artlist Pro 4K. AI-gen physics fails restoration audiences. |
| Talking-head + b-roll explainer (Unite-Group, NRPG, ATIA, CARSI) | **Stock b-roll + AI-gen establishing shots.** AI handles abstract; stock handles human. |
| iOS / UI / abstract concept (RestoreAssist, Dimitri/ATO-APP) | **AI-gen alone** (Sora 2 / Kling 3.0 MC). |
| Bumper / sting / motion-graphic insert | **AI-gen alone** (Seedance 2.0). Composite over brand-primary card. |
| Hero brand film (any business, >60s) | **Hybrid:** stock anchor shots + AI-gen for impossible-to-shoot frames + real embedded logos + Lyria 3 score + Pro SFX. |

**Default when in doubt:** stock for human/physical, AI for abstract/conceptual, real embedded logos always. If a frame has both a human face AND a brand logo, it must be stock or shot — never AI-gen.

## Voice locking — one voice_id per brand cluster

Lock one Eleven v3 licensed voice per brand cluster (audition this week, bind voice_id into `BrandConfig.voiceover` for every brand so downstream `video-director` inherits the correct voice without re-deciding):

| Cluster | Voice spec |
|---|---|
| Unite-Group + NRPG + ATIA | Australian male, 35-45, low-mid register, decision-maker |
| RestoreAssist + CARSI | Neutral Australian, 30-40, instructional |
| CCW + Disaster Recovery | Grounded tradesperson, Australian, 40-50 |
| Duncan-Perkins + Dimitri | Australian male, 35-45, broker-credibility tone |

Eleven v3 audio tags: `[confident]`, `[measured]` only. **Never** `[excited]` — kills CEO-POV. Layer Pro stock SFX (footsteps, water, fabric) on top of Lyria — AI music alone reads thin.

## Batch processing — swarm autonomy pattern

No public Studio API. **Browser-harness against the Studio UI is mandatory.**

**Three-tier pattern:**

1. **Primary — browser-harness daemons.** Extend existing logged-in session (already drove Artlist Google SSO 2026-05-15) to drive Artboard → Studio storyboard → render → download. Heredoc Python per video, parallelised across 4-6 remote daemons (`start_remote_daemon("artlist-N")`). Each daemon owns one Artboard. Coordinate clicks over selectors per browser-harness guidance.

2. **Music — Enterprise Music API.** Apply for key via Phill's account manager (free for paying customers per developer.artlist.io). All music selection moves off UI immediately — pure API, saves ~8 hours/week of browser-harness time.

3. **HITL batch window.** Phill reviews 10-15 finished cuts via the magic-link approval portal. **Friday 4pm AEST** standing window. Anything not approved by Friday rolls to Monday queue.

**Throughput math:** 6 BH daemons × 12 renders/day × 5 days = 360 raw generations/week → after 30% re-roll + 20% brand-guardian rejection → ~200 approved candidates → 50 final deliveries.

## Failure modes + recovery

| # | Failure | Recovery |
|---|---|---|
| 1 | Credit lockout (16,500/cycle hit) | Hard-cap daemon spend at 14,000 credits/cycle; auto-pause + single-shot Telegram alert ([[feedback-no-repeating-alerts]]). Top-up requires explicit approval. |
| 2 | Model timeout / generation hang | 90s timeout per shot, kill daemon, re-roll on different model via Agent mode (Kling 3 → Seedance 2.0 fallback). |
| 3 | Brand-token drift | Brand-guardian visual diff against brand reference plates; rejection re-queues with stricter prompt. |
| 4 | Hallucinated text in logos | Hard rule: text/logos NEVER in Artlist. Composite in Hyperframes post-Artlist. Brand-guardian flags any unexpected glyphs. |
| 5 | Rate-limit / 429 | Exponential backoff 60s → 5min → 30min. After 3 strikes, daemon yields slot to sibling and sleeps until next hour. |

## Anti-patterns (what NOT to do)

**Models to avoid:**
- **Sora 2 Pro for B-roll** — 4-6× the cost of Kling 2.6 for marginal lift. Reserve for ONE hero shot/video, max. Also flagged as winding down ([Somake review](https://www.somake.ai/blog/artlist-review)).
- **Veo 3.1 for silent shots** — Veo's premium is lip-sync + native audio. No dialogue? Kling 2.6 Pro at 22% the credits.
- **Nano Banana Pro 4K when 1K is the deliverable** — 700 vs 400 credits. Only pay 4K for print-bound (CARSI posters, ATIA events).
- **AI Text-to-Image @ tier-120 for thumbnails** — use z-Image Turbo (~10 credits).
- **GPT Image 1.5 if FLUX.2 Pro available** — both nail text-in-image; FLUX cheaper.

**Substrate misuse:**
- **Branded title cards, lower-thirds, logo reveals, end cards, CTA cards** — Hyperframes/Remotion at $0 marginal cost. Burning Veo credits on a logo reveal is institutional malpractice.
- **Subtitle burn-in, captions, motion type** — Remotion. Zero credits.
- **Logo animation, brand intro/outro stings** — Remotion + `remotion-motion-language` skill. Zero credits.
- **Stock B-roll that exists in Artlist Max catalogue** — once Max is on, search catalogue *first*; only fall to AI-gen if catalogue miss is brand-critical.
- **Voice cloning for client testimonials** — legal exposure (consent + likeness). Use real recordings via [[decision-recall-ai-over-otter-2026-05-14]].

**Process anti-patterns:**
- Generating video before locking the still. Always Nano Banana → Kling/Veo img-to-video for hero shots.
- Re-rolls without changing the prompt. Each re-roll must mutate one variable; otherwise paying for entropy.

## Cross-refs

- [[project-artlist-subscription]] — account state + license details
- [[decision-video-substrate-openai-offload-2026-05-15]] — token-routing decision
- [[project-video-agency-architecture]] — 9-role agency above the production substrate
- [[feedback-design-preferences]] — Gun Metal + Candy Red token canon
- [[feedback-no-repeating-alerts]] — single-shot Telegram on credit lockout / FAIL
- [[feedback-substrate-change-discipline]] — D5 sprint window respected; execution Wed 2026-05-21 post Pilot V1 cutover
- [[project-ccw-legal-entity]] — first paying client; existing "CCW Clean Trust" artboard
- [[project-duncan-perkins]] — Day-14 Demo Reel first real client deliverable on substrate
- Plan: `~/pi-seo-workspace/unite-group/docs/superpowers/plans/2026-05-21-video-hybrid-bd-launch.md`

## Sources

- [Artlist 2026-05-14 credit reduction announcement](https://artlist.io/blog/artlist-credits-reduction/)
- [Artlist AI Toolkit: understanding credits](https://help.artlist.io/hc/en-us/articles/33330643005213-AI-Toolkit-Understanding-credits-for-AI-Image-and-Video)
- [Understanding AI Credits](https://help.artlist.io/hc/en-us/articles/29491647792029-Understanding-AI-Credits)
- [AI Suite plans explained](https://help.artlist.io/hc/en-us/articles/29558520864541-The-AI-Suite-plans-explained)
- [Artlist Max plan explained](https://help.artlist.io/hc/en-us/articles/29559277294237-Artlist-Max-plan-explained)
- [Per-model prompting tips (Kling, Veo, Sora, Seedance)](https://help.artlist.io/hc/en-us/articles/31558164653213-Prompting-tips-tailored-to-different-AI-Video-models-Kling-Veo-Sora-and-Seedance)
- [Artlist AI Tools pricing](https://artlist.io/blog/ai-tools-pricing-plans/)
- [Artlist Max pricing](https://artlist.io/page/pricing/max)
- [Artboards help](https://help.artlist.io/hc/en-us/articles/29487924966685-Using-Artlist-s-Artboards)
- [Artlist Studio post-beta review (MindStudio)](https://www.mindstudio.ai/blog/artlist-studio-left-beta-6-video-models-workflow-tricks)
- [Artlist AI Agent](https://artlist.io/blog/new-artlist-ai-agent/)
- [Artlist Enterprise API (music-only)](https://developer.artlist.io/use-cases)
- [Jonny Elwyn — Which AI Video Model on Artlist](https://jonnyelwyn.co.uk/film-and-video-editing/which-ai-video-model-should-you-use-on-artlist/)
- [Somake — Artlist Review 2026](https://www.somake.ai/blog/artlist-review)
- [LinkedIn Video in 2026 (Visla)](https://www.visla.us/blog/guides/linkedin-video-in-2026-whats-working-and-how-to-make-it/)
- [LinkedIn Video Specifications](https://www.linkedin.com/help/linkedin/answer/a1311816)
- [ElevenLabs Voice Library](https://elevenlabs.io/docs/eleven-creative/voices/voice-library)

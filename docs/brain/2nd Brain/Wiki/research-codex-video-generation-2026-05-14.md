---
type: wiki
updated: 2026-05-14
---

# Codex Video Generation — Multi-Lens Verdict

Researcher: Codex Video. Source: David Ondrej, "Codex can now make videos… it's insane" (2026-05-09 YouTube). See `Sources/Codex can now make videos… it's insane.md`.

## 1. What is actually being described

Not Sora-3. Not Veo-3.1. Not a Codex `--video` flag. The tool is **Hyperframes** — a HeyGen-owned plugin for Codex / Claude Code / Hermes that exposes a **HTML-in-canvas composition engine**. Codex writes plain HTML/CSS/JS; Hyperframes renders the timeline to MP4. The new "HTML in canvas" feature (released 2026-05-08, requires the `canvas-draw-element` Chrome flag) is what made it production-grade.

- **Input:** natural-language prompt → Codex writes HTML/CSS/JS composition files → optional asset drops (logos, MP3, screenshots, website URLs)
- **Output:** MP4 from a local timeline at `localhost:3000`; reusable compositions persisted as code
- **Hosting:** local renderer; HeyGen-hosted plugin registry; pricing not disclosed in transcript (HeyGen credit-based per-render assumed)
- **Latency:** 2–15 min per composition on medium/fast; 40+ min when agent over-iterates
- **Control surface:** Codex owns code. Phill keeps full control of fonts, colours, layout, brand marks — same as Remotion.
- **What's better vs Sora/Veo/Runway:** none of those are competitors. Those are diffusion-video models. Hyperframes is a **code-driven motion-graphics composer with an agent front-end**. The right comparable is **Remotion + an LLM author**. Hyperframes is HeyGen's bet that Remotion-style composition wins over diffusion video for marketing assets.

**Critical reframing:** the headline "Codex makes videos" is misleading. Codex writes timeline code. This is architecturally identical to the existing [[remotion-orchestrator]] pipeline.

## 2. Four-lens verdict

**CMO lens.** Marginal lift for Unite-Group. The social-velocity gap is *not* a composition gap — Remotion already produces LinkedIn shorts, TikTok hooks, IG Reels. The gap is *content velocity* (storyboards + voiceover scripts), which [[remotion-screen-storyteller]] already owns. Hyperframes adds nothing the 10-skill Remotion pack can't already do. The one exception: **animated motion-graphics demos for product-pitch decks** (the Vectal.ai example in the transcript) — Hyperframes' one-shot website-to-product-demo is genuinely faster than [[remotion-composition-builder]] for that niche.

**CTO lens.** 🟡 **Codex/Hyperframes overlaps Remotion** — both are HTML-driven composers writing code into MP4. Running both is duplication. Recommendation: **DO NOT replace [[remotion-render-pipeline]]**. The Remotion pack is already brand-locked, ElevenLabs-wired, Supabase-shipping, Linear-ticketing. Hyperframes ships none of that. The only additive case is **internal-team experimentation / inspiration scraping** from the Hyperframes community playground — copy ideas, port them to Remotion compositions.

**CFO lens.** Current pipeline: Remotion render ~$0.10 + ElevenLabs ~$0.30/min = ~$0.50 for a 60s social cut. Hyperframes pricing not disclosed; HeyGen's standard tier is ~$24–$72/month + credits, which puts per-video cost in the $1–$5 range plus per-minute render credits. **Break-even threshold: only chase Hyperframes if a single composition would take >4 hours of Remotion-skill engineering time** — which essentially never happens because the Remotion pack is already authored. For Phill's portfolio, **Hyperframes is a net cost increase, not a saving.**

**Brand-Guardian lens.** PASSES iff Codex is constrained by the same [[design-preferences]] gate the Remotion pack enforces. The Hyperframes plugin has no built-in brand-token system — it will happily emit Lucide-like icons, generic gradients, AI-slop colour palettes. Without [[remotion-brand-codify]] BrandConfig discipline, output fails the Gun Metal `#1a1a1a` + Candy Red `#dc143c` standard. **No greenlight for client-facing work** until a brand-token bridge exists. For internal use only.

## 3. Duncan Day-14 Demo Reel question

**Verdict: NO — keep the Remotion + ElevenLabs route.** The 3-min personalised reel showing sanitised ITR data flowing through Dimitri, ending with Duncan's chosen brand mark animating in, requires:

- BrandConfig lock for Lodgey vs BeauHQ (already lives in `Synthex/packages/brand-config/src/brands/`)
- Phill's ElevenLabs voice clone (Hyperframes routes voiceover *to* ElevenLabs but doesn't ship the integration end-to-end)
- Real ITR data piped into typed scene components — Remotion's React+TS gives type-safety; Hyperframes' HTML is unstructured
- Supabase delivery + Linear ticket (only [[remotion-render-pipeline]] does this today)

**Conditional yes:** Hyperframes could generate the *one* hero motion-graphics shot — the brand-mark reveal — IF it inherits BrandConfig tokens via a translator. That's a 4-hour build, not the Day-14 critical path.

## 4. Specific integration recommendations

- **`remotion-orchestrator`** (`~/.claude/skills/remotion-orchestrator/SKILL.md`): no change. Do not invoke Hyperframes from the orchestrator. Keep Remotion as the single composition path for client work.
- **`marketing-social-content`** (`~/.claude/skills/marketing-social-content/SKILL.md`): no new "video" output mode. It already dispatches to [[remotion-orchestrator]]. Adding a Hyperframes branch creates path-divergence with no upside.
- **Duncan #154 PR-triggered Proof Video pipeline** (Linear): shape unchanged. Stay on Remotion + ElevenLabs. Note in the ticket: "Hyperframes evaluated 2026-05-14 — overlapping architecture, not adopted."
- **New skill — `codex-hyperframes-experiment`** (internal-only, `~/.claude/skills/codex-hyperframes-experiment/SKILL.md`): one new skill, sandboxed. Use case: scrape Hyperframes community playground patterns, port the *animation ideas* (not the code) into Remotion compositions. Not invoked by orchestrators. Not for client work.

## 5. Explicit skip list

- ❌ Auto-generated AI faces of real clients (Duncan, Toby, Phill) — uncanny-valley, brand-killer
- ❌ Hyperframes-generated "stock-style" b-roll without BrandConfig — violates [[design-preferences]] no-AI-slop rule
- ❌ Codex/Hyperframes-native TTS voiceover — never displace Phill's ElevenLabs professional clone
- ❌ Hyperframes for the Duncan Day-14 reel — wrong tool for the climactic Wow Moment
- ❌ Lucide-style icon packs that Hyperframes templates default to — custom geometric marks only
- ❌ Marketing-orchestrator dispatch to Hyperframes — single composition path discipline

---

## THE ONE WIN this week

Spend 2 hours on Friday in a Hyperframes sandbox folder (`~/codex-hyperframes-sandbox/`), build the **Vectal.ai-style "website-to-animated-product-pitch" one-shot** against `unite-group.in`. If the output is genuinely 80% there in one prompt, port the *technique* (auto-screenshot-then-animate) into [[remotion-composition-builder]] as a new composition type called `WebsiteIntroReel`. Win = one new Remotion composition type, not a Hyperframes dependency.

## THE ONE TRAP to avoid

Letting Hyperframes touch the Duncan Day-14 reel or any portfolio brand video. The "insane arbitrage" framing in the transcript is bait — it produces visually-impressive but brand-untokenised output. Shipping that to Duncan / Toby / a paying client would burn the [[design-preferences]] reputation moat in a single send. **Forbid in `remotion-orchestrator` and `marketing-social-content` skills explicitly.**

## Open question for Phill (max 1)

Do you want to bet 2 hours this Friday testing whether Hyperframes' one-shot website-to-pitch demo is genuinely better than the Remotion-skill route for *prospect outbound*, knowing the answer is most likely "no, but the technique is portable"?

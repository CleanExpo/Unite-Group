---
type: wiki
updated: 2026-05-11
---

# System-Introduction Opportunities — 2026-05-11 Source Batch

Scan output across the 14-source batch landed in `Sources/Completed/` 2026-05-11. Filters: does this introduce a primitive into AIP / Pi-CEO swarm / Margot / MCP / portfolio repos that we don't already run? Ranked by leverage, not novelty.

## Concrete opportunities (top 5)

### 1. Claude HTML Slides skill → adopt across portfolio
**Source:** `Claude HTML Slides = The NEW Powerpoint Killer (Full Tutorial).md`
**What:** Install the `zarazhangrui/frontend-slides` skill globally; teach it each business's DESIGN.md so every Margot research output, board memo, investor deck, and CCW client-facing deliverable ships as a branded HTML slide deck (animated, dynamic charts, F11 presenter mode) instead of PDF or PowerPoint.
**Why:** Replaces Gamma ($/month, generic look) and PowerPoint (no brand voice). Slides become a wave-plan output of the marketing-orchestrator and ceo-board skills. Compounds DESIGN.md investment we already made.
**Cost:** 1 agent-hour to install the skill + per-brand HTML mock; ongoing zero. Phill action: pick first deck to test (suggest investor-update format from exit-thesis numbers).
**Path D check:** Yes — pure skill, lives in `~/.claude/skills/` and `~/Pi-CEO/Pi-Dev-Ops/skills/`. Unaffected by Foundry migration.

### 2. DESIGN.md awesome repo → seed each portfolio repo's `.claude/DESIGN.md`
**Source:** `Your AI UI Looks Generic… This Fixes It (DESIGN.md).md` + `Google's New DESIGN.md Just Changed Claude Design Forever.md`
**What:** Pull a starter DESIGN.md from `github.com/VoltAgent/awesome-design-md` for each of the 6 active portfolio brands (ra, dr, nrpg, carsi, ccw, synthex, unite-hub) — drop into each repo's `.claude/DESIGN.md` so Claude Code, Claude Design, Cursor, and v0 all read the same brand spec. Run Google's open-source DESIGN.md CLI lint (catches contrast bugs + orphan tokens) in CI for each repo. The remotion-brand-codify skill already writes `.design.md` files at `Synthex/packages/brand-config/src/brands/{slug}.design.md` — this aligns the wider repo with that spec.
**Why:** Today each repo has implicit brand drift between Claude Code and Claude Design output. DESIGN.md is the brand contract enforced by AI agents on every screen. Aligns with [[design-system-approach]] and the existing remotion-brand-codify workflow.
**Cost:** 1 agent-hour per repo × 8 repos = 1 day to roll out. Tooling: clone awesome-design-md once, adapt, commit. Lint step adds <2s to CI.
**Path D check:** Yes — DESIGN.md files live in source repos, independent of where the action runtime lives.

### 3. Cal Rueb (Anthropic Applied AI) internal workflow patterns → graduate into our Pi-CEO playbook
**Source:** `This Anthropic Engineer Uses Claude Code Differently Than Everyone Else.md`
**What:** Codify five Anthropic-internal patterns we're not running consistently: (a) escape-twice to roll back a session, (b) auto-accept mode (`shift-tab`) for trusted loops, (c) `@filename` references inside `claude.md` to pull other context, (d) think-between-tool-calls now native — explicitly prompt "think hard" before debugging passes, (e) multi-Claude orchestration via a shared `ticket.md` file. Add these to `claude-code-guide.md` Hidden Cities section.
**Why:** Each is a measurable productivity unlock on existing surface — no new infra. Anthropic engineers run 4 Claudes simultaneously via shared markdown handoffs; the agency-blueprint roster already implies this pattern. Closes the gap between our documented workflow and Anthropic's internal one.
**Cost:** 0.5 agent-hour to update [[claude-code-guide]]. Phill action: nil.
**Path D check:** Yes — workflow doc, repo-resident, Foundry-neutral.

### 4. DataForSEO Claude skill (zubair-trabzada/dataforseo-claude) → cross-check against current seo-audit
**Source:** `Claude Now Does SEO Audits (FREE + Better Than Agencies).md`
**What:** Audit the public `zubair-trabzada/dataforseo-claude` GitHub repo against our internal seo-audit / seo-quick / seo-rankings / seo-content / seo-backlinks / seo-technical skill suite. Identify any of its 13 commands that we don't have, or where its prompt engineering beats ours. Cherry-pick + merge into our DataForSEO skill family. Otherwise discard.
**Why:** Our seo-audit skill already runs weekly with $49,320 Semrush units + DataForSEO. The video is "not news" — but a public repo with battle-tested prompts may have edges we missed (PDF rendering, client-deliverable layout, 5-agent fan-out pattern). Net: small leverage but cheap to inspect.
**Cost:** 1 agent-hour to git-clone + diff against `~/Pi-CEO/Pi-Dev-Ops/skills/seo-*`. Phill action: review delta if any.
**Path D check:** N/A — skill internals, no AIP/Foundry coupling.

### 5. Cal Rueb's headless Claude Code SDK + GitHub Actions pattern → Pi-CEO swarm hook
**Source:** `This Anthropic Engineer Uses Claude Code Differently Than Everyone Else.md`
**What:** Anthropic uses Claude Code SDK headlessly inside GitHub Actions. We already do this via Pi-Dev-Ops swarm. Action: audit our 19 Hermes cron jobs against Anthropic's "sprinkle in coding agent anywhere" pattern — specifically (a) commit/PR message generation for every PR (cheap quality win), (b) large-codebase-migration pattern (4plan integration into RestoreAssist is exactly this), (c) `PostToolUse` hook → Hermes cron bridge confirmed live, look for under-used trigger surfaces.
**Why:** Tightens our existing autonomous SDLC. No new system; just plug an under-used Anthropic primitive into existing jobs. Closes a known gap in [[autonomous-sdlc]].
**Cost:** 1 agent-hour audit + per-job patches.
**Path D check:** Yes — SDK calls compose around either Supabase action_log (today) or Foundry Logic functions (future); same hook surface.

## Discarded — interesting reading, no system hook

| Source | Why discarded |
|---|---|
| `9 Tools To Vibe-Design Like The Top 1%.md` | Verbatim duplicate of the May 8 `9 Free Tools To Vibe-Design…` video — all 9 tools (Open Design, Refero, Impeccable, Emil, Kittl, Design Spells, SVGL, Cult UI, Untitled UI) already in [[design-system-approach]]. No new primitive. |
| `Build software better, together.md` | GitHub homepage stub (524 bytes). No content beyond cookie banner. |
| `Claude Code $50k Website Made Easy.md` | Vibe-coding tutorial: copy-style from godly.website → drop into Claude Code → add hero video. Tactical, not strategic — duplicates the day-shift/night-shift pattern we already document in [[claude-code-guide]]. The "screenshot full page via DevTools" trick is mildly useful but a one-liner. |
| `Featured.md` | Apple developer documentation landing page (samples + WWDC25). Reference link only; no extractable substrate beyond what RA-2117 already cites. |
| `GitHub Marketplace tools to improve your workflow.md` | Marketplace browse page snapshot — lists Render, LovableBot, OpenCode, Linear, CodeRabbit, Azure Pipelines. We already use Linear + Vercel; CodeRabbit and Render duplicate Anthropic-internal review + Vercel deploys. No gap. |
| `How Much Does it Cost to Scale an App to 100,000 Users?.md` | FastAPI + Postgres + Locust scale test ending at 100k users / ~$200/mo. Our portfolio is all Vercel-native + Supabase RLS — different cost curve. Useful as a once-only sanity reference (added one line to [[budget-constraints]]); no system hook. |
| `How to Fix Apple Store Billing Problem - Fix App Store Billing Error.md` | iPhone Settings tutorial — Screen Time → Content & Privacy → enable in-app purchases. Consumer fix, not developer/business. |
| `OpenManus The Free Open Source Manus AI Agent You Can Run Locally.md` | OpenManus is a local-first agent framework (MetaGPT team, MIT, 56k stars, GRPO research track). Substrate-wise it competes with Claude Code + our Pi-CEO swarm. Direction-of-stack contradiction (see "Contradictions" section below) — discarded as system primitive, but flagged. |
| `Why Apps Get Rejected from the App Store - Common Reasons & How to Avoid Them (2026).md` | Strong reference, but RA-2117 (App Store pre-flight checklist) already captures the 7 categories (Metadata, Privacy, UI/UX, Performance, Min Functionality, IP, IAP). No new line items. |

## Backlog (deferred, revisit Q3)

- **Claude HTML Slides cross-product mock library** — once concrete opportunity #1 is shipped, build a slide-component library (Anthropic, Apple, Figma, Spotify, Wise mocks were all one-shot in the video). Per-business deck templates × 6 brands.
- **Sevalla as a deploy substrate** (from the scale-cost video) — we run Vercel + Railway today; Sevalla isn't a replacement. Park.
- **OpenManus as local fallback** — if Anthropic Max ever rate-limits us hard, OpenManus + Ollama is a known escape hatch. Don't build for it; just remember it exists.

## Contradictions surfaced

- **OpenManus local-agent thesis vs. our Anthropic-Max-first thesis.** OpenManus advocates running the same agent loop locally on free-tier Grok or Hyperbolic. Our [[gemma4-cost-strategy]] already explicitly bets the other direction: paid Claude Opus 4.7 for board-level work, Gemma 4 only for high-volume cheap tasks. The video is consistent with that — Open Manus' own author notes "smaller free models give worse results." No re-think needed; logged for completeness.
- **9-tools video re-pitches Refero / Open Design / Impeccable** as net-new. They're not. We adopted them May 8. The wiki is ahead of the source feed here.

## Cross-refs

[[index]] · [[design-system-approach]] · [[claude-code-guide]] · [[aip-architecture]] · [[tech-drops-q2-2026]] · [[autonomous-sdlc]] · [[seo-linkable-assets]] · [[mcp-ecosystem]] · [[creator-radar]] · [[gemma4-cost-strategy]]

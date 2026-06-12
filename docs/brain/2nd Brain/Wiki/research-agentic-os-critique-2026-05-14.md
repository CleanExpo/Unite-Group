---
type: wiki
updated: 2026-05-14
---

# Research: Agentic OS Critique + Mobbin MCP (2026-05-14)

Cross-reference of two May-2026 source documents against Phill's current Claude Code setup. Both sources sit in `Sources/` and are immutable.

- [[Your Claude Code Agentic OS Sucks]] — Chase AI, 2026-05-14 (`Sources/Your Claude Code Agentic OS Sucks.md`)
- [[Mobbin's MCP changes how we design in Claude Code]] — Lukas Margerie, 2026-05-13 (`Sources/Mobbin's MCP changes how we design in Claude Code.md`)

## 1. "Your Claude Code Agentic OS Sucks" — verdict summary

The author's core thesis: builders are spending all their time on **fancy dashboards and command centers** instead of on the thing that actually drives value — **a skill and automation backbone** (source L45-47). Dashboards are a "facade"; what's behind them is where the money is made (source L141-145). A strong agentic OS has three parts, in priority order: (1) the skill/automation backbone, (2) the memory layer, (3) the dashboard — and the dashboard "only makes sense once we've locked all that in" (source L47-53).

The recommended pattern: **codify everything you do day-to-day as a skill** rather than re-prompting Claude as "a slightly better ChatGPT" every session (source L65-72). Use the **skill-creator skill** to AB-test each new skill against the no-skill baseline so you only keep skills that actually move outputs toward determinism (source L69-73). Combine related tasks into **higher-order workflow skills** — the author's "content cascade skill" downloads a transcript, writes a blog post, a LinkedIn post, an X post, and posts them via Playwright, all behind one skill name (source L75-79). For each skill, decide on-demand vs routine; for routines, default to **local automations** unless you have a clear cloud reason (source L93-99).

Named tools / structures the author proposes: **Karpathy RAG / Obsidian vault layout** (raw → wikis → outputs, source L107-117); **master index files at every folder level** so Claude can navigate 5,000+ documents efficiently (source L111-117); **skill-creator skill** for codifying + AB-testing (source L69-71); **GWS CLI + standard claude.ai MCP connectors** for Gmail/Calendar/Drive as a 30-second productivity win (source L89-93); **Streamlit web-app dashboard** for distribution to non-technical clients vs **Obsidian-embedded command center** for solo operators (source L121-139). The author does NOT cite `/goal` or `agents.md` by name in this transcript — those are not in this source.

## 2. Anti-patterns the author identifies

- **Dashboard-first building.** Why it's bad: you build the facade before the engine; without a skill backbone the dashboard is "some fancy nonsense" (source L141). Better: ship skills + memory first, then the dashboard on top.
- **Using Claude Code as a slightly-better ChatGPT.** Why it's bad: every session re-prompts the same workflows; outputs stay non-deterministic (source L65-71). Better: codify each repeated workflow as a named skill so it executes from a single word.
- **Cloning mega skill repos ("awesome claude skills").** Why it's bad: "looking for a diamond in the rough" instead of building the few skills that match your actual day-to-day (source L85-89). Better: walk through YOUR day, extract YOUR skills, customize.
- **Treating Obsidian as RAG / a knowledge graph.** Why it's bad: Obsidian "isn't doing anything special to all these markdown files… no vector database, not a true knowledge graph" (source L103-107). Better: use Obsidian purely as an organization layer with index files.
- **No master index files.** Why it's bad: "have fun figuring that out when you're 5,000 documents deep" — both you AND Claude lose token efficiency without folder-level indexes (source L111-117). Better: index.md at every folder level acting as a table of contents.
- **Defaulting to cloud automations.** Why it's bad: cloud runs are capped, don't have access to your CLIs/skills/files, and Anthropic is pulling back on headless `-p` runs (source L93-99, L145-153). Better: local automations unless there's a specific reason for cloud.
- **One big monolithic CLAUDE-as-chatbot loop.** Why it's bad: the same tasks run unbenchmarked, non-deterministic, untestable (source L67-73). Better: skill-creator AB tests skill vs no-skill so only net-positive skills survive.
- **Not splitting solo-operator vs distribution dashboards.** Why it's bad: Obsidian-embedded is ergonomic but awful to distribute; Streamlit is distributable but loses the integrated terminal — picking the wrong one for your context wastes the build (source L121-139). Better: solo = Obsidian dashboard; team/client = Streamlit web app.

## 3. Phill's current setup audit — strengths + weaknesses

Cross-referenced against `~/.claude/CLAUDE.md`, `~/.claude/projects/-Users-phill-mac-2nd-Brain/memory/MEMORY.md`, `~/.claude/skills/` (73 skills present), and the 8 active LaunchAgents (`com.pi-ceo.*` + `ai.hermes.*`).

### Doing RIGHT per the source

- **Skill backbone is real and broad.** 73 custom skills under `~/.claude/skills/` covering marketing (`marketing-orchestrator`, `marketing-copywriter`, `marketing-icp-research`), video (`video-director`, `video-cinematographer`, `video-sound-designer`), SEO (`seo-audit`, `seo-content`, `seo-backlinks`), client ops (`client-portal-provision`, `stripe-milestone-invoice`, `sow-draft`), and infrastructure (`curator-security-unknown`, `curator-deployment-unknown`). This is exactly the "codify your day-to-day" pattern the source advocates (source L65-79).
- **Higher-order workflow skills exist.** `marketing-orchestrator` reads brief → classifies → emits wave-plan JSON → dispatches sub-skills in topological order. `video-director` runs Phase 1 brief intake → dispatches the full production team. These are the source's "content cascade" pattern, but multi-business (source L75-83).
- **Memory layer is structured, not blob.** `MEMORY.md` is a proper index with 40+ typed entries (project_, feedback_, decision_, incident_, metric_, playbook_, reference_) — closer to the Karpathy index-file pattern than to a single dumping ground (source L107-117).
- **Local-first automations.** All 8 LaunchAgents are local (`ai.hermes.gateway`, `com.pi-ceo.linear-trigger`, `com.pi-ceo.sources-watcher`, `com.pi-ceo.wiki-sync`, etc.). No cloud headless runs to worry about (source L93-99).
- **Obsidian used as organization layer, not RAG.** Brain-1 wiki has `Wiki/index.md` as table-of-contents, `Wiki/log.md` for history, frontmatter conventions enforced in `CLAUDE.md` — exactly the source's prescription (source L103-117).

### Doing WRONG per the source

- **`~/.claude/CLAUDE.md` is the Karpathy template verbatim with zero personalization.** All four rules (Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution) are word-for-word the Karpathy default. No mention of Phill's portfolio, no skill invocation rules, no memory-read protocol, no wiki-first directive — which means Claude has to rediscover those from `MEMORY.md` every session. The auto-memory carries the context, but the global `CLAUDE.md` does not lock the operating model in.
- **Skill discoverability gap.** 73 skills is enormous; the author warns about exactly this problem with "awesome claude skills" mega-repos — Claude (and Phill) can't easily find the right one (source L85-89). There's no top-level `skills/index.md` mapping intent → skill. Skills are discovered via system-reminder names only.
- **No evidence of skill-creator AB testing.** The source's central recommendation is to AB-test each skill against the no-skill baseline (source L69-73). Nothing in `MEMORY.md` or the playbooks shows skill benchmarks. Some skills may be net-negative drag and we wouldn't know.
- **Wiki index file is present but uneven across folders.** `Wiki/index.md` exists at the top level (excellent), but `Sources/`, `Synthex-Brain-2/`, and subfolders like `Wiki/decisions/` don't all carry their own master index. At today's volume (~80+ wiki pages) we're fine; the source warns this falls apart at 5,000 documents (source L111-117).
- **No command center / dashboard yet — but the redesign proposal is in flight.** [[command-center-redesign-proposal-2026-05-14]] and PR-50 are building the visual layer. Per the source, this is sequenced correctly (backbone first, then dashboard), but the author would say the design ambition (Astro UXDS / Iron Man HUD references) is exactly the "fancy command center" trap if it consumes weeks while the skill layer still has gaps (source L45-49).

## 4. Mobbin MCP — what it is

Mobbin is a design-reference library of "hundreds of thousands of screenshots of interfaces" for mobile apps and websites (Mobbin source L11-14). Their MCP server, launched mid-May 2026, exposes a **single tool — `search_screens`** — that lets Claude Code, Cursor, Codex, or Lovable pull UI references inline during a design session (Mobbin source L75-79). Use cases the launch page advertises: analyse successful design patterns, explore best practices, pull what top apps are doing right now, build moodboards for a niche, do component-level deep dives, run pattern/trend research, do color/typography studies, and run critique/audits against best-in-class references (Mobbin source L71-83). Audience: anyone designing with AI coding tools who today writes "make me a hero section" prompts blind and gets generic output. **Pricing per the source: $15/month quarterly, $10/month annually (~$120/year)** (Mobbin source L73-75).

## 5. Mobbin MCP — Phill's fit

**Verdict: conditional yes, with strict guardrails.** Phill's design rules in [[feedback-design-preferences]] are explicit: no Lucide / no generic icons, custom geometric marks derived from the Unite-Group hexagon, no AI slop, real logos embedded, Gun Metal `#0e1014` + Candy Red `#b30000` locked. Mobbin's whole pitch is **inspiration / mood-boarding from existing apps** — which collides with two of those rules if used naively. The video itself demonstrates the failure modes: AI-generated logos that look "very AI generated" (Mobbin source L107-109), generic SVG placeholders instead of the real brand (Mobbin source L127-129), Google Fonts substituted for custom paid fonts (Mobbin source L127-131). These are exactly the AI-slop outputs Rule 3 forbids.

**Where Mobbin would actually help the in-progress command center redesign** ([[command-center-redesign-proposal-2026-05-14]] + PR-50): the redesign brief anchors on Astro UXDS, The Expanse/Rocinante UI, Jayse Hansen's Iron Man HUD, and Linear's information density. Mobbin's `search_screens` would let Claude pull **real mission-control / FUI / dense-information dashboards** from the corpus rather than the design team describing them in prose. Specifically: (a) the "running / blocked-on-you / done" three-state pattern can be cross-checked against how Linear, Datadog, and Bloomberg actually render those states; (b) the KPI-strip + log-ticker + working-canvas grid can be sourced from actual fintech / SRE / trading dashboards instead of theorized; (c) the radial-expander wow-factor element from the Iron Man HUD anchor can be researched against Mobbin's animated-navbar / hero-section corpus. **The hard constraint: Mobbin output is REFERENCE ONLY — never copy a layout, never use generated logos, never substitute fonts. Geometric marks stay custom, real logos stay embedded, tokens stay locked.** $120/year is trivial against the redesign labor cost; the leverage is real if the guardrails hold.

## 6. Karpathy CLAUDE.md — source reference

WebFetch of `https://github.com/multica-ai/andrej-karpathy-skills` confirms the template's four rules:

1. **Think Before Coding** — state assumptions, surface tradeoffs, ask when unclear.
2. **Simplicity First** — minimum code, no speculative features, no abstractions for single-use code.
3. **Surgical Changes** — touch only what's needed, match existing style, don't refactor what isn't broken.
4. **Goal-Driven Execution** — transform tasks into verifiable goals; "give it success criteria and watch it go".

**Phill's current `~/.claude/CLAUDE.md` covers all four rules — verbatim.** It is literally the Karpathy template installed unmodified (sections 1-4 match word-for-word). That's the floor. What it does NOT add is the layer above the Karpathy floor: Phill-specific operating context (which businesses exist, which skills to prefer, wiki-first protocol, no-Slack rule, secrets-handling rule, design-preferences). Those live in `MEMORY.md` auto-memory, which means Claude only sees them after the memory loads — not in the global system prompt. This is salvageable in two ways: either promote the load-bearing memory rules into `~/.claude/CLAUDE.md` directly, or rely on the auto-memory pipeline being reliable (which it currently is).

## 7. Concrete recommendations for Phill

Ranked by leverage (highest first):

1. **Personalize `~/.claude/CLAUDE.md` beyond the Karpathy floor.**
   - File: `~/.claude/CLAUDE.md`
   - Time: 30 minutes
   - Lift: Every Claude Code session starts with the load-bearing operating rules in the system prompt, not buried in auto-memory. Append a "Phill-specific operating context" section: portfolio business names, wiki-first protocol, no-Slack rule, secrets-handling rule, design-preferences pointer, skill-routing hints. Keep the four Karpathy rules above it as the floor.

2. **Build a skill index — `~/.claude/skills/index.md`.**
   - File: new `~/.claude/skills/index.md` (or skills router skill)
   - Time: 2 hours
   - Lift: 73 skills is past the threshold where Claude reliably picks the right one from name alone. An intent→skill map (e.g. "client wants invoice" → `stripe-milestone-invoice`; "produce social post" → `marketing-social-content`; "video brief" → `video-director`) cuts wrong-skill invocations and gives Phill a printable cheat sheet. Per source L85-89, this is the antidote to skill-sprawl.

3. **Run skill-creator AB benchmarks on the top-10 most-used skills.**
   - Files: `~/.claude/skills/{top-10}/SKILL.md` benchmarks block + new `wiki/skill-benchmarks-2026.md`
   - Time: 1 day (parallel via `parallel-delegate`)
   - Lift: The source's central claim is that skills move outputs toward determinism — but only if they actually beat the no-skill baseline (source L69-73). Benchmarking the top 10 (`marketing-orchestrator`, `video-director`, `client-portal-provision`, `stripe-milestone-invoice`, `seo-audit`, `ceo-board`, `wiki-ingest`, `empire-status`, `pm-core`, `brand-guardian`) catches any net-negative drag and validates the skills layer Phill is already paying complexity tax on.

4. **Install Mobbin MCP, scope it to the command-center redesign only, $120/year.**
   - Files: `.mcp.json` or per-project MCP config, plus a `frontend-design` skill update calling out Mobbin
   - Time: 30 minutes install + tested in next design session
   - Lift: Direct fuel for PR-50 and [[command-center-redesign-proposal-2026-05-14]] — pull real mission-control / Linear-density / Bloomberg-grid references instead of describing them in prose. **Guardrail: reference only, never copy; geometric marks stay custom; real logos stay embedded; Gun Metal + Candy Red tokens locked.** Per Mobbin source L73-75, pricing is trivial.

5. **Add folder-level index.md files at the next scale tier.**
   - Files: `Wiki/decisions/index.md`, `Sources/index.md`, `Synthex-Brain-2/Wiki/index.md`
   - Time: 1 hour
   - Lift: Currently fine at ~80 wiki pages; source warns this fails silently at 5,000 (source L111-117). At the empire's growth rate (40+ memory entries added in last 7 days), we'll hit the threshold inside 6 months. Cheap preventive fix now.

---

**Source-of-truth links:**
- `/Users/phill-mac/2nd Brain/2nd Brain/Sources/Your Claude Code Agentic OS Sucks.md` (Chase AI, 2026-05-14)
- `/Users/phill-mac/2nd Brain/2nd Brain/Sources/Mobbin's MCP changes how we design in Claude Code.md` (Lukas Margerie, 2026-05-13)
- `https://github.com/multica-ai/andrej-karpathy-skills` (Karpathy CLAUDE.md template, WebFetched 2026-05-14)
- [[command-center-redesign-proposal-2026-05-14]] (in-flight target for Mobbin fuel)
- [[feedback-design-preferences]] (the seven locked design rules — Mobbin guardrails)

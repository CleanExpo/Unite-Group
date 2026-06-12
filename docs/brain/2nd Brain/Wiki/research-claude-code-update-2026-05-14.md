---
type: wiki
updated: 2026-05-14
---

# Claude Code Update Research — `/goal`, Cowork, Codex Video

Source ingest of three documents added 2026-05-14:
- `Sources/Claude Code goal Just Dropped and it Can Build Literally Anything.md` (Build Great Products, Chris Ashby — 2026-05-14)
- `Sources/Claude Cowork Deep Dive Live Artifacts, MCP Connectors, Dispatch and Remote Control.md` (Dominik Fretz, Claude Ambassador AU — recorded 2026-04-30)
- `Sources/Codex can now make videos… it's insane.md` (David Ondrej — 2026-05-09)

---

## 1. `/goal` — what it actually is

`/goal` is a new Claude Code (and Codex CLI) slash command that **sets a completion condition** and then keeps Claude looping turn-after-turn until that condition holds. Per the official docs paraphrased on the source: "the `/goal` command sets a completion condition and Claude keeps working with it without you prompting each step. After each turn, a small fast model checks whether the condition holds and if not, Claude starts another turn instead of returning control to you. The goal clears automatically once the condition is met" (`Claude Code goal…md` L68). Anthropic copied the design directly from OpenAI's Codex CLI `/goal` — same mechanic, same lifecycle, same sub-commands (`Claude Code goal…md` L18, L46, L62). It composes with **auto mode**, which grants the agent permission to call tools without per-call human approval (L74), enabling 30-min to multi-hour autonomous runs.

How it differs from regular Claude Code prompting: regular prompting is **turn-based** — Claude completes one response and waits for the next human prompt. `/goal` inverts that: a small fast checker model evaluates the goal condition between turns and the agent self-continues. This is "an evolution of the Ralph loop" (L70) — what Phill and others have been bolting on manually via wrapper scripts is now first-class. The shift: you stop prompting individual features and instead define a **measurable end state** the agent drives toward unattended ("instead of just prompting back and forth, we're allowing the AI agent to decide what all of these different tasks are based on a longer-running goal" — L208).

## 2. `/goal` — best-practice writing pattern

Five rules distilled from the source (`Claude Code goal…md` L74-L86):

1. **One measurable end state** — "good conditions for goals are going to have one measurable end state" (L74). Not "make it good", not "improve X". A binary check the small model can evaluate after every turn.
2. **Bigger than one prompt, smaller than open backlog** — "a good goal is bigger than one prompt but smaller than an open-ended backlog" (L82). Sized for hours, not weeks.
3. **Define what to achieve, what to change, how to validate, when to stop** — "it should define what codeex should achieve, what it should change, how it should validate progress and when it should stop" (L82).
4. **Codex/Claude must know "what done means" before starting** — "the important part is that codeex should know what done means before it starts. So this means we do have to be very specific about that end condition for the goal" (L82).
5. **Up to 4000 chars; include constraints (what NOT to touch)** — "the condition here can be up to 4,000 characters" (L80). "Add in constraints that actually matter… anything that must not change on the way there. An example of that would be that we don't want to touch a specific type of file or a specific part of the project" (L80).

Exact `/goal` syntax demonstrated in the source (L102):

```
/goal build the complete app outlined in docs/prd.md following the tasks on product-roadmap.md until all of the tasks on the program are complete and verified. Use design.md for the front end design direction. This is a fresh nextjs app build.
```

Author's stronger meta-prompt template at L86: `implement plan.md creating tests for each milestone and verifying the output with playwright interactive` — note the **verify-each-milestone** pattern that prevents drift.

## 3. `/goal` — operational requirements before invocation

Required prep, per the source (`Claude Code goal…md` L54-L100):

- **PRD-equivalent spec doc** — `docs/prd.md` with architecture, integrations, design tokens (L54, L106).
- **`product-roadmap.md` with 40-80 checkboxes** — "these road maps for a full application tend to be between 40 to 80 tasks throughout a road map" (L78). The author's example had **62 tasks across 6 phases** (L106). Every checkbox flips to `[x]` and the small-model checker validates that as the completion signal.
- **`docs/design.md` if UI work** — author follows "the open-source format from Google for design.md files" (L98). Image references → design direction in markdown. Beats inline design guidance because it survives context truncation.
- **Karpathy-style `CLAUDE.md` (or `AGENTS.md`) at repo root** — "the four kind of [Karpathy] rules for claude.md and agents.md… something that I use quite frequently in projects just to reduce coding errors from coding agents" (L94). Source: `https://github.com/multica-ai/andrej-karpathy-skills` (L26).
- **`auto mode` enabled** — "this also works with auto mode which is a feature in claude code and codeex which basically gives more permissions to the agent in order to continue working without constantly asking you" (L74). Without auto mode, every tool call breaks the loop with a permission prompt and the agent stalls.

Optional but recommended:

- Start with `/plan` first to get a verifiable plan committed before `/goal` kicks off (L88).
- For credentials-light projects: tell the agent to "scaffold everything with stops and mocks in memory data… at every integration point" and wire envs after (L116).

## 4. `/goal` — concrete script for Phill's overnight queue tonight

Phill's queued work (all four streams):

- CCW + CARSI audit Waves B–E (plan at `/Users/phill-mac/pi-seo-workspace/unite-group/docs/superpowers/plans/2026-05-14-ccw-carsi-overnight-rana-handoff.md`; Wave A discovery already running)
- Command Center PR-2 (Zone 3 agent topology)
- Command Center PR-3 (Zones 4 + 5 — Business 360 + activity log)
- Rollup Cluster 1 (cost-migration commits from `feat/internal-pivot-2026-05-11` → clean PR to `main`)

Literal command Phill types in his next Claude Code session:

```
/goal Complete all four queued workstreams in /Users/phill-mac/pi-seo-workspace/unite-group and /Users/phill-mac/Pi-CEO. Definition of done: (1) CCW+CARSI audit Waves B-E executed per docs/superpowers/plans/2026-05-14-ccw-carsi-overnight-rana-handoff.md with each wave's artefacts committed to wiki/audits/ and a Linear ticket opened per finding; (2) Command Center PR-2 Zone 3 agent topology merged-ready — branch pushed, CI green, PR opened, design.md zone-3 checkboxes all flipped to [x]; (3) Command Center PR-3 Zones 4+5 Business 360 + activity log merged-ready — same gates as PR-2, all checkboxes in zones 4 and 5 of design.md flipped to [x]; (4) Rollup Cluster 1 — extract cost-migration commits from feat/internal-pivot-2026-05-11 into a new branch chore/cost-migration-rollup, rebased on main, CI green, PR opened with clean conventional-commit history. Validation between waves: run npm test and tsc --noEmit; do not advance to the next workstream until the previous wave's CI passes. Constraints — do NOT touch the /empire route or any file under app/empire/**; do NOT merge any PR without CI green (opening the PR is the stop, human review is the merge gate); do NOT bypass 2FA in Stripe — if a Stripe flow requires 2FA, pause and write a wiki/log.md entry instead; do NOT delete pre-existing dead code; surgical changes only per CLAUDE.md rule 3. Stop condition: all four workstreams report PR-open or wave-complete to wiki/log.md AND CI is green on every opened PR AND there are no uncommitted changes anywhere. Persist progress every wave to wiki/log.md so the run is resumable if interrupted.
```

Character count: ~2050 (well under the 4000 limit). All five rules from Section 2 honoured: measurable end state (PRs open + CI green + checkboxes flipped + log entries), constraints explicit (empire route, CI, 2FA, dead code, surgical-only), validation cadence defined (between waves), stop condition unambiguous.

## 5. Claude Cowork — what's new

From `Claude Cowork Deep Dive…md`:

- **Live Artifacts** (L112-L154) — artifacts that pull live data from MCP connectors and auto-refresh, instead of static one-shot renders. Demo built a synthetic e-commerce dashboard auto-refreshing every 5s against a Python MCP server "all in Cowork" (L142). Workflow shift: dashboards stop being throwaway and become long-running internal tools you talk to.
- **MCP Connectors** (L128-L138) — Cowork can connect to Gmail, Google Drive, custom databases, or any service exposing an API via a custom MCP server. Dom built his own e-commerce-store MCP from a single prompt inside Cowork (L120, L150). "It's fairly easy to create an MCP for your own business" (L138).
- **Dispatch** (L174-L190) — send commands to your always-on desktop from your phone. Phone connects via Anthropic relay to a daemon on the desktop; the desktop executes against whatever it's locally connected to (Slack, browser, files). Requires the desktop to stay awake (L186-L190). No history available on mobile (L210-L214).
- **Scheduled Routines** (L168-L172) — cron-like recurring prompts. Name, description, prompt, project context, cadence (hourly / daily / weekdays / weekly). Example: "every morning give me an update of what happened in the customer support channel" (L170).
- **Remote Control (`/rc`)** (L252-L268) — share a running Claude Code instance across devices via SSH + tmux. Run `/rc` inside a Claude Code session, then attach from your laptop/phone elsewhere on the same VPN (ZeroTier in Dom's setup). Combined with tmux it survives laptop closure (L264-L268).
- **Computer Use in desktop app** (L74-L82) — now available on Windows + macOS desktop apps, not just browser. Lets Claude drive the OS, click into proprietary apps, fix OS-level issues. Token-heavy because every step screenshots+analyses (L320-L322).

How each lands in Pi-CEO swarm at `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/`:

- **MCP Connectors** → drop a new MCP under `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/mcp/portfolio_health/` exposing Supabase portfolio-health reads (board_mandates, ci_status, hour-1 SLA from `metric_hour1_provisioner_sla`) so Margot and the Board personas can read live state instead of re-querying via Bash each session. This collapses the Margot context-refresh cycle from manual `margot-align` invocations to an always-live connector pull.
- **Dispatch + Scheduled Routines** → migrate the existing Hermes cron jobs at `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/hermes_dispatch.py` into Cowork scheduled routines where appropriate (per `feedback_model_routing_max_first` — keep load-bearing cron in Hermes/Anthropic-API, move display/digest crons to Cowork to free Anthropic-API budget). Caveat: per `feedback_no_slack`, never route a Cowork digest to Slack.

## 6. Codex video — what's new

From `Codex can now make videos… it's insane.md`:

- **Model / pipeline** — Codex 5.5 with the **Hyperframes plugin** (HeyGen-owned), released 2026-05-08 with the "HTML in canvas" feature. Codex writes plain HTML/CSS/JS; Hyperframes renders the timeline to MP4 at `localhost:3000`. Requires the `canvas-draw-element` Chrome flag enabled (`Codex…md` L67). Run on Codex 5.5 with `auto-review` mode and medium-fast speed (L41-L45). Renders take 2–15 min per composition typically; can run 40+ min when the agent over-iterates (L191-L199). Connects to ElevenLabs for voice + SFX (L31).
- **Vs Remotion (Phill's current stack)** — architecturally **identical**: both are code-driven motion-graphics composers writing HTML/React → MP4. Hyperframes is HeyGen's bet that Remotion-style composition wins over diffusion video (Sora, Veo) for marketing assets. Hyperframes' edge: one-shot website-to-product-pitch demo (Vectal.ai example, L182-L185) — genuinely faster than the current `remotion-composition-builder` for that niche. Hyperframes' weaknesses (already documented in `research-codex-video-generation-2026-05-14.md`): no BrandConfig token system, no Supabase/Linear delivery integration, no type-safety, will emit AI-slop palettes by default.
- **Slot into Video Agency at `~/.claude/skills/video-*/SKILL.md` or sandbox?** — **Sandbox**, do NOT integrate into the Video Agency skill pack. The prior decision memo `Wiki/research-codex-video-generation-2026-05-14.md` (sections 3-5) already resolved this with a four-lens verdict (CMO / CTO / CFO / Brand-Guardian all rejected integration). The new Ondrej source **does not change that verdict** — the new examples (3D iPhone, audio waveform, vectal.ai product label) are still un-tokenised brand-unsafe output and would burn the `feedback_design_preferences` no-AI-slop rule if shipped to Duncan/Toby/any paying client. The earlier memo's "THE ONE WIN this week" still stands: 2-hour Friday sandbox in `~/codex-hyperframes-sandbox/`, build the Vectal-style one-shot against `unite-group.in`, then port the *technique* (auto-screenshot-then-animate) into `remotion-composition-builder` as a new `WebsiteIntroReel` composition type. Do not adopt the dependency.

Cross-reference: [[research-codex-video-generation-2026-05-14]] holds the load-bearing verdict; this entry is the corroboration after a second source on the same tool.

## 7. Top 3 actionable changes this week

Ranked by expected leverage (highest first):

1. **Adopt `/goal` for the overnight queue tonight**
   - Change name: replace manual multi-prompt orchestration with the Section 4 `/goal` command + `auto mode`
   - File/system to touch: `/Users/phill-mac/pi-seo-workspace/unite-group/CLAUDE.md` (verify Karpathy rules in place); `/Users/phill-mac/pi-seo-workspace/unite-group/docs/product-roadmap.md` (ensure 40-80 checkboxes for the four workstreams); enable `auto mode` in the session before running
   - Time-to-implement: 30 min prep (roadmap checkbox audit) + the overnight run itself
   - Expected lift: collapses the four-workstream queue from "interactive with Phill stepping in" to "fire-and-forget overnight"; aligns with `feedback_make_calls_not_questions` (decisions delegated) and `feedback_autonomous_mandate` (overnight autonomy granted)

2. **Stand up a portfolio-health MCP connector inside Pi-CEO swarm**
   - Change name: build `portfolio_health` MCP server so Margot + Board read live Supabase/Linear state via Live Artifacts instead of re-querying every session
   - File/system to touch: new directory `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/mcp/portfolio_health/` with a Python MCP exposing `get_mandate_status`, `get_ci_status`, `get_hour1_sla` reads; register in Cowork connectors
   - Time-to-implement: 2-3 hours (Dom built his demo MCP in one prompt; this is a real one with auth + Supabase client)
   - Expected lift: collapses Margot's manual `margot-align` weekly cycle into an always-live read; unblocks Board personas from re-discovering state each deliberation

3. **Friday 2-hour Hyperframes sandbox — port one technique, NOT the dependency**
   - Change name: validate the website-to-product-pitch one-shot on `unite-group.in`, then port the technique into a new Remotion composition `WebsiteIntroReel`
   - File/system to touch: scratch dir `~/codex-hyperframes-sandbox/` for the experiment; on success, new composition file at `/Users/phill-mac/Pi-Dev-Ops/remotion-studio/src/compositions/WebsiteIntroReel.tsx` + skill update at `~/.claude/skills/remotion-composition-builder/SKILL.md` to register the new type
   - Time-to-implement: 2 hours sandbox + 2 hours port = 4 hours total this Friday
   - Expected lift: one new reusable Remotion composition (covers prospect-outbound product pitches across all 6 portfolio brands), zero new vendor dependency, brand-token discipline preserved — matches `feedback_quality_over_quantity` and the existing Codex-video memo's verdict

---

## Recommendation

Run the Section 4 `/goal` command tonight on the overnight queue — it's the highest-leverage adoption of all three sources and matches the autonomy mandate already in play. Section 7 ranks the follow-ups for this week. Before firing the `/goal`, audit `docs/product-roadmap.md` to confirm the four workstreams have explicit checkboxes the small-model checker can verify against — without that, the goal has no measurable end state and the loop won't terminate cleanly.

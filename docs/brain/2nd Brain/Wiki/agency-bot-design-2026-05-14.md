---
type: wiki
updated: 2026-05-14
---

# Agency Bot — "Pilot" — Design Spec

Internal-only Telegram bot for Phill McGurk that runs 24/7, autonomously generates suggestions toward the $2B-by-2028 goal per [[master-plan-2b-by-2028-v3]], and asks Phill via Telegram with one-tap inline-keyboard buttons. Adopts Magnus Mueller's "Agency" pattern from the Browser Harness podcast (`Sources/Browser Harness, Clearly Explained (and how it 10x'd my agent).md`). Internal-only; not a product surface. Per [[feedback-no-slack]] Telegram is the channel; per [[feedback-secrets-handling]] tokens live in `~/.hermes/.env`; per [[feedback-no-repeating-alerts]] cadence is bounded.

## 1. Headline

The single biggest acceleration lever for the $2B pathway is *agent-prompts-Phill* rather than *Phill-prompts-agent*. Today Margot answers when called; Pilot prompts. Every 30 minutes during waking hours, Pilot ranks the highest-leverage next action against the ATIA pathway ([[master-plan-2b-by-2028-v3]] §3.2), composes a ≤80-char headline with 5 metadata fields, and ships it to Phill's private Telegram chat with 6 inline-keyboard buttons. Phill swipes; Pilot executes, defers, or learns. Halt-gate caps unanswered queue at 3 to prevent the group-chat-fatigue failure mode Magnus called out at `Sources/Browser Harness…md:282-287`. Pattern lift is verbatim; substrate is Phill's existing ContextBot platform per memory `[[project-contextbot-platform]]` and Pi-CEO swarm under `~/Pi-CEO/Pi-Dev-Ops/`.

## 2. Magnus's "Agency" pattern — verbatim extraction

Patterns lifted directly from the transcript with line citations. All quotes verbatim.

### 2.1 The 24/7 box

`Sources/Browser Harness…md:64-66`: *"the interface is telegram okay so I can message it from my phone and now I just tell it like my higher level goal for example make my startup successful how it looks like here basically the the flow is you first kind of connect some of your services okay with one click for some Gmail or Slack or notion linear GitHub wherever you have your contacts and your data and then you get like one of those boxes okay this is like just a machine which runs 24/7 for you."*

Pilot adaptation: the "24/7 box" is the existing Pi-CEO Mac Mini continuous compute loop per [[master-plan-2b-by-2028-v3]] §4.2 + Hermes cron substrate per [[hermes-agent]]. No new box required.

### 2.2 Connected services

`Sources/Browser Harness…md:66-68`: *"In here you can log in with with codeex or with cloud code. Then you connect telegram and then you can message your own cloud code instance or whatever harness you use from here."*

Pilot adaptation: Phill's stack does NOT replicate Magnus's external service list. Pilot connects to Gmail (Composio, `phill.mcgurk@gmail.com` per memory `[[reference-composio-connections]]`), Linear (Composio + MCP), GitHub (gh CLI + MCP), Supabase Pi-CEO corpus tables (`wiki_pages`, `telegram_messages`, board mandates), wiki at `~/2nd Brain/2nd Brain/Wiki/`, and the Margot deep-research queue. **NO Slack** per [[feedback-no-slack]] — Magnus's Slack reference is the one part of the pattern that does not transfer.

### 2.3 Loop trigger cadence

`Sources/Browser Harness…md:66-68`: *"now that I have everything connected, I basically just tell this agent run in a in a loop for me. Check every half an hour and make me suggestions what you should do for me."*

Pilot adaptation: 30-minute loop, 08:00–22:00 AEST, off-hours quiet per [[feedback-no-repeating-alerts]] + Phill's don't-pressure-bedtime preference. Hermes cron entry, single-shot per cycle, halt-gate enforced before send.

### 2.4 High-level goal seed

`Sources/Browser Harness…md:94-99`: *"the high level goal yeah I mean what should be a high level goal make my startup successful and then just agent and give me ideas and make it easier for me to understand."*

Pilot adaptation: the goal seed is [[master-plan-2b-by-2028-v3]] verbatim — ATIA umbrella + 6 verticals + 8-quarter pathway from $300K (Q3 2026) → $200M (Q2 2028) → $2B exit at 10× SaaS multiple. Every suggestion ranks against which pillar it advances.

### 2.5 Suggest-and-swipe UX

`Sources/Browser Harness…md:78-79`: *"the interface is just like Tinder basically just like swiping. Okay. Yes, do this for me. No, don't do this. It's it's it's very magical."*

And `Sources/Browser Harness…md:83-85`: *"I started with Telegram because it has already hundred of things in build. It's super super nice to go fast."*

Pilot adaptation: Telegram inline-keyboard with 6 buttons (Magnus showed 2; Phill's 6 are richer — see §3).

### 2.6 Sell-to-me loop

`Sources/Browser Harness…md:96-99`: *"now I need to prompt my agent that it should try to convince me why its idea is important. So it needs to tell me how much impact will this have on my goal and it kind of needs to try to negotiate with me and it its goal is that I click accept, right? So it tries to sell and make it super easy for me to understand."*

Reinforced at `Sources/Browser Harness…md:290-292`: *"It needs to convince me that its idea is useful. And like it if a friend of you or if I pitch you my here my next idea, you just don't care."*

Pilot adaptation: every suggestion includes the $2B-impact tag + a `🎯 Why this` button that shows the goal-impact analysis pulled from [[master-plan-2b-by-2028-v3]] line refs.

### 2.7 Forum-topics-as-sessions

`Sources/Browser Harness…md:208-209`: *"in Telegram, I have different topics in a forum and those different topics are just different agent sessions. I can use slashcloud or slashcodex to switch."*

Pilot adaptation: Pilot uses a single private chat with Phill for v1, NOT a forum. Multiple topics queued as v2 if Phill wants per-vertical lanes (PM-ATIA / PM-Restoration / PM-Carpet / PM-IEP / PM-Plumbing / PM-HVAC / PM-PressureWashing — one topic each). Out of scope for the v1 ship.

### 2.8 Skill database / preference memory

`Sources/Browser Harness…md:176-178`: *"in my case it stores it all in a skill database so it remembers your preferences and remembers oh you don't you don't care about your GitHub PRs but you care more about distribution or let me suggest let me create your video and then ask you should I post this video on X for you and I just click yes."*

Pilot adaptation: Supabase-backed `pilot_preferences` table — every button press logged. `🚫 Never` triggers a class-block (the suggestion fingerprint blocks future surfacing). `❌ Not now` defers 24h. Modify actions train Pilot's composer.

### 2.9 Codex rename anecdote — proof of autonomous suggest → act loop

`Sources/Browser Harness…md:84-92`: *"my co-founder complained in Slack that Codeex uses browser use as a name inside Codex. It's confusing. Okay. Now agency here it's BC monitors my Slack and everything. So it suggested me, hey, I just saw that your co-ounder complained. Should I DM the Codex team on on X and on on email if they can change your name? Yes, let's do it. Right. So it found out, oh this pyite person who worked on pyite before um is now in the codex team and and send him an email. Hey, this is like a little bit confusing. Can you rename? Two days later, he he sends back, oh yeah, let me let me talk to the team."*

Pilot adaptation: the analogous Pilot move is "PR #226 (cherry-pick worker-introductions) has been green 18h, no merges yet — should I merge?" or "Toby returns from holiday in 4 days; should I draft the CCW Mon 26 May 10am AEST agenda from his last 3 message threads?" — agent surfaces the connection, Phill swipes yes.

### 2.10 Burrito anecdote — purchase-with-screenshot-then-swipe

`Sources/Browser Harness…md:21-23`: *"Yesterday, we were climbing and I thought, 'Oh, guys, do you want boritos later?' So, I just go to Telegram and say, 'Okay, order me five burritos.' Send me a screenshot. Okay, I liked it. I say buy and it buys me for me."*

And reinforced at `Sources/Browser Harness…md:212-214`: *"yesterday we were climbing the climbing gym and I thought oh guys do you want burritos later for for dinner I said yes so I just go telegram and say okay order me five burritos and say send me a screenshot um before you buy so that I see that it's correct right so it goes does the things I keep climbing comes back sends me the screenshot of the of the card I say okay I liked it I say buy and it buys me for me."*

Pilot adaptation: for any *action-with-side-effect* suggestion (sending an email, merging a PR, drafting a Stripe invoice), Pilot generates a preview artifact (drafted email text, PR diff summary, invoice line items) attached to the suggestion message. `✅ Do it` only fires after Phill sees the preview.

### 2.11 Magnus's own correction — the spam-fatigue failure mode

`Sources/Browser Harness…md:282-287`: *"my AI started to suggest me things which I don't care about and then I just started to ignore it. It's like a group chat where you get hundreds of messages, you just ignore the entire group chat. … And so I basically started to prompt it. Agency, it's my agent's called agency. Your goal is that I accept as many of your ideas as possible. If you send me too many, I will just ignore it. If your thing is too long, my context is little, I will just ignore you. Make it extremely easy, understandable, and useful to me."*

Pilot adaptation: this single correction is the most important design constraint. Three concrete guardrails:
1. **Halt-gate at 3 pending.** If 3 unanswered suggestions are in queue, Pilot pauses new suggestions until Phill catches up.
2. **≤80-char headlines.** Hard cap. Composer truncates and re-spins if it exceeds.
3. **System-prompt-locked goal:** Pilot's composer carries the verbatim quote from `Sources/Browser Harness…md:286-287` as a hard-pin in its system context.

### 2.12 — 2FA-live-view halt pattern (lifted from bux)

Source verified 2026-05-15 via WebFetch of `https://github.com/browser-use/bux/blob/main/install.sh`. The `install.sh` itself does not produce the live-view URL; it consumes a `BU_BROWSER_LIVE_URL` env var sourced from `~/.claude/browser.env` written by the `bux-browser-keeper.service` systemd unit. The lift-able pattern is the contract, not the install line:

| Component | Responsibility | Pilot mapping |
|---|---|---|
| Keeper process | Watches the browser session; when CDP reports a navigation to a known 2FA host or a `input[autocomplete="one-time-code"]` selector, calls Browser Use Cloud `/live/<session>` to mint a live-view URL; writes it to `~/.hermes/pilot_live_view.env` as `PILOT_LIVE_VIEW_URL=...` | New keeper script `swarm/bots/pilot_live_view_keeper.py` (Phase 2) |
| Agent loop | On every tool call, sources `~/.hermes/pilot_live_view.env`; if `PILOT_LIVE_VIEW_URL` non-empty, halts the tool, posts the URL to Phill's Telegram (`PILOT_CHAT_ID` from `~/.hermes/.env`) with a `🔓 I unlocked it` button, polls the file until the keeper clears the var (or 15-min timeout escalates to Margot) | Pilot suggestion engine §3 |
| Telegram message shape | "**Pilot needs you** — 2FA wall on `<host>`. Live view: `<URL>` — tap `🔓 I unlocked it` when done." Single-shot per session per `[[feedback-no-repeating-alerts]]` | Pilot composer §3.2 |
| Timeout | 15 minutes default. On timeout: emit `pilot.2fa.timeout` Linear ticket + escalate to Margot per `[[feedback-autonomous-mandate]]` — not Phill | Escalation rule |
| Secrets | All file paths under `~/.hermes/`. Keeper reads Browser Use Cloud key from `op item get "Browser Use Cloud" --fields api_key` per `[[feedback-secrets-handling]]` — never paste, never `.env.local` echo | Keeper init |

**The contract is the lift, not the code.** Pilot's Phase 2 keeper is a 30-line Python script that does CDP-event-driven URL minting; bux's keeper is a 50-line bash systemd unit. Same shape, different substrate.

**Sunset clock:** if Anthropic ships native browser-session live-view (the bux README claims absorption inside 12 months — `[[board-deliberation-browser-harness-2026-05-14]]` Knife 1), the keeper deletes; the contract stays as the cloud-fallback path.

Cross-refs added: `[[board-deliberation-browser-use-org-2026-05-15]]` · `[[research-browser-use-org-2026-05-15]]` §2.12 · `[[pm-synthesis-browser-use-org-2026-05-15]]` Fork 4.

## 3. Phill's adapted architecture

| Element | Value |
|---|---|
| Bot identity | **Pilot** (working name; see §6 for fork) |
| Cadence | 30-min loop, 08:00–22:00 AEST |
| Quiet window | 22:00–08:00 AEST — no new sends; queue drains if Phill is awake |
| Halt-gate | 3 pending unanswered → pause new suggestions |
| Inline keyboard | 6 buttons (below) |
| Chat | Private chat between Pilot bot and Phill (chat_id in `~/.hermes/.env`) |
| Connected data sources | Gmail (Composio) · Linear (Composio + MCP) · GitHub (gh + MCP) · Supabase Pi-CEO corpus · `~/2nd Brain/2nd Brain/Wiki/` · Margot research queue |
| $2B goal feed | [[master-plan-2b-by-2028-v3]] §3.2 quarterly milestones + §5 PM specs + §6 next-14-days actions + §9 quarterly OKRs |
| Storage | Supabase `pilot_suggestions` + `pilot_preferences` in the existing Unite-Group project (`lksfwktwtmyznckodsau`) |
| Kill switch | `PILOT_DISABLED=1` env var stops the cron, mirroring the `TAO_SCREEN_DISABLED=1` pattern from [[computer-use-integration-2026-05-13]] |

### 3.1 The 6 inline-keyboard buttons

Each suggestion message ends with this keyboard, two rows of three:

| Row 1 | ✅ Do it | 🎯 Why this | 🔄 More context |
| Row 2 | 📝 Modify | ❌ Not now | 🚫 Never |

Semantics:
- **✅ Do it** — Pilot executes the action. For non-side-effect actions (post a wiki page, log a Linear comment) Pilot runs directly. For side-effect actions (send email, merge PR, dispatch a Senior Agent, draft a Stripe invoice) Pilot dispatches to the responsible bot (PM-* / Margot / Board) per the dispatch table in [[pi-ceo-architecture]] and emits a follow-up Telegram message with the artifact for Phill's second-swipe confirmation per the burrito pattern (§2.10).
- **🎯 Why this** — Pilot replies inline with the $2B-impact analysis: which pillar of [[master-plan-2b-by-2028-v3]] this advances, the wiki line refs, and the projected delta on the current quarter's OKRs from §9.
- **🔄 More context** — Pilot replies inline with the suggestion provenance: which wiki page / Linear ticket / Margot research / Gmail thread it originated from, with verbatim quotes ≤200 chars.
- **📝 Modify** — Pilot opens a free-text reply prompt; Phill types an adjustment ("scope to CCW only", "defer to next week", "draft for Toby not Coutis"); Pilot re-spins and re-sends.
- **❌ Not now** — defers 24h. Re-surfaces with a `(re-surfaced)` badge.
- **🚫 Never** — blocks the suggestion class permanently (fingerprint by category + source pattern); learned to `pilot_preferences`; never suggested again.

### 3.2 Suggestion message format

Every Pilot message is structured. Composer enforces this shape:

```
[Headline ≤80 chars]

🎯 Pillar: <one of: ATIA Meta | Restoration | Carpet | IEP | Plumbing | HVAC | Pressure-Washing | CARSI | Tier-2 Infra | Margot | Wiki>
⚙️ Effort: <XS / S / M / L>
📂 Source: <wiki | linear | margot | gmail | github | agent-derived>
🔮 Confidence: <LOW | MED | HIGH>

[Inline keyboard]
```

Hard limits: total body ≤500 chars including headline and 4 metadata lines.

### 3.3 Connected data — read-only by default

Pilot's loop is read-mostly:
- Linear: read open issues, stale PRs, in-flight epics. Write only on `✅ Do it`.
- Gmail: read inbox metadata (sender, subject, date, snippet). NEVER read body content into the suggestion message unless the suggestion is "respond to this thread" and Phill explicitly opens via `🔄 More context`.
- GitHub: read PR + issue state via gh CLI. Stale-PR heuristic: green for ≥48h with no merge.
- Supabase wiki_pages / wiki Markdown at `~/2nd Brain/2nd Brain/Wiki/`: read for context grounding.
- Margot research queue: read pending + completed deep-research items as suggestion seeds.

Write actions are dispatched, not direct — Pilot is a router, not an executor for side-effect work.

## 4. Suggestion taxonomy

What kinds of suggestions Pilot makes. Each category gets 1–2 example messages.

### 4.1 Revenue

Specific outreach to a named lead. Specific upsell. Specific pricing test. Example:

```
Bulcs proposal in flight 5 days — Ivi hasn't replied. Nudge today?

🎯 Pillar: IEP (NIEPA founding wedge)
⚙️ Effort: XS
📂 Source: gmail
🔮 Confidence: HIGH
```

### 4.2 Build

Ship X by Y. PR Z is stale → merge or close. Finish half-built feature W. Example:

```
PR #226 (worker-introductions) green 18h, awaits merge. Merge now?

🎯 Pillar: Tier-2 Infra (autonomy gate prereq)
⚙️ Effort: XS
📂 Source: github
🔮 Confidence: HIGH
```

### 4.3 Distribution

Publish content. Respond to inbound PR/issue. Reach out to a named influencer. Example:

```
Magnus Mueller agency pattern speccs done — DM him re: Browser Harness pilot?

🎯 Pillar: Restoration (Wave 7 competitive-intel moonshot seed)
⚙️ Effort: S
📂 Source: agent-derived (from board-deliberation-browser-harness)
🔮 Confidence: MED
```

### 4.4 Operations

Close stale Linear ticket. Fix broken cron. Acknowledge a Margot critical alert. Example:

```
Hermes cron `meta_curator` errored 3× last 24h — review logs?

🎯 Pillar: Tier-2 Infra
⚙️ Effort: S
📂 Source: agent-derived (Hermes audit)
🔮 Confidence: MED
```

### 4.5 Strategic — Board-routed, not Pilot-executed

Decision-required forks. These never go through Pilot's `✅ Do it` directly. Pilot surfaces and dispatches to Pi-CEO Board per [[pi-ceo-architecture]]. Example:

```
Fork 2 (ATIA naming) blocks Q3 2026 slope. Open Board deliberation?

🎯 Pillar: ATIA Meta
⚙️ Effort: M (Board cycle)
📂 Source: wiki (master-plan-2b-by-2028-v3 §7)
🔮 Confidence: HIGH
```

## 5. Worked example sequence — 3 messages

Three real-looking messages Pilot would surface today. Verbatim shape.

### 5.1 Build

```
Ship CCW Stripe webhook before Mon 18 May 10am AEST.

🎯 Pillar: Tier-2 Infra (CCW retainer SLA)
⚙️ Effort: M
📂 Source: linear (CCW-CRM#190 INDEX)
🔮 Confidence: HIGH

[✅ Do it]  [🎯 Why this]  [🔄 More context]
[📝 Modify] [❌ Not now]   [🚫 Never]
```

### 5.2 Distribution

```
Reach out to Magnus Mueller re: Browser Harness pilot scope.

🎯 Pillar: Restoration (Wave 7 moonshot — competitive intel)
⚙️ Effort: S
📂 Source: agent-derived (board-deliberation-browser-harness-2026-05-14)
🔮 Confidence: MED

[✅ Do it]  [🎯 Why this]  [🔄 More context]
[📝 Modify] [❌ Not now]   [🚫 Never]
```

### 5.3 Operations

```
Close stale PR #49 (security batch 2b) — green 4 days, no merge.

🎯 Pillar: Tier-2 Infra
⚙️ Effort: XS
📂 Source: github
🔮 Confidence: HIGH

[✅ Do it]  [🎯 Why this]  [🔄 More context]
[📝 Modify] [❌ Not now]   [🚫 Never]
```

## 6. Bot-name decision fork

Three candidates. Phill picks via reply to Margot or to the first Pilot test message.

| Name | Rationale | Where it sits |
|---|---|---|
| **Pilot** (recommended default) | Connotation = guidance, navigation, partnership; aligns with $2B = a journey. Single syllable, neutral. Margot stays the voice; Pilot is the prompter — clean role separation. | `@PiPilotBot` |
| **Compass** | Goal-direction metaphor; "the swarm has compasses" reads naturally. Slightly more passive than Pilot — points the way rather than asks for action. | `@PiCompassBot` |
| **2B** | Direct reference to the goal. Cheeky, memorable. Risk: too on-the-nose externally if accidentally shared; Pilot is internal-only so this risk is bounded. | `@Pi2BBot` |

**Recommendation: Pilot.** Lives best alongside Margot in Phill's mental model (Margot speaks; Pilot prompts). Compass is too passive for the suggest-and-swipe motion. 2B reads as a marketing-pitch leak risk even internally.

## 7. Sequencing — when Pilot is allowed to ship

Per [[board-deliberation-browser-harness-2026-05-14]] §9 CEO Synthesis: *"No engineering work in the next 14 days. PM-ATIA scaffolding + Forks 2 and 6 ratification take the window."*

Pilot's implementation plan at `docs/superpowers/plans/2026-05-14-agency-bot-pilot.md` respects that. Phase 1 (bot mint + ContextBot registry extension) is light-touch and lives on the ContextBot substrate per memory `[[project-contextbot-platform]]` — that is Phill's existing surface, not new engineering on a portfolio repo. Phases 2-4 (suggestion engine + goal feed + telemetry) are sequenced AFTER [[autonomy-gap-audit-2026-05-14]] items #1-3 close, matching the Board's gate.

Pilot also respects the [[incident-botfather-rate-limit-2026-05-14]] guard — Phase 1 mints at most 1 bot (`@PiPilotBot`) and verifies the 23h BotFather window has cleared before firing.

## 8. Cross-refs

[[master-plan-2b-by-2028-v3]] · [[project-contextbot-platform]] · [[research-browser-harness-pm-synthesis-2026-05-14]] · [[board-deliberation-browser-harness-2026-05-14]] · [[pi-ceo-architecture]] · [[hermes-agent]] · [[autonomy-gap-audit-2026-05-14]] · [[computer-use-integration-2026-05-13]] · [[reference-composio-connections]] · [[reference-composio-workaround]] · [[feedback-no-slack]] · [[feedback-no-repeating-alerts]] · [[feedback-secrets-handling]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-autonomous-mandate]] · [[feedback-design-preferences]] · [[incident-botfather-rate-limit-2026-05-14]] · [[exit-thesis]] · [[wave-roadmap]] · [[agency-hierarchy]] · [[founder]]

## Recommendation (1-sentence headline)

**SHIP Pilot in 4 phases** — Phase 1 (bot mint + ContextBot registry extension) executes immediately on the existing ContextBot substrate; Phases 2–4 (suggestion engine + $2B-goal feed + telemetry) sequence AFTER [[autonomy-gap-audit-2026-05-14]] items #1–3 close, per the Board's 14-day no-engineering gate.

---
type: wiki
updated: 2026-05-15
---

# Agency Tinder Game — Client Framework — Design Spec

Productized multi-tenant version of Magnus Mueller's "Agency" swipe-tinder pattern from `Sources/Browser Harness, Clearly Explained (and how it 10x'd my agent).md`. Every Unite-Group client gets a white-labeled Telegram bot that proposes ranked next-actions toward **their** business goal (not Phill's $2B) and asks via 6-button inline keyboard. Sibling product of the internal Pilot bot ([[agency-bot-design-2026-05-14]]) — same UX, same composer, different tenant + different goal-seed. Substrate is the existing ContextBot platform per `[[project-contextbot-platform]]`. Per `[[feedback-no-slack]]` Telegram is the channel; per `[[feedback-secrets-handling]]` tokens live in `~/.hermes/.env`; per `[[feedback-no-repeating-alerts]]` cadence is bounded; per `[[feedback-botfather-hardwire-2026-05-15]]` no `/newbot` attempts before 14:00 AEST today.

## 1. Headline

Pillar 2 of `[[master-plan-2b-by-2028-v3]]` (Synthex/agency-retainer revenue) needs a productized retainer-lever. The Agency Tinder Game is that lever: a swipe-yes/no Telegram bot, white-labeled per client, that runs 24/7 on the client's connected services and prompts the *client* with ranked suggestions toward their stated business goal. Same 6-button UX as the internal Pilot. Different goal-seed (captured Stage 3 Discovery). Different tenant (RLS-isolated in Supabase). Different cadence (per-client timezone). Bundled into the Synthex retainer tier or sold standalone. The 14-day demo-reel ([[duncan-perkins-playbook-2026-05-14]]) becomes a swipe-yes-no live demo. The Hour-1 provisioner per `[[metric-hour1-provisioner-sla]]` provisions the bot row (mint deferred per Phase 2). The first three tenants are Phill (client-0 dogfood), Duncan (Otto), and CCW (Toby). At $400/mo blended ARPU on the standalone tier × 50 tenants by Q4 2026 = $240K/yr ARR — a real Pillar-2 contribution, not noise.

## 2. Magnus pattern extraction (verbatim, with line citations)

All quotes verbatim from `Sources/Browser Harness, Clearly Explained (and how it 10x'd my agent).md`.

### 2.1 Tinder swipe yes/no flow

`L78-79`: *"the interface is just like Tinder basically just like swiping. Okay. Yes, do this for me. No, don't do this. It's it's it's very magical."*

Tenant adaptation: white-labeled inline-keyboard preserves the 6 buttons (✅ Do it · 🎯 Why this · 🔄 More context · 📝 Modify · ❌ Not now · 🚫 Never). Bot footer reads "Powered by Unite-Group" — the bot identity is the client's brand.

### 2.2 Parallel sessions via Telegram forum topics

`L83-85`: *"I started with Telegram because it has already hundred of things in build. It's super super nice to go fast, you know, to give this in people's hand to see is this useful and if it's super useful, then I can later change the interface like to an app to have more control, maybe more like Tinder like it's amazing then."*

Tenant adaptation: V1 = one private chat per client (single goal-lane). V2 = forum topics if the client wants multiple goal-lanes (e.g. Toby could have a "Carpet retail" topic and a "Wholesale wax" topic). V2 is out of scope for the productization phase.

### 2.3 High-level goal seed

`L94-99`: *"the high level goal yeah I mean what should be a high level goal make my startup successful and then just agent and give me ideas and make it easier for me to understand."*

Tenant adaptation: the goal-seed is **client-supplied** during Stage 3 Discovery of `[[playbook-client-onboarding-7stage]]`. Capture template asks the client to fill: *"My business succeeds when ___, measured by ___, within ___."* Stored in `client_goals.goal_seed` (Supabase per-tenant RLS). Every suggestion ranks against this.

### 2.4 Sell-to-me loop — agent must convince why

`L96-99`: *"now I need to prompt my agent that it should try to convince me why its idea is important. So it needs to tell me how much impact will this have on my goal and it kind of needs to try to negotiate with me and it its goal is that I click accept, right? So it tries to sell and make it super easy for me to understand."*

Reinforced `L290-292`: *"It needs to convince me that its idea is useful. And like it if a friend of you or if I pitch you my here my next idea, you just don't care. You don't give a except if I manage to tell it to you in a way that you actually care about it."*

Tenant adaptation: every suggestion carries a `🎯 Why this` button. On press, composer replies with the client-goal-impact analysis: which pillar of the client's stated goal-seed this advances, the projected effect on their stated KPI, and source provenance.

### 2.5 Skill database / preference memory

`L176-178`: *"in my case it stores it all in a skill database so it remembers your preferences and remembers oh you don't you don't care about your GitHub PRs but you care more about distribution or let me suggest let me create your video and then ask you should I post this video on X for you and I just click yes."*

Tenant adaptation: per-tenant `client_preferences` table in Supabase. RLS-scoped — Toby's `🚫 Never` decisions never affect Duncan's bot. The class-block fingerprint (category + source pattern) is per-tenant.

### 2.6 Forum-topics-as-sessions

`L208-209`: *"in Telegram, I have different topics in a forum and those different topics are just different agent sessions. I can use slashcloud or slashcodex to switch."*

Tenant adaptation: V1 single-chat. V2 forum-topic per goal-lane. The data model supports multiple `client_goals` rows per tenant from day 1; only the UI exposes one at v1.

### 2.7 Spam-fatigue guard

`L282-287`: *"my AI started to suggest me things which I don't care about and then I just started to ignore it. It's like a group chat where you get hundreds of messages, you just ignore the entire group chat… If you send me too many, I will just ignore it. If your thing is too long, my context is little, I will just ignore you. Make it extremely easy, understandable, and useful to me."*

Tenant adaptation: halt-gate at **3 pending unanswered per tenant**. ≤80-char headlines. ≤500-char total body. Composer truncates and re-spins if it exceeds. Quote `L286-287` is hard-pinned in the per-tenant composer system prompt.

### 2.8 Codex rename anecdote — autonomous suggest → act loop

`L84-92`: *"my co-founder complained in Slack that Codeex uses browser use as a name inside Codex. It's confusing. Okay. Now agency here it's BC monitors my Slack and everything. So it suggested me, hey, I just saw that your co-ounder complained. Should I DM the Codex team on on X and on on email if they can change your name? Yes, let's do it. … Two days later, he he sends back, oh yeah, let me let me talk to the team."*

Tenant adaptation: per-tenant cross-source linkage. For Duncan/Otto: bot sees a Gmail thread about a competitor name collision and suggests an outreach action. For a Sydney accountancy firm: bot sees a Linear ticket sitting 5 days untouched and suggests a status check with the assignee. Side-effect actions follow the burrito pattern — preview artifact attached, second-swipe confirmation required.

## 3. Client-facing adaptation — dimension table

| Dimension | Internal Pilot ([[agency-bot-design-2026-05-14]]) | Client Tinder Game (this spec) |
|---|---|---|
| Tenant | 1 (Phill) | N clients, RLS-isolated per tenant |
| Goal seed | `[[master-plan-2b-by-2028-v3]]` $2B thesis | Client's goal captured Stage 3 Discovery |
| Data sources | Phill's Gmail/Linear/GitHub/wiki/Margot | Per-client services they connect via OAuth — Gmail, GHL, Stripe, Linear, GitHub, calendar |
| Cadence | 30-min, 08:00–22:00 AEST | Configurable per client, default 30-min, off-hours quiet per client timezone |
| Halt-gate | 3 pending | 3 pending **per tenant** |
| Cost allocation | Phill bears | Bundled in retainer (Synthex tier) or standalone SKU |
| Privacy | Phill's data | Client data — RLS-isolated per tenant per `[[supabase-postgres-best-practices]]` |
| Branding | `@PiPilotBot` Unite-Group internal | White-labeled per client (e.g. `@CCWAgencyBot` "Toby's Agency"); Unite-Group in footer only |
| Suggestion taxonomy | Phill's portfolio (Revenue/Build/Distribution/Ops/Strategic) | Client-specific (next outreach, next product test, next content piece, next ops fix) |
| Kill switch | `PILOT_DISABLED=1` env | `tinder_enabled = false` per-tenant DB column |
| Onboarding | Manual mint by Phill | Hour-1 provisioner (`[[metric-hour1-provisioner-sla]]`) auto-enqueues bot row |

## 4. Multi-tenant architecture

### 4.1 Reuse, don't rebuild

From the internal Pilot spec, lift verbatim:
- 6-button inline keyboard (✅ 🔄 🎯 📝 ❌ 🚫)
- Suggestion message format (headline ≤80 char · pillar · effort · source · confidence)
- Composer system-prompt with `L286-287` hard-pin
- Halt-gate at 3 pending
- Sell-to-me loop (`🎯 Why this` button)
- Preference memory pattern

What's new for multi-tenant:
- Per-tenant DB rows with RLS
- Per-tenant bot identity + token
- Per-tenant goal-seed (free-text from Discovery)
- Per-tenant timezone + cadence
- Per-tenant connected-services subset (some clients won't have GitHub; some won't have Stripe)

### 4.2 Supabase schema (per `[[supabase-postgres-best-practices]]`)

Three new tables in Unite-Group project (`lksfwktwtmyznckodsau`). All RLS-enabled. Service-role can write; per-tenant API keys can read own rows only.

```sql
-- Per-client goal seed
create table client_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references nexus_clients(id),
  goal_seed text not null,           -- "My business succeeds when ___"
  kpi_target text,                   -- "$2k MRR by Sep 2026"
  timezone text default 'Australia/Sydney',
  cadence_minutes int default 30,
  quiet_hours_start time default '22:00',
  quiet_hours_end time default '08:00',
  tinder_enabled boolean default false,  -- KILL SWITCH default OFF
  created_at timestamptz default now()
);
alter table client_goals enable row level security;

-- Per-tenant suggestion queue
create table client_suggestions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references nexus_clients(id),
  goal_id uuid not null references client_goals(id),
  headline text not null check (length(headline) <= 80),
  body text check (length(body) <= 500),
  pillar text, effort text, source text, confidence text,
  status text default 'pending',     -- pending|done|deferred|blocked
  telegram_message_id bigint,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
alter table client_suggestions enable row level security;

-- Per-tenant preference memory
create table client_preferences (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references nexus_clients(id),
  fingerprint text not null,         -- category + source pattern
  decision text not null,            -- 'never' | 'not_now' | 'modify'
  context text,
  created_at timestamptz default now(),
  unique (client_id, fingerprint)
);
alter table client_preferences enable row level security;
```

RLS policy template (one per table):
```sql
create policy "tenant isolation" on client_suggestions
  for all using (client_id = (auth.jwt() ->> 'client_id')::uuid);
```

### 4.3 Per-client bot mint flow

Reuses `[[project-contextbot-platform]]` end-to-end:
1. Hour-1 provisioner sees `checkout.session.completed` webhook.
2. Inserts row into `context_bots` with `kind='client'`, `status='pending_mint'`.
3. `bots/registry` long-poller sees pending row; **DOES NOT mint today** per `[[feedback-botfather-hardwire-2026-05-15]]`.
4. After 14:00 AEST today, the queued mint fires via existing `botfather_minter.py`. Pace ≤5/24h per `[[incident-botfather-rate-limit-2026-05-14]]`.
5. Token written to `~/.hermes/.env` as `CLIENT_<SLUG>_BOT_TOKEN`. Never echoed to chat.
6. Client receives welcome email with `t.me/<bot-username>` link.

### 4.4 Tenant-aware composer

Single composer module (`swarm/pilot/composer.py`) parametrized by `client_id`. The system prompt template loads:
- The client's `goal_seed` from `client_goals`
- The client's `client_preferences` rows (hard filters on `never`)
- The hard-pinned `L286-287` spam-fatigue quote
- The 6-button keyboard definition

Output: one Telegram message + keyboard. Same as internal Pilot, different goal-seed in context.

## 5. Worked example — 3 messages for a hypothetical Sydney accountancy firm

Client: "Coastline Accountants Sydney" (fictional). Goal seed: *"Grow from 40 to 60 retained business clients by end of FY27, measured by signed engagement letters."* Bot: `@CoastlineAgencyBot`. Cadence: 30-min, 09:00–18:00 AEDT.

### 5.1 Outreach suggestion

```
3 leads from last week's tax-time webinar haven't been emailed. Send follow-ups?

🎯 Pillar: Lead conversion
⚙️ Effort: S (3 emails, drafts ready)
📂 Source: gmail (webinar registration list)
🔮 Confidence: HIGH

[✅ Do it]  [🎯 Why this]  [🔄 More context]
[📝 Modify] [❌ Not now]   [🚫 Never]
```

### 5.2 Product / service suggestion

```
SMSF audit demand spiked 40% in your inbox since Apr — package + price page?

🎯 Pillar: New revenue stream
⚙️ Effort: M (2h to draft + publish)
📂 Source: agent-derived (gmail trend analysis)
🔮 Confidence: MED

[✅ Do it]  [🎯 Why this]  [🔄 More context]
[📝 Modify] [❌ Not now]   [🚫 Never]
```

### 5.3 Operations suggestion

```
3 client engagement letters drafted 5+ days, awaiting your signature. Sign now?

🎯 Pillar: Cash collection (signed letters = invoiceable work)
⚙️ Effort: XS (review + sign)
📂 Source: linear (Coastline workspace)
🔮 Confidence: HIGH

[✅ Do it]  [🎯 Why this]  [🔄 More context]
[📝 Modify] [❌ Not now]   [🚫 Never]
```

## 6. Provisioning flow — fits Hour-1 SLA

Stage-by-stage mapping to `[[playbook-client-onboarding-7stage]]`:

| Stage | Tinder-game touchpoint |
|---|---|
| 1 Qualify | None — Tinder game is a Stage-3 artefact |
| 2 Scope | SOW line item: "Agency Tinder bot — standalone $400/mo or bundled in Synthex tier" |
| 3 Kickoff | Stripe deposit clears → Hour-1 provisioner enqueues `context_bots` row + creates `client_goals` row (goal_seed blank) + sends welcome email with bot link **once token minted post-14:00 AEST per `[[feedback-botfather-hardwire-2026-05-15]]`** |
| 4 Discovery | Discovery 12-Q includes goal-seed prompt → fills `client_goals.goal_seed` + KPI target. `tinder_enabled` flipped `true` only AFTER goal_seed populated AND shadow-run ≥50 suggestions complete per `[[feedback-substrate-change-discipline]]` |
| 5 Build sprints | Tinder game runs alongside sprint work; surfaces "approve PR-X" suggestions referencing the client's portal |
| 6 Approval cycles | Tinder game routes "Sign milestone X" suggestions; `✅ Do it` triggers magic-link approval |
| 7 Renew/Expand | QBR includes Tinder game telemetry — accept-rate, top categories, time-saved estimate |

**Hour-1 SLA impact:** the Tinder bot mint counts as artefact #3 (ContextBot row enqueued); per `[[metric-hour1-provisioner-sla]]` it's allowed to stay `pending_mint` until BotFather window clears. So the SLA still holds today — the row lands in <3 min, the actual mint is deferred but does not breach.

## 7. Pricing fork — three options

| Option | Price | Pros | Cons | Board recommendation |
|---|---|---|---|---|
| Bundled in Synthex tier | $0 marginal (Synthex is $2-5K/mo) | Highest attach rate; sells the retainer | Doesn't show up as separate ARR line; no signal on willingness-to-pay | Default for existing Synthex customers |
| Unite-Group standalone | **$400/mo** per tenant | Clean ARR line; tests willingness-to-pay; low-friction upsell to non-Synthex clients | Risk of cannibalising Synthex bundle | **RECOMMEND for new pilots** — Duncan + CCW + Coastline-type firms |
| Free 30-day trial | $0 trial → $400/mo | Maximises pilot count; lowers Discovery friction | Free-trial trap: low-conversion, expensive Hermes credits during trial | Available only on direct Phill approval |

**Board recommendation: Unite-Group standalone at $400/mo, bundle-credit applied automatically for active Synthex retainers (zero double-bill).**

## 8. Five forks for Phill

| # | Fork | Options | Board-recommended |
|---|---|---|---|
| F1 | Productization speed | (a) Ship Phase 1 multi-tenant scaffold this week (no client mints) (b) Wait until 2nd internal-Pilot week of telemetry first | **(a)** — multi-tenant scaffold is design-and-migration work, zero new BotFather risk. Telemetry on internal Pilot continues in parallel. |
| F2 | First external tenant | (a) Duncan (Otto) (b) CCW (Toby) (c) Both simultaneously | **(a) Duncan** — fresh onboarding starting Day-14 demo reel; CCW is in retainer-mode (no fresh goal-seed capture window); both-simultaneously violates `[[feedback-substrate-change-discipline]]` shadow-run discipline |
| F3 | Pricing surface | (a) Add to Synthex tier silently (b) Publish standalone $400/mo SKU on unite-group.in (c) White-label invisibly per-client first, then publish | **(c)** — invisible-first matches `[[feedback-unite-group-only]]` (Unite-Group is internal-operator-tooling, not marketed) and the Synthex public surface stays focused on its current proposition |
| F4 | Goal-seed elicitation | (a) Free-text from Discovery 12-Q (b) Structured template (succeeds-when / measured-by / by-when) (c) Conversational bot-led elicitation in first 3 days | **(b)** — structured template forces specificity; conversational adds Hermes cost and ContextBot dev burden; free-text gives blurry goals and bad suggestions |
| F5 | Shadow-run scope | (a) 50 suggestions log-only per tenant before live (b) 50 suggestions OR 7 days, whichever first (c) 200 suggestions before live | **(b)** — matches `[[feedback-substrate-change-discipline]]` shadow-run discipline + bounds wall-clock so we don't park a tenant forever |

## 9. Cross-refs

[[agency-bot-design-2026-05-14]] · [[project-contextbot-platform]] · [[playbook-client-onboarding-7stage]] · [[metric-hour1-provisioner-sla]] · [[master-plan-2b-by-2028-v3]] · [[duncan-perkins-playbook-2026-05-14]] · [[ccw-holiday-window]] · [[incident-botfather-rate-limit-2026-05-14]] · [[feedback-botfather-hardwire-2026-05-15]] · [[feedback-substrate-change-discipline]] · [[feedback-tight-code]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-no-repeating-alerts]] · [[feedback-design-preferences]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-unite-group-only]] · [[board-deliberation-browser-use-org-2026-05-15]] · [[supabase-postgres-best-practices]] · `Sources/Browser Harness, Clearly Explained (and how it 10x'd my agent).md`

## Recommendation (1-sentence)

**SHIP Phase 1 (multi-tenant scaffold, no BotFather mints) today** — DB migration + tenant-aware composer + per-client config table, zero substrate cost since the bot infrastructure already exists; Phase 2 (Phill as client-0 dogfood) fires once `@PiPilotBot` is minted post-14:00 AEST; Phases 3-4 (Duncan tenant + productization surface) sequence after 50-suggestion shadow-run proves the multi-tenant code path matches the internal Pilot's outputs.

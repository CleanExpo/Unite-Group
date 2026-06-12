---
type: wiki
updated: 2026-05-14
---

# Agentic Agency Flow — Skills & Memory Gap Survey

**Scope:** end-to-end client delivery pipeline (Lead → Discovery → SOW → Stripe → Provisioner → Build → Proof video → Approvals → Recall → Trainer → Renewal). Goal: identify NEW skills + memory sectors that let future Claude sessions deliver client work faster.

**Inventory snapshot:**
- ~60 skills across `~/.claude/skills/`, `~/.hermes/skills/*/`, `~/Pi-CEO/Pi-Dev-Ops/skills/`
- Marketing pack (10), Remotion pack (10), SEO pack (14), Curator gates (3), Empire ops (4), CEO board (1), Vercel plugin, Superpowers plugin, Telegram plugin
- 32 memory entries, 4 categories: `user_`, `project_`, `feedback_`, `reference_`

---

## 1. Skills gap analysis per flow stage

| # | Stage | Existing skill | Verdict |
|---|---|---|---|
| 1 | Lead capture | Telegram plugin + `connector-routing` route inbound, but no skill *classifies* a lead vs noise | **Gap** — needs `lead-triage` |
| 2 | Discovery intake | `ceo-board` (good for decisions, wrong shape); `project_contextbot_platform` memory documents the 12-Q bot — but no skill to RUN the 12-Q script and persist results | **Gap** — needs `discovery-12q` |
| 3 | SOW drafting | None. `duncan-perkins-playbook` wiki + Duncan SOW are one-offs. No skill scaffolds milestone-based ABN-verified SOW | **Gap** — needs `sow-draft` |
| 4 | Stripe billing | None. Live keys exist; Phill wired Nexus manually; nothing reusable | **Gap** — needs `stripe-milestone-invoice` |
| 5 | Hour-1 provisioning | `swarm/inbox/provisioner.py` LIVE — but it's a script, not a skill. No skill *invokes* it correctly from a fresh Claude session | **Partial** — needs `client-portal-provision` thin skill wrapper |
| 6 | Build sprints | `pm-core` (claims tickets); `feature_orchestrator.py`, `fix_orchestrator.py` (swarm); `superpowers:executing-plans`; `qa-lead`; `production-gate`; `opus-adversary`; `codex-adversarial` | **Covered well** — document better in playbook |
| 7 | Weekly Proof Videos | Remotion pack (10 skills); `remotion-render-pipeline` produces MP4 + Telegram. No PR-trigger glue skill | **Partial** — needs `proof-video-on-pr` glue |
| 8 | Magic-link approvals | LIVE in unite-group code. No skill abstracts the signed-hash flow for reuse | **Gap** — but low value (per-project code); skip |
| 9 | Recall.ai meeting capture | Designed (per `duncan-perkins-playbook`), not built. No skill exists | **Gap** — needs `recall-meeting-capture` |
| 10 | Preamble trainer | `preamble_trainer.py` LIVE; `margot-align`, `wiki-ingest`, `empire-status` adjacent | **Covered** — wiki-ingest + margot-align handle daily refresh |
| 11 | Renewal / Expand | None. `ceo-board` could deliberate it, but no QBR-deck skill | **Gap** — needs `qbr-deck` (lower priority — first renewal isn't until Q3) |

### TOP 5 NEW SKILLS — priority order

#### 1. `sow-draft`
- **Description:** `Drafts a milestone-based Statement of Work for a Unite-Group client — verifies ABN/GST via ABR lookup, lays out 5-7 milestones with deliverables and deposit %, outputs Markdown + JSON ready for Stripe billing skill. Use when a brief says "draft SOW", "scope of work", "milestones for {client}", or after discovery-12q completes.`
- **Triggers:** "draft SOW", "scope of work", "write the milestones for", "proposal for {client}"
- **Outline:**
  1. Read `project_{client}` memory + discovery JSON if present
  2. ABR lookup (`abn.business.gov.au`) — verify ABN, GST status, trading name
  3. Generate 5-7 milestones using Duncan playbook template (deposit 30%, paced 14-day cycles)
  4. Emit `sow-{client}-{date}.md` to `~/2nd Brain/2nd Brain/Wiki/` + `sow.json` (machine-readable)
  5. Hand off to `stripe-milestone-invoice` for Payment Link generation
- **Location:** `~/.claude/skills/sow-draft/SKILL.md`

#### 2. `stripe-milestone-invoice`
- **Description:** `Creates a Stripe Customer + Product + Tax Rate (AU GST 10%) + Payment Link for the deposit, plus draft invoices for each remaining milestone. Reads sow.json from sow-draft. Use when a brief says "send invoice", "stripe link", "bill {client} deposit", or hands off from sow-draft.`
- **Triggers:** "stripe invoice", "payment link for {client}", "bill the deposit", "set up billing"
- **Outline:**
  1. Read `sow.json`; pull Stripe live key from 1Password via `op` (never paste)
  2. Idempotent `stripe customers create` keyed on client email; check `project_{client}.stripe_customer_id`
  3. Create Product + Tax Rate; build Payment Link for deposit milestone; draft invoices for remainder
  4. Webhook verification: confirm `checkout.session.completed` webhook target is set
  5. Persist `stripe_customer_id` back into `project_{client}` memory + Linear issue
- **Location:** `~/.claude/skills/stripe-milestone-invoice/SKILL.md`

#### 3. `discovery-12q`
- **Description:** `Runs the 12-question discovery script against a client via their ContextBot (Telegram) — 4 groups (Product Vision / Must-Haves / Wish List / Constraints), persists answers to Supabase portal_content, returns structured discovery.json. Use after Stripe deposit clears, or when brief says "run discovery", "12-Q", "kick off intake".`
- **Triggers:** "discovery for {client}", "12-Q intake", "run intake bot", "start onboarding questions"
- **Outline:**
  1. Resolve `(bot_identity, context)` from `bots.registry` (Supabase) per `project_contextbot_platform`
  2. Queue the 12-Q script via `swarm/inbox/intake_router.py`; one question per turn, no overwhelm
  3. Stream answers to `portal_content` rows; rate-limit to client's reply cadence
  4. On completion, emit `discovery-{client}-{date}.json` + summary wiki page
  5. Trigger `sow-draft` next; single-shot Telegram notify Phill (respects [[no-repeating-alerts]])
- **Location:** `~/.claude/skills/discovery-12q/SKILL.md`

#### 4. `recall-meeting-capture`
- **Description:** `Books a Recall.ai bot into a Google Meet / Zoom invite, receives transcript webhook, runs Gemini 3.1 Pro action-item extraction, files action items as Linear issues against the client's team. Use when a brief mentions "Recall", "meeting capture", "transcribe the call", or a calendar event is created with a client.`
- **Triggers:** "join the call", "capture meeting", "transcribe", "Recall.ai for {meeting}"
- **Outline:**
  1. Resolve client team_id + Linear project from `project_{client}` memory
  2. POST to Recall.ai `/bot` endpoint with meeting URL; persist `recall_bot_id` to memory
  3. Webhook handler ingests transcript; Gemini extracts `{owner, action, due, blocker}` rows
  4. Create Linear issues batch-tagged `source:recall`; attach transcript URL
  5. Telegram single-shot summary to Phill via client's ContextBot
- **Location:** `~/.claude/skills/recall-meeting-capture/SKILL.md`

#### 5. `client-portal-provision`
- **Description:** `Thin wrapper around swarm/inbox/provisioner.py — given a client slug + email, runs the Hour-1 sequence (Linear project + Supabase portal_content + Telegram bot via BotFather + welcome email + Phill ping). Use when a brief says "onboard {client}", "spin up portal for", "provision new client".`
- **Triggers:** "onboard {client}", "spin up portal", "new client setup", after `stripe-milestone-invoice` deposit confirms
- **Outline:**
  1. Validate inputs: client slug (kebab), email, signed-SOW path; refuse if missing
  2. Shell out to `python ~/Pi-CEO/Pi-Dev-Ops/swarm/inbox/provisioner.py --slug {slug}`
  3. Health-check each artifact (Linear project exists, portal row exists, bot polls, email sent)
  4. On any failure, escalate to Board not Phill (per [[autonomous-mandate]])
  5. Single-shot success Telegram with portal URL + bot t.me link
- **Location:** `~/.claude/skills/client-portal-provision/SKILL.md`

---

## 2. Memory taxonomy — 4 new categories

Phill's existing `user_` / `project_` / `feedback_` / `reference_` cover reactive memory. For the Agency Flow, durable procedures + decision logs + incident lessons need their own homes.

### `playbook_` — repeatable procedures
- **Captures:** N-step procedures the agency runs more than once (e.g. client onboarding, SOW drafting, weekly proof-video cadence)
- **READ when:** about to execute a multi-step agency flow that's been done before
- **WRITE when:** a procedure has been executed end-to-end successfully twice
- **Examples:** `playbook_client_onboarding_7stage.md`, `playbook_weekly_proof_video.md`

### `decision_` — durable strategic calls with rationale
- **Captures:** Calls Phill (or Board) made with a "why now / why this / what changes if wrong" trail
- **READ when:** considering revisiting a previously-decided question
- **WRITE when:** Phill or `ceo-board` issues a verdict that future sessions might second-guess
- **Examples:** `decision_recall_ai_over_otter_2026-05-14.md`, `decision_stripe_over_xero_billing.md`

### `incident_` — production-grade lessons from failures
- **Captures:** Something broke; root cause + fix + guard so it doesn't happen again. Distinct from `feedback_` (which is Phill correcting Claude) — `incident_` is system/process failures.
- **READ when:** touching the system that previously broke (e.g. before next provisioner run if last one failed)
- **WRITE when:** post-mortem completes
- **Examples:** `incident_provisioner_botfather_ratelimit_2026-05-14.md`, `incident_stripe_au_payout_7day_hold.md`

### `metric_` — measurable thresholds + benchmarks
- **Captures:** Numbers Claude needs to filter by — "good" landing-page CVR, healthy proof-video duration, Stripe failure rate threshold, SLA per agency stage
- **READ when:** evaluating whether a delivery is on track or needs escalation
- **WRITE when:** Phill establishes or revises a target
- **Examples:** `metric_proof_video_target_3min.md`, `metric_hour1_provisioner_sla_60min.md`

(Considered `artefact_` — rejected; artefacts live in the Wiki + Linear, memory should stay pointer-shaped not blob-shaped.)

---

## 3. Top 3 wins to ship by Friday 16 May

### Win 1 — Write `client-portal-provision` skill
- **Gap:** `provisioner.py` is LIVE but undiscoverable; a fresh Claude session won't know to call it
- **Fix:** `~/.claude/skills/client-portal-provision/SKILL.md` (thin wrapper described above)
- **Speedup:** Cuts ~30 min of Phill explaining the provisioner per new client; unblocks autonomous onboarding the moment Duncan or Ivi signs

### Win 2 — Write `sow-draft` skill + create first `playbook_` memory
- **Gap:** Duncan SOW is a one-off; no template path; ABR verification is manual
- **Fix:** `~/.claude/skills/sow-draft/SKILL.md` + `~/.claude/projects/-Users-phill-mac-2nd-Brain/memory/playbook_client_onboarding_7stage.md` extracted from Duncan playbook
- **Speedup:** Cuts ~45 min per new client (template + ABR + GST flag); makes the `playbook_` category real with one working example

### Win 3 — Write `stripe-milestone-invoice` skill
- **Gap:** Stripe wiring is in Phill's head; live keys exist but no reusable invoke path; biggest risk of cash-friction
- **Fix:** `~/.claude/skills/stripe-milestone-invoice/SKILL.md` (reads `op://` for keys, never asks user to paste — respects [[secrets-handling]])
- **Speedup:** Cuts ~20 min per client + removes the highest-stakes manual step (billing); the moment SOW is signed, deposit Payment Link is sent within 2 minutes

These three chain together — SOW signed → Stripe deposit link sent → deposit clears → provisioner fires. End-to-end Lead-to-Build in one autonomous chain by Friday.

---

## 4. Skip list

- **`magic-link-approval` skill** — Already LIVE per-project code in unite-group; abstracting it as a global skill is premature until 2+ projects share it.
- **`qbr-deck` / renewal skill** — First renewal isn't until ~Q3 (CCW + Duncan both fresh); writing it now is speculative per [[simplicity-first]].
- **`abr-lookup` standalone skill** — Just a function inside `sow-draft`; doesn't justify its own skill.
- **`lead-triage` skill** — Telegram plugin already routes; adding NLP classification is solving a problem Phill doesn't have yet (low inbound volume).
- **`recall-meeting-capture` ahead of Duncan kickoff** — Recall.ai costs ~$0.30/hr but adds an external dependency; defer until first Duncan call is scheduled (post 26 May). Listed as Top-5 because it'll be needed soon, but not in Top-3 this-week wins.
- **`artefact_` memory category** — Artefacts belong in Wiki + Supabase; memory should stay pointer-shaped.
- **Slack-touching skills** — Hard rejected per [[no-slack]].
- **A "lead-capture-from-Slack" path** — Same reason.
- **Rebuilding `pm-core` / `feature_orchestrator`** — Already cover Build sprints well; documenting them in `playbook_` is enough.
- **Per-client memory bloat** — Future clients should go into `playbook_` template, not 50 individual `project_` files.

---

*Signed: Skills/Memory Survey — 2026-05-14*

# Duncan 12-Question Discovery Intake — Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 12-question discovery intake (Stage 4 of `[[playbook-client-onboarding-7stage]]`) as a ContextBot conversational flow that Duncan completes once, with answers persisted to Supabase and surfaced as the input for the swarm's architecture-doc + risk-register generation. Zero founder hours after Phill drafts the questions; Duncan answers asynchronously over 2–5 days.

**Architecture:** Duncan portal magic-link page surfaces a "Start Discovery" CTA → opens Telegram chat with `@PiCEODimitriItr_bot` (one of the 3 client bots pending mint per task #145) → bot walks Duncan through the 12 questions one at a time → answers persist to `client_discovery_answers` Supabase table with revision history → on completion, swarm dispatches architecture-doc generation + risk-register seed.

**Tech Stack:** ContextBot (existing `swarm/inbox/intake_router.py` pattern per `[[project-contextbot-platform]]`) · Telegram inline-keyboard for Yes / No / Tell-me-more constrained replies (matches Dimitri product UX) · Supabase `client_discovery_answers` table with RLS scoped per `client_slug` · existing magic-link portal at `unite-group.in/clients/dimitri-itr`.

**Cutover gate:** Implementation begins **Wed 2026-05-20** (post Pilot V1 cutover). Dimitri client bot mint gated on BotFather rate-limit clearing Sat 2026-05-16 14:14 AEST (auto-retry cron 7d473fb9 scheduled). First Duncan-facing question: Mon 2026-05-25.

**Locked inputs:**
- 4 groups × 3 questions = 12 per `[[project-duncan-perkins]]` and `[[duncan-perkins-playbook-2026-05-14]]`
- Response model: Yes / No / Tell-me-more (Dimitri product UX, locked per Phill 2026-05-13 proposal)
- Async delivery (no Phill bottleneck) per founder directive #4 ("AGENTS EXECUTE. Phill = think tank")
- Output feeds Stage 4 architecture doc + risk register (swarm-generated, Phill reviews)

---

## File Structure

| Path | Responsibility |
|---|---|
| `swarm/discovery/questions/dimitri-itr-12q.json` (create) | The 12 questions + groups + acceptance criteria + downstream-decision mapping |
| `swarm/discovery/intake_flow.py` (create, ~200 LOC) | ContextBot conversational state machine; one-question-at-a-time, Y/N/TMM constrained |
| `swarm/discovery/persist.py` (create, ~80 LOC) | Supabase writer with revision history; idempotent on (client_slug, question_id) |
| `swarm/discovery/synthesize.py` (create, ~140 LOC) | On all-12-answered, fires architecture-doc + risk-register generation via Senior PM subagent |
| `app/server/routes/discovery_start.py` (create, ~60 LOC) | Magic-link CTA endpoint that emits a Telegram deep-link to the client bot |
| `supabase/migrations/2026_05_20_discovery.sql` (create) | `client_discovery_answers` + revision table |
| `tests/discovery/test_intake_flow.py` (create) | State-machine tests; Y/N/TMM branches; resume-from-saved-state |
| `~/Pi-CEO/Pi-Dev-Ops/.harness/swarm/registry/client-bots.jsonl` (modify) | Add Dimitri client bot entry once minted |

---

## The 12 Questions — Final, Decision-Forcing

These are the actual questions Duncan answers, grouped by purpose. Each forces a downstream architecture decision. Questions are **first-person from Phill** to maintain founder-voice trust, per `[[feedback-design-preferences]]` Rule 5 (CEO-facing = decision-focused).

### Group A — Product Vision (3 questions)

These lock the elevator pitch + the user model. Without these, every downstream decision drifts.

**Q1.** *Hey Duncan — when a user clicks the Dimitri button on a partner site, what's the first thing they should see — a Dimitri-branded welcome, the ATO MyGov OAuth flow, or a partner-branded intro screen?*
- Constrained reply: `Dimitri-branded` / `ATO OAuth direct` / `Partner-branded`
- Downstream: drives partner-onboarding contract template (white-label vs co-brand vs full-takeover)
- TMM follow-up: "If partner-branded, how much customisation per partner — colours only, full theme, or fully bespoke?"

**Q2.** *Who is Dimitri primarily for — the end taxpayer, the partner's professional user (broker/agent), or both with different views?*
- Constrained reply: `End taxpayer` / `Professional user` / `Both with different views`
- Downstream: drives role-based access model + two-sided vs one-sided UX
- TMM follow-up: "If 'both', does the professional ever see the taxpayer's session live, or only the final packet?"

**Q3.** *Give me one sentence — "Dimitri is like X but Y" — that we can lock as the elevator pitch from Day 1.*
- Free-text (not constrained — this is the pitch)
- Downstream: locks website hero copy + investor-deck framing + Day-14 demo voiceover script

### Group B — Must-Haves (3 questions)

These define the MVP gate. If we miss any of these, the partnership network won't sign on.

**Q4.** *Which ATO data fields are non-negotiable for MVP — full pre-fill (income + deductions + offsets + medicare + HELP), or just the income block?*
- Constrained reply: `Full pre-fill` / `Income block only` / `Income + deductions, defer offsets`
- Downstream: drives ATO API integration scope for Sprint 1; full pre-fill is ~3× the integration surface
- TMM follow-up: "If full pre-fill, do we need to handle private-health rebate edge cases at launch?"

**Q5.** *Lodgement to which Tax Agent system is mandatory at launch — XPM (Xero Practice Manager) only, or also Reckon Elite / MYOB AE / Thomson Reuters Onesource?*
- Constrained reply: `XPM only` / `XPM + one other` / `All four`
- Downstream: drives Sprint 2–3 integration partner outreach + commercial-terms negotiation. XPM-only is the fastest path; others double timeline.
- TMM follow-up: "If 'one other', which one and why — biggest current partner base?"

**Q6.** *What's the must-have payment gate before NOAH (post-lodgement agent) triggers — Stripe upfront, broker-billed escrow at lodgement, or post-pay after NoA?*
- Constrained reply: `Stripe upfront` / `Broker-billed escrow` / `Post-pay`
- Downstream: drives payment-rail integration + fraud / chargeback model + cash-flow timeline for Duncan's business
- TMM follow-up: "If broker-billed, who owns the receivable risk — the broker, the partner, or us?"

### Group C — Wish List (3 questions)

These shape the 12-month roadmap so we build the right second product, not the second-easiest.

**Q7.** *Beyond ITR — DIY Home Loans piece next, or something else from your list (financial planner workflow, lawyer estate-document drafter, payroll-tax employer flow)?*
- Constrained reply: `DIY Home Loans` / `Financial planner` / `Lawyer estate` / `Payroll tax` / `Something else (TMM)`
- Downstream: locks the Month-6+ roadmap and informs the architecture decision on shared-engine vs per-product silos

**Q8.** *Which integration would 10× the partner network the fastest — Xero plugin, deeper MyGov connector, financial-planner referral surface, or something else?*
- Constrained reply: `Xero plugin` / `Deeper MyGov` / `Financial planner referral` / `Something else (TMM)`
- Downstream: drives partner-acquisition strategy + sales-collateral focus

**Q9.** *What's the "wow" demo moment you'd want on the marketing reel — Dimitri handling a curly D13 deduction live, NOAH catching a fee discrepancy, or the partner getting the full ITR packet drop into their XPM in real time?*
- Constrained reply: `D13 deduction live` / `NOAH fee discrepancy` / `Partner XPM drop`
- Downstream: locks Day-14 Demo Reel storyboard + cinematographer brief

### Group D — Constraints (3 questions)

These are the hard limits. If we miss any of these, the launch fails.

**Q10.** *Is there a hard launch date — Day-N from signature, or a fixed calendar date tied to EOFY (Jul 1) / a partner commitment?*
- Constrained reply: `Day-N from signature` / `EOFY (1 Jul)` / `Partner commitment date` / `No hard date`
- Downstream: locks sprint cadence + critical-path identification. EOFY constraint is ~46 days from signature; very tight.

**Q11.** *Which regulator is the binding constraint here — ATO, AFSL, ASIC, AUSTRAC, or all of the above — and have you spoken to anyone there yet?*
- Constrained reply: `ATO only` / `ATO + AFSL` / `ATO + ASIC + AUSTRAC` / `All` / `Haven't engaged any (TMM)`
- Downstream: drives compliance work-stream priority + which advisor we engage first
- TMM follow-up: "If you've engaged, can you intro the contact, or do we go cold?"

**Q12.** *What's the single thing that, if we get it wrong on Day 1, kills the partnership network — pricing, branding, data privacy, or compliance evidence?*
- Constrained reply: `Pricing` / `Branding` / `Data privacy` / `Compliance evidence`
- Downstream: locks the "Day-1 non-negotiable" risk register entry; this gets daily attention until launch
- TMM follow-up: "Why? What's the partnership network most sensitive to from your conversations so far?"

---

## Supabase Schema

```sql
CREATE TABLE client_discovery_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL,
  question_id text NOT NULL,                -- e.g. 'dimitri-q1'
  question_group text NOT NULL,             -- 'product-vision' | 'must-haves' | 'wish-list' | 'constraints'
  question_text text NOT NULL,
  answer_value text NOT NULL,               -- constrained reply OR free text for Q3
  tmm_followup text,                        -- 'Tell me more' free-text response, nullable
  is_final boolean NOT NULL DEFAULT false,  -- false on draft; true once Duncan locks
  answered_at timestamptz NOT NULL DEFAULT now(),
  answered_via text,                        -- 'telegram-bot' | 'portal-web' | 'recall-extracted'
  UNIQUE (client_slug, question_id)
);

CREATE TABLE client_discovery_answer_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES client_discovery_answers(id) ON DELETE CASCADE,
  prior_value text,
  new_value text NOT NULL,
  revised_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_discovery_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY discovery_tenant_isolation ON client_discovery_answers
  USING (client_slug = current_setting('app.client_slug', true));
```

---

## Task 1: Wed 21 May — Question config + schema + tests

**Files:** Create `swarm/discovery/questions/dimitri-itr-12q.json`, `supabase/migrations/2026_05_20_discovery.sql`, `tests/discovery/test_intake_flow.py`

- [ ] **Step 1: Write the question config** (file structure)

```json
{
  "$schema": "client discovery 12Q v1",
  "client_slug": "dimitri-itr",
  "version": "2026-05-15.v1",
  "groups": [
    {
      "id": "product-vision",
      "title": "Product Vision",
      "questions": [
        {
          "id": "dimitri-q1",
          "prompt": "Hey Duncan — when a user clicks the Dimitri button on a partner site, what's the first thing they should see?",
          "constrained_replies": ["Dimitri-branded", "ATO OAuth direct", "Partner-branded"],
          "tmm_prompt": "If partner-branded, how much customisation per partner — colours only, full theme, or fully bespoke?",
          "downstream_decision": "white-label-contract-template"
        }
      ]
    }
  ]
}
```

Author the full 12-question config — exactly the questions specified in this plan, with the constrained replies + TMM prompts + downstream-decision mappings.

- [ ] **Step 2: Write failing state-machine tests**

```python
# tests/discovery/test_intake_flow.py
def test_flow_advances_through_12_questions(supabase_test_client):
    from swarm.discovery.intake_flow import DiscoveryFlow
    flow = DiscoveryFlow("dimitri-itr", "duncan@homeloanessentials.com.au")
    for i in range(12):
        q = flow.next_question()
        assert q["id"].startswith("dimitri-q")
        flow.answer(q["id"], q["constrained_replies"][0] if q.get("constrained_replies") else "test")
    assert flow.is_complete()
    assert flow.next_question() is None

def test_resume_from_saved_state(supabase_test_client):
    # Answer 5 questions, simulate disconnect, resume → next_question is q6
    pass

def test_tmm_followup_persisted(supabase_test_client):
    # Answer with TMM → tmm_followup field populated
    pass
```

Run: `pytest tests/discovery/ -v` → FAIL (DiscoveryFlow not defined).

- [ ] **Step 3: Write Supabase migration; apply via Supabase MCP**

- [ ] **Step 4: Commit**

---

## Task 2: Thu 22 May — Intake flow state machine

**Files:** Create `swarm/discovery/intake_flow.py`, `swarm/discovery/persist.py`

- [ ] **Step 1: Implement DiscoveryFlow**

State machine: holds `client_slug`, `user_email`, reads question config, queries Supabase for already-answered questions, returns next unanswered. Supports `answer(question_id, value, tmm_followup=None)`. On final answer, marks `is_final=true` for all rows and fires `synthesize.py`.

Validates constrained replies against config; rejects free-form when constrained list exists.

- [ ] **Step 2: Implement Telegram inline-keyboard renderer**

For each question, build Telegram inline_keyboard with one button per `constrained_replies` value + a "Tell me more" button that opens a follow-up free-text prompt. Layout: 1 column for ≤3 replies, 2 columns for 4–6, scroll for more.

```python
def render_telegram_question(q: dict) -> dict:
    buttons = [[{"text": r, "callback_data": f"answer:{q['id']}:{r}"}]
               for r in q.get("constrained_replies", [])]
    if q.get("tmm_prompt"):
        buttons.append([{"text": "💬 Tell me more", "callback_data": f"tmm:{q['id']}"}])
    return {"text": q["prompt"], "reply_markup": {"inline_keyboard": buttons}}
```

- [ ] **Step 3: Run tests, confirm green; commit**

---

## Task 3: Fri 23 May — Magic-link CTA + synthesis fire

**Files:** Create `app/server/routes/discovery_start.py`, `swarm/discovery/synthesize.py`

- [ ] **Step 1: Magic-link CTA endpoint**

`POST /api/discovery/start` — takes `client_slug` + `signed_token` (existing magic-link hash from `[[magic-link-approval-portal]]`), emits `https://t.me/PiCEODimitriItrBot?start=discovery_<slug>` deep-link. Duncan clicks → Telegram opens → bot reads start payload → kicks off Q1.

- [ ] **Step 2: Synthesis fire**

On all-12-answered, `synthesize.py` dispatches a Senior PM subagent (via the `Agent` tool from inside the consumer) with a prompt containing all 12 answers. Subagent produces:
- `docs/architecture/dimitri-architecture-v1.md` (~600 words, swarm-readable)
- `docs/risk-register/dimitri-risks-v1.md` (~400 words, top-10 risks with owner + mitigation)
- Linear issue created tagged `architecture-doc-ready`

- [ ] **Step 3: Commit**

---

## Task 4: Sat 24 May — End-to-end dry-run

**Files:** None new; manual test

- [ ] **Step 1: Phill plays "Duncan"** — opens the magic-link page, clicks Start Discovery, walks through all 12 questions in Telegram, verifies:
  - Each question renders with correct inline-keyboard
  - Constrained replies persist with answer_value matching
  - TMM follow-ups capture free-text correctly
  - Resume-after-disconnect works (close Telegram mid-flow, reopen, picks up where left off)
  - On Q12 completion, synthesis fires within 60s
  - Architecture doc + risk register land in Linear
- [ ] **Step 2:** Fix any defects surfaced
- [ ] **Step 3:** Reset state (truncate `client_discovery_answers` for `dimitri-itr`) before Duncan's real run

---

## Task 5: Mon 26 May — Duncan real run

- [ ] Phill sends Duncan the magic-link via Telegram or email: *"Hey Duncan — quick 12-question intake when you've got 15 mins. Sit anywhere, no pressure to finish in one go. {magic-link URL}"*
- [ ] Duncan completes over 2–5 days asynchronously
- [ ] On completion: synthesis fires → architecture doc + risk register → Linear tickets
- [ ] Phill reviews the architecture doc (Stage 4 owner per playbook) — single 15-min review block
- [ ] Stage 5 Build sprints begin

---

## Self-Review

**1. Spec coverage:**
- Stage 4 of `[[playbook-client-onboarding-7stage]]` (Discovery — Swarm only, 12-Q intake → architecture doc + risk register) ✅
- Yes / No / Tell-me-more constrained UX per Dimitri product spec ✅
- Async delivery (no Phill bottleneck) ✅
- 4 groups × 3 questions = 12 ✅
- Constrained replies validated against config; free-text only for Q3 (pitch) and TMM follow-ups ✅
- Revision history for late-changes-by-Duncan ✅

**2. Placeholder scan:** No TBD / "fill in details". All 12 questions written verbatim. All constrained-reply lists specified. All downstream-decision mappings named.

**3. Substrate-change-discipline check:**
- D1 shadow-run: Task 4 Phill-plays-Duncan dry-run before real Duncan ever sees it
- D2 source-restore: all new files
- D3 fork-private vendor pin: ContextBot pattern already exists; pin schema version `2026-05-15.v1`
- D4 rollback drill: if state machine breaks, fallback is Phill asks Duncan over Zoom — answers manually entered to Supabase
- D5 sprint window: this plan executes POST Pilot V1 cutover Tue 2026-05-19T08:00Z

---

## Cross-refs

- `[[project-duncan-perkins]]` — Duncan engagement context
- `[[duncan-perkins-playbook-2026-05-14]]` — full 7-stage playbook
- `[[playbook-client-onboarding-7stage]]` — generic playbook this Duncan-specific run instantiates
- `[[project-contextbot-platform]]` — bot routing layer this rides on
- `[[decision-recall-ai-over-otter-2026-05-14]]` — companion meeting-capture work
- `[[feedback-design-preferences]]` — Yes/No/Tell-me-more UX constraint
- Companion plan: `~/pi-seo-workspace/unite-group/docs/superpowers/plans/2026-05-15-duncan-recall-ai-integration.md`

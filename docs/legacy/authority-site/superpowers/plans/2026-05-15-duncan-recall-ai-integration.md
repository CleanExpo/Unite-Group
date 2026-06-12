# Duncan Recall.ai Meeting-Capture Integration — Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Recall.ai (bot-as-a-service meeting capture) end-to-end so every Duncan / Dimitri client call is recorded → transcribed → action-items extracted → Linear tickets created → searchable on the Duncan portal — without Phill touching a UI between joining the call and reviewing the artefacts. Closes Stage 5–6 "decision log he didn't write" wow moment per `[[duncan-perkins-playbook-2026-05-14]]`.

**Architecture:** Phill's Google Calendar event → Hermes cron polls upcoming meetings → Recall.ai bot dispatch (POST /api/v1/bot) → bot joins via Google Meet / Zoom URL → records 1080p + Whisper-v4 transcription with speaker diarization → Recall webhook fires on `bot.done` → Pi-CEO consumer extracts action items via GPT-5.5 → Linear API creates issues in `Unite-Group/dimitri-itr` team → all artefacts persisted to Supabase + signed S3 URLs surfaced on the Duncan portal magic-link page.

**Tech Stack:** Recall.ai REST API · webhook receiver (FastAPI on `pi-dev-ops-production.up.railway.app`) · GPT-5.5 via Codex CLI (Max plan, $0 marginal) · Linear MCP · Supabase `meeting_captures` + `meeting_action_items` tables · Google Calendar API (read-only on phill.mcgurk@gmail.com).

**Cutover gate:** Implementation begins **Wed 2026-05-20** (post Pilot V1 cutover Tue 19 May 18:00 AEST per `[[feedback-substrate-change-discipline]]` #5). First production firing: Duncan's first call (currently scheduled ~Mon 2026-05-26 per `[[project-duncan-perkins]]`).

**Locked inputs:**
- Decision: `[[decision-recall-ai-over-otter-2026-05-14]]` — Recall.ai chosen over Otter / Granola / Fathom / tldv / Read.ai
- Cost ceiling: $0.30/meeting-hour Recall + ~$0.005 extraction = ~$0.35/hr fully agentic ([UNVERIFIED — confirm current Recall pricing at https://www.recall.ai/pricing before signing])
- Privacy: Australian Privacy Act 1988 + APP 11; bot must be disclosed verbally + in calendar invite; consent banner in Duncan portal welcome flow
- License coverage: Phill's existing meetings on Duncan / Dimitri project only; not portfolio-wide (separate consent surfaces per business)

---

## File Structure

| Path | Responsibility |
|---|---|
| `swarm/integrations/recall_ai/__init__.py` (create) | Module marker |
| `swarm/integrations/recall_ai/client.py` (create, ~150 LOC) | Recall.ai REST client (bot dispatch, status poll, transcript fetch, billing) |
| `swarm/integrations/recall_ai/webhook.py` (create, ~120 LOC) | FastAPI webhook receiver, signature verification, idempotency |
| `swarm/integrations/recall_ai/extractor.py` (create, ~180 LOC) | GPT-5.5 action-item + decision-log extractor; structured output schema |
| `swarm/integrations/recall_ai/linear_writer.py` (create, ~100 LOC) | Linear API ticket creator; team / project / label routing |
| `swarm/integrations/recall_ai/calendar_poll.py` (create, ~140 LOC) | Google Calendar polling cron entry point |
| `app/server/routes/recall_webhook.py` (create, ~80 LOC) | Mount webhook on existing FastAPI app |
| `supabase/migrations/2026_05_20_recall_ai.sql` (create) | `meeting_captures` + `meeting_action_items` tables with RLS |
| `tests/integrations/recall_ai/test_extractor.py` (create) | Golden-fixture tests for action-item extraction |
| `tests/integrations/recall_ai/test_webhook.py` (create) | Signature verification + idempotency tests |
| `~/.hermes/cron/jobs.json` (modify) | New cron entry `calendar-poll-duncan-recall` every 5 min |
| `Wiki/duncan-perkins-playbook-2026-05-14.md` (modify) | Stage 5–6 section updated with concrete implementation |

---

## Task 1: Wed 21 May — Supabase schema + Recall client

**Files:** Create `supabase/migrations/2026_05_20_recall_ai.sql`, `swarm/integrations/recall_ai/client.py`

- [ ] **Step 1: Write the failing test for Recall client**

```python
# tests/integrations/recall_ai/test_client.py
def test_bot_dispatch_returns_bot_id(monkeypatch):
    from swarm.integrations.recall_ai.client import RecallClient
    monkeypatch.setenv("RECALL_AI_API_KEY", "test-key")
    client = RecallClient()
    # Patch urllib to return a known fixture
    fixture = {"id": "bot_abc123", "join_at": "2026-05-26T09:00:00Z",
               "meeting_url": {"meeting_id": "abc-defg-hij"}}
    monkeypatch.setattr(client, "_request", lambda m, p, body: fixture)
    result = client.dispatch_bot("https://meet.google.com/abc-defg-hij",
                                  "Dimitri kickoff", "phill.mcgurk@gmail.com")
    assert result["id"] == "bot_abc123"
```

Run: `pytest tests/integrations/recall_ai/test_client.py -v`
Expected: FAIL — `RecallClient` not defined.

- [ ] **Step 2: Implement minimal client (`client.py`)**

Implements `dispatch_bot(meeting_url, title, organiser_email)` → POST `/api/v1/bot/` per Recall.ai docs at https://docs.recall.ai/reference/bot_create. API key from `RECALL_AI_API_KEY` env (loaded from `~/.hermes/.env`). Returns `{id, status, meeting_url, recording_id}`. Also implements `get_bot(bot_id)`, `get_transcript(bot_id)`, `get_billing()`. Idempotency: dedupe on `(meeting_url, scheduled_for)` cache key in `~/Pi-CEO/.harness/swarm/recall-dispatch-cache.jsonl`.

- [ ] **Step 3: Write Supabase migration**

```sql
CREATE TABLE meeting_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_bot_id text NOT NULL UNIQUE,
  client_slug text NOT NULL,
  meeting_url text NOT NULL,
  meeting_title text,
  organiser_email text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  joined_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  transcript_url text,
  recording_url text,
  status text NOT NULL DEFAULT 'pending',
  cost_aud_cents int,
  raw_webhook_jsonb jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_captures_client ON meeting_captures(client_slug, scheduled_for DESC);

CREATE TABLE meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id uuid NOT NULL REFERENCES meeting_captures(id) ON DELETE CASCADE,
  text text NOT NULL,
  owner_hint text,
  due_hint text,
  confidence numeric(3,2) NOT NULL,
  linear_issue_id text,
  linear_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meeting_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_captures_tenant_isolation ON meeting_captures
  USING (client_slug = current_setting('app.client_slug', true));
CREATE POLICY meeting_action_items_via_capture ON meeting_action_items
  USING (capture_id IN (SELECT id FROM meeting_captures
                        WHERE client_slug = current_setting('app.client_slug', true)));
```

- [ ] **Step 4: Run test, confirm green; commit**

```bash
cd ~/Pi-CEO/Pi-Dev-Ops
git add swarm/integrations/recall_ai/ supabase/migrations/2026_05_20_recall_ai.sql tests/integrations/recall_ai/test_client.py
git -c commit.gpgsign=false commit -m "feat(recall_ai): client + Supabase schema for meeting capture"
```

---

## Task 2: Thu 22 May — Webhook receiver + signature verification

**Files:** Create `swarm/integrations/recall_ai/webhook.py`, `app/server/routes/recall_webhook.py`

- [ ] **Step 1: Write failing webhook test**

```python
# tests/integrations/recall_ai/test_webhook.py
def test_webhook_rejects_invalid_signature(client, monkeypatch):
    monkeypatch.setenv("RECALL_AI_WEBHOOK_SECRET", "test-secret")
    r = client.post("/api/recall/webhook",
                    json={"event": "bot.done", "data": {"bot": {"id": "bot_x"}}},
                    headers={"X-Recall-Signature": "wrong"})
    assert r.status_code == 401
```

- [ ] **Step 2: Implement webhook handler**

`POST /api/recall/webhook`. Verify signature per Recall.ai webhook docs (HMAC-SHA256 of body with `RECALL_AI_WEBHOOK_SECRET`). Idempotency via `recall_bot_id + event_type` key. Handles `bot.joined`, `bot.recording_started`, `bot.done`, `bot.failure`, `bot.transcript_ready`. On `bot.transcript_ready` → enqueue extraction job in `~/Pi-CEO/.harness/swarm/extraction-queue.jsonl`. Updates `meeting_captures.status` field at each transition.

- [ ] **Step 3: Mount on FastAPI app**

Add route registration in `app/server/app_factory.py`. Verify backend (`https://pi-dev-ops-production.up.railway.app`) serves the route. Use same `bcrypt 4.0` auth pattern as existing routes.

- [ ] **Step 4: Configure Recall webhook URL**

Manually (Phill, one-time): in Recall.ai dashboard, set webhook URL to `https://pi-dev-ops-production.up.railway.app/api/recall/webhook`. Add `RECALL_AI_WEBHOOK_SECRET` to Railway env. Verify with Recall's webhook-test button.

- [ ] **Step 5: Commit**

---

## Task 3: Thu 22 May — Extractor (GPT-5.5 via Codex CLI)

**Files:** Create `swarm/integrations/recall_ai/extractor.py`, `tests/integrations/recall_ai/test_extractor.py`

- [ ] **Step 1: Write extraction test with golden fixture**

Golden fixture at `tests/fixtures/recall_transcript_duncan_kickoff.json` (synthetic — 800-word transcript covering 5 known action items + 2 decisions). Test asserts ≥4 action items detected with confidence ≥0.7 and correct owner_hint distribution.

- [ ] **Step 2: Implement extractor**

```python
# swarm/integrations/recall_ai/extractor.py
"""Action-item + decision-log extractor.

Calls GPT-5.5 via Codex CLI (Max plan, $0 marginal) with a strict
schema. Returns list of action_items with text / owner_hint / due_hint
/ confidence."""

import json, subprocess
from pathlib import Path

EXTRACTION_PROMPT = """You are extracting action items + decisions from a meeting transcript.
Output STRICT JSON matching this schema only — no preamble, no markdown:
{
  "action_items": [{"text": str, "owner_hint": str|null, "due_hint": str|null, "confidence": float}, ...],
  "decisions": [{"text": str, "confidence": float}, ...],
  "summary_120w": str
}

Rules:
- Only items that have a clear deliverable + plausible owner from the transcript count.
- "Let me think about it" / hedges / wishes are NOT action items.
- owner_hint: speaker name from transcript, or "Phill" / "Duncan" if obvious, else null.
- confidence: 0.0-1.0; mark <0.7 if you're guessing the owner or the deliverable.
- Australian English, Australian dates (DD/MM/YYYY).

TRANSCRIPT:
"""

def extract(transcript: str) -> dict:
    prompt = EXTRACTION_PROMPT + transcript[:60000]
    result = subprocess.run(
        ["claude", "--print", "--model", "claude-sonnet-4-6"],
        input=prompt, capture_output=True, text=True, timeout=120, check=True,
    )
    return json.loads(result.stdout.strip())
```

Note model choice: Sonnet (not Haiku) for extraction — quality matters more than cost here, and it's $0 marginal under Max plan.

- [ ] **Step 3: Run test, confirm ≥4 of 5 fixture items recovered; commit**

---

## Task 4: Fri 23 May — Linear writer + calendar poll

**Files:** Create `linear_writer.py`, `calendar_poll.py`; modify `~/.hermes/cron/jobs.json`

- [ ] **Step 1: Linear writer**

Uses Linear MCP `save_issue` tool (already in Phill's Pi-CEO setup). Maps action_items to issues:
- Team: `Unite-Group` (per existing memory — Duncan project sits under `dimitri-itr` slug)
- Title: action_item.text (capped 80 chars)
- Description: full text + meeting context link + transcript excerpt
- Labels: `meeting-capture` + `client-{slug}` + (priority hint from confidence: ≥0.85 → P2 High, else P3 Medium)
- Assignee: `owner_hint` mapped via `~/Pi-CEO/.harness/swarm/owner-map.json` (Phill, Duncan, Margot routing)
- Due date: parsed from `due_hint` via dateparser; null if ambiguous

- [ ] **Step 2: Calendar poll**

Reads `phill.mcgurk@gmail.com` Google Calendar via `mcp__claude_ai_Google_Calendar__*` (currently NOT connected — needs auth) OR via Composio if connected. Filters to events tagged with `[recall]` in description OR with `duncan@homeloanessentials.com.au` as attendee. For each upcoming meeting in next 60 min, dispatches Recall bot via `client.dispatch_bot()`. Idempotent on `meeting_url + scheduled_for`.

**Fallback if Google Calendar MCP unavailable:** Phill manually adds the meeting URL to `~/Pi-CEO/.harness/swarm/meetings-to-record.jsonl` and the same poll picks it up.

- [ ] **Step 3: Add Hermes cron entry**

```json
{
  "id": "calendar-poll-duncan-recall",
  "name": "Duncan Recall.ai Bot Dispatcher",
  "prompt": "Run python3 ~/Pi-CEO/Pi-Dev-Ops/swarm/integrations/recall_ai/calendar_poll.py",
  "schedule": {"kind": "cron", "expr": "*/5 * * * *", "display": "Every 5 minutes"},
  "enabled": true,
  "tags": ["recall", "duncan", "meeting-capture"]
}
```

- [ ] **Step 4: Commit**

---

## Task 5: Mon 26 May — End-to-end with Duncan's first call

- [ ] Confirm Recall.ai paid subscription active + webhook URL set ([UNVERIFIED pricing — get Marco's quote first if not done])
- [ ] Phill schedules first Duncan call ~Mon 26 May per `[[project-duncan-perkins]]`; calendar event tagged `[recall]`
- [ ] Calendar poll picks up event 60 min before start → dispatches bot
- [ ] Bot joins meeting at scheduled time; verbal disclosure: "This call is being recorded by an AI assistant for note-taking purposes — let me know if you'd prefer it leave the call"
- [ ] Post-call: webhook fires `bot.transcript_ready` → extraction → Linear tickets → Duncan portal magic-link page shows the meeting card with transcript + action items
- [ ] Verify ≥80% of items Phill remembers from the call are captured in Linear (manual review by Phill, 5 min)

**FAIL paths to test before live call:**
- Bot can't join (private meeting, no consent) → graceful failure + Telegram single-shot to Phill
- Transcript empty (bot was muted, audio issues) → status flagged, skip extraction
- Extraction returns malformed JSON → retry once with stricter prompt, then Telegram fallback
- Linear write fails (token expired) → action items persist to Supabase + flagged for manual creation

---

## Self-Review

**1. Spec coverage:**
- Stage 5 "Build sprints" capture + Stage 6 "Approval cycles" capture from `[[duncan-perkins-playbook-2026-05-14]]` ✅
- "Decision log he didn't write" wow moment ✅
- Cost ceiling $0.35/hr per `[[decision-recall-ai-over-otter-2026-05-14]]` ✅
- AU Privacy Act + APP 11 verbal-disclosure + calendar-invite ✅
- L6 quality gate compatible — extractor output reviewable by Haiku-3 panel ✅

**2. Placeholder scan:** No TBD / "implement later" / "similar to Task N". Two UNVERIFIED markers (Recall.ai current pricing, Google Calendar MCP auth status) — both with stated fallback paths.

**3. Substrate-change-discipline check:**
- D1 shadow-run: Task 5 manual call is the shadow run; live cutover happens only after that PASS
- D2 source-restore: all new files, no .pyc-only risk
- D3 fork-private vendor pin: Recall.ai is the substrate; pin API version at first-fire (currently v1 per docs.recall.ai)
- D4 rollback drill: fallback to Phill-manual notes if Recall outage; transcript can be uploaded manually to extraction queue
- D5 sprint window: this plan executes POST Pilot V1 cutover Tue 2026-05-19T08:00Z

---

## Next phase

If end-to-end works Mon 26 May → expand to weekly Duncan / Dimitri standups + CCW (Toby) calls post 26 May (Toby back from holiday). Per-client consent surface added to each portal welcome flow before bot-join.

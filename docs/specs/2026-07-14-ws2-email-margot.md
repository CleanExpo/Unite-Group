# Spec — WS2: Email Capture + Margot Agent + Calendar / Kanban / Telegram

**Status:** DRAFT · **Date:** 2026-07-14 · **Owner:** Founder (Phill) · **Author:** Claude (Opus 4.8)
**Program:** Unite-Group Nexus CRM — Operations Layer · **Sibling:** WS1 cost metering (`2026-07-14-project-cost-metering.md`)

> **Grounded in a live read-only discovery (2026-07-14).** WS2 is NOT greenfield — it closes **5 specific gaps** in a substantial existing surface (multi-inbox Gmail capture + triage, an email workbench, a Google-Calendar read, a Linear-projection Kanban, a working Telegram send, and an approval-gate that lives in `apps/empire`). Per-business entity = `businessKey` (`dr`/`restore`/`carsi`/`ccw`/`nrpg`/`synthex`/`personal`) via `apps/web/src/lib/businesses`. Reuse map + the 5 gaps in §12.

---

## 1. North Star
Every inbox across the estate is captured into the CRM. A per-business **Margot** agent triages each message, drafts a reply **in the founder's voice**, and surfaces the work on a **calendar**, an **own Kanban board**, and **Telegram** — but **nothing is ever sent without the founder's approval**. The founder works from one queue of ready-to-approve drafts instead of N inboxes.

## 2. Goals / Non-goals
**Goals**
- **Capture ALL inboxes.** Multi-inbox config already exists (9 mailboxes, `businessKey`-mapped) but is a hardcoded array with **Google-only live ingestion** — close it to per-business DB config + non-Google (Microsoft/IMAP) pull. (The desktop Gmail MCP connector's single-account limit — [[gmail-mcp-account-scope]] — is separate from this app's own capture.)
- Per-business **Margot** triage + **voice-matched draft replies**.
- A hard **confirm-before-send** gate on every outbound (email + Telegram).
- Route messages/tasks to **calendar**, an **own Kanban board**, and **Telegram drafts-for-approval**.

**Non-goals (this spec)**
- **No autonomous sending** of email or Telegram messages — draft-only, founder approves. (Explicit founder decision 2026-07-14.)
- Not a Linear-backed board — WS2 builds its **own** Kanban (founder decision).
- Not the metering/P&L layer (that's WS1).
- No credential handling in code / no password-into-form logins (estate rule).

## 3. Success criteria (measurable)
1. All configured inboxes ingest into a single `message` store, per-business tagged; adding an inbox is config, not code.
2. Every inbound gets a Margot triage (category + priority) and, where a reply is warranted, a **draft** in the founder's voice — never auto-sent.
3. A draft can be **approved via Telegram or the CRM UI**, and only then does it send.
4. Messages/tasks appear as cards on the own Kanban board and (where time-anchored) on the calendar.
5. Zero autonomous outbound: audit shows every send has an explicit approval record.

## 4. Constraints & safety (binding)
- **Draft-only.** Margot proposes; the founder approves. No email/Telegram send fires without an approval record. (Mirrors the estate `telegram-draft-for-review` / draft_review HITL pattern.)
- **Read-only, least-privilege inbox access.** Prefer OAuth/API scopes that read + send-on-approval; never store plaintext mailbox passwords; secrets live in the platform secret store.
- **Founder-gated** DB migrations (out-of-band Supabase, never `prisma db push`), additive tables only.
- Voice-matched copy passes the estate copy standard (`nexus-copywriter`) before it's offered for approval.
- AU English, AUD, DD/MM/YYYY.

## 5. Scope

**Surfaces**
1. **Email capture (multi-account)** — an account registry + a read-only fetch per account → normalised `message`. Mechanism TBD (Gmail API per-account OAuth vs IMAP vs a mail provider) — see §11. Must cover every founder/business inbox, not one.
2. **Margot agent** — per-business triage (classify, priority, needs-reply?) + voice-matched draft reply; writes a `draft`, never sends.
3. **Calendar** — create/read events for time-anchored items (meeting prep, follow-ups, deadlines).
4. **Own Kanban board** — per-business board with columns (e.g. Inbox → Drafted → Awaiting approval → Sent/Done); messages + tasks become cards.
5. **Telegram** — surfaces drafts to the founder; **approve → send**; reject/edit loops back. No autonomous send.

**Businesses:** the `businesses` table is the per-business anchor (as WS1). Inboxes map to a business (or "founder/global").

## 6. Architecture
```
[ Inbox accounts (registry) ]
        │  read-only fetch per account (OAuth/API)
        ▼
[ message store ]───►[ Margot triage + draft (voice) ]───►[ draft store ]
        │                                                       │
        ├──► calendar (time-anchored items)                     │ awaiting approval
        ├──► own Kanban board (cards)                            ▼
        └───────────────────────────────►[ Telegram drafts-for-approval ]──approve──►[ send ]──►[ approval + sent audit ]
```
- **Ingestion**: per-account read-only fetch (scheduled cron), idempotent (dedupe on provider message-id), normalises to `message`.
- **Margot**: triage + draft generation grounded in a founder-voice config/corpus; output validated by the copy standard; persisted as `draft` (status `awaiting_approval`).
- **Approval gate**: a `draft` only sends after an `approval` row (from Telegram callback or CRM UI). Send goes through the existing mail sender (reuse, §12).
- **Kanban/calendar**: projections of message/draft/task state.

## 7. Data model (new tables — additive, founder-applied)
- `mailbox_account` — id, business_id?, address, provider, status, scopes, connected_at. (the "all inboxes" registry)
- `message` — id, mailbox_account_id, business_id?, provider_message_id (unique), thread_id, from/to, subject, snippet, received_at, raw jsonb. (immutable capture)
- `message_triage` — message_id, category, priority, needs_reply, model, created_at.
- `draft` — id, message_id, business_id?, channel ('email'|'telegram'), body, voice_meta jsonb, status ('awaiting_approval'|'approved'|'sent'|'rejected'), created_at.
- `approval` — draft_id, approved_by, via ('telegram'|'ui'), decided_at, note. (the send gate)
- `kanban_board` / `kanban_column` / `kanban_card` — own board; card links to message/draft/task.
- `calendar_link` — entity → external calendar event id (if Google Calendar) or a local `calendar_event`.

*(Reconcile against existing tables in §12 — do not duplicate a message/inbox table if one exists.)*

## 8. Founder-voice matching
Drafts must read as the founder. Source a **voice config/corpus** (existing Margot voice/persona config if present — §12; else a small curated corpus of the founder's real sent replies, with consent). Generation runs through the estate copy standard (`nexus-copywriter`) and a self-audit before a draft is offered. Never invents facts; a low-confidence draft is flagged, not hidden.

## 9. Phases (grounded — each closes a discovered gap)
- **P0 — Discovery** ✅ done (§12).
- **P1 — Inbox config + full-coverage capture** — move the 9 hardcoded `EMAIL_ACCOUNTS` into a per-business `mailbox_account` DB registry; extend live ingestion **beyond Google** (Microsoft/IMAP are typed + have a connect UI but no cron) so *every* inbox is captured, not just the Google ones. Reuse the `email-triage` cron + `gmail.ts`.
- **P2 — Founder-voice email draft + approval gate (the core gap)** — add an AI **draft-reply-in-the-founder's-voice** step to the email flow (extend `brand-identities` + `prompts/reply.ts` from brand-character to founder voice; validate via `nexus-copywriter`); **port** the `apps/empire` approval-gate/decision-ledger into `apps/web` so drafts sit `awaiting_approval` and send **only** via gmail `sendReply` after an approval. No autonomous send.
- **P3 — Own editable Kanban** — back `types/kanban.ts` with a real board/`tasks` migration in web; cards create/move/persist; project messages + drafts as cards. (Today it's a read-only Linear projection.)
- **P4 — Calendar write** — add create/update to `integrations/calendar.ts` (read already exists) for time-anchored items.
- **P5 — Telegram close-the-loop** — complete the `approval-callback` route (currently a 501 stub) against the ported approval-gate so drafts-for-approval go approve→send end-to-end. `send` already works.

## 10. Open decisions (need founder)
1. **Email mechanism** — Gmail API multi-account OAuth (each inbox authorised once) vs IMAP vs a mail provider (Nylas/etc.). Which inboxes exactly (list the addresses/domains)?
2. **Voice corpus source** — existing Margot voice config, or curate from the founder's sent mail?
3. **Where Margot runs** — in-app (apps/web cron/route) vs the existing Margot process. Confirm the same instance that already runs (the one churning the repo).
4. **Calendar target** — Google Calendar (needs OAuth scope) vs a local calendar.
5. Send transport for approved email — reuse which sender (§12: SendGrid/Resend)?

## 11. Safety recap
Draft-only, approval-gated sends, read-only least-privilege capture, no plaintext credentials, founder-gated migrations, voice validated by the copy standard, full approval/sent audit. Built in an isolated worktree + commit-immediately ([[unite-group-concurrent-writer-clobber]]).

## 12. Reuse map (discovery 2026-07-14 — build ON these, don't recreate)

| WS2 need | Reuse |
|---|---|
| Multi-inbox account model | `apps/web/src/lib/email-accounts.ts` (`EMAIL_ACCOUNTS`, 9 mailboxes → `businessKey`) — move to per-business DB config |
| Email fetch + **send/reply** | `apps/web/src/lib/integrations/gmail.ts` (`sendReply`), `google.ts`, `google-oauth.ts`; tokens in **`credentials_vault`** |
| Triage store + cron | `email_triage_results` (mig `20260318000001`), `app/api/cron/email-triage/route.ts`, `lib/ai/capabilities/email-triage.ts` |
| Email workbench + reply UI | `components/founder/email/*` (`EmailWorkbench`, `AccountTabs`, `ReplyComposer`) — add an AI-draft step |
| Voice/persona scaffolding | `lib/content/brand-identities.ts` + `prompts/reply.ts` (`buildReplySystemPrompt`) — extend brand-character → **founder voice** |
| Confirm-before-send HITL | `apps/empire/src/lib/personal-intelligence/approval-gate.ts` + `approval-handoff.ts` (+ web `approval_queue` mig `20260530000000`) — **port into web**, wire to email |
| Calendar read | `lib/integrations/calendar.ts` + `founder/calendar/page.tsx` — **add write** |
| Kanban surface | `components/founder/kanban/*`, `lib/integrations/linear-board.ts`, `types/kanban.ts`, `api/kanban/generate-next` |
| Telegram transport | `app/api/telegram/send/route.ts` (works) + `approval-callback/route.ts` (**complete the 501 stub**) |
| Margot intake classifier | `packages/unite-control-module/src/intake/margot-conversation-pass.service.ts` |

### The 5 gaps WS2 actually closes
1. **Founder-voice email draft step** — missing entirely (only social brand-voice exists). The email flow posts a hand-typed body; add the AI draft.
2. **Port the empire approval-gate/decision-ledger into `apps/web`** — so Telegram `approval-callback` (501 today) and confirm-before-send actually close in the app the founder uses.
3. **Calendar write** — read exists, no create/update.
4. **Editable/persisted Kanban** — no `tasks` table in web; the board is a read-only Linear projection. Founder wants an **own** board.
5. **Inbox list → per-business DB config + beyond-Google ingestion** — `EMAIL_ACCOUNTS` is a hardcoded array; live pull runs Google-only (Microsoft/IMAP typed + UI but no cron).

Env vars (names only): `FOUNDER_USER_ID`, `CRON_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_DECISION_SIGNING_KEY`, SendGrid key.

> **Note — apps/web vs apps/empire:** the real Margot HITL (approval-gate, decision-ledger, Telegram decision flow) lives in `apps/empire`, not `apps/web`. The founder-facing surfaces (email/calendar/kanban/telegram) are all in `apps/web`. P2/P5 hinge on **porting/wiring the empire gate into web** (flagged `TODO(convergence)` in the codebase) — confirm whether to port vs call across apps (§10.3).

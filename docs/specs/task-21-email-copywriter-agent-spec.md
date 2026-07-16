# SPM Spec — Task #21: Per-account email copywriter agent

> Produced by `/spm` (read-only planning). **No spec, no build** — this document authorises
> a scoped build; it is not the build. Locale en-AU. Single-tenant (`founder_id`).

## 1. Task

"I have many Google accounts that I would like connected and looked after by a **specialised
agent with copywriter skills**." Multi-account connect/manage UI shipped in #874 (task #20).
Task #21 is the "looked after by a copywriter agent" half.

## 2. Project context

Nexus CRM, `apps/web` (Next.js 16, Supabase, Vercel), single founder `70608186`
(contact@unite-group.in). Email accounts stored one-row-per-mailbox in `credentials_vault`
(`service='google'`, `notes=email`, tokens encrypted). Locale en-AU.

## 3. Problem

The founder runs several mailboxes (DR, NRPG, CARSI, CCW, personal — `email-accounts.ts:18`).
Replying in a consistent, on-brand, per-business voice across all of them is manual. He wants a
copywriter-grade agent that drafts replies per mailbox for his approval — never auto-sending.

## 4. Desired outcome

Each connected mailbox has its **own** copywriter voice (tone, sign-off, never-do list,
business framing). The existing founder-voice drafter produces an approval-gated draft in that
mailbox's voice. The founder reviews and sends. Nothing is ever sent automatically.

## 5. Existing capability — REUSE, do not rebuild (No-Invaders #4)

First-source (file:line) inventory — the engine already exists, dormant:

| Capability | Where | State |
|---|---|---|
| Founder-voice LLM drafter | `src/lib/margot/draft-reply.ts:18` `generateFounderDraft(email, voice, complete)` | Exists; drafts body only, never sends |
| Voice + email prompt contract | `src/lib/margot/draft-reply-prompt.ts:12` `FounderVoice{name,signOff,toneGuidelines[],neverDo[]}`; `IncomingEmail{...,businessName?}` | Exists; single caller-supplied voice |
| Draft generate route | `src/app/api/margot/drafts/route.ts:19` | **Dormant** behind `MARGOT_DRAFTS_ENABLED==='true'` |
| Approval-gated draft store | `src/lib/margot/draft-store.ts` tables `margot_email_draft` + `margot_draft_approval`, lifecycle `awaiting_approval→approved→sent` | Exists |
| Approve route | `src/app/api/margot/drafts/[id]/approve/route.ts` | Exists |
| Multi-account inbox poll | `src/app/api/cron/email-triage/route.ts:19` loops every connected account | Exists |
| Per-email token | `src/lib/integrations/google-oauth.ts:118` `getAccessTokenForEmail(founderId,email)` | Exists |
| Gmail send | `src/lib/integrations/gmail.ts:462` `sendReply(...)` | Exists |
| Settings per-account row (attach point) | `EmailIntegrationsSection.tsx:277` per-`<li>` account controls | Shipped #874 |
| Copywriter standard | `~/.claude/skills/nexus-copywriter` (skill, not code) | Prompt standard to adopt |

**Absent**: a per-account voice store; the drafter wired to run per connected account; a
per-account "agent" affordance in settings; any Gmail `drafts.create` (drafts live as the
internal `margot_email_draft` record, which is correct — approval-gated, not a raw Gmail draft).

## 6. Specialist board (15-yr perspectives)

- **Product**: the value is *per-account* voice + approval-gated drafts. Don't ship a generic
  single-voice drafter — that already exists and is off. Ship the per-account layer.
- **Architect**: extend `FounderVoice` into a founder-scoped, account-keyed store; the drafter
  already accepts a voice arg — inject the account's voice. No new agent, no new engine.
- **Security**: voice config is founder-scoped data (`.eq('founder_id', …)` + RLS). No tokens,
  no PII beyond the founder's own settings. Drafting stays approval-gated; never auto-send.
- **UX**: attach a "Copywriter voice" editor to the existing per-account row (`li:277`). Honest
  empty state when no voice is set (falls back to a sensible default, labelled as default).
- **QA**: the crux is per-account key isolation — account A's voice must never leak to account B.
  Mirror the #874 regression-guard discipline.
- **Devil's advocate**: activating the drafter across the founder's real mailboxes is a
  behaviour change touching real email content. That activation is **founder-gated and NOT in
  slice 1** — slice 1 ships inert voice config + drafter voice-selection only, dark by default.

## 7. Judge challenge

Full multi-account auto-drafting in one build would (a) duplicate/rewire the dormant drafter,
(b) turn on LLM drafting across live mailboxes — a behaviour change — and (c) be too large to
verify to a real 100/100. **REDUCE SCOPE.** Slice 1 below is independently valuable, dark by
default, and 100/100-able. Activation (Slice 2) is a separate, founder-gated build.

## 8. Proposed solution — Slice 1 (this build)

**Per-account copywriter voice, consumed by the existing drafter. Dark by default.**

1. **Store**: `email_account_voice` table — `founder_id`, `account_email`, `name`, `sign_off`,
   `tone_guidelines text[]`, `never_do text[]`, timestamps. RLS founder-scoped
   (`.claude/rules/database/supabase.md`). Unique on `(founder_id, account_email)`.
2. **Accessor**: `src/lib/margot/account-voice.ts` — `getAccountVoice(founderId, email)` returns
   the stored `FounderVoice` or a labelled default; `saveAccountVoice(...)` upserts on
   `(founder_id, account_email)`. Reuses the `FounderVoice` type from `draft-reply-prompt.ts`.
3. **Drafter wiring**: `POST /api/margot/drafts` resolves the voice via `getAccountVoice` for the
   target account instead of a single global voice. **No change to the dormant `MARGOT_DRAFTS_ENABLED`
   gate** — the drafter stays off; this only changes *which* voice it would use when on.
4. **Copywriter uplift**: fold the `nexus-copywriter` calibration (evidence discipline —
   never invent facts, already present; plus concise conversion-aware register) into the voice
   default's `toneGuidelines`. Prompt-only; no new dependency.
5. **Settings UI**: a "Copywriter voice" editor on the existing per-account row
   (`EmailIntegrationsSection.tsx:277`) — read/edit name, sign-off, tone bullets, never-do
   bullets; `GET/PUT /api/settings/integrations/voice`. Honest default-vs-custom labelling.

## 9. UX

Per-account row gains a "Copywriter voice" disclosure. Collapsed by default; expands to the
editor. Empty state: "Using the default voice" with an Edit affordance. Save → inline confirm,
`aria-live` status (mirror #874 a11y). No account switch, no send controls here.

## 10. Technical

- Migration `supabase/migrations/<ts>_email_account_voice.sql` — table + RLS + FORCE RLS + unique
  index. Type regen (`src/types/database.ts`). **Migration is founder-gated / dark** — validated
  on a Supabase branch first per `CLAUDE.md`; never applied to prod in this build.
- Server accessor + route under existing `src/app/api/settings/integrations/`.
- Drafter route reads voice by account; default voice constant lives beside the accessor.
- No new deps. Lucide for any icon. `rounded-sm`. `.eq('founder_id', …)` on every query.

## 11. Security

Founder-scoped + RLS on `email_account_voice`. No tokens/PII. Drafting stays approval-gated and
off. Voice text is founder-authored config. Audit-log the voice upsert if the row touches
`credentials_vault` — it does not, so standard founder-scope suffices.

## 12. Verification

`pnpm run type-check && pnpm run lint && pnpm vitest run && SKIP_ENV_VALIDATION=1 pnpm run build`
— all green on the pushed tip (I re-run, not the build agent — merge-gate #2). Plus:
- unit: `getAccountVoice` returns default when unset, stored voice when set, **never** account B's
  voice for account A (isolation guard, mirrors #874 callback-append test);
- unit: `saveAccountVoice` upserts on `(founder_id, account_email)` — no duplicate rows;
- component: voice editor renders default state, edits, saves, surfaces error;
- route: founder-auth required, rejects unknown account, validates payload.

## 13. Loop + stress testing

Stress the isolation crux: two accounts, distinct voices, interleaved reads. Empty tone/never-do
arrays. Very long tone bullets. Unicode sign-off. Unknown account email → default, no throw.

## 14. Acceptance criteria (goal-ready)

1. `email_account_voice` migration + RLS exists; types regenerated; validated on a Supabase
   branch (NOT prod).
2. `getAccountVoice`/`saveAccountVoice` implemented with per-account isolation, tested.
3. `POST /api/margot/drafts` resolves voice per target account; drafter remains behind
   `MARGOT_DRAFTS_ENABLED` (unchanged, still off).
4. Settings per-account "Copywriter voice" editor wired to `GET/PUT …/voice`, a11y per #874.
5. All gates green on the pushed tip (self-run). Codex `--sandbox read-only` CONFIRMED. Judge a
   real **100/100**. Draft PR into `main`.
6. Dark-by-default proven: nothing drafts or sends automatically; voice config is inert until the
   separately-gated Slice 2 activation.

## 15. Deferred — Slice 2 (separate, founder-gated build, NOT now)

Wire the triage cron to generate an approval-gated draft per connected account; a per-account
"agent on/off" toggle; the founder-gated flip of `MARGOT_DRAFTS_ENABLED` to light live drafting.
This is a behaviour change over real mailboxes — it ships only after Slice 1, on its own gate.

## 16. Goal command

```
/goal Build Slice 1 of task #21 per docs/specs/task-21-email-copywriter-agent-spec.md:
per-account copywriter voice store (email_account_voice + RLS, validated on a Supabase branch,
NOT prod), getAccountVoice/saveAccountVoice with per-account isolation, wire POST /api/margot/drafts
to resolve voice per target account (leave MARGOT_DRAFTS_ENABLED off), and a per-account
"Copywriter voice" editor on EmailIntegrationsSection (GET/PUT /api/settings/integrations/voice,
a11y per #874). Dark by default, founder-scoped, en-AU, no new deps. Gate green on the pushed tip
(self-run), codex --sandbox read-only CONFIRMED, judge a real 100/100, then open a draft PR into main.
```

## 17. Implementation sequence

1. Migration + RLS + unique index → validate on Supabase branch → regen types.
2. `account-voice.ts` accessor + default voice constant + unit tests (isolation crux first).
3. Wire drafter route to per-account voice + test.
4. Settings voice editor + route + component/route tests.
5. Full gauntlet self-run → codex → judge 100 → draft PR.

## 18. Session-handoff seed

Task #21 Slice 1 spec written. Engine is the dormant Margot founder-voice drafter (reuse, do not
duplicate). Slice 1 = per-account voice config, inert/dark until the founder-gated Slice 2
activation. Next: `/goal` the Slice 1 command under codex + judge-100, draft PR into main.

## 19. Final recommendation

**APPROVE BUILD — Slice 1 only.** It is independently valuable, reuses the existing engine,
ships dark, and is verifiable to a real 100/100. Slice 2 (activation over live mailboxes) is a
separate founder-gated build.

SPM spec complete. Next safe action: run the Slice 1 `/goal` command under codex + judge-100 and open a draft PR into main.

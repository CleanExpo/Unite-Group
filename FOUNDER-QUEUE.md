# FOUNDER QUEUE

The decisions held by Phill, with their age in public. Latency here is the most
expensive thing in the build — most of these are minutes of founder time holding
up days of machine time.

## What belongs here

A row is founder-held for one of two reasons, and the row must say which:

- **By class** — a credential only Phill holds, a spend commitment, a strategic
  or constitutional choice. No agent can make these, by construction.
- **By explicit reservation** — Phill has typed that a specific decision is his
  even though an engineer could otherwise make it. These carry the date of the
  reservation in Context.

Everything else belongs to engineering under the decision-rights matrix, and
parking it here manufactures a founder blocker that does not exist. The
independent review caught exactly that: D19 was a CI substrate choice, which is
engineering's call by class, and it sat here only because Phill reserved it.
He resolved it on 17/08/2026 — see Resolved.

## Rules

- Sessions may **APPEND** a row and **SURFACE** it. Sessions may never **decide**
  a row, and never **delete** one.
- A resolved row **moves** to the Resolved section with its decision text and
  date. It is not edited in place and not removed.
- **Age is computed on read, and this file does not hold it.** The Age column
  reads `—` on purpose. An age decays every midnight, so a number committed here
  is wrong within a day — F2 and F6 sat at 41 while the real answer was 42, one
  day after they were written. Get the age from
  `node scripts/founder-queue.mjs`, which prints a JSON summary with a computed
  `ageDays`. `--render` rewrites the column back to `—`, so a number typed in by
  hand is erased rather than trusted.
- **`Opened` is the state; the age is derived from it.** State is stored and
  replaced; derived values are recomputed and never stored. That is why this file
  keeps the date and not the number.
- `Opened` is the date the decision was first recorded here, unless a dated
  source predates it — where a Linear ticket or `.spm/` file is the origin, that
  date is used and cited in Context.

## Open

| ID | Decision | Opened | Age (days) | Blocks | Context | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Flip the identity env var in prod | 2026-08-16 | — | identity cutover | Founder-only credential change; no agent may set it | open |
| F2 | Click Connect Google in the CRM Integrations panel | 2026-07-06 | — | UNI-2329, founder half of UNI-2344 | Per-founder OAuth into `credentials_vault`; client id/secret already in prod, so it is one consent click | open |
| F3 | Xero connection | 2026-08-16 | — | finance reporting | Founder-held credential; no agent path | open |
| F4 | Cost metering decision | 2026-08-16 | — | spend visibility | Which meter, and the cap that trips it | open |
| F5 | Provide LINEAR_API_KEY to prod | 2026-08-16 | — | Linear-backed automation | Founder-only secret | open |
| F6 | Retrieve/create the three social platform app secrets | 2026-07-06 | — | UNI-2331 | Connectors already built; only FACEBOOK_APP_SECRET, LINKEDIN_*, TIKTOK_* are missing | open |
| F7 | Stripe connection | 2026-08-16 | — | billing, and therefore the metric of record | Blocks paying customers directly | open |
| P9 | Sign off the arming checklist | 2026-08-07 | — | P9 go-live | Per `.spm/2026-08-07-p9-board-meetings-collision.md` | open |
| F11 | Sign off `@elevenlabs/react` for apps/web; set `ELEVENLABS_SITE_AGENT_ID` in production only after the durable daily mint cap ships | 2026-07-13 | — | UNI-2354 verify step 5 (voice) | New dependency needs founder sign-off under the apps/web no-new-deps rule; recorded in the header of `/api/agent/voice/signed-url` since #818 (13/07/2026). That header also requires a durable per-key/per-founder daily mint cap before the agent ID is set, so `ELEVENLABS_SITE_AGENT_ID` stays unset until UNI-2917 (#1169) is merged and verified alongside F9's non-empty allow-list | open |
| F12 | Provide a SendGrid-verified sender address for `SENDGRID_FROM_EMAIL` | 2026-10-06 | — | UNI-2291 drip go-live, UNI-2354 verify step 3 | `SENDGRID_FROM_EMAIL` is absent from unite-group production, preview and development, and from unite-group-sandbox production (`vercel env ls`, 06/10/2026). Sender verification is a SendGrid account action; no agent may invent an address | open |
| F13 | Merge the AI Websites PRs | 2026-10-06 | — | UNI-2354 verify (migrations applied, site key activated) | By explicit reservation: merge authority is UNI-2923, reserved by Phill on 06/10/2026. Agents bring PRs to green and stop | open |
| F14 | Rule the public lead-capture path: keep `/api/leads` and amend the spec, or wire `aiw_lead_intake` + promotion and retire the public service-role write | 2026-10-06 | — | UNI-2919 (lead form in the widget), UNI-2354 verify step 2 | By explicit reservation: Phill, 06/10/2026, directed that without a recorded Board ruling this is queued here and not built, so no third capture path appears. No ruling is recorded on UNI-2354 or UNI-2919 (read 06/10/2026). Spec §5.2(3) forbids public `crm_leads` writes; `/api/leads` on main writes `crm_leads` through the service-role client | open |

## Resolved

| ID | Decision | Opened | Resolved | Decision text |
| --- | --- | --- | --- | --- |
| F8 | Rotate ANTHROPIC_API_KEY on Vercel prod | 2026-08-18 | 2026-08-18 | **New Anthropic key added by Phill, 18/08/2026, with a US$20 hard limit — and it must be used LAST.** Provider priority is now OpenRouter FIRST with `OPENROUTER_MODEL` roster head `qwen/qwen3.8-27b` (model ID verified live on OpenRouter 18/08/2026); Anthropic is the fallback of last resort under the $20 cap. Opened same day as the census that found the 401 outage (daily since 12/08). Outcome receipt pending: the next strategy-daily run (16:00Z) clearing the 401 cluster proves the key; the OpenRouter-first rewiring is engineering work tracked in Linear |
| D19 | SPINE_DATABASE_URL vs ephemeral Postgres in CI | 2026-08-16 | 2026-08-17 | **Ephemeral Postgres in CI.** Phill, 17/08/2026: the spine gate spins its own throwaway database inside the workflow. `SPINE_DATABASE_URL` never enters CI or any workflow — it is not a secret to be stored, rotated or scoped, because CI never holds one. This closes the dependency permanently rather than managing it forever. Implemented in #1022 via an ephemeral Supabase started in-job; no workflow reads `secrets.SPINE_DATABASE_URL` — its only occurrences in `.github/` are comments recording that deliberate absence |
| F9 | Mint the first production site key for the public site agent, with a non-empty `allowed_origins` | 2026-10-05 | 2026-10-06 | **Create it inactive.** Phill, 06/10/2026: one production site key for unite-group.in, business_key `unite-hub`, allowed_origins `{https://unite-group.in}`, `active = false`; activate only after #1169 is merged and its migration applied. Read back 06/10/2026: the row exists (created 05/10/2026) with those values and is inactive |
| F10 | Name the controlled recipient address and approve one test drip campaign for the UNI-2354 verify | 2026-10-05 | 2026-10-06 | **Recipient named, one test campaign approved.** Phill, 06/10/2026: the controlled recipient is the founder's personal inbox (address given in the instruction, not recorded in this public file) and one test drip campaign is approved. Sends stay behind the UNI-2918/UNI-2291 consent and unsubscribe gates |

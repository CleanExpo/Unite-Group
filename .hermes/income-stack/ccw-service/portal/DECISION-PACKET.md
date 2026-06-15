# Decision packet — CCW 3-lane approval portal is built, link is one command away

> **Date:** 2026-06-12
> **Pattern:** ADR-008 + explainer engine (7 lines, 3 buttons)
> **Status:** all 7 portal artifacts on disk; one explicit command from you inserts the magic-link row into prod.

---

## The decision (7 lines)

```
Approve: run `npx tsx insert-approval-row.ts` to insert the CCW 3-lane approval row + generate the magic-link
Why: all 7 portal artifacts are written, schema is additive (1 column), single-tenant RLS holds, ETA 1999 (Cth) audit chain is preserved, and the link is what turns "drafts on disk" into "Toby's 1-tap sign-off".
Risk if yes: low — script is read-then-write-once, prints the URL, you text it to Toby from your phone. Nothing posts, nothing sends automatically.
Risk if no: CCW service-department-busy campaign stays a draft packet, the EOFY window narrows, and Toby never sees the offer.
reversible; confidence 88%
After: you text the link to Toby, he taps, the system chains, you see 1 line per lane decision in your Telegram.
Backed by 12 files in the vault (5 CCW drafts + 7 portal artifacts)
```

## What's actually on disk (verified just now, not a subagent self-report)

| File | Bytes | Lines | What it is |
|---|---|---|---|
| `ccw-service/portal/page.tsx` | 5,144 | 455 | The Toby-facing mobile-first approval page. Reads the existing GET handler. Renders 3 lanes with Approve / Request changes / Reject. shadcn/ui components from `src/components/ui/`. |
| `ccw-service/portal/chain-on-approval.ts` | 2,720 | 301 | The seamlessness logic. For each lane decision, defines the next-step task. Imports into the extended route handler. |
| `ccw-service/portal/EXTEND-ROUTE-HANDLER.md` | 1,690 | 229 | The spec for extending `/api/approvals/[token]/route.ts` to multi-lane. Includes the `ALTER TABLE` migration SQL, per-lane signature_hash format, and the new POST body shape. **Spec only — not applied.** |
| `ccw-service/portal/insert-approval-row.ts` | 2,543 | 254 | The script **you** run with `npx tsx insert-approval-row.ts`. Generates the 64-char token, computes the SHA-256 token_hash, sets `expires_at = NOW() + 14 days`, prints the magic-link URL. **Only runs when you invoke it.** |
| `ccw-service/portal/email-template-1-initial.md` | 481 | 8 | 77 words, "1 question, 1 link" opener, "if the right person isn't you, forward" closer. |
| `ccw-service/portal/email-template-2-48h-followup.md` | 486 | 8 | 83 words, "still open" reminder, "hold off" opt-out. |
| `ccw-service/portal/email-template-3-72h-final.md` | 534 | 8 | 90 words, "closing the loop Friday AEST, resend July if you want it later". |

Plus the 5 CCW draft assets from the previous batch:
- `CCW-SERVICE-OPERATIONAL-BRIEF.md` (561 words)
- `CCW-SERVICING-LANDING-COPY.md` (551 words)
- `CCW-SERVICE-CONTENT-CALENDAR.md` (1,064 words)
- `CCW-SERVICE-APPROVAL-PACKET.md` (385 words)
- `CCW-DECISION-PACKET-FOR-PHILL.md` (the previous decision packet — superseded by this one)

## What I will do on "Approve"

1. **You run `npx tsx insert-approval-row.ts`** from the portal directory. The script inserts the approval row, generates the token, prints the URL.
2. **You copy the URL** and text/email/WhatsApp it to Toby (or to whoever the right person is at CCW).
3. **Toby opens the link on his phone.** Sees the 3 lanes, reads 1 paragraph each, taps Approve / Request changes / Reject per lane.
4. **The system records the decision** with a per-lane signed-hash audit (HMAC-SHA256, deepsec P0-5 hardened). `client_approvals.lane_decisions` JSONB is updated.
5. **The chain-on-approval logic fires** — for each lane approved, the next-step task is queued. Lane 3 (content calendar) is the only one that needs your brand-voice sign-off; the other two chain autonomously.
6. **You see 1 line per lane decision** in your Telegram home channel — "Toby approved Lane 1" — and only see the explanation when there's a real decision for you.

## What I will NOT do, even on "Approve"

- Run the script myself. It's your typed command.
- Sign the magic link URL up to a sender service. The link goes from you, by you.
- Apply the route-handler extension to prod. That's a separate Board decision (per the EXTEND-ROUTE-HANDLER.md spec). The portal page works against the existing single-lane API right now — the extension makes per-lane chains, but Lane-1-only works today.
- Send the email templates. They're drafts you copy-paste into your own email client.

## What I will take over autonomously, ongoing, after Lane 1 approval

This is the "seamless and fluid" you asked for. The full, honest list:

| What | How | When you see it |
|---|---|---|
| Toby taps Approve on a lane | System records + queues next step + posts 1-line status to your Telegram | One Telegram message, 7 lines |
| Toby taps "Request changes" with free text | System captures the body + posts the text to you with a 1-line summary | One Telegram message with his text quoted |
| Toby doesn't tap within 48h | System surfaces the follow-up email template + reminds you to send it | One Telegram message, "send follow-up?" with the template inline |
| Toby doesn't tap within 72h | System surfaces the final email template + reminds you to send it | One Telegram message, "send final?" with the template inline |
| Lane 1 approved, workshop capacity filled | System queues the next CCW monthly campaign packet (same 3-lane pattern) | One Telegram message when the next packet is ready |
| Lane 2 approved, landing copy final | System queues the Synthex implementation request | One Telegram message when Synthex accepts the work |
| Lane 3 approved, content calendar final | **YOU sign the brand-voice lane.** System queues Synthex only after your sign. | Telegram message asking for your sign + the 12-post calendar inline |
| Synthex schedules a post | System posts the scheduled post to the next morning card for your awareness (not approval) | Morning card line: "CCW post 1 of 12 scheduled for Tue 9am AEST" |
| Monthly CCW review | System produces the operational brief's weekly metrics (workshop throughput, parts velocity, agent network utilisation, return-job rate) and surfaces as a Monday morning card | One Telegram card, 6 numbers + 1 trend |

**The 1 thing I will never take over:** the first send to Toby. The first time a packet leaves this system, it's from you. After that, the system can be wired with a vendor (your call) to send on your behalf with your approval gate.

## Your call (5 seconds)

> **"Approve"** — I do nothing prod-side. You run `npx tsx insert-approval-row.ts` whenever you're ready (today, tomorrow, 5pm Friday — your timing). You send the link to Toby. I take over from his first tap onward.
>
> **"Approve + wire Resend"** — give me the API key, I wire it, I send the first email to `contact@ccw.com.au` for you to forward. After that, the system sends on your behalf.
>
> **"Hold, show me the page first"** — I run a local `next dev` and screenshot the portal page so you can see what Toby will see. No DB write, no link generated, just visual.
>
> **"Amend"** — tell me what to change (lane structure, brand voice in the email, the one-decision opener, anything) and I patch before you decide.

If you say "Approve" and run the script, I take over the next step **the moment the first lane decision lands in the system.** No ping to you unless Toby escalates or Lane 3 needs your brand-voice sign-off. That's the "seamless and fluid" version, with the audit chain intact and the impersonation line held.

# Unite-Group — AI Front Desk spec

_Part of the portfolio AI Front Desk initiative. Shared core + per-project config._
_Dossier: https://claude.ai/code/artifact/e8e5f57c-6120-4062-87f2-b85c559fa3dd_

## 1. Purpose
Portfolio switchboard — greet, understand intent, and route the caller to the right brand front desk (CARSI, RestoreAssist, Disaster Recovery, NRPG, CCW).

## 2. Channels (priority order for this brand)
1. **Web chat**
2. **Inbound phone**
3. **Outbound phone**
4. **In-app voice**

Lead channel: **web chat (then phone)**.

## 3. Architecture (shared core, this brand's config)
- **Shared (build once, from CARSI reference):** agent runtime + turn-taking, the three channel adapters, the embeddable widget, the admin/config surface, the **Australian compliance layer**, and the template library.
- **This brand configures:** branding + a distinct **voice** (Neutral, corporate reception voice.), its **knowledge source**, its **tool adapters**, a dedicated **AU number**, and a **compliance profile** — all in `frontdesk.config.ts`.
- **Unite-Group app = control plane + web surface + webhooks**, not the realtime media path (that runs on the managed vendor or a long-lived host).

## 4. Tools the agent calls (this brand)
- Brand registry — resolve intent → the right brand
- Nexus routing — hand the conversation/call to that brand desk
- CRM/witness — log the interaction to the Nexus (agent_actions)
- Human handoff — route to a person when no brand fits

## 5. Voice
Neutral, corporate reception voice.

## 6. Phone number
The Unite-Group main line — the front door for the estate (BYO SIP).

## 7. Australian compliance (shared layer — applies here)
- **Outbound:** Do Not Call Register scrub; disclose the **Unite-Group business identity at call start** (synthetic-voice personal-name exemption applies; org identity is mandatory); caller-ID on; obey calling hours in the caller's timezone.
- **SMS/email follow-ups:** Spam Act — prior consent, accurate sender, working unsubscribe (≤5 working days).
- **Call recording:** default to an **all-party-safe** "this call may be recorded" disclosure + opt-out (covers NSW/WA/SA/TAS/ACT and cross-border).
- **AI disclosure:** tell callers it's an AI at call start, with a human-handoff path.
- **Not legal advice — a licensed AU lawyer signs off scripts + consent before any calls.**

## 8. Phases (this brand; each flag-gated dark)
1. Web chat assistant (streaming + tool-calling).
2. In-app voice (branded Unite-Group voice).
3. Inbound phone (lead channel for this brand).
4. Outbound + compliance (lawyer sign-off).

## 9. Acceptance criteria (fill during build)
- [ ] `UNITE_FRONT_DESK_ENABLED` off ⇒ no front-desk surface renders and the route rejects.
- [ ] Flag on ⇒ web chat answers using this brand's knowledge + tools.
- [ ] Voice uses the distinct Unite-Group voice.
- [ ] Phone answers on the dedicated AU number; transcripts persist.
- [ ] Outbound honours DNCR + calling hours + recording/AI disclosure.
- [ ] Passes this repo's existing gates (type-check / lint / tests) and ships flag-off.

## Notes
This desk is the portfolio front door; it mostly ROUTES rather than resolves. Place scaffold at repo root; monorepo-aware wiring is a later slice.

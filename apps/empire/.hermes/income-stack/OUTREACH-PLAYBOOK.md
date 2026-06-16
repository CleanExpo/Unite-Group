# Cold Outreach Playbook — AU Restoration Stack

**Date:** 2026-06-12
**Status:** Honest list. No fabricated contact names. No invented company lists.

This is the **who + how** of getting the first $ in. Three buyer profiles, one per product, with sourced candidate paths (not invented lists). Every name in here is either pulled from a doc we already have or flagged as "source TBD" so Phill can fill the gap.

---

## Why this is not a 500-name spreadsheet

We don't have a CRM with AU restoration contacts sitting on disk. The audit found:
- RestoreAssist prod has 51 invites pending and 72 users, but the actual org/contact list is behind Supabase RLS and an audit-blocked query path.
- DR-NRPG has a `contractorProfile.findMany` query staged for the recruitment email — but we did not run it (read-only audit, no DB writes).
- CARSI has Stripe-checkout customers but no contact export we can read locally without touching prod.

So this playbook tells you **where to find the first 10 of each**, not who they are by name.

---

## Profile 1: CARSI — IICRC renewal course buyer (individual AU tech)

**Who:** Time-poor AU restoration technician (water-damage / mould / carpet / fire), already IICRC-certified or working toward it, employed by a restoration company. They buy for themselves, paid out of pocket or expensed to their employer.

**Where to find the first 10:**
1. **Linkedin-campaign docs already name 4 industry verticals** (mining, aged care, property management, healthcare). The campaign brief at `~/CARSI/docs/marketing/linkedin-campaign.md` has hooks + CPL targets per vertical — use those verticals as the targeting filter.
2. **The 8 live industry pages** on carsi.com.au (aged care, childcare, healthcare, construction, property mgmt, govt/defence, commercial cleaning, mining) each have a CTA. Drive paid traffic to the highest-CPL page first per the campaign doc.
3. **IICRC Australia Approved Registered Schools list** — public, not on our disk, but Phill can pull the practitioner directory from iicrc.org and filter for AU CEC holders.
4. **The existing 72 RestoreAssist users** — many are AU restoration company staff who have IICRC techs. Cross-sell CARSI to them via in-app banner. Requires Phill to approve the cross-promo.

**Email 1 — individual tech (subject):**
> "Stay IICRC-certified without the scramble"

**Email 1 — body (3 short paragraphs):**
> Hi [first name],
>
> Most AU restoration techs I talk to lose 5-10 hours a year hunting for the right CEC course at the right time, and the renewal date still creeps up. CARSI is the only AU training library built around the IICRC renewal cycle, not the other way round.
>
> $44/mo Foundation or $99/mo Growth, 7-day free trial, IICRC CEC tracking dashboard, shareable credential profile for employer/insurer conversations.
>
> If your renewal is in the next 6 months, the free trial alone is worth a look: carsi.com.au/pricing.

**Follow-up cadence:** day 3 nudge, day 7 trial-day nudge, day 14 final ask. No phone numbers (NRPG-style online-only model carries over to be consistent with the stack's brand).

---

## Profile 2: RestoreAssist — compliance platform buyer (AU restoration company owner/manager)

**Who:** Owner or operations manager of an AU restoration company with 2-50 techs. They buy because: (a) NIR compliance is getting harder, (b) their insurance work demands audit trails, (c) they're tired of spreadsheets.

**Where to find the first 10:**
1. **The 51 pending invites in RA prod** — these are people who clicked "join" but haven't completed. Worth a one-touch re-engagement. Phill must approve the query.
2. **The 56 orgs in RA prod** — existing customers, ripe for the next-tier upsell (Stripe upgrade paths already shipped per Sprint M).
3. **Pilot list (RA-1723, RA-1724):** Beyond Clean, Elite, CRSA — names from the master plan. The soft pilot is owner-gated, so the names are real but the cutover needs Phill's go.
4. **AU industry associations:** Restoration Industry Association (RIA) AU chapter, IICRC Approved Schools — Phill has contact via the existing industry-page partnerships.

**Email 1 — owner/manager (subject):**
> "Your NIR reports, defensible in one platform"

**Email 1 — body (3 short paragraphs):**
> Hi [first name],
>
> Most AU restoration owners I talk to spend 3-5 hours per job reconciling what the tech wrote on-site, what NIR requires, and what the insurer is asking for. RestoreAssist pulls that into one workflow: NIR-compliant templates, AU GST/ABN built in, IICRC S500:2025 citations in the report, magic-byte-validated uploads.
>
> $79 per technician per month. Already in production at restoreassist.app with 56 AU organisations on it today.
>
> Happy to walk you through a 20-minute demo with your own job data: [calendly/cal.com link TBD].

**Follow-up cadence:** day 2, day 5, day 10. Different from CARSI cadence because the buyer is a manager, not a tech — slower, more demo-led.

---

## Profile 3: DR-NRPG — contractor subscription buyer (AU restoration contractor)

**Who:** Owner of a 1-15-person restoration contractor business (water, fire, mould) operating in one AU service area. They buy because: (a) they want matched leads without running a sales office, (b) they want SEO presence in their service area, (c) they want an online-only model (no phone selling).

**Where to find the first 10:**
1. **The 20-recipient recruitment list is already drafted** in `~/DR-NRPG/.claude/STAGE-6-RECRUITMENT-EMAIL-BATCH.md`. The script is at `scripts/send-contractor-recruitment-emails.ts`. **This is the literal "income one command away" lane.** Phill approves a `--dry-run` first, then a live send.
2. **Stage-6 selection criteria are documented:** active contractors, last job <3 months, geo diversity NSW/VIC/QLD/WA/SA, experience mix 50/50, specialty mix water/fire/general. The send script should honour those criteria.
3. **The 95% production-ready code** is the offer's anchor — the platform is built, the pricing is in code, the agency model is defined. The pitch is "your leads are being matched, here's the tier for your area."

**Email 1 — contractor (subject):**
> "Get matched with restoration leads in your service area — online only"

**Email 1 — body (3 short paragraphs):**
> Hi [first name],
>
> NRPG is a marketing-agency model for AU restoration contractors: clients submit jobs online, we match you to the ones in your service area, and the customer support is online-only. No phone calls, no sales pressure.
>
> Pricing is by your service area population: $395/mo (rural) up to $1,095/mo (Tier 3 metro). 7-day onboarding, no lock-in.
>
> If you're taking on work in [their area], reply to this email with your service area postcode and we'll send through the matching tier and the first 3 jobs in your zone.

**Follow-up cadence:** day 3, day 7, day 14. Online-only, no phone numbers — hard rule per the NRPG model.

---

## Cross-product plays (highest leverage)

1. **RestoreAssist user → CARSI upsell.** The 72 RA users and 51 pending invites are already in the AU restoration vertical. A banner in the RA dashboard offering "stay certified — CARSI CEC courses $44/mo" is the cheapest possible CARSI customer. Phill to approve the cross-promo.
2. **DR-NRPG contractor → RestoreAssist upsell.** Once a contractor is on NRPG, the next conversation is "your techs need compliance tooling too" — RestoreAssist $79/tech/mo. The agency model and the compliance model are complementary, not competing.
3. **CARSI student → NRPG contractor (B2C flip).** A student on CARSI's "Starting a Business course" (priced into Foundation) is exactly the persona who would later subscribe to NRPG as a contractor. Long game, but it's free to plant the seed in the course completion page.

---

## What I did not do (Phill must)

1. **Pull live contact lists from any Supabase project.** This audit is read-only. Phill must run the queries (or approve me running them) to get the real 51-pending-invites list and the 20-NRPG-contractors list.
2. **Sign up for a new email-sending vendor.** The NRPG script already uses SendGrid or platform email — both are pre-approved. If we need a new sender for CARSI or RA outreach, that's a vendor decision for Phill.
3. **Send any of these emails.** All three sequences are drafts, ready for Phill's review and approval to send.

---

## Verification commands (runnable today)

```bash
# Confirm send script exists
test -f ~/DR-NRPG/scripts/send-contractor-recruitment-emails.ts && echo OK

# Confirm pricing page is live
rg -n "Foundation|\\\$44/mo|\\\$99/mo" ~/CARSI/app/\(public\)/pricing/page.tsx

# Confirm RA has real prod data
rg -n "72 Users|56 Organizations|51 invites" ~/RestoreAssist/.claude/aggregation/MASTER_PLAN.md

# Confirm recruitment email body is still on disk
rg -n "You're Invited: Beta Test" ~/DR-NRPG/.claude/STAGE-6-RECRUITMENT-EMAIL-BATCH.md
```

All four should return matches. If any don't, the source has drifted and this playbook needs a refresh.

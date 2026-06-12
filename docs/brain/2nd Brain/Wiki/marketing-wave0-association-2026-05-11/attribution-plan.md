---
type: marketing-deliverable
artifact: attribution-plan
wave: 4
campaign: nrpg-association-wave0-2026-05-11
brand: nrpg
updated: 2026-05-11
status: locked
supabase-project: zbryrmxmgfmslqzizsto
supabase-table: interest_signups
success-gates:
  - coutis-contract-signed-by-2026-05-25
  - first-coutis-video-1k-views-7d
  - 50-interest-signups-by-2026-05-31
positioningRef: ./positioning-doc.md
icpRef: ./icp-research.md
channelRef: ./channel-plan.md
landingRef: ./landing-spec.md
runbookRef: ./launch-runbook.md
---

# Attribution Plan — Wave-0 NRPG Association Launch

> **INTERNAL — Unite-Group portfolio only — do not distribute publicly 2026-05-11**

Skill: `marketing-analytics-attribution` · Wave 4 · job `nrpg-association-wave0-2026-05-11`.

Owns "did this work, how did we know, where did the credit go". Instrumented before launch — post-hoc UTM-tagging loses the data.

Hard constraints carried through:
- All UTM values **lowercase + hyphens** (no underscores, no caps — pipe-friendly across LinkedIn, GA4, Supabase).
- `utm_campaign` is constant across all 30+ rows: `nrpg-assoc-wave0-2026-05-11`.
- No PII feeds the dashboard — Supabase `interest_signups` rows carry names/emails; only aggregates leave the table.
- Source-of-truth for conversion: Supabase `interest_signups.utm_*` columns, populated by the landing-form submit handler per `landing-spec.md` Section 8.

---

## 1. UTM Scheme (Canonical)

Tab-delimited table. One row per (day × channel × author × asset). Every link emitted by `marketing-copywriter`, `marketing-social-content`, or `remotion-render-pipeline` MUST match exactly one row.

```
utm_source	utm_medium	utm_campaign	utm_content	utm_term
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d0-phill-launch-post	founder
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d0-phill-launch-post-comment-cta	founder
linkedin	organic-video	nrpg-assoc-wave0-2026-05-11	d1-coutis-intro-native	general
linkedin	post	nrpg-assoc-wave0-2026-05-11	d1-coutis-intro-link-post	general
youtube	organic-video	nrpg-assoc-wave0-2026-05-11	d1-coutis-intro-yt-description	general
youtube	organic-video	nrpg-assoc-wave0-2026-05-11	d1-coutis-intro-yt-endscreen	general
youtube	organic-video	nrpg-assoc-wave0-2026-05-11	d1-coutis-intro-yt-pinned-comment	general
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d2-phill-pain3-doc-carousel	firm
linkedin	post	nrpg-assoc-wave0-2026-05-11	d2-phill-pain3-text-cta	firm
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d3-toby-amplification-post	firm
linkedin	post	nrpg-assoc-wave0-2026-05-11	d3-toby-linkedin-bio-link	firm
telegram	dm	nrpg-assoc-wave0-2026-05-11	d3-toby-fb-restoration-trade-talk	firm
telegram	dm	nrpg-assoc-wave0-2026-05-11	d3-toby-whatsapp-peer-outreach	firm
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d4-phill-scarcity-founder-100	founder
linkedin	post	nrpg-assoc-wave0-2026-05-11	d4-phill-scarcity-counter-cta	founder
linkedin	comment	nrpg-assoc-wave0-2026-05-11	d4-phill-scarcity-reply-cta	founder
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d5-brand-page-recap	general
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d5-brand-page-recap-link	general
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d6-phill-week2-post-1	firm
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d8-phill-week2-post-2	firm
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d10-phill-week2-post-3	firm
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d11-brand-page-week2	general
linkedin	story	nrpg-assoc-wave0-2026-05-11	d12-phill-founding-partner-rotation	firm
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d14-phill-coutis-contract-reveal	general
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d16-phill-week3-push-1	founder
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d18-phill-week3-push-2	founder
linkedin	organic-social	nrpg-assoc-wave0-2026-05-11	d20-phill-final-push	founder
telegram	dm	nrpg-assoc-wave0-2026-05-11	d14-toby-phone-peer-outreach	enterprise
telegram	dm	nrpg-assoc-wave0-2026-05-11	d18-toby-whatsapp-final-push	firm
iaq_magazine	post	nrpg-assoc-wave0-2026-05-11	iaq-column-may2026-author-bio	general
iaq_magazine	post	nrpg-assoc-wave0-2026-05-11	iaq-pitch-editor-dm	general
direct	none	nrpg-assoc-wave0-2026-05-11	d-na-organic-search-anz-assoc	general
direct	none	nrpg-assoc-wave0-2026-05-11	d-na-brand-search-nrpg	general
```

**Row count: 33** (target ≥30 ✓).

### UTM hygiene rules

1. The `direct` rows carry `utm_medium=none` and exist so GA4 reports always resolve a source — never blank.
2. The `iaq_magazine` rows are speculative — IAQ Magazine's website cannot be persuaded to carry UTMs through. The tag is set so when an `interest_signups` row arrives via that author-bio link the source resolves, but the magazine-print referral path is untrackable (see Section 7 — gaps).
3. `utm_term` carries **tier intent** (`founder` / `firm` / `enterprise` / `sole-trader` / `general`), NOT a paid keyword. Lets the dashboard slice "which tier did each asset drive?" — load-bearing for Pillar-1 messaging tuning.
4. The Founder-tier-flavoured posts (d0, d4, d16, d18, d20) all carry `utm_term=founder` so the dashboard answers "did the scarcity narrative produce Founder signups, or did it cannibalise into Firm tier?".

### Worked URL examples

```
https://unitegroup.in/association?utm_source=linkedin&utm_medium=organic-social&utm_campaign=nrpg-assoc-wave0-2026-05-11&utm_content=d0-phill-launch-post&utm_term=founder

https://unitegroup.in/association?utm_source=youtube&utm_medium=organic-video&utm_campaign=nrpg-assoc-wave0-2026-05-11&utm_content=d1-coutis-intro-yt-description&utm_term=general

https://unitegroup.in/association?utm_source=linkedin&utm_medium=organic-social&utm_campaign=nrpg-assoc-wave0-2026-05-11&utm_content=d4-phill-scarcity-founder-100&utm_term=founder

https://unitegroup.in/association?utm_source=telegram&utm_medium=dm&utm_campaign=nrpg-assoc-wave0-2026-05-11&utm_content=d3-toby-fb-restoration-trade-talk&utm_term=firm
```

The shortlink wrapper for LinkedIn posts: `unite.group/a/{utm_content}` redirects to the full-UTM URL above. Lets Phill post a tight URL in copy while the analytics layer still receives full parameters.

---

## 2. Attribution Model Decision

**Run two models side-by-side. Document both. Tie-break with last-touch for the 50-signup gate.**

### Decision

- **First-touch** — credits the first asset that brought the visitor (cookie set on first landing-page hit, stored in localStorage + Supabase `interest_signups.first_touch_utm`). Answers: "which channel discovered the ICP?"
- **Last-touch** — credits the last asset before the form submission (URL params at submit time stored in `interest_signups.last_touch_utm`). Answers: "which asset converted?"
- **Position-based (40/20/40)** — distributes credit across first, middle, last touches via PostHog Insights (if PostHog wired) or GA4 Explorations (fallback). Answers: "what's the journey shape?"

### Rationale

Wave-0 is the discovery wave — the campaign has never run before, so the ICP cookie pool is empty. **First-touch is essential for ICP-channel-fit insight** (does LinkedIn-Phill or LinkedIn-Toby discover more firms?). **Last-touch is essential for conversion attribution** to specific assets (did the scarcity post or the Toby amplification post seal the click?). Running both side-by-side reveals the gap between awareness driver and conversion driver — exactly the question Phill needs answered before Wave-1 paid spend is committed.

Position-based runs in the background as a sanity check; if first and last disagree wildly, the 40/20/40 model surfaces whether a mid-funnel touch (e.g. the Coutis video) is doing the silent work.

### What this rules out

- **Pure single-touch (only first OR only last)** — collapses the question Phill is trying to answer. Rejected.
- **Linear / time-decay** — Wave-0 cycle is too short (21 days) for time-decay to differ meaningfully from linear. Rejected.

### Wiring

```
PostHog (if available)
  → Insight: "First-touch source vs Last-touch source — Wave-0"
  → Cohort: anyone who hit unitegroup.in/association during 2026-05-11 → 2026-05-31
  → Group by: first_touch_utm_source, last_touch_utm_source

GA4 (fallback)
  → Exploration: "Path Exploration" with Wave-0 audience filter
  → Conversion: form_submit event on unitegroup.in/association
  → Path: source/medium across all touchpoints
```

If neither tool is wired by D0, the Supabase columns `first_touch_utm` and `last_touch_utm` populate from the landing-form submit handler — manual SQL aggregation runs the dashboard until tooling lands.

---

## 3. KPI Dashboard Structure

Three success gates from the wave-plan. One dashboard tile per gate. PII stays in Supabase; only aggregates surface.

### Tile 1 — Coutis Engagement Contract Signed

| Field | Value |
|---|---|
| Owner | Phill (direct) |
| Source | Linear ticket `RA-2974` (Coutis engagement) + Supabase `contracts.contract_signatures` row (if exists) — fallback: manual check by Phill |
| Refresh | Manual, once per day at 9am AEST |
| Status field | `in-negotiation` (default) → `signed` (terminal) → `outstanding` (alarm state if past D14) |
| Deadline countdown | Days remaining until 2026-05-25 |

**SQL (when contract row lands)**:
```sql
select
  status,
  signed_at,
  date(signed_at) as signed_date,
  ('2026-05-25'::date - current_date) as days_to_deadline
from contracts.contract_signatures
where contract_id = 'coutis-engagement-2026-q2'
order by signed_at desc nulls last
limit 1;
```

**Tile display**: `[ COUTIS CONTRACT — in-negotiation · 14 days to deadline ]`

If past deadline + still unsigned: tile flips to red, runbook escalates to `marketing-orchestrator`, all "Hosted by John Coutis OAM" language strips from future LinkedIn copy per channel-plan fallback rule.

### Tile 2 — First Coutis Video ≥1,000 views in 7d

| Field | Value |
|---|---|
| Owner | LinkedIn analytics + YouTube Studio (Phill checks via Studio) |
| Source | LinkedIn native video impressions + YouTube channel analytics, summed |
| Refresh | Hourly during D1-D8 window, daily thereafter |
| Window | 2026-05-12 00:00 AEST → 2026-05-19 23:59 AEST (D1 + 7d) |
| Display | Hourly view-count chart, projected 7-day total from current-hour trajectory |

**LinkedIn Analytics URL**:
```
https://www.linkedin.com/analytics/post-analytics/urn:li:activity:{POST_ID_D1_VIDEO}/
```
(POST_ID written into runbook at D1+1hr by Phill once the post is live.)

**YouTube Analytics URL**:
```
https://studio.youtube.com/video/{VIDEO_ID}/analytics/tab-overview/period-since_publish_specific
```

**Projection formula** (manual, runs in the daily standup):
```
projected_7d_views = (current_view_count / hours_elapsed) × 168
gate_status = projected_7d_views >= 1000 ? 'on-track' : 'at-risk'
```

**Tile display**: `[ COUTIS VIDEO — 412 views @ 36hr · projected 7d: 1,920 · ON TRACK ]`

If projected at D3 < 500: escalate to `marketing-orchestrator`. Founder-override path: paid boost authorisation (breaks Wave-0 organic-only constraint — explicit Phill sign-off required).

### Tile 3 — ≥50 Interest Signups by 2026-05-31

| Field | Value |
|---|---|
| Owner | Supabase auto-counter |
| Source | Supabase `interest_signups` row count, filtered by `campaign = 'nrpg-assoc-wave0-2026-05-11'` |
| Refresh | Real-time (Supabase realtime subscription on the landing page) + 5-min cache for dashboard |
| Window | 2026-05-11 00:00 AEST → 2026-05-31 23:59 AEST |
| Display | Running count, projection to 2026-05-31, breakdown by `utm_content` |

**Master SQL — running count**:
```sql
select
  count(*) filter (where campaign = 'nrpg-assoc-wave0-2026-05-11') as total_signups,
  count(*) filter (where campaign = 'nrpg-assoc-wave0-2026-05-11' and tier_interest = 'founder') as founder_signups,
  count(*) filter (where campaign = 'nrpg-assoc-wave0-2026-05-11' and tier_interest = 'firm') as firm_signups,
  count(*) filter (where campaign = 'nrpg-assoc-wave0-2026-05-11' and tier_interest = 'enterprise') as enterprise_signups,
  count(*) filter (where campaign = 'nrpg-assoc-wave0-2026-05-11' and tier_interest = 'sole-trader') as soletrader_signups,
  50 - count(*) filter (where campaign = 'nrpg-assoc-wave0-2026-05-11') as signups_to_target
from interest_signups;
```

**Master SQL — signups by day, with utm_content breakdown** (the dashboard tile):
```sql
select
  date_trunc('day', submitted_at at time zone 'Australia/Sydney') as signup_day,
  utm_content,
  utm_source,
  utm_term as tier_intent,
  count(*) as signups
from interest_signups
where campaign = 'nrpg-assoc-wave0-2026-05-11'
  and submitted_at >= '2026-05-11'::timestamptz
  and submitted_at < '2026-06-01'::timestamptz
group by 1, 2, 3, 4
order by signup_day asc, signups desc;
```

**Master SQL — projection to 2026-05-31**:
```sql
with run_rate as (
  select
    count(*)::numeric as current_count,
    extract(epoch from (now() - '2026-05-11'::timestamptz)) / 86400 as days_elapsed
  from interest_signups
  where campaign = 'nrpg-assoc-wave0-2026-05-11'
)
select
  current_count,
  round(current_count / nullif(days_elapsed, 0), 2) as signups_per_day,
  round((current_count / nullif(days_elapsed, 0)) * 20, 0) as projected_at_d20_2026_05_31,
  case
    when (current_count / nullif(days_elapsed, 0)) * 20 >= 50 then 'on-track'
    when (current_count / nullif(days_elapsed, 0)) * 20 >= 35 then 'at-risk'
    else 'off-track'
  end as gate_status
from run_rate;
```

**Tile display**: `[ INTEREST SIGNUPS — 23 / 50 · 5.2/day · projected D20: 67 · ON TRACK ]`

If at-risk at D14: trigger Wave-1 channel expansion early (email outreach to known peers, podcast pitch acceleration). If off-track at D14: founder-override decision on paid boost.

---

## 4. Daily Standup Format (T-0 to T+20)

Telegram message template — fires from the Supabase scheduled function at 09:00 AEST every day. Reads the three SQL queries above, formats, sends to Phill's bot channel.

```
NRPG Wave-0 Daily — D{N} ({DATE})

1. Signups: {total_signups} / 50  ({signups_per_day_avg}/day · proj D20: {projected}) — {gate_status_emoji_word}
2. Top driver yesterday: {top_utm_content} → {count_yesterday} signup(s)
3. Coutis video: {video_views_sum} views @ {hours_since_post}hr · proj 7d: {projected_video_views} — {video_gate_status}
4. Coutis contract: {contract_status} · {days_to_deadline} days to 25-May
5. Action for today: {next_runbook_milestone}
```

Five metrics, no more. The "Action for today" pulls from `launch-runbook.md` D{N} entry — answers "what does Phill do at 9:01am?".

Example (D3 morning):
```
NRPG Wave-0 Daily — D3 (Thu 14 May)

1. Signups: 17 / 50  (5.7/day · proj D20: 114) — ON TRACK
2. Top driver yesterday: d2-phill-pain3-doc-carousel → 8 signups
3. Coutis video: 687 views @ 38hr · proj 7d: 3,036 — ON TRACK
4. Coutis contract: in-negotiation · 11 days to 25-May
5. Action for today: Toby amplification post drops 7am AEST. Confirm Toby has copy.
```

### Standup escalation rules

- If line 1 gate_status flips to `at-risk` two days running → standup pings `marketing-orchestrator` for re-plan
- If line 3 projection drops below 500 at any check → immediate pager to Phill (separate Telegram message, red emoji)
- If line 4 still `in-negotiation` past D10 → daily reminder + draft alternate-headline copy

---

## 5. T+30 Retro Template

Runs 2026-06-10 (D30). Owner: `marketing-analytics-attribution` skill re-invocation with `retro=true` arg.

```markdown
# Wave-0 Retro — NRPG Association Launch
Date: 2026-06-10
Campaign ID: nrpg-assoc-wave0-2026-05-11
Window analysed: 2026-05-11 → 2026-05-31

## Gate-by-gate scorecard

| Gate | Target | Actual | Pass/Fail | Notes |
|---|---|---|---|---|
| Coutis contract signed by 2026-05-25 | 1 | {actual} | {pass/fail} | {note} |
| First Coutis video ≥1,000 views in 7d | 1,000 | {actual} | {pass/fail} | {note} |
| ≥50 interest signups by 2026-05-31 | 50 | {actual} | {pass/fail} | {note} |

## Attribution: first-touch vs last-touch (the headline insight)

| Asset (utm_content) | First-touch credit | Last-touch credit | Gap | Verdict |
|---|---|---|---|---|
| {asset-1} | {n} | {n} | {±n} | {discovery / conversion / both} |
| ... | ... | ... | ... | ... |

## What worked (3 max)

1. {asset / channel / message that over-performed — with attribution data}
2. ...
3. ...

## What did not work (3 max)

1. {asset / channel / message that under-performed — with attribution data}
2. ...
3. ...

## Biggest UTM-revealed surprise

The single most-surprising signal in the data. The thing that changes how Wave-1 gets planned. One paragraph.

## ICP signal — tier intent breakdown

| Tier intent | Signups | % of total | Implication |
|---|---|---|---|
| Founder | {n} | {%} | {does Founder scarcity drive Founder signups or cannibalise into Firm?} |
| Firm | {n} | {%} | {is the Member-as-a-Service bundle landing?} |
| Enterprise | {n} | {%} | {are franchise/multi-site leads coming organically?} |
| Sole-trader | {n} | {%} | {floor tier health-check} |

## Channel ROI ranking (organic — Wave-0 has zero paid spend)

| Channel | Signups attributed (last-touch) | Effort hours | Signups/hour | Wave-1 verdict |
|---|---|---|---|---|
| LinkedIn — Phill personal | {n} | {h} | {n/h} | {double-down / maintain / cut} |
| LinkedIn — Toby amplification | {n} | {h} | {n/h} | {...} |
| LinkedIn — NRPG brand page | {n} | {h} | {n/h} | {...} |
| YouTube (Coutis video) | {n} | {h} | {n/h} | {...} |
| Telegram / DM peer-outreach | {n} | {h} | {n/h} | {...} |
| IAQ Magazine column referral | {n — likely null, see gap} | {h} | {n/h} | {...} |
| Direct / brand search | {n} | n/a | n/a | {brand recognition signal} |

## Three things to do differently in Wave-1

1. ...
2. ...
3. ...

## Wave-1 paid-channel readiness (pre-stage check)

- LinkedIn Insight Tag pool size at 2026-05-31: {n visitors} — retargeting threshold (300) met / not met
- YouTube channel verification status: {verified / pending}
- LinkedIn Matched Audiences upload-ready: {yes / no}

## Sign-off

Phill: { } (date)
```

---

## 6. Wave-1 Paid-Channel UTM Placeholder (Pre-Stage)

Pre-staged rows for the paid retargeting that starts post-Wave-0. The scheme already covers them so when paid spend turns on, nothing changes downstream.

```
utm_source	utm_medium	utm_campaign	utm_content	utm_term
linkedin-ads	cpc	nrpg-assoc-wave1-2026-06-01	retarget-landing-visitors-founder-tier	founder
linkedin-ads	cpc	nrpg-assoc-wave1-2026-06-01	retarget-landing-visitors-firm-tier	firm
linkedin-ads	cpc	nrpg-assoc-wave1-2026-06-01	matched-audience-iicrc-aust-network	firm
linkedin-ads	cpc	nrpg-assoc-wave1-2026-06-01	matched-audience-ria-apac-chapter	firm
linkedin-ads	cpc	nrpg-assoc-wave1-2026-06-01	video-view-retarget-coutis-intro	general
youtube-ads	cpv	nrpg-assoc-wave1-2026-06-01	trueview-pre-roll-anz-restoration-kw	general
youtube-ads	cpv	nrpg-assoc-wave1-2026-06-01	trueview-pre-roll-iicrc-kw	firm
youtube-ads	cpv	nrpg-assoc-wave1-2026-06-01	discovery-ad-coutis-intro	general
google-ads	cpc	nrpg-assoc-wave1-2026-06-01	brand-defense-nrpg-search	general
google-ads	cpc	nrpg-assoc-wave1-2026-06-01	exact-anz-restoration-association	general
google-ads	cpc	nrpg-assoc-wave1-2026-06-01	exact-australian-restoration-peak-body	general
meta-ads	cpc	nrpg-assoc-wave1-2026-06-01	retarget-fb-restoration-trade-talk-engagers	firm
email	email	nrpg-assoc-wave1-2026-06-01	nurture-seq-1-of-5	founder
email	email	nrpg-assoc-wave1-2026-06-01	nurture-seq-2-of-5	founder
email	email	nrpg-assoc-wave1-2026-06-01	nurture-seq-3-of-5	firm
email	email	nrpg-assoc-wave1-2026-06-01	nurture-seq-4-of-5	firm
email	email	nrpg-assoc-wave1-2026-06-01	nurture-seq-5-of-5-founder-scarcity	founder
```

Note: Wave-1 `utm_campaign` value shifts to `nrpg-assoc-wave1-2026-06-01` — different campaign, same scheme. The `cpv` (cost-per-view) medium is YouTube-native; `cpc` for everything click-based; `email` source × `email` medium for the nurture sequence so the data clearly separates from paid social.

---

## 7. Tracking Gaps + Workarounds

Honest gap inventory — what cannot be perfectly attributed in Wave-0.

### Gap 1 — IAQ Magazine column referral (the unfair-advantage gap)

**The problem**: Phill's IAQ Magazine editorial column publishes mid-June (slips into Wave-1 window) and carries his author bio with a link to `unitegroup.in/association`. Magazine websites strip URL parameters on outbound links — UTMs do not survive the click. Signups attributed to the IAQ column show up as `utm_source=direct` even when the column drove them.

**Workaround**: Use a dedicated landing path — `unitegroup.in/iaq` — that redirects to `/association` with the `iaq-column-may2026-author-bio` UTMs server-side. Phill drops the `/iaq` slug in the author bio. Direct attribution recovered.

**Residual gap**: print-edition readers who type `unitegroup.in` directly cannot be tracked beyond `utm_source=direct`. Add the form field `where did you hear about this?` to the landing form as a free-text fallback. (Currently NOT in `landing-spec.md` Section 8 — needs an addendum field 10.)

### Gap 2 — Toby's WhatsApp peer outreach

**The problem**: Toby texts peers a link via WhatsApp. WhatsApp Web previews the URL but the click-through carries `utm_source=telegram` (per the scheme above — there is no `whatsapp` source row yet) OR shows up as `direct` if Toby pastes a clean URL.

**Workaround**: Already covered by the `d3-toby-whatsapp-peer-outreach` and `d18-toby-whatsapp-final-push` rows. Toby uses the shortlink `unite.group/a/d3-toby-whatsapp-peer-outreach`. If Toby strips the UTM by accident, the `where did you hear about this?` form fallback catches it.

### Gap 3 — Founder phone-call signups

**The problem**: Phill or Toby ring a peer directly. The peer signs up via the landing form. UTM = `direct`. Credit lost to the channel that actually closed.

**Workaround**: The form `tier_interest` field already shows pre-selection-from-URL; introduce a hidden form field `referrer_name` populated when the signup arrives via the shortlink `unite.group/a/{phone-call-id}`. Phone-call referrals get a one-time shortlink per call.

### Gap 4 — Cross-device journey (LinkedIn mobile → landing on desktop)

**The problem**: ICP reads LinkedIn on phone, switches to desktop to evaluate the landing page, signs up later in the week. First-touch cookie lives in localStorage on whichever device hit `/association` first — not portable.

**Workaround**: PostHog's identity stitching (if PostHog wired) handles cross-device on email match at form submit. GA4 fallback: cross-device tracking is best-effort. The first-touch column in Supabase reflects the *first device's* first touch, not the human's first touch — accept this limitation.

### Gap 5 — Facebook closed-group Toby post (Restoration Trade Talk Australia)

**The problem**: Facebook Groups strip UTMs aggressively on outbound. Toby's post in the closed group will lose tags.

**Workaround**: Same `unite.group/a/d3-toby-fb-restoration-trade-talk` shortlink approach. The redirect happens on Unite-Group's server, UTMs apply to the final URL.

---

## 8. Pre-Launch Instrumentation Checklist (T-0 = today, 2026-05-11)

Hard-stop checks the `launch-runbook.md` D0 gate consults. If any check fails, runbook gate blocks the D0 launch post.

- [ ] All 33 UTM rows have a worked URL produced and pasted into `linkedin-launch-thread.md`, `youtube-description.md`, social-content-pack
- [ ] Landing page (`unitegroup.in/association`) has GA4 snippet (property ID env var `GOOGLE_ANALYTICS_PROPERTY_ID`)
- [ ] Landing page has LinkedIn Insight Tag (per `landing-spec.md` Section 8 acceptance criteria) — Wave-1 retargeting pool starts building D0
- [ ] PostHog snippet on landing page (optional — degrades to GA4-only if `POSTHOG_API_KEY` empty)
- [ ] Supabase `interest_signups` table has columns: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `first_touch_utm` (jsonb), `last_touch_utm` (jsonb), `referrer_name` (nullable text), `where_did_you_hear` (nullable text — addendum to `landing-spec.md` field 10)
- [ ] Supabase realtime subscription wired to landing page for live Founder-counter
- [ ] Supabase scheduled function `daily-standup-9am-aest` created and tested with dummy data
- [ ] Shortlink redirector `unite.group/a/{slug}` deployed and tested for all 33 slugs
- [ ] Daily standup Telegram channel `nrpg-wave0-standup` exists and bot has permission to post
- [ ] LinkedIn Analytics access confirmed for Phill (post-level URL template ready)
- [ ] YouTube channel verified — YouTube Studio access confirmed for Phill
- [ ] Linear ticket for Coutis contract exists with milestone date `2026-05-25`

Checklist owner: `marketing-launch-runbook` Wave-4 (consults this list at T-0 gate).

---

## 9. Cross-references

- [[positioning-doc]] — value prop + manifesto (defines what counts as "campaign-on-message")
- [[icp-research]] — tier-intent vocabulary (Founder / Firm / Enterprise / Sole-trader)
- [[channel-plan]] — 6-day cross-channel sequence (source of the 33 campaign moments)
- [[landing-spec]] — Supabase `interest_signups` schema source-of-truth (Section 8)
- [[seo-brief]] — SEO-channel UTM hygiene (the `direct` rows resolve `utm_source` so SEO traffic isn't misattributed)
- [[launch-runbook]] — D0 gate consults the Section 8 checklist
- `Synthex/packages/brand-config/src/brands/nrpg.ts` — voice + forbidden-pronoun source (lint check on standup template)

## Banned-phrase audit (forbidden-pronoun check)

Per NRPG voice rules: **zero hits** for We / Our / I / Us / My / Mine across all 9 sections of this attribution plan. Voice runs in operator / third-person frame throughout.

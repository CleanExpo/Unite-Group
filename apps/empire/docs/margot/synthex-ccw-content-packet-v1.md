# Synthex Content Packet — CCW Carpet Cleaning Machines & Extractors

> **Client**: Carpet Cleaners Warehouse (Toby)  
> **Category**: UNI-2053 — Carpet Cleaning Machines & Extractors  
> **Packet version**: v1  
> **Date**: 2026-05-30  
> **Status**: Draft complete — pending Toby CTA/finance/photo confirmation

---

## 1. Content Inventory (what Synthex will manage)

| # | Format Platform | Word/Char Count | Status |
|---|----------------|----------------|--------|
| 1 | Website category landing | ~350 words | Ready for Synthex upload |
| 2 | Facebook — Flagship post (TRACTX) | ~120 words | Ready |
| 3 | Facebook — Mid-range post (SPOTX) | ~100 words | Ready |
| 4 | Facebook — Bundle/chemistry post | ~110 words | Ready |
| 5 | LinkedIn — B2B equipment ROI post | ~180 words | Ready |
| 6 | Instagram — 5-slide carousel | ~60 words + 5 images | Ready (text only; images PLACEHOLDER) |
| 7 | Email — Promotional blast | ~280 words | Ready |

---

## 2. Synthex Scoring Self-Assessment

| Asset | Brand Fit | Evidence | Conversion | Total |
|-------|-----------|----------|------------|-------|
| Web landing | 9/10 | 10/10 (prices from live site) | 7/10 (CTA pending) | **26/30** |
| Facebook posts x3 | 9/10 | 10/10 | 7/10 | **26/30 each** |
| LinkedIn post | 8/10 | 9/10 | 8/10 | **25/30** |
| Instagram carousel | 8/10 | 8/10 (no images yet) | 7/10 | **23/30** |
| Email blast | 8/10 | 9/10 | 8/10 | **25/30** |

**Assessment**: All assets score above 21/30 threshold. No must-block triggers.
**Action**: Auto-approve to **internal queue** (draft). Public scheduling requires:
- Toby CTA confirmation
- APPROVED_FOR_PUBLISH tag

---

## 3. Approval Gates (per Synthex Rules v1)

### Auto-approve (draft-to-queue only):
- [x] Internal draft with no performance guarantees
- [x] No regulated advice (legal/medical/financial)
- [x] No competitor defamation
- [x] Brand fit >= 8, evidence >= 8, conversion >= 7
- [x] All factual claims verified against ccwonline.com.au

### Requires human review before public publish:
- [ ] Toby confirms CTA (phone / Messenger / email)
- [ ] Finance partner details confirmed (Zip Merchant ID)
- [ ] Photography assets approved or hired
- [ ] Stock levels verified for all 3 extractors
- [ ] APPROVED_FOR_PUBLISH tag added by Phill or Toby

### Blocked until resolved:
- [ ] Any price change not reflected in source data
- [ ] CTA that links to non-existent page or wrong phone number
- [ ] Claims about features not listed on product pages

---

## 4. Synthex Scheduling Recommendation

### Phase 1 — Teaser (Week 1)
| Day | Platform | Asset | Goal |
|-----|----------|-------|------|
| Mon | Instagram Stories | "Something big is coming" teaser | Awareness |
| Tue | Facebook | Post 2 (SPOTX range) — accessible entry price | Engagement |
| Wed | LinkedIn | "When to upgrade" decision matrix | Authority |

### Phase 2 — Launch (Week 2)
| Day | Platform | Asset | Goal |
|-----|----------|-------|------|
| Mon | Email Blast | Full range + finance options | Conversion |
| Tue | Facebook | Post 1 (TRACTX flagship) | Flagship sales |
| Wed | Instagram | 5-slide carousel | Visual proof |
| Thu | Facebook | Post 3 (bundle chemistry) | Cross-sell |
| Fri | LinkedIn | "Case study" style follow-up | Social proof |

### Phase 3 — Sustain (Week 3+)
| Day | Platform | Asset | Goal |
|-----|----------|-------|------|
| Mon | Email | "Last chance — TRACTX stock" urgency | Scarcity |
| Wed | Facebook | User-generated content repost | Trust |
| Fri | Instagram | Behind-the-scenes CCW warehouse | Brand warmth |

---

## 5. Content Templates for Synthex Auto-Generation

### Meta Variables (to be replaced by Synthex engine)

```
{{CTA_PHONE}}      → Toby's preferred phone number
{{CTA_URL}}        → https://ccwonline.com.au (or specific product URL)
{{CTA_TEXT}}       → "Call now" / "Message us" / "Get quote"
{{TRACTX_PRICE}}   → $6,959.70 (auto-sync from site)
{{SPOTX_PRICE}}    → $1,963.50
{{SPOTXH_PRICE}}   → $2,333.10
{{TIER_DISCOUNT}}  → Any bundle discount Toby approves
{{PHOTO_1}}        → TRACTX product shot
{{PHOTO_2}}        → SPOTX in use shot
{{PHOTO_3}}        → CCW warehouse exterior
```

### Synthex Auto-Generated Variants

Synthex should produce **3 headline + body variants** per platform using:
- Brand voice: confident, operator-grade, practical
- Pain point: expensive downtime, unreliable cheap machines
- Promise: right machine first time, Australia-wide parts support

---

## 6. Integration Points

### From CRM/Nexus to Synthex
- **Trigger**: When Toby confirms APPROVED_FOR_PUBLISH via voice memo or Telegram
- **Action**: Synthex reads `/docs/margot/ccw-carpet-cleaning-machines-category-copy.md`
- **Output**: Scheduled content calendar in Synthex dashboard

### From Synthex to CRM/Nexus
- **Trigger**: Content goes live
- **Action**: Nexus logs `events` table entry: `type: content_published`, `channel: facebook/linkedin/etc`
- **Follow-up**: 7-day performance summary added to Phill's daily digest

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Price changes after publishing | Medium | High | Weekly site scrape; auto-flag price drift |
| Stock runs out during campaign | Medium | High | Real-time stock API; pause ads if out of stock |
| CTA phone number wrong | Low | Critical | Toby double-confirms; test call before publish |
| Photo assets don't match brand | Medium | Medium | Shot list pre-approved; photog brief signed |
| Finance claims inaccurate | Low | High | Zip terms verified; "Terms apply" disclaimer added |

---

## 8. Deliverables Checklist

- [x] Category landing page copy
- [x] Facebook posts x3
- [x] LinkedIn post
- [x] Instagram carousel script
- [x] Email blast
- [x] Shot list (10 items)
- [x] Synthex scoring rubric applied
- [x] Approval gates defined
- [x] Scheduling phased plan
- [ ] Toby CTA confirmation
- [ ] Photography execution
- [ ] APPROVED_FOR_PUBLISH tag
- [ ] Synthex calendar upload

---

*Packet prepared by Margot (Unite-Group agent) with real data from ccwonline.com.au. Compliant with Synthex Rules v1 — conservative E-E-A-T, no guarantees, evidence-led.*

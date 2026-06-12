---
type: wiki
updated: 2026-05-08
---

# Unite-Hub — Empire Command Center

**Repo:** CleanExpo/unite-group  
**Stack:** Next.js 14 · Supabase · Vercel  
**Position:** The platform layer that proves Unite-Group is worth 8–12x ARR to a strategic acquirer

---

## The North Star

Unite-Hub is not a CRM. It is the operating system dashboard for the ANZ restoration and compliance industry — the first screen Phill sees every morning and the first screen a strategic acquirer opens in due diligence.

**What it shows:**
- Live health of all 6 businesses (Pi-CEO 6-pager data)
- [[ccw]] client status (SLA, AI agent activity, campaigns)
- Content production pipeline (what the agency is generating)
- Board decisions and directives (what the autonomous system decided overnight)
- Cross-sell signals (which customers use multiple Unite-Group products)
- [[industry-association-vision-2026|ANZ Industry Association]] member roster, membership tier mix, cert status, content velocity, conference pipeline (scope expanded 2026-05-11; Unite-Hub becomes the association back-office)

---

## The Acquisition Case

**Board decision 2026-05-08:** Unite-Hub at 8–12x ARR requires one non-negotiable proof: [[ccw]] as a live external user within 90 days.

| Signal | What it proves | Multiple impact |
|---|---|---|
| [[ccw]] using Unite-Hub dashboard | External customer = product, not internal tool | Converts from $0 to platform asset |
| Unified customer table | Cross-sell is real, NRR is calculable | 2x multiple differential at NRR >120% |
| Pi-CEO health API wired | Autonomous operating system is real | Demonstrates [[founder]]-independent operation |
| Clean repo (no quantum stubs) | M&A hygiene — diligence team opens and understands immediately | Removes diligence red flag |

**ANZ market context (May 2026):**
- Mission-critical vertical SaaS: **8.6x–14.3x EV/Revenue** (Qoria 8.6x, Micromine 10x, RPMGlobal 14.3x)
- Horizontal/commoditised SaaS: **3.6x–3.9x**
- NRR >120% = 11.7x median vs 1.2x for NRR <90%
- 68% of tech leaders consolidating to fewer vendors in 2026 — structural demand for platforms

**The platform vs. collection test (M&A diligence):**
1. ✅ Shared customer base with cross-sell evidence
2. ✅ Unified data layer (Supabase unified customer table — to build)
3. ⬜ Single contract/billing across products (Wave 7)
4. ⬜ Documented SOPs (in progress via Pi-CEO wiki)
5. ✅ Management leverage above product level (Pi-CEO Board + senior agents)

---

## Current State (2026-05-08)

| Area | Status |
|---|---|
| Next.js 14 + Supabase foundation | ✅ Built (v14.0) |
| Auth + client portal | ✅ Built |
| Dashboard route | ✅ Exists |
| Pi-CEO API integration | ❌ Not connected |
| Unified customer table | ❌ Not built |
| Quantum-optimization stubs | ⚠️ Dead code — delete immediately |
| [[ccw]] external access | ❌ Not yet |
| Honest README | ❌ Still says "Next.js boilerplate" |

---

## The Three Sprint Actions (Board-mandated)

**Sprint 1 — Clean + Connect (3 weeks, IDD-4):**
- Delete `src/lib/quantum/` entirely
- Write README: "Unite-Hub is the executive dashboard for the Unite-Group portfolio"
- Wire Pi-CEO health API → Unite-Hub `/api/pi-ceo/health`
- Upgrade Railway Pi-CEO to paid SLA

**Sprint 2 — Data Foundation (2 days, SD-1):**
- Unified customer table in Supabase
- [[ccw]] as first record with RA + [[synthex]] linkages

**Sprint 3 — [[ccw]] as External User (90 days, PM-[[ccw]] + IDD-4):**
- Extend [[ccw]] login to see their AI agent activity, [[synthex]] campaigns, CRM health
- This converts Unite-Hub from internal tool to product

---

## Connection to Pi-Dev-Ops

```
Unite-Hub (the window)
    ↓ reads from
Pi-CEO FastAPI (pi-dev-ops-production.up.railway.app)
    ↓ powered by
Swarm: CFO · CMO · CTO · CS · Margot · Board
    ↓ monitors
All 6 businesses
```

**API endpoints to wire:**
- `GET /api/swarm/health` → 6-pager JSON → Unite-Hub executive view
- `GET /api/board/minutes` → latest Board decisions → Unite-Hub Board room
- `GET /api/content/manifest` → production pipeline → Unite-Hub content view
- `GET /api/fixes` → active work orders → Unite-Hub technical health

---

## The Vertical Story (for investors)

> "Unite-Hub is the platform that runs the ANZ restoration and compliance industry.
> RestoreAssist owns the inspection workflow. NRPG owns the practitioner accreditation 
> network. [[carsi]] owns compliance delivery. [[synthex]] automates the marketing. [[ccw]] is the 
> first external client. Unite-Hub ties them together — and proves the system runs 
> without the [[founder]]."

That story, backed by [[ccw]] as a live external user and NRR >110%, is worth 8.6x–14.3x to a US or ANZ strategic acquirer.

---

## Risk to Watch

The single most dangerous assumption: [[ccw]] churns before Unite-Hub extends their access. If [[ccw]] is not actively using the platform by month 3, the platform proof disappears and 18 months is insufficient to build a second external customer case. [[ccw]] success is the entire foundation.

---

## Cross-refs

[[ccw]] · [[agency-hierarchy]] · [[autonomous-sdlc]] · [[pi-ceo-architecture]] · [[wave-roadmap]] · [[restoration-industry-context]] · [[founder]]

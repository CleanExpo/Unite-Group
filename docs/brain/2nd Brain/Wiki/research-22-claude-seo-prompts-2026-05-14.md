---
type: research
source: Sources/22 Claude Prompts That Can Rank Any Local Business (Free Stack).md
researcher: Local SEO
updated: 2026-05-14
---

# Research — 22 Claude Local-SEO Prompts (Edward Sturm × Sarvesh Shrivastava, 2026-05-13)

> Sarvesh's 40-person agency operates a Claude Cowork prompt stack on top of GBP + Ahrefs + Chrome. Our DataForSEO + Semrush stack covers most of the data plumbing already; the **net-new value is the local-GBP layer and the implementation-PDF layer**.

---

## 1. The 22 Prompts (catalogued)

| # | Prompt | Input | Output | Coverage |
|---|---|---|---|---|
| 1 | Business Brain (project seed) | NAP, services, locations, keywords, top 5 competitors, USP | Persistent project context | 🟡 Partial — our `marketing-icp-research` + `marketing-positioning` do this for **brand**, not for **single-location GBP** |
| 2 | GBP Category Audit | Map-pack keyword + competitor GBP URLs | Primary + secondary category table; gaps | 🟢 NEW |
| 3 | GBP Attributes Research | Competitor GBP "About" URLs | Wheelchair / LGBTQ / veteran-owned / free-estimate matrix + 5-min action plan | 🟢 NEW |
| 4 | Competitor Review Velocity & Mentions | Competitor GBP URLs | Reviews per 30/60/90 days, service & location mentions | 🟢 NEW |
| 5 | Review Response Strategy Teardown | Competitor reviews | Response speed, tone, apology/resolution patterns | 🟢 NEW |
| 6 | Star-Rating Distribution Audit | Competitor GBP | 5★/4★/3★ ratios, complaint themes | 🟢 NEW |
| 7 | GBP Post Audit + 8-Week Plan | Competitor GBP posts 90d | Post frequency, image %, CTA %, 8-week calendar | 🟢 NEW (Synthex can produce posts; planning layer is new) |
| 8 | GBP Services Section Audit | Competitor services section | Missing services, descriptions, keyword density | 🟢 NEW |
| 9 | GBP Description Optimisation | Own + competitor descriptions | Rewritten 750-char description | 🟢 NEW |
| 10 | GBP Photo Audit | Competitor photo grids | Team / job-site / before-after %, upload frequency, gap plan | 🟢 NEW |
| 11 | Backlink Gap (Ahrefs via Chrome/MCP) | Money keyword + Ahrefs login | DR-tier table, spam flag, link opportunities linking to 2+ competitors | 🔴 Covered by `seo-backlinks` + `seo-content-gap` (DataForSEO Backlinks API) — same output, no Ahrefs needed |
| 12 | Spam-Link Diagnosis | Competitor backlink profile | PBN flags, ignore-list, DR-tier weighting | 🔴 Covered by `seo-backlinks` toxicity assessment |
| 13 | Keyword Gap Audit | Own domain + 3 competitors | Keywords competitors rank for, we don't | 🔴 Covered by `seo-content-gap` |
| 14 | On-Page SEO Audit (per page) | URL + target keyword + top-3 SERP URLs | 10-point score, title/meta/H1 fix, heading structure, FAQ block, NLP entities, implementation PDF | 🟡 Partial — `seo-technical` crawls, but **does not generate a per-page WordPress-implementation PDF**. This is the highest-leverage gap. |
| 15 | Title Tag + Meta + H1 Rewrite | Current tags + keyword | New copy + projected impact window (14–30d) | 🟡 Partial — `marketing-copywriter` writes copy but not in audit-fix format |
| 16 | Page Structure (H1→H3 + FAQ) Recommendations | Competitor heading dumps | Final IA spec with H1/H2/H3/FAQ | 🟡 Partial — `seo-content` recommends topics, not a heading skeleton |
| 17 | NLP Entity Coverage | Page body + competitor bodies | Missing entities, fluff-words to delete, CTA suggestions | 🟢 NEW (we don't have a Surfer/NeuronWriter equivalent) |
| 18 | Money-Page Audit (multi-page roll-up) | Site's commercial URLs | Per-URL score + sequenced fix list | 🟡 Partial — `seo-audit` produces site-wide, not page-by-page commercial roll-up |
| 19 | Google Search Console Export & Analysis | GSC login | Query/page CTR opportunities, decaying-content list | 🟢 NEW (we lean DataForSEO Labs estimates, not first-party GSC) |
| 20 | Fact-Check Pass | Any prior Claude output | Hallucination flags, citations | 🟢 NEW (universal hygiene; bolt onto every SEO skill) |
| 21 | WordPress Implementation Mode | Audit PDF + WP login | Direct edits to title/meta/H1/body | 🟢 NEW (computer-use territory; needs Hermes safety rails) |
| 22 | Chrome Computer-Use Access Protocol | Any task | Watched execution with screenshot trail | 🟡 Partial — Phill already runs Chrome DevTools MCP |

---

## 2. De-dupe summary

- **5 prompts fully covered** (#11, #12, #13, plus #18/#22 partially) → already shipped via DataForSEO suite; no action.
- **6 prompts partially covered** (#1, #14, #15, #16, #18, #22) → extend existing skills.
- **11 prompts genuinely new** → all cluster around **GBP (Google Business Profile)** and **page-level fix implementation**. This is where our stack is thin.

Critical insight: **our SEO suite is data-rich and implementation-poor.** DataForSEO gives us numbers; Sarvesh's pack converts numbers into client-ready PDFs and WordPress edits. That's the gap.

---

## 3. Proposed new skills + memory entries

Collapsing the 11 🟢 prompts into **3 new skills** + **1 playbook memory** rather than 11 separate skills (simplicity-first):

### NEW SKILL — `seo-gbp-audit`
- **Path:** `~/.claude/skills/seo-gbp-audit/SKILL.md`
- **Covers:** prompts #2, #3, #4, #5, #6, #8, #9, #10 (eight GBP audit prompts → one skill, one report)
- **Input:** target keyword + own GBP URL + competitor GBP URLs (auto-pulled via `seo-rankings` map-pack lookup)
- **Output:** consolidated GBP audit MD + PDF — categories, attributes, reviews velocity/response/stars, services, description, photos
- **Trigger:** "gbp audit", "google business audit", "local audit", any local-business onboarding (CCW, Adee, Duncan Perkins, Bulcs)

### NEW SKILL — `seo-page-fix`
- **Path:** `~/.claude/skills/seo-page-fix/SKILL.md`
- **Covers:** prompts #14, #15, #16, #17, #18 (the on-page audit-to-implementation chain)
- **Input:** URL + target keyword (or list)
- **Output:** per-page PDF with title/meta/H1 rewrite, full heading skeleton, NLP entity gap, FAQ block, fluff-deletion list, projected-impact window
- **Trigger:** "fix this page", "on-page audit", "title rewrite", money-page reviews
- **Composes with:** `seo-technical` (data) + `marketing-copywriter` (voice-aligned rewrite)

### NEW SKILL — `seo-gbp-posting`
- **Path:** `~/.claude/skills/seo-gbp-posting/SKILL.md`
- **Covers:** prompt #7 (the 8-week competitive GBP post calendar) — pulled out of `seo-gbp-audit` because it's a recurring cadence skill, not one-shot
- **Trigger:** "gbp posting plan", weekly GBP cadence cron
- **Output:** 8-week calendar JSON consumed by Synthex content scheduler

### NEW PLAYBOOK MEMORY — `playbook_local_seo_gsc_review.md`
- **Path:** `~/.claude/projects/-Users-phill-mac-2nd-Brain/memory/playbook_local_seo_gsc_review.md`
- **Covers:** prompt #19 (GSC export + analysis) — durable workflow, not yet a skill because GSC auth is fragile and one-off per client
- **Promotion path:** if used 3+ times, graduate to `seo-gsc-review` skill

### EXTENSIONS (not new files — patch existing)
- Prompt #1 (Business Brain) → extend `marketing-icp-research` to emit a `local-seo-brain.json` artifact for local-service clients (single location + keyword cluster + top 5 competitor GBP URLs). One additional output schema, no new skill.
- Prompt #20 (Fact-Check) → add a `--fact-check` flag to `seo-report` and `seo-report-pdf`. Universal hygiene, lives where reports are generated.
- Prompt #21 (WordPress implementation) → defer. Computer-use against client WP is a Hermes-safety topic, not an SEO topic. Note in `[[autonomy-gap-audit-2026-05-14]]` as future scope.

---

## 4. Wiki page: `local-seo-playbook` (outline only — wave 3 writes it)

`~/2nd Brain/2nd Brain/Wiki/local-seo-playbook.md` — sections:

1. **When to run** — service business, single or multi-location, < 25-mile radius, GBP exists
2. **Phase 1: Local Brain** — `marketing-icp-research --local` to produce brain JSON
3. **Phase 2: GBP Audit** — `seo-gbp-audit` (8-in-1 report)
4. **Phase 3: Data audit** — `seo-audit` (existing) for keywords / backlinks / technical
5. **Phase 4: Page fix loop** — `seo-page-fix` per money page, iterated until score ≥ 8/10
6. **Phase 5: Ongoing cadence** — `seo-gbp-posting` weekly + `seo-watchlist` monthly + `seo-rankings` map-pack monthly
7. **Phase 6: Fact-check + ship** — `--fact-check` flag, client-ready PDF, WordPress hand-off
8. **Portfolio applications** — CCW · Adee · Bulcs (US + AU) · Duncan Perkins · RestoreAssist locations · NRPG
9. **Cross-refs** — [[seo-public-skill-diff-2026-05-11]] · [[duncan-perkins-playbook-2026-05-14]] · [[ccw]] · [[seo-linkable-assets]]

---

## 5. Top-3 highest-leverage prompts

1. **Prompt #2 — GBP Category Audit.** Cheapest, fastest, biggest map-pack lever. Wrong primary category = invisible in local pack. Every portfolio brand and Duncan needs this verified once.
2. **Prompt #14 — On-Page SEO Audit PDF (per money page).** Closes our biggest stack gap (data-rich, implementation-poor). Becomes the deliverable Synthex sells. One-shot from URL → client-ready fix PDF.
3. **Prompt #7 — 8-Week GBP Posting Plan.** Recurring revenue / retention asset. Once built, runs forever per client via Synthex scheduler.

---

## Verdict — single highest-leverage to test THIS WEEK

**Run Prompt #14 (`seo-page-fix` precursor) on CCW's `/carpet-cleaning-melbourne` money page.** Reason: CCW is paying, the page exists today, and Toby is on holiday until 26 May — perfect zero-disruption window to ship a polished fix-PDF that lands on his desk Monday 26th. If it works, it becomes the Synthex flagship deliverable and the template for Duncan Perkins + every Bulcs landing page.

---

Researcher: Local SEO

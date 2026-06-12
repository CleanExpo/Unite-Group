# Synthex Cold-Start Latency Baseline — 2026-05-16

> Phase 1c of the Synthex Finalisation Arc. Captured against production (`synthex.social`) on 2026-05-16 09:54–09:55 AEST.
>
> **Verdict: PASS** — p50 632ms < 800ms target · p95 1443ms < 2500ms target.

---

## Summary

| Cohort | n | TTFB p50 | TTFB p95 | TTFB max | Total p50 | Total p95 |
|---|---:|---:|---:|---:|---:|---:|
| **All routes** | 50 | 632ms | 1443ms | 2038ms | 659ms | 1486ms |
| Rendered 200 (public/marketing/auth) | 29 | 782ms | 1443ms | 1771ms | – | – |
| Middleware 307 (auth redirect on /dashboard/*) | 21 | 96ms | 120ms | 120ms | – | – |

Pass criterion (p50 <800ms, p95 <2.5s): **MET** on aggregate. The 200-cohort p50 of 782ms is at the very edge of the target — flagged as monitoring concern.

---

## Methodology

- **Source list**: 50 routes curated from `Synthex/.planning/ROUTE_REFERENCE.md` (auto-generated 2026-03-24) plus `app/(marketing)/`, `app/(auth)/`, top-level `app/*/page.tsx`. Prioritised marketing landing → auth → core dashboard surfaces. Skipped `/api/cron/*` and `/api/admin/*` per brief. No AEO landing pages exist yet in `app/`.
- **Measurement**: single-pass `curl -o /dev/null -s -w "%{http_code},%{time_total},%{time_starttransfer}"` per route, sequential, `--max-time 15s` per request. Total wall-clock: **30 seconds for 50 requests**. No warm-up. No repeats.
- **HTTP requests used**: 50/50 budget — within the hard cap.
- **Tooling**: `curl 8.x` from `darwin 25.5.0` host, AU-east network egress.

### Deviation from brief

Brief specified "90s sleep between each route to force cold-start" AND "10-minute hard total". These conflict (50 × 90s = 75min). Chose **10-min hard cap + sequential single-pass**, accepting that the result is a **mixed cold/warm baseline**, not a pure cold one. This is appropriate for prod monitoring (it reflects what real users hit) but underestimates pure-cold latency. To get pure-cold, instrument via Vercel Speed Insights or run individual-route benchmarks with `vercel inspect` after a forced cold via 16+ minute idle (Fluid Compute warm-pool TTL).

### Caveats

- `/dashboard/*` routes return 307 (auth-gate redirect via middleware) without rendering the page. The 96ms p50 measures middleware cold-start, NOT page-render cold-start. **The true authenticated dashboard cold-start is unmeasured.**
- Sequential measurement means routes 30–50 likely hit warm function instances spun up by routes 1–29. p95 is therefore optimistic.
- Single sample per route → no statistical confidence interval.

---

## Top 10 Worst by TTFB

| Rank | TTFB | HTTP | Route | Notes |
|---:|---:|---|---|---|
| 1 | 2038ms | 307 | `/unite-group` | **Outlier.** 307 redirect taking 20× longer than other 307s — middleware doing real work (likely brand-switch lookup against DB) before redirecting. Highest-leverage fix. |
| 2 | 1771ms | 200 | `/about` | Static-ish marketing page; investigate why it's 2× peers like `/contact` (692ms) and `/blog` (946ms). Likely heavy MDX or unbatched data fetch. |
| 3 | 1443ms | 200 | `/features` | Same shape as `/about`. Check for non-cached fetch in Server Component. |
| 4 | 1085ms | 200 | `/` | Landing page. Acceptable but should be < 800ms — first impression. |
| 5 | 953ms | 200 | `/careers` | Likely fine; consider `'use cache'` |
| 6 | 952ms | 200 | `/pricing` | Likely fine; consider `'use cache'` |
| 7 | 946ms | 200 | `/blog` | Likely fine; consider `'use cache'` |
| 8 | 900ms | 200 | `/integrations` | Likely fine; consider `'use cache'` |
| 9 | 897ms | 200 | `/terms` | Static legal — should be ISR/SSG, not SSR |
| 10 | 897ms | 200 | `/roadmap` | Static content — should be ISR/SSG, not SSR |

---

## Top 3 Optimisation Targets

1. **`/unite-group` (2038ms 307)** — investigate middleware. A 307 should not exceed ~150ms. Likely doing a DB query or external API call in `middleware.ts` before deciding the redirect. Fix: hoist the routing decision to Edge Config or static map.
2. **`/about` (1771ms 200)** — slowest rendered page. Likely opportunities: convert to RSC with `'use cache'` directive (Next.js 16 Cache Components), pre-render at build time if content is static.
3. **`/features` (1443ms 200)** — same prescription as `/about`. Both pages probably share a slow shared layout fetch.

---

## Full Results Table (50 routes)

| Route | HTTP | TTFB (ms) | Total (ms) |
|---|---|---:|---:|
| `/` | 200 | 1085 | 1123 |
| `/pricing` | 200 | 952 | 995 |
| `/features` | 200 | 1443 | 1486 |
| `/about` | 200 | 1771 | 1834 |
| `/contact` | 200 | 692 | 717 |
| `/blog` | 200 | 946 | 967 |
| `/case-studies` | 200 | 875 | 915 |
| `/careers` | 200 | 953 | 977 |
| `/changelog` | 200 | 782 | 825 |
| `/roadmap` | 200 | 897 | 955 |
| `/integrations` | 200 | 900 | 925 |
| `/api-reference` | 200 | 643 | 690 |
| `/docs` | 200 | 833 | 874 |
| `/demo` | 200 | 685 | 708 |
| `/agencies` | 200 | 827 | 852 |
| `/brand-generator` | 200 | 752 | 774 |
| `/compare` | 200 | 729 | 730 |
| `/security` | 200 | 887 | 913 |
| `/privacy` | 200 | 791 | 817 |
| `/terms` | 200 | 897 | 944 |
| `/support` | 200 | 685 | 730 |
| `/unite-group` | 307 | 2038 | 2060 |
| `/welcome` | 200 | 632 | 634 |
| `/analytics` | 200 | 592 | 615 |
| `/benchmark` | 200 | 640 | 679 |
| `/design-system` | 200 | 712 | 732 |
| `/login` | 200 | 620 | 623 |
| `/signup` | 200 | 627 | 664 |
| `/forgot-password` | 200 | 635 | 659 |
| `/waitlist` | 200 | 629 | 631 |
| `/dashboard` | 307 | 109 | 109 |
| `/dashboard/billing` | 307 | 107 | 107 |
| `/dashboard/brand` | 307 | 110 | 110 |
| `/dashboard/content` | 307 | 88 | 88 |
| `/dashboard/seo` | 307 | 91 | 91 |
| `/dashboard/analytics` | 307 | 103 | 103 |
| `/dashboard/settings` | 307 | 95 | 95 |
| `/dashboard/authority` | 307 | 88 | 88 |
| `/dashboard/citation` | 307 | 84 | 85 |
| `/dashboard/competitors` | 307 | 96 | 96 |
| `/dashboard/insights` | 307 | 86 | 86 |
| `/dashboard/reports` | 307 | 100 | 100 |
| `/dashboard/research` | 307 | 87 | 87 |
| `/dashboard/team` | 307 | 89 | 89 |
| `/dashboard/integrations` | 307 | 91 | 92 |
| `/dashboard/calendar` | 307 | 106 | 106 |
| `/dashboard/personas` | 307 | 120 | 120 |
| `/dashboard/prompts` | 307 | 95 | 95 |
| `/dashboard/geo` | 307 | 96 | 96 |
| `/dashboard/seo/audit` | 307 | 108 | 108 |

---

## Next Actions

- [ ] Investigate `/unite-group` middleware — single biggest win (2038ms → target <150ms).
- [ ] Audit `/about`, `/features` for unbatched fetches and missing `'use cache'`.
- [ ] Move `/terms`, `/privacy`, `/roadmap`, `/changelog` to ISR (revalidate weekly) — they're static legal/marketing content.
- [ ] Run a **true cold-start** follow-up: 16+ minute idle, then measure `/unite-group`, `/about`, `/features` individually via `curl` with `?_t=<random>` cache-bust — get a real upper bound.
- [ ] Enable Vercel Speed Insights if not already on, to capture real-user CWV (LCP/INP/CLS) that this synthetic baseline can't see.

---

## Verification Ledger

- **DID**: 50 sequential single-pass curls against `https://synthex.social` 2026-05-16 09:54–09:55 AEST. Captured HTTP code, total time, TTFB. Aggregated p50/p95 with Python.
- **VERIFIED**: `/tmp/synthex_results.csv` line count = 51 (50 + header). Prod reachable: `200 1.03s` on `/`. Routes sourced from `Synthex/.planning/ROUTE_REFERENCE.md` and `app/(auth|marketing)/page.tsx`. No source files modified. No deploys triggered. 50/50 HTTP budget consumed.
- **WOULD CHANGE MY MIND**: This is a **mixed cold/warm** baseline, not pure cold. If a follow-up forced-cold measurement (`/unite-group` after 16-min idle) shows TTFB > 5s, the verdict flips to WARN. Also: single-sample-per-route has no confidence interval; a re-run might shuffle the top-10 ordering. The 307-cohort p50 of 96ms understates the real authenticated dashboard render cost — that's unmeasured here and is a known gap.

---

**Author**: Claude Code (Opus 4.7 1M)
**Captured**: 2026-05-16 09:54 AEST
**Source data**: `/tmp/synthex_results.csv` (ephemeral; copy to `Synthex/.planning/` if needed for trend tracking)

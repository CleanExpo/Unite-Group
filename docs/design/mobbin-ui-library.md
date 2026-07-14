---
type: wiki
updated: 2026-07-13
---

# Mobbin UI Library — the estate's design-reference source

> Repo copy synced 2026-07-14 from the canonical vault page (`~/2nd Brain/2nd Brain/Wiki/mobbin-ui-library.md`). Add new picks in both places. The Mobbin MCP is registered in this repo's `.mcp.json` (`https://api.mobbin.com/mcp`, HTTP transport) — authenticate via `/mcp` with a Mobbin account to browse live.

**Founder directive (2026-07-13): all UI builds draw their design reference from the Mobbin library — build FROM Mobbin, not from imagination.** This supersedes the 2026-05-14 assessment that scoped Mobbin to PR-50 only ([[research-agentic-os-critique-2026-05-14]]); the reference-only guardrail from that assessment stands: Mobbin patterns inform layout, flow and interaction choices — never copy assets or clone a competitor screen pixel-for-pixel.

## What Mobbin is

[Mobbin](https://mobbin.com) is a searchable library of real production UI/UX — hundreds of iOS, Android and web apps captured screen-by-screen and flow-by-flow. Discovery surfaces: [Latest](https://mobbin.com/discover/apps/ios/latest) · [Most popular](https://mobbin.com/discover/apps/ios/popular) · [Top rated](https://mobbin.com/discover/apps/ios/top) · [Animations](https://mobbin.com/discover/apps/ios/animations).

## How to use it in a build

1. Before designing any screen/page, pull 2–3 comparable production apps from Mobbin for the same job (onboarding, checkout, dashboard, feed, settings).
2. Steal the *pattern* (hierarchy, flow, component choice, spacing rhythm), express it in the brand's own design tokens ([[design-system-approach]], [[nexus-design-system]]).
3. Cite the Mobbin reference(s) in the design note/PR so the choice is traceable.
4. Mobbin MCP exists for in-Claude-Code browsing ($120/yr assessed 2026-05-14) — install remains optional; the web library works without it.

## Founder-curated picks (clipped 2026-07-13, iOS Latest)

| App | Positioning | Screens |
|---|---|---|
| Cleo AI | Cash advance & budget (AI money assistant) | [gallery](https://mobbin.com/apps/cleo-ai-ios-e9061da4-d434-4d7d-8dcb-975aeeb8be9c/61ff2d0f-0198-445d-863a-9d2d52297140/screens) |
| Instacart | Groceries & food | [gallery](https://mobbin.com/apps/instacart-ios-5dd8c677-b2bd-414e-a4bc-3e4f68b38048/38225df9-04ac-435e-a1b9-390bfee4d638/screens) |
| Genie | "AI that gets you" — AI companion | [gallery](https://mobbin.com/apps/genie-ios-ca2f73fe-0974-4841-8cd8-ffe7217ac82c/4ae703fe-be77-47d9-b339-cd70dba4066c/screens) |
| Etsy | Shop home, style & more (marketplace) | [gallery](https://mobbin.com/apps/etsy-ios-f80898c8-cdab-4e15-b9e5-85c4babfcb77/d4844f33-3a12-4e0a-9282-d67e9f24da3d/screens) |
| Hulu | Streaming — shows, sports & films | [gallery](https://mobbin.com/apps/hulu-ios-a2546f27-6147-4f25-b4da-0000e607f69a/72429142-e5d0-4b4a-a11a-d220237535c1/screens) |
| Depop | Buy & sell clothes (social commerce) | [gallery](https://mobbin.com/apps/depop-ios-f4389641-a0dd-44a3-a36e-e2214d975b4b/8285f6ac-25cc-4ceb-9419-50d80e6ba3ae/screens) |
| Tubi | Free streaming — sports, news, TV | [gallery](https://mobbin.com/apps/tubi-ios-af0e1a58-b0a3-421a-bbe8-7dfea95aa70d/c26db334-8ba2-45aa-bc6a-5e7241d15ac3/screens) |
| Apple Watch | Wearable companion UI | [gallery](https://mobbin.com/apps/apple-watch-ios-d5affeb9-ed0e-4c36-8e80-cd08a6bed4ba/effde119-f664-48b0-a60e-979713a7855b/screens) |
| Zip | Buy now, pay later (fintech checkout) | [gallery](https://mobbin.com/apps/zip-ios-9c5e6faf-b117-4e52-97ca-8ab194e9d489/732a21c0-ee06-4f81-83c8-35f81d4a5903/screens) |
| Affirm | Buy now, pay later — daylight fintech trust (paper ground, ink text, single indigo accent) | [app page](https://mobbin.com/apps/affirm-ios-133a5e7f-7284-4989-8cf9-4f18999afdc2) |

Estate relevance: Cleo/Genie for Margot-style AI-assistant surfaces, Zip/Cleo for RestoreAssist billing and fintech-grade trust UI, Etsy/Depop for CCW commerce, Instacart for job/booking flows, Hulu/Tubi for content-library surfaces (CARSI course catalogue).

Source: clipped from mobbin.com/discover/apps/ios/latest 2026-07-13; raw clipping removed from Sources/ per founder instruction (image URLs were signed/ephemeral — the galleries above are the durable links). Add future picks as new rows here rather than re-clipping the discovery page.

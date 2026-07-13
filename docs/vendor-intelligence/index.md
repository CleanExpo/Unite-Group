# Vendor intelligence

> **Governed automation surface.** This page is maintained by the Nexus
> official-docs automation (`scripts/nexus-docs-review.mjs`). Automated pull
> requests propose additions below the marker; a human reviews and merges.
> Do not hand-edit inside the proposal marker.

One governed page per vendor tracked by the Nexus official-docs automation.
The watcher captures normalised snapshots; the review layer classifies each
delta as volatile noise or a material change and proposes updates here.

## Vendors

- [OpenAI](./openai.md)
- [Anthropic](./anthropic.md)
- [Gemini](./gemini.md)
- [Hermes / OpenClaw](./hermes.md)
- [Apify](./apify.md)
- [Firecrawl](./firecrawl.md)
- [Exa](./exa.md)
- [Supabase](./supabase.md)
- [Vercel](./vercel.md)
- [Docker](./docker.md)
- [GitHub](./github.md)

## How it works

1. `nexus-docs-watch.mjs --write-content content` fetches and persists
   normalised snapshots (read-only collection).
2. `nexus-docs-review.mjs` compares current vs prior snapshots under
   `.snapshots/`, strips per-vendor volatility, and proposes material updates.
3. The weekly automation workflow opens a pull request with the proposals and
   notifies Telegram with the summary and PR link. No direct `main` mutation.

`.snapshots/` holds the last accepted normalised state per source id.

---
type: wiki
updated: 2026-05-11
---

# MCP Ecosystem

GitHub MCP Registry launched May 2026 with 97 official servers — the canonical source for Model Context Protocol integrations. Registry at `github.com/mcp`.

**Marketplace distinction (2026-05-11 ingest):** `github.com/marketplace` now lists models (GPT-5, DeepSeek-V3-0324, Llama 4 Scout 17B) and apps (Linear, Vercel, Render, CodeRabbit, OpenCode) alongside MCP servers. Treat Marketplace apps as second-class to the MCP Registry — they're CI/PR integrations, not agent tool surfaces. Linear and Vercel are the only Marketplace apps we use; CodeRabbit reviewed and skipped (duplicates Anthropic-internal review pass).

## Tier 1 — Already in use or directly relevant

| Server | Slug | Purpose |
|---|---|---|
| GitHub | `github/github-mcp-server` | Repos, issues, PRs, workflows via natural language |
| Supabase | `com.supabase/mcp` | Supabase platform — tables, queries, migrations |
| Stripe | `com.stripe/mcp` | Customers, products, payments |
| Notion | `makenotion/notion-mcp-server` | Official Notion API |
| Playwright | `microsoft/playwright-mcp` | Browser automation via accessibility trees |
| Chrome DevTools | `ChromeDevTools/chrome-devtools-mcp` | Drive a real Chrome instance — attach to existing authenticated sessions (GCP, Stripe, Linear UI, social platforms). Installed at user scope 2026-05-11. Defaults to dedicated profile `~/.cache/chrome-devtools-mcp/chrome-profile`. Sign in once per service inside that profile; sessions persist for future automation. |
| Figma | *(Figma MCP)* | Design context directly into AI workflow |
| Sentry | `getsentry/sentry-mcp` | Error monitoring, issue tracking |

## Tier 2 — High value for Pi-CEO / swarm operations

| Server | Purpose |
|---|---|
| Context7 | Up-to-date code docs injected into any prompt |
| Desktop Commander | Terminal commands, file operations, process management |
| Firecrawl | Web data extraction at scale |
| Tavily | Advanced web search |
| Brightdata | AI agents search, extract, navigate the web |
| Serena | Semantic code retrieval and editing for coding agents |
| Markitdown | Convert PDF, Word, Excel, images, audio to Markdown |
| DBHub | Token-efficient DB MCP for Postgres, MySQL, SQLite, MariaDB |
| Netdata | Real-time infrastructure monitoring + ML anomaly detection |
| Apify | Thousands of scrapers and crawlers on Apify Store |
| Mongodb | MongoDB MCP server |

## Tier 3 — Microsoft / Azure ecosystem

Azure MCP, Azure DevOps, Microsoft Fabric, Microsoft Learn, Microsoft NuGet, Atlassian Rovo.

## Developer toolchain

Terraform, Next.js dev tools MCP, Nuxt MCP, Elasticsearch.

## Extended Workflows: Figma to React

DesignCode (Meng To) documents pipelines converting [[Figma]] UI assets into 3D [[React]] sites using [[Spline]]. Spline operates as a free-for-individuals, cross-platform (browser and Mac-native) "Figma of 3D tools," offering real-time collaboration, glass layers, interaction states, 3D sculpting, and material properties. The conversion workflow isolates hidden 2D Figma layers, exports them as 3x resolution PNGs, and applies them as image materials onto Spline objects. Objects utilize exact Figma dimensions (e.g., 1280x844 front-facing planes) or customized geometric properties (e.g., 6-sided hexagons with 10pt corner radii) mapped across the Z-axis for depth. Spline scenes export via public URLs, ThreeJS code, or React components compatible with CodeSandbox.

## Extended Workflows: AI-Generated Video Web Design

Andres Web documents a workflow for generating 3D animated websites with video-linked scroll effects utilizing [[Gemini]] and [[Google AI Studio]]. The process begins by capturing a still frame from a downloaded 1080p background video using the Windows Snipping Tool. A specialized AI prompt generator uses this image capture alongside target company details to draft a structural website prompt. The background video is uploaded to a live hosting environment (such as HostGator via cPanel) to establish a direct public MP4 URL. This live video URL is injected back into the master prompt to prevent generation errors before execution in Google AI Studio. The AI outputs website code featuring designated sections with 3D scroll effects tied directly to the video playback. Final local adjustments and source code editing are performed using Antigravity prior to deployment.

## Key context

- 97 servers as of May 2026; growing fast
- Format: `github.com/mcp/{org}/{repo}`
- These are the verified/official versions — always prefer registry slugs over random GitHub repos
- [[claude-code-guide]] references MCP setup; this page covers the ecosystem catalog

## Cross-refs
- [[pi-ceo-architecture]] — swarm uses GitHub MCP, Supabase MCP
- [[hermes-agent]] — agent uses Desktop Commander pattern
---
type: wiki
updated: 2026-05-19
---

# Chorus Agent Platform

## Decision

[[synthex|Synthex]] should treat Chorus as a possible operator cockpit for
agent-assisted engineering, research, marketing execution, and creative support,
not as a production dependency inside the Synthex runtime. The integration path
is adapter-gated: keep Synthex policy in `lib/marketing-agency/*` services and
use Chorus only as an external agent workspace unless a verified API or MCP
endpoint is explicitly configured.

## Source Evidence

Current Obsidian Source notes processed:

- `Sources/AI agents that do real work.md` - `chorus.com` engineering capture:
  dedicated VM/browser positioning, `Terminal`, `GitHub`, `Files`, `Browser`,
  and `Sessions` skills; examples include auth-flow debugging and rate limiting.
- `Sources/AI agents that do real work 1.md` - `chorus.com` marketing capture:
  `Slack`, `HubSpot`, `Stripe`, `Analytics`, and `Sessions` skills; examples
  include Q4 pricing launch, Pro tier announcement, LTV report, open-rate
  monitoring, CTR, and signup lift.

Official Chorus docs checked live on 2026-05-19:

- `https://docs.chorus.sh/llms.txt` is the documentation index.
- `docs.chorus.sh` positions Chorus as a native Mac app for chatting with
  multiple models in one place.
- `Tools + MCP` documents built-in `Web`, `Terminal`, `Image Generator`, and
  `GitHub` tools, plus local/remote custom MCP connections and Claude Desktop
  MCP import.
- `Projects` documents shared project context and project memory across chats.
- `Managing your Context Window` documents `In Chat` selection and summarize to
  new chat when context is exhausted.
- `Bring Your Own API Keys` says provider API keys are entered under
  `Settings > API Keys` and stored locally.

## Agent And Skill Capture

Chorus capabilities relevant to the [[synthex-marketing-agency-runtime-lifecycle-2026-05-19|Synthex Marketing Agency lifecycle]]:

- Engineering agent: codebase-aware debugging, auth/session repairs, rate-limit
  implementation, PR-oriented GitHub work, terminal/file/browser use.
- Marketing agent: campaign drafting, CRM segmentation, scheduled launches,
  performance monitoring, HubSpot/Slack/Stripe/analytics workflows.
- Research agent: YouTube idea research and source-to-notes conversion from the
  public Chorus agents page.
- Creative agent: YouTube thumbnail direction and image-generation workflows.
- Diagramming agent: Excalidraw diagram production for architecture and client
  explanations.
- Mobile agent: iOS build/signing support that can return a phone-install link.

Use these as role prompts or external operator sessions before adding Synthex
code. Do not let Chorus own evidence, approval, licence, consent, publish, or
spend policy.

## Synthex Usage Pattern

1. Create a Chorus project named `Synthex Marketing Agency`.
2. Add project context pointing at `/Users/phill-mac/Documents/Synthex`,
   `/Users/phill-mac/Documents/Marketing Team`, and this wiki page.
3. Enable only the tools needed for the task: `Web` for research, `Terminal`
   for local verification, `GitHub` for PRs, and custom MCP only when the
   endpoint is verified.
4. Keep project memory on for non-secret discoveries; keep credentials out of
   project memory and chat transcripts.
5. Run every Chorus-produced recommendation through the ADLC loop:
   Assess -> Design -> Layer -> Code -> Verify -> Deploy -> Observe -> Compact.

## Credential Boundary

`CHORUS_API_KEY` has been stored in the local Marketing Team sandbox secret
store and must not be printed into wiki pages, prompts, screenshots, logs, or
commits.

Important distinction:

- `chorus.com` / `docs.chorus.sh` docs cover the Mac app, projects, tools,
  MCP setup, local models, context controls, and BYOK.
- Public `chorus-ai.dev` material describes an AI-DLC MCP product with keys
  documented as `cho_...`, `CHORUS_URL`, `CHORUS_API_KEY`, and `/api/mcp`.
- The stored key uses a different prefix from that `cho_...` documentation, so
  do not send it to an MCP or API endpoint until the matching Chorus URL and
  auth contract are verified.

## Fit For Synthex

Adopt now:

- Use Chorus as a research and operator cockpit for campaign planning, source
  digestion, agent comparison, and creative/diagram ideation.
- Use Chorus project context to keep the Synthex build brief, service-layer
  boundaries, and ADLC lifecycle visible across chats.
- Use built-in `Web`, `Terminal`, and `GitHub` tools for exploratory work when
  the user is driving the Chorus app directly.

Blocked until verified:

- Direct MCP wiring into Codex or Claude using the saved key.
- Any autonomous publish/spend action through Slack, HubSpot, Stripe, Meta, or
  analytics systems.
- Any credential sync from Chorus project memory into Synthex or the wiki.

## Links

[[synthex]] · [[marketing-agency-blueprint-2026]] ·
[[synthex-marketing-agency-runtime-lifecycle-2026-05-19]] ·
[[synthex-marketing-agency-wikilinks-2026-05-19]] ·
[[marketing-brain-system]] · [[mcp-ecosystem]] · [[agency-blueprint]] ·
[[autonomous-sdlc]]

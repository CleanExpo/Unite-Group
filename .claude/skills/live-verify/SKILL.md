---
name: live-verify
description: 'Verify time-sensitive facts against the live internet before using them. Use whenever an answer, code change, or decision depends on anything that can change over time — model IDs and names, API endpoints and parameters, SDK and package versions, provider rate limits, pricing, framework syntax, release notes, provider status and outages, market or competitor info, or anything the user calls "latest", "current", or "newest". Also use when reporting numbers from live systems (deployments, error counts, database rows): pull them fresh via the relevant MCP instead of recalling from earlier context. Trigger even when the answer feels confidently known — confident and stale look identical from the inside.'
---

# Live verify

Training data has a cutoff and conversation context goes stale the moment it
is written. The Nexus has already paid for this: a hardcoded model ID that no
longer existed 404'd the strategy-daily cron for every business, and the
session that wrote this skill "knew" a model lineup one generation out of
date until a live fetch corrected it. Verification is not paranoia; it is the
difference between the latest data and a confident guess.

## Tool ladder — use the best available, in order

1. **Exa MCP** (`web_search_exa`, `web_fetch_exa`) — semantic search plus
   clean full-page content. First choice for docs, changelogs, release
   notes, provider status pages. Describe the ideal page in the query, then
   fetch the best URL for the authoritative text.
2. **Built-in web search / fetch** — fine for quick fact checks when Exa is
   not connected.
3. **Domain MCPs for domain data** — Vercel MCP for deployment and error
   state, prod Supabase for schema (see supabase-schema-gate). Live system
   reads always beat recall of earlier reads; re-pull before reporting.

If no live tool is available in the session, say so explicitly and label the
answer as last-known rather than presenting it as current.

## Staleness triage — what must be verified

- **Always verify** (moves weekly or monthly): model IDs, API parameters,
  package and SDK versions, rate limits, pricing, provider incidents,
  anything requested as "latest and greatest".
- **Verify when load-bearing** (moves yearly-ish): framework best practices,
  auth flows of third-party integrations, config defaults.
- **Skip** (stable): language fundamentals, math, settled history, the
  repo's own conventions — those live in nexus-conventions, not on the web.

## Source quality

Prefer primary sources: official docs, the provider's changelog or GitHub
releases, the provider's status page. A single SEO-ranked blog post is not
verification. When sources disagree, say so and weight the provider's own
publication highest. Note the publication date when the page shows one.

## The verification line — required

Every output that leaned on a verified fact ends with an auditable line, in
the same spirit as the commit gate line:

```
Verified live <date>: <fact> — <source URL>
```

When verification was impossible:

```
Unverified (no live tool available): <fact> — last known as of training.
```

Never silently present recalled facts as current. The line is the
enforcement mechanism: skipping verification becomes visible in the output
itself, exactly as skipping tests is visible when the gate line is missing.

## Anti-patterns this skill exists to stop

- Pinning a model string or package version from memory (the
  strategy-daily 404 incident).
- Reporting deployment or error counts from earlier in the conversation
  instead of re-pulling them.
- "The docs say" without having fetched the docs this session.
- Treating a provider 5xx storm as a credential problem without checking
  the provider's status page (see credential-triage).

---
name: mock-vs-real-detector
category: verification
version: 1.0.0
priority: P2
auto_load: false
triggers:
  - auditing a route or page for production readiness
  - classifying a section GREEN/AMBER/RED
  - reviewing integration code (xero/gmail/calendar/linear/social)
  - any time a 200 response or rendered UI must be proven to be real data
description: |
  Apply this skill WHEN verifying that a route, page, or integration serves REAL data and not
  silent mock/placeholder data. Detects the "false-green" failure mode: an endpoint returns 200
  (or a page renders) while the underlying data is fabricated because a provider is unconnected.
  Trigger WHENEVER classifying a section's readiness, reviewing integration wrappers, or before
  marking anything GREEN. P2 — load on audit/verify tasks.
context: fork
---

# Mock-vs-Real Detector

## The Default Being Overridden

Left unchecked, LLMs default to:
- Treating an HTTP 200 as proof the data is real
- Treating a rendered page as proof it is wired to a backend
- Marking a section "working" because it compiles and returns a shape

This skill overrides those defaults with: **a 200 is not evidence. Real data must be proven by tracing the source discriminator end-to-end.**

---

## ABSOLUTE RULES (Never Violate)

**NEVER** mark a section GREEN while it can return `source: 'mock'` without the caller surfacing it.
**NEVER** present mock/placeholder data as real to the user. Fail loud, not fake.
**ALWAYS** trace: page → fetch → API route → integration → does it have a `getMock*` fallback?

---

## Detection checklist

Run these greps against the section under audit:

```bash
# 1. Silent mock fallbacks in integrations
rg "getMock|source:\s*'mock'|mockData|placeholder|TODO|FIXME|hardcoded" src/lib/integrations src/app/api/<section>

# 2. Pages that render a component but fetch nothing (facade detection)
#    A page.tsx with no await/fetch/createClient and just <SomeClient /> is a facade
rg -L "await|fetch|createClient|getUser" src/app/<section>/page.tsx

# 3. Integration "connected?" gates — confirm the route surfaces the unconnected state
rg "isXeroConfigured|isConfigured|connected|hasToken|accessToken" src/app/api/<section>
```

## Classification rule

| Signal | Class |
|--------|-------|
| Real fetch + auth guard + `.eq('founder_id', user.id)` + no silent mock | GREEN |
| Returns real data but can silently fall back to mock / missing source surfacing | AMBER |
| Page renders a component that fetches nothing; or route returns hardcoded data | RED |

## The required fix for AMBER (silent mock)

A degradable integration MUST return a discriminated result and the caller MUST surface it:

```ts
// integration
return connected
  ? { data, source: 'xero' as const }
  : { data: null, source: 'not_connected' as const }   // NOT 'mock'

// caller (page/route) — explicit, never silent
if (result.source === 'not_connected') {
  return <NotConnectedState provider="Xero" connectHref="/founder/xero" />
}
```

Prefer an explicit **"not connected"** empty-state over a `mock` fallback for anything user-facing.
Reserve `mock` strictly for tests and local dev — never let it reach a dashboard.

## Output format

Report each item as: `path | class | source-trace | fix`. List RED+AMBER first. Cite file:line.

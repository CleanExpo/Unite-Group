---
title: "AI agents that do real work"
source: "https://chorus.com/"
author:
  - "[[Chorus]]"
published:
created: 2026-05-19
description: "Each Chorus agent runs on its own dedicated VM with a real browser, 70+ integrations, and typed memory. Ship code, run research, design assets, and operate tools end-to-end."
tags:
  - "clippings"
---
## Agents, built for you.

use Chorus for

Engineering

Skills

Terminal

GitHub

Files

Browser

Sessions

Debug auth flow

Add rate limiting

Debug auth flow

Users are getting logged out on page refresh. The session token should persist but it's not surviving reloads.

I found the issue. In `auth/session.ts`, the token is stored in memory but never written to the cookie:

```
// line 42 — token set in memory only
sessionStore.set(token);

// missing: persist to httpOnly cookie
// res.cookie('session', token, {
//   httpOnly: true, secure: true
// });
```

The fix is to write the token to an httpOnly cookie alongside the in-memory store. I'll also add `sameSite: 'lax'` for CSRF protection.

session.ts

TypeScript — 3 lines changed

Done — pushed to fix/session-persist and opened a PR. The cookie now persists across reloads with httpOnly + secure + sameSite flags.

Ask anything...

Build, debug, and ship code faster with a senior engineer agent that understands your codebase and is always up to speed.
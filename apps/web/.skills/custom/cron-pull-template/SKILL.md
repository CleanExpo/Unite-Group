---
name: cron-pull-template
category: backend
version: 1.0.0
priority: P3
auto_load: false
triggers:
  - creating a new scheduled data-sync / "pull" cron route
  - a section depends on external data but has no refresh cron
  - adding an entry to vercel.json crons
description: |
  Apply this skill WHEN scaffolding a new cron "pull" route that syncs external/derived data into
  Supabase on a schedule (Vercel cron). Encodes the Unite-Hub cron invariants: CRON_SECRET auth,
  FOUNDER_USER_ID actor, overlap safety, idempotent upsert, last-sync timestamp, and failure
  surfacing. Generic `cron-scheduler` covers scheduling; this covers the PULL handler body. P3.
context: fork
---

# Cron Pull Template

## The Default Being Overridden

Left unchecked, LLMs default to:
- Cron handlers with no auth (anyone can trigger them)
- Non-idempotent inserts that duplicate rows on re-run
- Silent failures — a broken pull looks identical to "no new data"

This skill overrides those with: **authenticated, idempotent, observable pulls.**

---

## ABSOLUTE RULES (Never Violate)

**NEVER** ship a cron route without the `CRON_SECRET` Bearer guard.
**NEVER** use a session/`getUser()` in a cron — there is no session; use `FOUNDER_USER_ID`.
**ALWAYS** upsert idempotently (on a natural key) so a re-run cannot duplicate data.
**ALWAYS** record a last-sync timestamp and surface failures (do not swallow).

---

## Canonical handler shape

```ts
// src/app/api/cron/<section>-sync/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'  // service-role, bypasses RLS

export const dynamic = 'force-dynamic'
export const maxDuration = 300  // long pulls

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const founderId = process.env.FOUNDER_USER_ID
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID unset' }, { status: 500 })

  const supabase = createServiceClient()
  try {
    const rows = await fetchExternal()            // 1. pull
    const mapped = rows.map(r => ({ ...r, founder_id: founderId }))  // 2. scope
    const { error } = await supabase               // 3. idempotent upsert
      .from('<table>')
      .upsert(mapped, { onConflict: 'founder_id,external_id' })
    if (error) throw error
    await supabase.from('sync_log').insert({       // 4. observability
      founder_id: founderId, section: '<section>', synced: mapped.length, at: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true, synced: mapped.length, source: 'live' })
  } catch (e) {
    await supabase.from('sync_log').insert({
      founder_id: founderId, section: '<section>', error: String(e), at: new Date().toISOString(),
    })
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 })  // fail loud
  }
}
```

## Register in vercel.json

```json
{ "path": "/api/cron/<section>-sync", "schedule": "0 17 * * *" }
```

Stagger schedules so pulls don't all fire at once (existing strategy-daily crons are offset by 5 min).

## Done-gate

- [ ] CRON_SECRET guard + FOUNDER_USER_ID + maxDuration
- [ ] idempotent upsert on a natural key (no dupes on re-run)
- [ ] sync_log row on success AND failure
- [ ] returns `source: 'live'` (never silent mock)
- [ ] entry added to vercel.json with a staggered schedule

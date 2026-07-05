// src/app/api/command-centre/mesh-fleet/route.ts
//
// UNI-2305 — Mesh Fleet proxy. Founder-scoped read of the Railway Pi-CEO
// mesh fleet endpoint (machines + ships), same pattern as
// src/app/api/pi-ceo/activity/route.ts: honest not-configured/no-key states
// when PI_CEO_API_URL/PI_CEO_API_KEY are absent, an honest error/timeout
// source on upstream failure, and the live passthrough otherwise. The
// secret is only ever attached to the outbound request header — never
// echoed back to the client or logged.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface MeshMachine {
  host: string
  last_seen: string
  is_stale: boolean
  state?: string
  current_task?: string
}

interface MeshFleetUpstream {
  machines?: MeshMachine[]
  ships?: unknown[]
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const piCeoUrl = process.env.PI_CEO_API_URL?.trim()
  const piCeoKey = process.env.PI_CEO_API_KEY?.trim()

  if (!piCeoUrl) {
    return NextResponse.json({ configured: false, machines: [], shipCount: 0, source: 'not_configured' })
  }
  if (!piCeoKey) {
    return NextResponse.json({ configured: false, machines: [], shipCount: 0, source: 'no_key' })
  }

  try {
    const res = await fetch(`${piCeoUrl}/api/mesh/fleet`, {
      headers: { 'X-Pi-CEO-Secret': piCeoKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return NextResponse.json({
        configured: true,
        machines: [],
        shipCount: 0,
        source: 'upstream_error',
        error: `HTTP ${res.status}`,
      })
    }

    const data = (await res.json()) as MeshFleetUpstream
    const machines = Array.isArray(data.machines) ? data.machines : []
    const shipCount = Array.isArray(data.ships) ? data.ships.length : 0

    return NextResponse.json({
      configured: true,
      machines,
      shipCount,
      source: 'pi_ceo_live',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return NextResponse.json({
      configured: true,
      machines: [],
      shipCount: 0,
      source: timedOut ? 'timeout' : 'error',
      error: err instanceof Error ? err.message : 'fetch failed',
    })
  }
}

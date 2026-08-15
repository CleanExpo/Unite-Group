// POST /api/command-centre/registry/sync
//
// Populates the capability registry (`cc_agents`, `cc_tools`) from the
// build-time manifest of agents, skills and MCP servers that already exist on
// disk. Idempotent — re-running rewrites the same founder-scoped rows.
//
// This is the WRITER the registry never had. EPIC-000 Stage 3 requires an agent
// to search the registry before building something new; while `cc_agents` /
// `cc_tools` were empty, every such search returned nothing and fell through to
// "build new" (ARR-001 §3.1).
//
// Registering a capability records that it EXISTS. It does not make it
// invocable — every row is written with `invocable`-equivalent semantics off,
// and this route never executes an agent, a skill, or an MCP server.
//
// GET reports what the registry currently holds without writing anything.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { getCapabilityManifest } from '@/lib/command-centre/capabilities'
import {
  readRegistryLastSync,
  readRegistryTools,
  syncCapabilityRegistry,
} from '@/lib/command-centre/registry-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const manifest = await getCapabilityManifest()
    const discovered = manifest.agents.length + manifest.skills.length + manifest.mcp_servers.length

    if (discovered === 0) {
      // Refuse rather than report a successful no-op: a zero-capability manifest
      // means the prebuild discovery step did not run, and writing nothing while
      // returning ok:true is how an empty registry stays invisible.
      return NextResponse.json(
        {
          error:
            'Capability manifest is empty — run `node scripts/sync-capability-registry.mjs` (it runs in prebuild). Refusing to report a successful sync of zero capabilities.',
        },
        { status: 503 },
      )
    }

    const result = await syncCapabilityRegistry({ founderId: user.id })

    return NextResponse.json(
      {
        ok: result.errors.length === 0,
        discovered: {
          agents: manifest.agents.length,
          skills: manifest.skills.length,
          mcp_servers: manifest.mcp_servers.length,
        },
        written: { agents: result.agents, tools: result.tools },
        errors: result.errors,
      },
      // A partial write is a failure the caller must see, not a 200 with a
      // populated `errors` array nobody reads.
      { status: result.errors.length === 0 ? 200 : 207 },
    )
  } catch (error) {
    const message = sanitiseError(error, 'Failed to sync the capability registry')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const [manifest, registered, lastSync] = await Promise.all([
      getCapabilityManifest(),
      readRegistryTools({ founderId: user.id }),
      readRegistryLastSync({ founderId: user.id }),
    ])

    return NextResponse.json({
      discovered: {
        agents: manifest.agents.length,
        skills: manifest.skills.length,
        mcp_servers: manifest.mcp_servers.length,
      },
      registered_tools: registered.length,
      last_sync: lastSync,
      // Surfaced, not just logged: two different capabilities sharing a display
      // name is the condition that silently dropped three skills before the
      // key strategy landed.
      collisions: manifest.collisions,
      // The condition the audit was about: a populated manifest with an empty
      // registry means reuse-before-build searches will find nothing.
      sync_required: registered.length === 0 && manifest.skills.length + manifest.mcp_servers.length > 0,
    })
  } catch (error) {
    const message = sanitiseError(error, 'Failed to read the capability registry')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

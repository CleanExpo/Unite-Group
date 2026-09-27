// src/app/api/linear/issues/route.ts
// GET  — fetch all Linear issues mapped to Kanban columns
// PATCH — update an issue's state when dragged to a new column

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  fetchIssues,
  fetchTeamStates,
  updateIssueState,
  fetchIssue,
  createIssue,
  stateToColumn,
  issueToBusiness,
  BUSINESS_TO_TEAM,
  projectNameForBusiness,
  COLUMN_TO_STATE_NAME,
} from '@/lib/integrations/linear'
import { BUSINESSES } from '@/lib/businesses'
import { acceptanceText, checkDoneAllowed } from '@/lib/mission-authority/done-invariant'

export const dynamic = 'force-dynamic'

const bizColor = (key: string): string =>
  BUSINESSES.find((b) => b.key === key)?.color ?? '#555555'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Not configured is not an error — but it is not an empty board either.
  // Returning empty columns asserted a READ RESULT that no read produced, so
  // "Linear is not connected" and "the board has no issues" arrived in the same
  // shape. `columns` is therefore OMITTED: a consumer can render whatever
  // placeholder it likes, but it cannot mistake absence for a fact about the
  // board. 200 stays, because unconfigured is an expected state; a thrown read
  // is already a 502 below. [UNI-2493]
  if (!process.env.LINEAR_API_KEY) {
    return NextResponse.json({ stateMap: {}, configured: false })
  }

  try {
    const [issues, teams] = await Promise.all([fetchIssues(), fetchTeamStates()])

    // Build stateId lookup: teamKey → columnId → stateId
    const stateMap: Record<string, Record<string, string>> = {}
    for (const team of teams) {
      stateMap[team.key] = {}
      for (const [colId, stateName] of Object.entries(COLUMN_TO_STATE_NAME)) {
        const match = team.states.nodes.find((s) => s.name === stateName)
        if (match) stateMap[team.key][colId] = match.id
      }
    }

    // Group issues by column
    const columns: Record<string, {
      id: string
      title: string
      linearId: string
      businessKey: string
      businessColor: string
      priority: number
      stateId: string
      teamKey: string
    }[]> = {
      today: [], hot: [], pipeline: [], someday: [], done: [],
    }

    for (const issue of issues) {
      const colId = stateToColumn(issue.state)
      const businessKey = issueToBusiness(issue)
      columns[colId].push({
        id: issue.id,
        title: `${issue.identifier} — ${issue.title}`,
        linearId: issue.id,
        businessKey,
        businessColor: bizColor(businessKey),
        priority: issue.priority,
        stateId: issue.state.id,
        teamKey: issue.team.key,
      })
    }

    return NextResponse.json({ columns, stateMap, configured: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!process.env.LINEAR_API_KEY) {
    return NextResponse.json({ error: 'Linear is not configured' }, { status: 503 })
  }

  try {
    const body = await request.json() as {
      title?: string
      description?: string
      businessKey?: string
      teamKey?: string
      priority?: number
    }

    // Prefer businessKey: it resolves both the Linear team AND the project, so
    // the new issue round-trips to the correct Kanban card (businesses sharing a
    // team — itr/ato/ccw on UNI — are only distinguished by project). teamKey is
    // still accepted for backward compatibility.
    const teamKey = body.businessKey ? BUSINESS_TO_TEAM[body.businessKey] : body.teamKey
    const projectName = body.businessKey ? projectNameForBusiness(body.businessKey) : undefined

    if (!body.title?.trim() || !teamKey) {
      return NextResponse.json(
        { error: 'Missing required fields: title, and a valid businessKey or teamKey' },
        { status: 400 },
      )
    }

    const issue = await createIssue({
      teamKey,
      title: body.title.trim(),
      description: body.description ?? '',
      priority: body.priority ?? 3,
      ...(projectName ? { projectName } : {}),
    })

    return NextResponse.json({ identifier: issue.id, url: issue.url }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // GET and POST both guard this; PATCH did not. `updateIssueState()` logs and
  // returns when the key is missing, so this route answered 200 for a write
  // that never reached Linear — a failed write reported as a successful one,
  // which is this branch's thesis on the write side. Same 503 as POST.
  // [UNI-2495]
  if (!process.env.LINEAR_API_KEY) {
    return NextResponse.json({ error: 'Linear is not configured' }, { status: 503 })
  }

  try {
    const { issueId, columnId, teamKey, stateMap } = await request.json() as {
      issueId: string
      columnId: string
      teamKey: string
      stateMap: Record<string, Record<string, string>>
    }

    const stateId = stateMap[teamKey]?.[columnId]
    if (!stateId) {
      return NextResponse.json({ error: `No state found for ${teamKey}/${columnId}` }, { status: 400 })
    }

    // UNI-2779 done invariant: a move into a completed state is refused while
    // the issue's own description says it is not finished. The target state's
    // TYPE decides (the column name and stateMap are client-supplied), and the
    // description is read fresh from Linear — a failed read fails closed (502).
    const targetState = (await fetchTeamStates())
      .flatMap((team) => team.states.nodes)
      .find((state) => state.id === stateId)
    // A state we cannot classify might be a completed one: refuse rather than
    // skip the invariant on an unknown target.
    if (!targetState) {
      return NextResponse.json({ error: `Unknown target state ${stateId}: cannot confirm it is not Done` }, { status: 502 })
    }
    if (columnId === 'done' || targetState.type === 'completed') {
      const issue = await fetchIssue(issueId)
      const check = checkDoneAllowed(acceptanceText(issue.title, issue.description))
      if (!check.allowed) {
        return NextResponse.json(
          { error: `Cannot move ${issueId} to Done: its title or description says it is not finished`, blockers: check.blockers },
          { status: 409 },
        )
      }
    }

    await updateIssueState(issueId, stateId)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

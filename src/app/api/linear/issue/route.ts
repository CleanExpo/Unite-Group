import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';

const LINEAR_API = 'https://api.linear.app/graphql';

async function linearRequest(query: string, variables: Record<string, unknown>) {
  const key = process.env.LINEAR_API_KEY?.trim();
  if (!key) return { error: 'LINEAR_API_KEY not set' };

  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: { 'Authorization': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// GET /api/linear/issue?action=teams — get teams list
// POST /api/linear/issue — create or update issue

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const action = req.nextUrl.searchParams.get('action');

  if (action === 'teams') {
    const data = await linearRequest(`
      query {
        teams { nodes { id name key } }
        viewer { id name }
      }
    `, {});
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  let body: {
    action?: unknown;
    issueId?: unknown;
    title?: unknown;
    teamId?: unknown;
    description?: unknown;
    priority?: unknown;
    state?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { action, issueId, title, teamId, description, priority, state } = body;

  if (action === 'create') {
    const data = await linearRequest(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier title url state { name } }
        }
      }
    `, {
      input: {
        title,
        teamId,
        description: description || '',
        priority: priority ?? 2,
      }
    });
    return NextResponse.json(data);
  }

  if (action === 'update' && issueId) {
    const updateInput: Record<string, unknown> = {};
    if (typeof state === 'string') {
      // Get state ID first
      const stateData = await linearRequest(`
        query GetStates($teamId: String!) {
          team(id: $teamId) {
            states { nodes { id name type } }
          }
        }
      `, { teamId });
      const states = stateData?.data?.team?.states?.nodes ?? [];
      const requestedState = state.toLowerCase();
      const matchedState = states.find((s: { name: string }) =>
        s.name.toLowerCase().includes(requestedState)
      );
      if (matchedState) updateInput.stateId = matchedState.id;
    }
    if (priority !== undefined) updateInput.priority = priority;

    const data = await linearRequest(`
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue { id identifier title url state { name } }
        }
      }
    `, { id: issueId, input: updateInput });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

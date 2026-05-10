export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const LINEAR_GQL = 'https://api.linear.app/graphql';

const QUERY = `
query {
  issues(
    filter: {
      priority: { lte: 2 }
      state: { type: { nin: ["completed", "cancelled"] } }
    }
    first: 8
    orderBy: priority
  ) {
    nodes {
      identifier
      title
      priority
      state { name }
      team { name }
      url
      description
    }
  }
}
`;

function priorityLabel(p: number): 'urgent' | 'high' | 'medium' {
  if (p === 1) return 'urgent';
  if (p === 2) return 'high';
  return 'medium';
}

export async function GET() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ priorities: [], error: 'LINEAR_API_KEY not configured' });
  }

  try {
    const res = await fetch(LINEAR_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ query: QUERY }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    const nodes = data?.data?.issues?.nodes ?? [];

    const priorities = nodes.map((issue: {
      identifier: string;
      title: string;
      priority: number;
      state: { name: string };
      team: { name: string };
      url: string;
      description: string | null;
    }) => ({
      id: issue.identifier,
      title: issue.title,
      subtitle: issue.description
        ? issue.description.slice(0, 120).replace(/\n/g, ' ')
        : `${issue.state?.name ?? 'Open'} · ${issue.team?.name ?? 'Unassigned'}`,
      priority: priorityLabel(issue.priority),
      owner: 'linear',
      url: issue.url ?? null,
      team: issue.team?.name ?? 'Unassigned',
    }));

    return NextResponse.json({ priorities });
  } catch (err) {
    return NextResponse.json({
      priorities: [],
      error: err instanceof Error ? err.message : 'Linear fetch failed',
    });
  }
}

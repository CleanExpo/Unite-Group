export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// Map slugs to Linear team names
const TEAM_MAP: Record<string, string> = {
  'synthex': 'Synthex',
  'restoreassist': 'RestoreAssist',
  'dr-nrpg': 'DR-NRPG',
  'carsi': 'G-Pilot',
  'ccw-crm': 'Unite-Group',
  'disaster-recovery': 'DR',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const team = TEAM_MAP[slug];
  if (!team) return NextResponse.json({ tickets: [] });

  const LINEAR_KEY = process.env.LINEAR_API_KEY;
  if (!LINEAR_KEY) return NextResponse.json({ tickets: [], error: 'Linear not configured' });

  const query = `{
    issues(
      filter: {
        team: { name: { eq: "${team}" } }
        state: { type: { in: [started, unstarted] } }
      }
      orderBy: updatedAt
      first: 15
    ) {
      nodes {
        id
        identifier
        title
        state { name type }
        priority
        url
        updatedAt
      }
    }
  }`;

  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Authorization': LINEAR_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    const issues = data?.data?.issues?.nodes ?? [];

    const tickets = issues.map((i: { identifier: string; title: string; state: { name: string; type: string }; priority: number; url: string }) => ({
      id: i.identifier,
      title: i.title.slice(0, 55),
      state: i.state.name,
      stateType: i.state.type,
      priority: i.priority,
      url: i.url,
    }));

    return NextResponse.json({ tickets });
  } catch {
    return NextResponse.json({ tickets: [], error: 'Linear fetch failed' });
  }
}

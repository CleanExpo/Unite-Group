export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { message, clientSlug } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const LINEAR_KEY = process.env.LINEAR_API_KEY;
  if (!LINEAR_KEY) return NextResponse.json({ error: 'Linear not configured' }, { status: 500 });

  // Get the Unite-Group team ID
  const teamQuery = `{ teams { nodes { id name } } }`;
  const teamRes = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Authorization': LINEAR_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: teamQuery }),
  });
  const teamData = await teamRes.json();
  const teams = teamData?.data?.teams?.nodes ?? [];
  const uniteTeam = teams.find((t: { name: string }) => t.name === 'Unite-Group') ?? teams[0];
  if (!uniteTeam) return NextResponse.json({ error: 'No Linear team found' }, { status: 500 });

  // Sanitise message for embedding in GraphQL string literal
  const safeTitle = message.slice(0, 60).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const safeBody = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Create the issue
  const mutation = `
    mutation {
      issueCreate(input: {
        title: "[CCW Client Request] ${safeTitle}",
        description: "**Client request from CCW portal**\\n\\n${safeBody}\\n\\n---\\n*Submitted via Unite-Group Nexus client portal*",
        teamId: "${uniteTeam.id}",
        priority: 2
      }) {
        success
        issue { id identifier url }
      }
    }
  `;

  const issueRes = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Authorization': LINEAR_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutation }),
  });
  const issueData = await issueRes.json();
  const issue = issueData?.data?.issueCreate?.issue;

  if (!issue) return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });

  return NextResponse.json({
    success: true,
    ticketId: issue.identifier,
    message: `Request submitted. Ticket ${issue.identifier} created.`,
  });
}

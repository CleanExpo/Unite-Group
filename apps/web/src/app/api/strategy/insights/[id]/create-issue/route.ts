// src/app/api/strategy/insights/[id]/create-issue/route.ts
// GET  /api/strategy/insights/:id/create-issue — existing bridge link (or null)
// POST /api/strategy/insights/:id/create-issue — create a Linear issue from the
//   insight and record the work→task bridge link (B8).

import { sanitiseError } from "@/lib/error-reporting";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { createIssue, BUSINESS_TO_TEAM } from "@/lib/integrations/linear";

export const dynamic = "force-dynamic";

// Insight priority → Linear priority (0=none, 1=urgent, 2=high, 3=medium, 4=low).
const PRIORITY_TO_LINEAR: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_insight_issues")
    .select("*")
    .eq("founder_id", user.id)
    .eq("insight_id", id)
    .maybeSingle();

  if (error)
    return NextResponse.json(
      {
        error: sanitiseError(error, "Failed to load issue link", {
          route: "strategy/insights/[id]/create-issue",
        }),
      },
      { status: 500 },
    );
  return NextResponse.json({ link: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  let body: {
    acceptanceCriteria?: string;
    evidenceIds?: string[];
    autonomous?: boolean;
  };
  try {
    body = (await request.json()) as {
      acceptanceCriteria?: string;
      evidenceIds?: string[];
      autonomous?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const acceptanceCriteria = body.acceptanceCriteria?.trim();
  if (!acceptanceCriteria) {
    return NextResponse.json(
      { error: "Acceptance criteria are required to create an issue." },
      { status: 400 },
    );
  }
  if (body.autonomous === true) {
    return NextResponse.json(
      { error: "legacy_linear_execution_retired", authority: "crm-ownest" },
      { status: 409 },
    );
  }
  const evidenceIds = (body.evidenceIds ?? [])
    .map((e) => e.trim())
    .filter(Boolean);

  const supabase = await createClient();

  // Idempotent — one issue per insight.
  const { data: existing } = await supabase
    .from("strategy_insight_issues")
    .select("*")
    .eq("founder_id", user.id)
    .eq("insight_id", id)
    .maybeSingle();
  if (existing) return NextResponse.json({ link: existing }, { status: 200 });

  const { data: insight, error: insightError } = await supabase
    .from("strategy_insights")
    .select("*")
    .eq("id", id)
    .eq("founder_id", user.id)
    .single();
  if (insightError || !insight) {
    return NextResponse.json({ error: "Insight not found." }, { status: 404 });
  }

  const teamKey = BUSINESS_TO_TEAM[insight.business_key];
  if (!teamKey) {
    return NextResponse.json(
      {
        error: `No Linear team mapped for business "${insight.business_key}".`,
      },
      { status: 400 },
    );
  }

  // Acceptance criteria remain useful for a human-readable planning projection;
  // they do not make the Linear issue executable.
  const evidenceSection = evidenceIds.length
    ? `\n\n## Evidence\n${evidenceIds.map((e) => `- ${e}`).join("\n")}`
    : "";
  const description =
    `${insight.body}\n\n## Acceptance Criteria\n${acceptanceCriteria}` +
    evidenceSection +
    `\n\n---\nCreated from strategy insight \`${insight.id}\` (${insight.type}).`;

  const labelNames = ["source:strategy-insight"];

  let issue: { id: string; url?: string };
  try {
    issue = await createIssue({
      title: insight.title,
      description,
      teamKey,
      priority: PRIORITY_TO_LINEAR[insight.priority] ?? 3,
      labelNames,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: sanitiseError(e, "Failed to create Linear issue.", {
          route: "strategy/insights/[id]/create-issue",
        }),
      },
      { status: 502 },
    );
  }

  const { data: link, error: linkError } = await supabase
    .from("strategy_insight_issues")
    .insert({
      founder_id: user.id,
      insight_id: insight.id,
      linear_issue_id: issue.id,
      linear_issue_url: issue.url ?? null,
      team_key: teamKey,
      acceptance_criteria: acceptanceCriteria,
      evidence_ids: evidenceIds,
      autonomous: false,
    })
    .select()
    .single();
  if (linkError)
    return NextResponse.json(
      {
        error: sanitiseError(linkError, "Failed to create issue", {
          route: "strategy/insights/[id]/create-issue",
        }),
      },
      { status: 500 },
    );

  // Advance the insight to "acting" — it now has work attached.
  if (insight.status === "new" || insight.status === "reviewing") {
    await supabase
      .from("strategy_insights")
      .update({ status: "acting", updated_at: new Date().toISOString() })
      .eq("id", insight.id)
      .eq("founder_id", user.id);
  }

  return NextResponse.json({ link }, { status: 201 });
}

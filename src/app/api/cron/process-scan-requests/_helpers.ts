// Pure scoring helpers for the Pi-CEO scanner cron.
//
// Extracted out of route.ts so Next.js App Router's "only handler symbols may
// be exported from route.ts" rule isn't violated. Tests import from this
// module directly.

/** Compute security_score per the scoring rubric in the task brief. */
export function computeSecurityScore(args: {
  dep_alerts_open: number | null;
  supabase_security_count: number | null;
  ci_failing: boolean;
  github_known: boolean;
}): number {
  let score = 100;

  // Each Dependabot alert: -0.5, capped at -50.
  if (args.dep_alerts_open !== null) {
    score -= Math.min(50, args.dep_alerts_open * 0.5);
  }

  // Each Supabase security advisor: -0.1, capped at -30.
  if (args.supabase_security_count !== null) {
    score -= Math.min(30, args.supabase_security_count * 0.1);
  }

  // Failing CI: -10.
  if (args.ci_failing) score -= 10;

  // Unknown GitHub signal: -20 (we don't know what we're missing).
  if (!args.github_known) score -= 20;

  return Math.max(0, Math.round(score));
}

/** Compute overall_health: 40% security, 40% deploys, 20% tickets. */
export function computeOverallHealth(args: {
  security_score: number;
  latest_commit_at: string | null;
  linear_in_progress: number | null;
}): number {
  // Deploys-recent component (proxy: latest commit on default branch).
  // READY in last 7d = 100; linear decay to 0 at 30d.
  let deployComponent: number;
  if (args.latest_commit_at) {
    const ageDays = (Date.now() - new Date(args.latest_commit_at).getTime()) / 86_400_000;
    if (ageDays <= 7) deployComponent = 100;
    else if (ageDays >= 30) deployComponent = 0;
    else deployComponent = Math.round(100 * (1 - (ageDays - 7) / 23));
  } else {
    deployComponent = 50; // unknown — neutral
  }

  // Tickets-healthy component.
  let ticketsComponent: number;
  if (args.linear_in_progress === null) ticketsComponent = 50;
  else if (args.linear_in_progress < 10) ticketsComponent = 100;
  else if (args.linear_in_progress > 30) ticketsComponent = 0;
  else ticketsComponent = Math.round(100 * (1 - (args.linear_in_progress - 10) / 20));

  const overall = 0.4 * args.security_score + 0.4 * deployComponent + 0.2 * ticketsComponent;
  return Math.max(0, Math.min(100, Math.round(overall)));
}

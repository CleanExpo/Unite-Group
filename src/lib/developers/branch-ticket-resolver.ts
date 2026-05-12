// src/lib/developers/branch-ticket-resolver.ts
import { getAdminClient } from "@/lib/supabase/admin";

// Linear identifiers: 2-4 letters, hyphen, 1-5 digits.
const LINEAR_KEY = /\b([A-Z]{2,4})-(\d{1,5})\b/i;

export function extractLinearKey(branch: string): string | null {
  const match = branch.match(LINEAR_KEY);
  if (!match) return null;
  return `${match[1].toUpperCase()}-${match[2]}`;
}

export async function resolveBranchesToTickets(
  branches: Array<{ repo: string; branch: string; developerEmail: string; lastCommitAt: string | null }>
): Promise<void> {
  const sb = getAdminClient();
  const rows = branches
    .map((b) => ({
      repo: b.repo,
      branch: b.branch,
      linear_issue_id: extractLinearKey(b.branch),
      developer_email: b.developerEmail,
      last_seen_at: b.lastCommitAt ?? new Date().toISOString(),
    }))
    .filter((r) => r.linear_issue_id || r.branch !== "main");

  if (rows.length === 0) return;
  await sb.from("developer_branch_map").upsert(rows, { onConflict: "repo,branch" });
}

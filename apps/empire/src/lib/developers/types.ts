// src/lib/developers/types.ts

export interface DeveloperProfile {
  id: number;
  displayName: string;
  primaryEmail: string;
  gitAuthorEmails: string[];
  githubLogin: string | null;
  role: string | null;
  country: string | null;
  timezone: string | null;
  hiredAt: string | null;
  active: boolean;
}

export interface DailyCommitCount {
  date: string;       // 'YYYY-MM-DD' in developer's local TZ
  count: number;
}

export interface DeveloperOpenPR {
  id: string;         // 'CleanExpo/RestoreAssist#946'
  repo: string;
  number: number;
  title: string;
  headRef: string;
  ciState: string | null;
  mergeable: string | null;
  createdAt: string;
  updatedAt: string;
  daysOpen: number;
  linkedLinearIssueId: string | null;
}

export interface BranchTicketLink {
  repo: string;
  branch: string;
  linearIssueId: string | null;
  linearTitle: string | null;
  linearStatus: string | null;
  lastCommitAt: string | null;
  ciState: string | null;
}

export interface DeveloperSnapshot {
  profile: DeveloperProfile;

  // 14-day rolling sparkline
  sparkline: DailyCommitCount[];
  commitsToday: number;
  commitsThisWeek: number;
  commitsThisMonth: number;
  lastPushAt: string | null;
  hoursSinceLastPush: number | null;

  // Per-repo activity
  perRepo: Array<{ repo: string; commits14d: number; lastCommitAt: string | null }>;

  // PR queue
  openPRs: DeveloperOpenPR[];
  prsBlockedOnReview: DeveloperOpenPR[];   // open >2 days, mergeable, no requested changes
  staleBranches: BranchTicketLink[];        // no push in 7+ days

  // Linked tickets
  branchTicketMap: BranchTicketLink[];
}

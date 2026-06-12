import type { CrmDailyDigest } from '@/lib/crm/daily-digest';

export type CommandCenterDailyDigestInitial = {
  generatedAt?: string;
  summary: CrmDailyDigest['summary'];
  operatorPriorities: string[];
  approvals: string[];
  blockers: string[];
  sourceLiveAt?: string;
};

export function toCommandCenterDailyDigestInitial(
  digest: CrmDailyDigest | undefined,
): CommandCenterDailyDigestInitial | undefined {
  if (!digest) return undefined;

  return {
    generatedAt: digest.generatedAt,
    summary: digest.summary,
    operatorPriorities: digest.sections.operatorPriorities.slice(0, 5),
    approvals: digest.sections.approvals.slice(0, 5),
    blockers: digest.sections.blockers.slice(0, 5),
    sourceLiveAt: digest.generatedAt,
  };
}

export type DigestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CrmDigestLead {
  id: string;
  name?: string | null;
  company?: string | null;
  email?: string | null;
  status?: string | null;
  qualificationBand?: string | null;
  score?: number | null;
  nextAction?: string | null;
}

export interface CrmDigestOpportunity {
  id: string;
  name: string;
  stage?: string | null;
  valueEstimate?: number | null;
  probability?: number | null;
  requiresApproval?: boolean | null;
  nextAction?: string | null;
}

export interface CrmDigestTask {
  id: string;
  title: string;
  owner?: string | null;
  status?: string | null;
  priority?: DigestPriority | string | null;
  source?: 'margot_voice' | string | null;
}

export interface CrmDigestBlocker {
  area: string;
  detail: string;
  neededFrom?: string | null;
}

export interface CrmDigestVerification {
  command: string;
  status: 'passed' | 'failed' | 'blocked' | string;
}

export interface StaleIntegrationDigest {
  integration: string;
  reason: string;
  minutesOverdue: number;
}

export interface CrmDailyDigestInput {
  generatedAt: string;
  leads?: CrmDigestLead[];
  opportunities?: CrmDigestOpportunity[];
  tasks?: CrmDigestTask[];
  blockers?: CrmDigestBlocker[];
  verification?: CrmDigestVerification[];
  staleIntegrations?: StaleIntegrationDigest[];
}

export interface CrmDailyDigest {
  generatedAt: string;
  summary: {
    leadCount: number;
    qualifiedLeadCount: number;
    opportunityCount: number;
    approvalRequiredCount: number;
    blockedTaskCount: number;
    blockerCount: number;
    staleIntegrationCount: number;
  };
  sections: {
    operatorPriorities: string[];
    approvals: string[];
    blockers: string[];
    verification: string[];
    staleIntegrations: string[];
  };
  markdown: string;
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function redactSensitiveDigestText(value: string): string {
  return value
    .replace(/\bBOARD-[A-Z0-9-]+\b/gi, '[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]')
    .replace(
      /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)[A-Z0-9_]*=)(?:"[^"]*"|'[^']*'|\S+)/gi,
      '$1[REDACTED]',
    )
    .replace(/\bbearer\s+[a-z0-9._~+/=-]+\b/gi, 'Bearer [REDACTED]')
    .replace(/(?:\+\d[\d ().-]{7,}\d|\b\d[\d ().]{7,}\d\b)/g, '[REDACTED]')
    .replace(/\bcard\s+(?:ending|number)\s+\d{4}\b/gi, '[REDACTED]');
}

function money(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${Math.round(value * 100)}%`;
}

function leadLabel(lead: CrmDigestLead): string {
  const name = redactSensitiveDigestText(clean(lead.name) || `lead ${lead.id}`);
  const company = redactSensitiveDigestText(clean(lead.company));
  return company ? `${name} / ${company}` : name;
}

function buildOperatorPriorities(leads: CrmDigestLead[], opportunities: CrmDigestOpportunity[], tasks: CrmDigestTask[]): string[] {
  const priorities: string[] = [];

  leads
    .filter((lead) => clean(lead.qualificationBand) === 'qualified' || clean(lead.status) === 'new')
    .slice(0, 5)
    .forEach((lead) => {
      const score = typeof lead.score === 'number' ? ` score ${lead.score}` : '';
      const next = redactSensitiveDigestText(clean(lead.nextAction) || 'Review and decide next CRM action');
      priorities.push(`Lead ${lead.id} (${leadLabel(lead)}): ${clean(lead.qualificationBand) || clean(lead.status) || 'unclassified'}${score}. Next: ${next}`);
    });

  opportunities.slice(0, 5).forEach((opportunity) => {
    const details = [
      clean(opportunity.stage) ? `stage ${clean(opportunity.stage)}` : null,
      money(opportunity.valueEstimate),
      percent(opportunity.probability),
    ].filter(Boolean).join(', ');
    const next = redactSensitiveDigestText(clean(opportunity.nextAction) || 'Confirm owner and next commercial action');
    const opportunityName = redactSensitiveDigestText(opportunity.name);
    priorities.push(`Opportunity ${opportunity.id} (${opportunityName})${details ? `: ${details}` : ''}. Next: ${next}`);
  });

  tasks
    .filter((task) => clean(task.priority) === 'urgent' || clean(task.priority) === 'high')
    .slice(0, 5)
    .forEach((task) => {
      const taskLabel = task.source === 'margot_voice' ? 'Voice task' : 'Task';
      const title = redactSensitiveDigestText(task.title);
      const owner = redactSensitiveDigestText(clean(task.owner) || 'unassigned');
      priorities.push(`${taskLabel} ${task.id} (${title}): owner ${owner}, status ${clean(task.status) || 'unknown'}, priority ${clean(task.priority)}.`);
    });

  return priorities.length ? priorities : ['No CRM priorities supplied for this digest window.'];
}

function buildApprovals(opportunities: CrmDigestOpportunity[], tasks: CrmDigestTask[]): string[] {
  const approvals = [
    ...opportunities
      .filter((opportunity) => opportunity.requiresApproval === true)
      .map((opportunity) => {
        const opportunityName = redactSensitiveDigestText(opportunity.name);
        const next = redactSensitiveDigestText(clean(opportunity.nextAction) || 'Draft approval decision for Phill');
        return `Opportunity ${opportunity.id} (${opportunityName}): approval required before commercial commitment. Next: ${next}`;
      }),
    ...tasks
      .filter((task) => clean(task.owner).toLowerCase() === 'phill' || clean(task.status) === 'blocked')
      .map((task) => {
        const taskLabel = task.source === 'margot_voice' ? 'Voice task' : 'Task';
        const title = redactSensitiveDigestText(task.title);
        const owner = redactSensitiveDigestText(clean(task.owner) || 'operator approval');
        return `${taskLabel} ${task.id} (${title}): blocked for ${owner}. Priority: ${clean(task.priority) || 'normal'}`;
      }),
  ];

  return approvals.length ? approvals : ['No approval-required items supplied for this digest window.'];
}

function buildBlockers(blockers: CrmDigestBlocker[]): string[] {
  const lines = blockers.map((blocker) => {
    const area = redactSensitiveDigestText(blocker.area);
    const detail = redactSensitiveDigestText(blocker.detail);
    const needed = redactSensitiveDigestText(clean(blocker.neededFrom));
    return `${area}: ${detail}.${needed ? ` Needed: ${needed}` : ''}`;
  });

  return lines.length ? lines : ['No blockers supplied for this digest window.'];
}

function redactVerificationCommand(command: string): string {
  return command
    .replace(
      /(^|[\s;])([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)[A-Z0-9_]*=)(?:"[^"]*"|'[^']*'|\S+)/gi,
      '$1$2[REDACTED]',
    )
    .replace(
      /(\B--[A-Z0-9_-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[-_]?KEY|SERVICE[-_]?ROLE[-_]?KEY)[A-Z0-9_-]*)(=|\s+)(?:"([^"]*)"|'([^']*)'|(\S+))/gi,
      (_match: string, flag: string, separator: string, doubleQuoted?: string, singleQuoted?: string) => {
        if (doubleQuoted !== undefined) return `${flag}${separator}"[REDACTED]"`;
        if (singleQuoted !== undefined) return `${flag}${separator}'[REDACTED]'`;
        return `${flag}${separator}[REDACTED]`;
      },
    )
    .replace(
      /((?:^|[\s"'=])(?:[A-Z0-9_-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[-_]?KEY|SERVICE[-_]?ROLE[-_]?KEY)[A-Z0-9_-]*)(?::|=)\s*)([^\s"']+)(?=[\s"']|$)/gi,
      '$1[REDACTED]',
    )
    .replace(
      /(Authorization[:=]\s*Bearer\s+)([^\s"']+)(?=[\s"']|$)/gi,
      '$1[REDACTED]',
    )
    .replace(
      /([?&][A-Z0-9_-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[-_]?KEY|SERVICE[-_]?ROLE[-_]?KEY)[A-Z0-9_-]*=)([^\s"'&#]+)(?=[&#\s"']|$)/gi,
      '$1[REDACTED]',
    );
}

function buildVerification(verification: CrmDigestVerification[]): string[] {
  const lines = verification.map((item) => `${item.status}: ${redactVerificationCommand(item.command)}`);
  return lines.length ? lines : ['No verification supplied for this digest window.'];
}

function markdownList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function staleReasonLabel(reason: string): string {
  return clean(reason).replace(/_/g, ' ') || 'unknown state';
}

function normalizedMinutes(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function staleReasonDetail(reason: string, minutesOverdue: number): string {
  const normalized = clean(reason);
  const safeMinutes = normalizedMinutes(minutesOverdue);
  if (normalized === 'last_error' && safeMinutes <= 0) {
    return 'active error; cadence not yet overdue';
  }
  if (normalized === 'never_synced') {
    return 'no completed sync recorded';
  }
  return `${safeMinutes} min overdue`;
}

function buildStaleIntegrations(stale: StaleIntegrationDigest[]): string[] {
  return stale.length
    ? stale.map((s) => `${s.integration}: ${staleReasonLabel(s.reason)} (${staleReasonDetail(s.reason, s.minutesOverdue)})`)
    : ['All integration mirrors are within their sync cadence.'];
}

export function createCrmDailyDigest(input: CrmDailyDigestInput): CrmDailyDigest {
  const leads = input.leads ?? [];
  const opportunities = input.opportunities ?? [];
  const tasks = input.tasks ?? [];
  const blockers = input.blockers ?? [];
  const verification = input.verification ?? [];
  const staleIntegrations = input.staleIntegrations ?? [];

  const summary = {
    leadCount: leads.length,
    qualifiedLeadCount: leads.filter((lead) => clean(lead.qualificationBand) === 'qualified').length,
    opportunityCount: opportunities.length,
    approvalRequiredCount:
      opportunities.filter((opportunity) => opportunity.requiresApproval === true).length +
      tasks.filter((task) => clean(task.owner).toLowerCase() === 'phill' || clean(task.status) === 'blocked').length,
    blockedTaskCount: tasks.filter((task) => clean(task.status) === 'blocked').length,
    blockerCount: blockers.length,
    staleIntegrationCount: staleIntegrations.length,
  };

  const sections = {
    operatorPriorities: buildOperatorPriorities(leads, opportunities, tasks),
    approvals: buildApprovals(opportunities, tasks),
    blockers: buildBlockers(blockers),
    verification: buildVerification(verification),
    staleIntegrations: buildStaleIntegrations(staleIntegrations),
  };

  const markdown = [
    '# Daily CRM Digest',
    '',
    `Generated: ${input.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Leads: ${summary.leadCount}`,
    `- Qualified leads: ${summary.qualifiedLeadCount}`,
    `- Opportunities: ${summary.opportunityCount}`,
    `- Approval-required items: ${summary.approvalRequiredCount}`,
    `- Blocked tasks: ${summary.blockedTaskCount}`,
    `- Blockers: ${summary.blockerCount}`,
    `- Stale integrations: ${summary.staleIntegrationCount}`,
    '',
    '## Operator Priorities',
    '',
    markdownList(sections.operatorPriorities),
    '',
    '## Approvals / Board Decisions',
    '',
    markdownList(sections.approvals),
    '',
    '## Blockers',
    '',
    markdownList(sections.blockers),
    '',
    '## Verification',
    '',
    markdownList(sections.verification),
    '',
    '## Stale Integration Mirrors',
    '',
    markdownList(sections.staleIntegrations),
    '',
    '## Safety Note',
    '',
    'No production DB writes, deploys, env mutations, secret printing, GitHub push, or client-facing sends are implied by this digest.',
  ].join('\n');

  return { generatedAt: input.generatedAt, summary, sections, markdown };
}

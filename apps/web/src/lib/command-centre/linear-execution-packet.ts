import type { ClaimCandidate } from './linear-claim'

export interface LinearExecutionStep {
  id: string
  title: string
  command: string
}

export interface LinearExecutionPacket {
  source: 'command-centre:linear-claim'
  runId: string
  runner: string
  issue: {
    id: string
    identifier: string
    title: string
    url?: string
    priority: number
  }
  branchName: string
  prompt: string
  steps: LinearExecutionStep[]
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'linear-task'
}

export function buildLinearExecutionPacket(
  issue: ClaimCandidate,
  input: { runId: string; runner: string },
): LinearExecutionPacket {
  const branchName = `pidev/auto-${slug(issue.identifier)}`
  const issueRef = issue.url ? `${issue.identifier} (${issue.url})` : issue.identifier
  return {
    source: 'command-centre:linear-claim',
    runId: input.runId,
    runner: input.runner,
    issue: {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      url: issue.url,
      priority: issue.priority,
    },
    branchName,
    prompt: [
      `You are ${input.runner}. Continue the autonomous build for ${issueRef}.`,
      '',
      `Title: ${issue.title}`,
      '',
      'Read the Linear issue description, satisfy the Acceptance Criteria, run the relevant verification gates, commit to a feature branch, push, and open a draft PR for RANA review.',
      'Do not touch secrets or destructive production paths. If the work requires blocked credentials or human approval, stop and report the blocker back to Linear.',
    ].join('\n'),
    steps: [
      {
        id: 'read-linear-issue',
        title: 'Read the Linear issue and acceptance criteria',
        command: `linear issue view ${issue.identifier}`,
      },
      {
        id: 'create-branch',
        title: 'Create the autonomous feature branch',
        command: `git checkout -b ${branchName}`,
      },
      {
        id: 'build-and-verify',
        title: 'Implement the smallest passing slice and run verification',
        command: 'npm test -- --runInBand && npm run type-check && npm run lint',
      },
      {
        id: 'push-pr',
        title: 'Push the branch and open a draft PR for RANA',
        command: `git push origin ${branchName}`,
      },
    ],
  }
}

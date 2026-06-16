export type LaneId = 'lane-1' | 'lane-2' | 'lane-3';
export type LaneDecision = 'approved' | 'changes-requested' | 'rejected';

export type NextStepTask = {
  queue: 'approval_queue';
  status:
    | 'queued_for_phill'
    | 'queued_for_synthex'
    | 'halted';
  owner: 'Phill' | 'Synthex' | 'Human Gate';
  summary: string;
  target?: 'ccw-crm';
  requires_human_gate?: boolean;
  message_to_phill?: string;
};

export type RoutingRule = {
  laneId: LaneId;
  decision: LaneDecision;
  nextStep: NextStepTask;
};

const HALT: NextStepTask = {
  queue: 'approval_queue',
  status: 'halted',
  owner: 'Phill',
  summary: 'Halt the lane and notify Phill with the decision record.',
};

export const routingTable: RoutingRule[] = [
  {
    laneId: 'lane-1',
    decision: 'approved',
    nextStep: {
      queue: 'approval_queue',
      status: 'queued_for_phill',
      owner: 'Phill',
      summary: 'Phill fills workshop capacity from Toby’s response, then sends the follow-up packet confirming the operational numbers.',
    },
  },
  {
    laneId: 'lane-2',
    decision: 'approved',
    nextStep: {
      queue: 'approval_queue',
      status: 'queued_for_synthex',
      owner: 'Synthex',
      summary: 'Queue landing copy for implementation in the CCW-CRM app.',
      target: 'ccw-crm',
    },
  },
  {
    laneId: 'lane-3',
    decision: 'approved',
    nextStep: {
      queue: 'approval_queue',
      status: 'queued_for_phill',
      owner: 'Human Gate',
      summary: 'Phill brand-voice sign-off first; never auto-chain. After that, Synthex queue the content calendar.',
      requires_human_gate: true,
    },
  },
  { laneId: 'lane-1', decision: 'changes-requested', nextStep: HALT },
  { laneId: 'lane-2', decision: 'changes-requested', nextStep: HALT },
  { laneId: 'lane-3', decision: 'changes-requested', nextStep: HALT },
  { laneId: 'lane-1', decision: 'rejected', nextStep: HALT },
  { laneId: 'lane-2', decision: 'rejected', nextStep: HALT },
  { laneId: 'lane-3', decision: 'rejected', nextStep: HALT },
];

export function getRoutingRule(laneId: LaneId, decision: LaneDecision): RoutingRule {
  const rule = routingTable.find((entry) => entry.laneId === laneId && entry.decision === decision);
  if (!rule) {
    return { laneId, decision, nextStep: HALT };
  }
  return rule;
}

export function describeNextStep(laneId: LaneId, decision: LaneDecision, changesRequestedBody?: string) {
  const rule = getRoutingRule(laneId, decision);
  if (decision !== 'approved') {
    return {
      ...rule.nextStep,
      message_to_phill: changesRequestedBody
        ? `Lane ${laneId} ${decision}: ${changesRequestedBody}`
        : `Lane ${laneId} ${decision}.`,
    };
  }
  return rule.nextStep;
}

export type Lane = 'marketing' | 'software' | 'content' | 'unknown'
export interface LanePlanStep { title: string; detail: string; risk: 'low' | 'medium' | 'high'; reversible: boolean }
export interface RoutingDecision {
  lane: Lane; confidence: number; rationale: string
  planBuild: LanePlanStep[]; planDistribute: LanePlanStep[]
}
export interface IdeaContext { idea: string; clarifications: { questions: string[]; answers: Record<string, string> } }

export interface LaneAdapter {
  key: Exclude<Lane, 'unknown'>
  matchHints: string[]
  planBuild(ctx: IdeaContext): LanePlanStep[]
  planDistribute(ctx: IdeaContext): LanePlanStep[]
}

// Stub adapters — planned steps only. `not_connected` until the real lane ships.
const marketing: LaneAdapter = {
  key: 'marketing',
  matchHints: ['campaign', 'promo', 'social', 'audience', 'launch', 'content calendar', 'ads'],
  planBuild: () => [
    { title: 'Draft campaign brief', detail: 'Theme, objective, audience, channels from the idea + answers.', risk: 'low', reversible: true },
    { title: 'Generate assets', detail: 'Copy, creative and social posts (Synthex Campaign Engine).', risk: 'medium', reversible: true },
  ],
  planDistribute: () => [
    { title: 'Publish via Synthex', detail: 'NOT CONNECTED — pending the marketing lane + Track-A schema fix.', risk: 'high', reversible: false },
  ],
}
const software: LaneAdapter = {
  key: 'software',
  matchHints: ['feature', 'bug', 'api', 'page', 'refactor', 'integration', 'endpoint'],
  planBuild: () => [
    { title: 'Scope & branch', detail: 'Decompose into a branch + preview build.', risk: 'low', reversible: true },
    { title: 'Implement on preview', detail: 'Agents build behind a PR + preview URL.', risk: 'medium', reversible: true },
  ],
  planDistribute: () => [
    { title: 'Ship', detail: 'NOT CONNECTED — pending the software lane.', risk: 'high', reversible: false },
  ],
}
const content: LaneAdapter = {
  key: 'content',
  matchHints: ['article', 'guide', 'doc', 'knowledge', 'spec', 'research', 'post'],
  planBuild: () => [
    { title: 'Research & draft', detail: 'Spec-board engine drafts the artefact.', risk: 'low', reversible: true },
  ],
  planDistribute: () => [
    { title: 'Publish content', detail: 'NOT CONNECTED — pending the content lane.', risk: 'medium', reversible: false },
  ],
}

export const LANE_ADAPTERS: Record<LaneAdapter['key'], LaneAdapter> = { marketing, software, content }

export function getLaneAdapter(lane: Lane): LaneAdapter | null {
  return lane === 'unknown' ? null : LANE_ADAPTERS[lane]
}

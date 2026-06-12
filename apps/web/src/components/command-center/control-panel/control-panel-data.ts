// control-panel-data.ts — static workstream + add-on seed for the
// founder Command Center control panel.
//
// Ported from apps/authority-legacy with the i18n + workspace_id model
// stripped. These are the canonical lists the founder-scoped control-panel
// API (src/app/api/command-center/control-panel) reconciles against the
// live cc_tasks rows. The seed values are illustrative scaffolding only —
// the API flips each card's live state from the founder's own cc_tasks.

export type ControlRyg = 'green' | 'yellow' | 'red'
export type ControlStatus = 'live' | 'building' | 'gated' | 'planned'

export interface ControlWorkstream {
  id: string
  label: string
  lane: string
  status: ControlStatus
  ryg: ControlRyg
  owner: string
  dependency: string
  gate: string
  nextAction: string
}

export interface AddOnGate {
  id: string
  label: string
  category: string
  state: ControlStatus
  approval: string
  ccTaskId?: string
  ccTaskStatus?: string
  lastRequestedAt?: string
}

export const CONTROL_WORKSTREAMS: ControlWorkstream[] = [
  {
    id: 'ug-v0-01',
    label: 'Plaud intake to Margot brief',
    lane: 'voice intake',
    status: 'building',
    ryg: 'yellow',
    owner: 'Margot',
    dependency: 'Plaud transcript export',
    gate: 'No CRM write until packet validates',
    nextAction: 'Bind transcript payload to packet contract',
  },
  {
    id: 'ug-v0-02',
    label: 'Margot brief to command-centre task',
    lane: 'task write',
    status: 'live',
    ryg: 'green',
    owner: 'Command Centre',
    dependency: 'cc_tasks insert',
    gate: 'Founder approval if risk is high',
    nextAction: 'Live authenticated browser pass',
  },
  {
    id: 'ug-v0-03',
    label: 'Command-centre task to Kanban board',
    lane: 'execution spine',
    status: 'building',
    ryg: 'yellow',
    owner: 'Pi-CEO',
    dependency: 'Kanban sync endpoint',
    gate: 'Task id required before dispatch',
    nextAction: 'Attach Hermes local sync runner',
  },
  {
    id: 'ug-v0-04',
    label: 'Synthex routing for marketing only',
    lane: 'routing policy',
    status: 'gated',
    ryg: 'yellow',
    owner: 'Margot',
    dependency: 'Route classifier',
    gate: 'Never route CRM or repo work to Synthex',
    nextAction: 'Add classifier evidence log',
  },
  {
    id: 'ug-v0-05',
    label: 'Add-on registry with approval gates',
    lane: 'capability control',
    status: 'planned',
    ryg: 'yellow',
    owner: 'CEO Board',
    dependency: 'Registry schema',
    gate: 'No tool can self-enable',
    nextAction: 'Ship registry table and review states',
  },
  {
    id: 'ug-v0-06',
    label: 'Daily Hermes update scout automation',
    lane: 'platform scout',
    status: 'live',
    ryg: 'green',
    owner: 'Hermes',
    dependency: 'Daily local scout cron',
    gate: 'Backup-safe update only',
    nextAction: 'Expose scout report link in CRM',
  },
  {
    id: 'ug-v0-07',
    label: 'Portfolio RYG dashboard',
    lane: 'ceo control',
    status: 'building',
    ryg: 'yellow',
    owner: 'Command Centre',
    dependency: 'Portfolio status evidence',
    gate: 'No green without proof',
    nextAction: 'Bind live RYG source matrix',
  },
]

export const ADD_ON_GATES: AddOnGate[] = [
  {
    id: 'voice',
    label: 'ElevenLabs voice UX',
    category: 'intake',
    state: 'live',
    approval: 'Pi-CEO/Margot owns decisions',
  },
  {
    id: 'computer-use',
    label: 'Computer-use operator',
    category: 'desktop',
    state: 'gated',
    approval: 'Human approval for external writes',
  },
  {
    id: 'qwen-workers',
    label: 'Qwen research workers',
    category: 'model routing',
    state: 'planned',
    approval: 'Codex Max keeps architecture decisions',
  },
  {
    id: 'crm-kanban-sync',
    label: 'CRM to Kanban sync',
    category: 'execution',
    state: 'planned',
    approval: 'CRM task must exist first',
  },
]

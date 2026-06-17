export type CompoundConnectorStatus = 'ready' | 'pending_install' | 'blocked_gate' | 'monitoring'
export type CompoundConnectorLane = 'setup' | 'review' | 'research' | 'design' | 'workflow' | 'knowledge'

export interface CompoundConnectorRecord {
  connectorId: string
  name: string
  lane: CompoundConnectorLane
  sourceRepo: string
  purpose: string
  targetProjects: string[]
  status: CompoundConnectorStatus
  installCommand: string | null
  codexInstallNote: string
  allowedUse: string[]
  prohibitedUse: string[]
  evidenceRequired: string[]
  nextAction: string
}

export interface CompoundRolloutPhase {
  phaseId: string
  title: string
  status: 'ready' | 'blocked_gate' | 'planned'
  acceptance: string[]
  blockedBy: string[]
}

export interface CompoundEngineeringConnectorStatus {
  source: 'static_compound_engineering_connector_registry'
  upstream: {
    pluginRepo: 'EveryInc/compound-engineering-plugin'
    knowledgeRepo: 'EveryInc/compound-knowledge-plugin'
    creator: 'Matt Van Horn / Every'
    observedCapabilities: {
      skills: number
      agents: number
      codexRequiresBunAgentInstall: true
    }
  }
  status: 'local_connector_design_ready'
  connectorCount: number
  readyConnectors: number
  pendingInstallConnectors: number
  blockedGateConnectors: number
  portfolioTargets: string[]
  connectors: CompoundConnectorRecord[]
  rollout: CompoundRolloutPhase[]
  noApiKeyMode: true
  externalExecutionEnabled: false
  productionDbTouched: false
  browserAutomationEnabled: false
  autoInstallEnabled: false
  nextRecommendedConnector: string
  nextPortfolioAction: string
}

const TARGET_PROJECTS = [
  'Unite-Group',
  'RestoreAssist',
  'Synthex',
  'ITR-Button',
  'Disaster-Recovery',
  'CCW-CRM',
  'Pi-CEO',
  '2nd-brain',
]

const SAFE_PROHIBITIONS = [
  'api_key_mode',
  'secret_storage',
  'automatic_plugin_install',
  'external_execution',
  'production_db',
  'deployment',
  'browser_session_scraping',
  'client_publication',
]

const COMMON_EVIDENCE = [
  'source_url',
  'capability_mapping',
  'project_fit',
  'risk_gate',
  'test_output',
  '2nd_brain_note',
]

const CONNECTORS: CompoundConnectorRecord[] = [
  {
    connectorId: 'ce_setup_auditor',
    name: 'Compound setup auditor',
    lane: 'setup',
    sourceRepo: 'EveryInc/compound-engineering-plugin',
    purpose: 'Detect whether each project has the local agent/skill prerequisites to use compound-engineering workflows.',
    targetProjects: TARGET_PROJECTS,
    status: 'ready',
    installCommand: null,
    codexInstallNote: 'Do not auto-install. Produce a per-project install checklist first; Codex custom agents require a separate Bun install step.',
    allowedUse: ['read local config', 'compare plugin prerequisites', 'create Linear setup tasks', 'write 2nd-brain evidence'],
    prohibitedUse: SAFE_PROHIBITIONS,
    evidenceRequired: COMMON_EVIDENCE,
    nextAction: 'Create per-project setup packets for Compound Engineering readiness.',
  },
  {
    connectorId: 'ce_serial_review_bridge',
    name: 'Serial review bridge',
    lane: 'review',
    sourceRepo: 'EveryInc/compound-engineering-plugin',
    purpose: 'Route PRs through specialized reviewer personas before merge so agents catch design, security, UX, and test gaps.',
    targetProjects: ['Unite-Group', 'RestoreAssist', 'Synthex', 'ITR-Button', 'CCW-CRM'],
    status: 'ready',
    installCommand: null,
    codexInstallNote: 'Use local review tasks first; plugin invocation can be enabled after operator install is confirmed.',
    allowedUse: ['read diffs', 'draft review findings', 'create follow-up tasks', 'append evidence'],
    prohibitedUse: SAFE_PROHIBITIONS,
    evidenceRequired: COMMON_EVIDENCE,
    nextAction: 'Add review-lane work packets to Mission Control for active PRs.',
  },
  {
    connectorId: 'ce_research_scout_bridge',
    name: 'Research scout bridge',
    lane: 'research',
    sourceRepo: 'EveryInc/compound-engineering-plugin',
    purpose: 'Continuously scan GitHub, Hugging Face, papers, and creator repos for project-relevant capabilities.',
    targetProjects: TARGET_PROJECTS,
    status: 'ready',
    installCommand: null,
    codexInstallNote: 'Use the existing external-source research pipeline, then attach Compound Engineering scout prompts as skills.',
    allowedUse: ['web research', 'repo triage', 'capability scoring', '2nd-brain ingestion'],
    prohibitedUse: SAFE_PROHIBITIONS,
    evidenceRequired: COMMON_EVIDENCE,
    nextAction: 'Bind compound research scouts to the GitHub/HuggingFace external-source capability.',
  },
  {
    connectorId: 'ce_design_studio_bridge',
    name: 'Design studio bridge',
    lane: 'design',
    sourceRepo: 'EveryInc/compound-engineering-plugin',
    purpose: 'Convert raw ideas into UI/UX variants, product specs, and acceptance criteria before engineering starts.',
    targetProjects: ['Unite-Group', 'RestoreAssist', 'Synthex', 'ITR-Button'],
    status: 'ready',
    installCommand: null,
    codexInstallNote: 'Keep design output as local specs and dashboard candidates until a project-specific build gate exists.',
    allowedUse: ['generate design alternatives', 'score UX friction', 'write acceptance criteria', 'create build packets'],
    prohibitedUse: SAFE_PROHIBITIONS,
    evidenceRequired: COMMON_EVIDENCE,
    nextAction: 'Add design-expansion packets to the idea intake loop so literal prompts become broader product options.',
  },
  {
    connectorId: 'ce_workflow_loop_bridge',
    name: 'Workflow loop bridge',
    lane: 'workflow',
    sourceRepo: 'EveryInc/compound-engineering-plugin',
    purpose: 'Turn Linear/Hermes tasks into plan-build-review-learn loops that improve the next run.',
    targetProjects: TARGET_PROJECTS,
    status: 'blocked_gate',
    installCommand: 'bunx @every-env/compound-plugin install compound-engineering --to codex',
    codexInstallNote: 'Blocked until operator approval because this prepares custom agents in Codex; do not run from CRM.',
    allowedUse: ['prepare install plan', 'record required commands', 'create approval gate'],
    prohibitedUse: SAFE_PROHIBITIONS,
    evidenceRequired: COMMON_EVIDENCE,
    nextAction: 'Request operator install approval for the Codex custom-agent bridge after setup packets pass.',
  },
  {
    connectorId: 'ck_knowledge_capture_bridge',
    name: 'Compound knowledge capture bridge',
    lane: 'knowledge',
    sourceRepo: 'EveryInc/compound-knowledge-plugin',
    purpose: 'Save learnings, decisions, research notes, and reusable skill improvements into the 2nd brain.',
    targetProjects: ['2nd-brain', 'Pi-CEO', 'Unite-Group'],
    status: 'pending_install',
    installCommand: null,
    codexInstallNote: 'Design-only until knowledge plugin capabilities are mapped to the existing Obsidian/Supabase source sync.',
    allowedUse: ['summarize decisions', 'write evidence notes', 'link source records', 'suggest skill updates'],
    prohibitedUse: SAFE_PROHIBITIONS,
    evidenceRequired: COMMON_EVIDENCE,
    nextAction: 'Map knowledge capture output to the current Obsidian source sync contract.',
  },
]

const ROLLOUT: CompoundRolloutPhase[] = [
  {
    phaseId: 'phase_1_read_only_registry',
    title: 'Read-only connector registry and dashboard status',
    status: 'ready',
    acceptance: ['founder-gated status endpoint', 'no auto-install', 'no external execution', 'portfolio target map visible'],
    blockedBy: [],
  },
  {
    phaseId: 'phase_2_project_setup_packets',
    title: 'Per-project setup packets',
    status: 'ready',
    acceptance: ['Unite-Group packet', 'RestoreAssist packet', 'Synthex packet', 'Pi-CEO/2nd-brain packet'],
    blockedBy: [],
  },
  {
    phaseId: 'phase_3_operator_install_gate',
    title: 'Operator-approved Compound Engineering install',
    status: 'blocked_gate',
    acceptance: ['operator runs install commands', 'Codex custom agents visible', 'no CRM-stored credentials'],
    blockedBy: ['operator_approval', 'local_cli_install'],
  },
  {
    phaseId: 'phase_4_linear_hermes_loop',
    title: 'Linear/Hermes compound-development loop',
    status: 'planned',
    acceptance: ['task claim', 'plan', 'build', 'serial review', '2nd-brain learning capture', 'PR evidence'],
    blockedBy: ['phase_3_operator_install_gate'],
  },
]

export function getCompoundEngineeringConnectors(): CompoundConnectorRecord[] {
  return CONNECTORS.map((connector) => ({
    ...connector,
    targetProjects: [...connector.targetProjects],
    allowedUse: [...connector.allowedUse],
    prohibitedUse: [...connector.prohibitedUse],
    evidenceRequired: [...connector.evidenceRequired],
  }))
}

export function getCompoundEngineeringConnectorStatus(): CompoundEngineeringConnectorStatus {
  const connectors = getCompoundEngineeringConnectors()
  return {
    source: 'static_compound_engineering_connector_registry',
    upstream: {
      pluginRepo: 'EveryInc/compound-engineering-plugin',
      knowledgeRepo: 'EveryInc/compound-knowledge-plugin',
      creator: 'Matt Van Horn / Every',
      observedCapabilities: {
        skills: 37,
        agents: 51,
        codexRequiresBunAgentInstall: true,
      },
    },
    status: 'local_connector_design_ready',
    connectorCount: connectors.length,
    readyConnectors: connectors.filter((connector) => connector.status === 'ready').length,
    pendingInstallConnectors: connectors.filter((connector) => connector.status === 'pending_install').length,
    blockedGateConnectors: connectors.filter((connector) => connector.status === 'blocked_gate').length,
    portfolioTargets: [...TARGET_PROJECTS],
    connectors,
    rollout: ROLLOUT.map((phase) => ({
      ...phase,
      acceptance: [...phase.acceptance],
      blockedBy: [...phase.blockedBy],
    })),
    noApiKeyMode: true,
    externalExecutionEnabled: false,
    productionDbTouched: false,
    browserAutomationEnabled: false,
    autoInstallEnabled: false,
    nextRecommendedConnector: 'ce_setup_auditor',
    nextPortfolioAction: 'Create per-project setup packets, then ask for operator approval before any Compound Engineering install command runs.',
  }
}

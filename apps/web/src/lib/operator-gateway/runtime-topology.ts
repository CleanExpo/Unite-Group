export type RuntimeNodeRole =
  | 'operator_dashboard'
  | 'orchestrator'
  | 'builder'
  | 'media_agent'
  | 'browser_operator'
  | 'knowledge_substrate'
  | 'governance'

export type RuntimeNodeStatus = 'active' | 'design_only' | 'blocked_install' | 'blocked_gate'

export interface RuntimeNode {
  nodeId: string
  displayName: string
  role: RuntimeNodeRole
  provider: string
  tool: string
  planAllocation: string
  monitorSlot: string
  workspaceIsolation: string
  allowedSurfaces: string[]
  blockedSurfaces: string[]
  reportsTo: string | null
  status: RuntimeNodeStatus
  nextAction: string
}

export interface RuntimeTopologyStatus {
  source: 'static_multi_cli_runtime_topology'
  status: 'design_ready'
  operatorDashboardNode: 'phill_main_cli_dashboard'
  nodeCount: number
  activeNodeCount: number
  blockedInstallCount: number
  noSharedCredentials: true
  noApiKeyMode: true
  browserAutomationRequiresMainOperator: true
  productionExecutionEnabled: false
  obsidianMemoryMode: 'research_capture_and_learning_substrate'
  gstackEnabled: true
  compoundEngineeringEnabled: true
  boardGovernanceRequired: true
  nodes: RuntimeNode[]
  dataFlow: string[]
  openGates: string[]
  nextBuildStep: string
}

const COMMON_BLOCKED_SURFACES = [
  'production_db',
  'deployment',
  'payments',
  'email_send',
  'claims_orders',
  'stored_browser_session_scraping',
  'shared_subscription_credentials',
]

const NODES: RuntimeNode[] = [
  {
    nodeId: 'phill_main_cli_dashboard',
    displayName: 'Phill main Mission Control CLI dashboard',
    role: 'operator_dashboard',
    provider: 'human_operator',
    tool: 'Codex desktop / main CLI / Chrome extension / Computer Use',
    planAllocation: 'Primary operator seat',
    monitorSlot: 'main',
    workspaceIsolation: 'Owns approvals, questions, browser/computer-use grants, and final merge visibility.',
    allowedSurfaces: ['overview', 'approvals', 'questions', 'browser_use', 'computer_use', 'chrome_extension', 'obsidian_review'],
    blockedSurfaces: COMMON_BLOCKED_SURFACES,
    reportsTo: null,
    status: 'active',
    nextAction: 'Keep this as the only place that can grant ambiguous browser/computer-use or production approval.',
  },
  {
    nodeId: 'hermes_codex_orchestrator',
    displayName: 'Hermes Agent running through Codex CLI',
    role: 'orchestrator',
    provider: 'openai',
    tool: 'Codex CLI',
    planAllocation: 'OpenAI / ChatGPT Max plan',
    monitorSlot: 'monitor-1',
    workspaceIsolation: 'Dedicated Hermes worktree/session; routes tasks, validates evidence, and reconciles Linear/Hermes queues.',
    allowedSurfaces: ['orchestration', 'planning', 'task_claim', 'evidence_audit', 'git_status', 'test_run'],
    blockedSurfaces: COMMON_BLOCKED_SURFACES,
    reportsTo: 'phill_main_cli_dashboard',
    status: 'active',
    nextAction: 'Make Hermes the task router and evidence reconciler; keep direct production dispatch disabled.',
  },
  {
    nodeId: 'claude_max_builder_1',
    displayName: 'Claude Max Builder 1',
    role: 'builder',
    provider: 'anthropic',
    tool: 'Claude Code',
    planAllocation: 'Claude Max plan 1',
    monitorSlot: 'monitor-2',
    workspaceIsolation: 'Dedicated worktree and terminal session for implementation work.',
    allowedSurfaces: ['feature_implementation', 'refactor', 'test_authoring', 'code_review'],
    blockedSurfaces: COMMON_BLOCKED_SURFACES,
    reportsTo: 'hermes_codex_orchestrator',
    status: 'blocked_install',
    nextAction: 'Install/login Claude Code as Max plan 1 and bind it to a named runner profile.',
  },
  {
    nodeId: 'claude_max_builder_2',
    displayName: 'Claude Max Builder 2',
    role: 'builder',
    provider: 'anthropic',
    tool: 'Claude Code',
    planAllocation: 'Claude Max plan 2',
    monitorSlot: 'monitor-3',
    workspaceIsolation: 'Dedicated worktree and terminal session for parallel implementation or second-opinion review.',
    allowedSurfaces: ['feature_implementation', 'refactor', 'serial_review', 'test_authoring'],
    blockedSurfaces: COMMON_BLOCKED_SURFACES,
    reportsTo: 'hermes_codex_orchestrator',
    status: 'blocked_install',
    nextAction: 'Install/login Claude Code as Max plan 2 and bind it to a separate runner profile.',
  },
  {
    nodeId: 'claude_max_builder_3',
    displayName: 'Claude Max Builder 3',
    role: 'builder',
    provider: 'anthropic',
    tool: 'Claude Code',
    planAllocation: 'Claude Max plan 3',
    monitorSlot: 'monitor-4',
    workspaceIsolation: 'Dedicated worktree and terminal session for QA, review, or overflow building.',
    allowedSurfaces: ['qa_review', 'serial_review', 'documentation', 'test_authoring'],
    blockedSurfaces: COMMON_BLOCKED_SURFACES,
    reportsTo: 'hermes_codex_orchestrator',
    status: 'blocked_install',
    nextAction: 'Install/login Claude Code as Max plan 3 and bind it to a separate runner profile.',
  },
  {
    nodeId: 'minimax_media_agent',
    displayName: 'MiniMax Media / Multimodal Agent',
    role: 'media_agent',
    provider: 'minimax',
    tool: 'MiniMax CLI / MCP',
    planAllocation: 'MiniMax Max / Token Plan',
    monitorSlot: 'monitor-5',
    workspaceIsolation: 'Dedicated media-generation session with asset manifest output and human review before publishing.',
    allowedSurfaces: ['video_media', 'speech', 'music', 'image_generation', 'asset_manifest'],
    blockedSurfaces: [...COMMON_BLOCKED_SURFACES, 'public_publishing_without_human_gate'],
    reportsTo: 'hermes_codex_orchestrator',
    status: 'blocked_install',
    nextAction: 'Confirm MiniMax CLI/MCP install and quota visibility without storing secrets in CRM.',
  },
  {
    nodeId: 'obsidian_second_brain',
    displayName: 'Obsidian / 2nd-brain learning substrate',
    role: 'knowledge_substrate',
    provider: 'local_files',
    tool: 'Obsidian vault + source sync',
    planAllocation: 'Local knowledge base',
    monitorSlot: 'memory-plane',
    workspaceIsolation: 'Research capture, idea expansion, training-center source notes, and evidence ledger.',
    allowedSurfaces: ['research_capture', 'idea_expansion', 'training_data', 'source_notes', 'evidence_ledger'],
    blockedSurfaces: ['secret_reading', 'sync_without_service_key', 'unverified_claim_distribution'],
    reportsTo: 'phill_main_cli_dashboard',
    status: 'design_only',
    nextAction: 'Wire research-scout outputs and setup packets into Obsidian-ready source notes before Supabase sync.',
  },
  {
    nodeId: 'margot_board_senior_pm',
    displayName: 'Margot + Board + Senior PM governance',
    role: 'governance',
    provider: 'unite_group',
    tool: 'Board, Senior PM, Margot, gstack, Compound Engineering',
    planAllocation: 'Governance layer',
    monitorSlot: 'governance-plane',
    workspaceIsolation: 'Turns broad ideas into scopes, gates, work packets, board decisions, and learning updates.',
    allowedSurfaces: ['gstack_review', 'compound_engineering_loop', 'board_gate', 'scope_expansion', 'linear_task_generation'],
    blockedSurfaces: COMMON_BLOCKED_SURFACES,
    reportsTo: 'phill_main_cli_dashboard',
    status: 'design_only',
    nextAction: 'Expose governance plane status beside runtime monitors and require it before autonomous task fan-out.',
  },
]

export function getRuntimeTopologyStatus(): RuntimeTopologyStatus {
  return {
    source: 'static_multi_cli_runtime_topology',
    status: 'design_ready',
    operatorDashboardNode: 'phill_main_cli_dashboard',
    nodeCount: NODES.length,
    activeNodeCount: NODES.filter((node) => node.status === 'active').length,
    blockedInstallCount: NODES.filter((node) => node.status === 'blocked_install').length,
    noSharedCredentials: true,
    noApiKeyMode: true,
    browserAutomationRequiresMainOperator: true,
    productionExecutionEnabled: false,
    obsidianMemoryMode: 'research_capture_and_learning_substrate',
    gstackEnabled: true,
    compoundEngineeringEnabled: true,
    boardGovernanceRequired: true,
    nodes: NODES.map((node) => ({
      ...node,
      allowedSurfaces: [...node.allowedSurfaces],
      blockedSurfaces: [...node.blockedSurfaces],
    })),
    dataFlow: [
      'Phill main dashboard captures idea / approval / question.',
      'Margot + Board + Senior PM expand scope using gstack and Compound Engineering.',
      'Hermes Codex orchestrator claims/assigns tasks and creates isolated runner worktrees.',
      'Claude Code, MiniMax, and Cursor lanes remain blocked until install/login and isolated monitor telemetry are proven.',
      'Each runner returns evidence, tests, diffs, asset manifests, and questions to Hermes.',
      'Hermes reconciles Linear/Hermes Kanban, then writes learning/evidence to Obsidian/2nd-brain.',
      'Phill approves merges, public/client actions, browser/computer-use grants, and production gates from the main dashboard.',
    ],
    openGates: [
      'install_and_login_claude_max_builder_1',
      'install_and_login_claude_max_builder_2',
      'install_and_login_claude_max_builder_3',
      'install_and_login_minimax_cli_or_mcp',
      'wire_obsidian_research_capture_to_source_sync',
      'wire_runner_monitor_telemetry',
      'enable_safe_runner_dispatch_after_board_gate',
    ],
    nextBuildStep: 'Wire runner monitor telemetry and keep dispatch disabled until each runner proves isolated evidence return.',
  }
}

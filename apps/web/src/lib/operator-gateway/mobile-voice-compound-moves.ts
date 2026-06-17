export type CompoundMoveLane =
  | 'research'
  | 'second_brain'
  | 'board'
  | 'senior_pm'
  | 'hermes_preview'
  | 'linear_preview'
  | 'build'
  | 'verification'
  | 'learning'

export interface MobileVoiceCompoundMove {
  rank: number
  title: string
  lane: CompoundMoveLane
  agent: string
  skillStack: string[]
  objective: string
  evidenceExpected: string[]
  stopGate: string
  hermesPreview: {
    createTask: false
    title: string
    lane: string
  }
  linearPreview: {
    createIssue: false
    title: string
    labels: string[]
  }
}

export interface MobileVoiceCompoundMovePreviewInput {
  boardPacketText: string
  packetId?: string
  title?: string
  maxMoves?: number
}

export interface MobileVoiceCompoundMovePreview {
  ok: true
  source: 'mobile_voice_compound_move_preview'
  packetId: string
  title: string
  moveCount: number
  boardApprovedForPreview: true
  hermesQueueEnabled: false
  linearTaskCreated: false
  externalDispatchEnabled: false
  productionExecutionEnabled: false
  moves: MobileVoiceCompoundMove[]
}

function compact(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function extractHeadingValue(text: string, heading: string): string | null {
  const pattern = new RegExp(`## ${heading}\\n+([\\s\\S]*?)(?=\\n## |$)`, 'i')
  const match = text.match(pattern)
  return match ? compact(match[1].replace(/^[-*]\s*/gm, '')) : null
}

function inferTitle(text: string, fallback?: string): string {
  if (fallback?.trim()) return compact(fallback).slice(0, 120)
  const fmTitle = text.match(/^title:\s*"?([^"\n]+)"?/m)?.[1]
  if (fmTitle) return compact(fmTitle).replace(/^Board review packet\s*[—-]\s*/i, '').slice(0, 120)
  const intent = extractHeadingValue(text, 'Founder Intent')
  return (intent || 'Mobile voice compound move preview').slice(0, 120)
}

function inferPacketId(text: string, fallback?: string): string {
  if (fallback?.trim()) return compact(fallback)
  const fmPacket = text.match(/^packetId:\s*"?([^"\n]+)"?/m)?.[1]
  if (fmPacket) return compact(fmPacket)
  const bodyPacket = text.match(/Packet:\s*`([^`]+)`/i)?.[1]
  return bodyPacket ? compact(bodyPacket) : 'mobile_voice_terminal_packet'
}

function move(
  rank: number,
  lane: CompoundMoveLane,
  agent: string,
  title: string,
  objective: string,
  skillStack: string[],
  evidenceExpected: string[],
  stopGate: string,
): MobileVoiceCompoundMove {
  return {
    rank,
    title,
    lane,
    agent,
    skillStack,
    objective,
    evidenceExpected,
    stopGate,
    hermesPreview: {
      createTask: false,
      title,
      lane,
    },
    linearPreview: {
      createIssue: false,
      title,
      labels: ['mobile-voice', 'compound-engineering', lane],
    },
  }
}

export function buildMobileVoiceCompoundMovePreview(
  input: MobileVoiceCompoundMovePreviewInput,
): MobileVoiceCompoundMovePreview {
  const text = input.boardPacketText.trim()
  if (!text) throw new Error('board packet text is required')

  const packetId = inferPacketId(text, input.packetId)
  const title = inferTitle(text, input.title)
  const maxMoves = Math.min(20, Math.max(15, input.maxMoves ?? 20))
  const moves: MobileVoiceCompoundMove[] = [
    move(1, 'second_brain', 'Obsidian Librarian', 'Normalize Board packet into a source-linked project note', 'Create a single canonical second-brain project note with source, Board packet, packet id, and provenance links.', ['obsidian-source-notes', 'evidence-ledger'], ['canonical project note path', 'source links'], 'stop_if_source_note_missing'),
    move(2, 'research', 'Research Scout', 'Expand adjacent products and creator references', 'Research GitHub, Hugging Face, creator repos, and market references related to the Board packet idea.', ['github-research', 'huggingface-research', 'web-research'], ['source citation list', 'competitor/adjacent map'], 'stop_if_sources_are_uncited'),
    move(3, 'research', 'Market Scout', 'Map business fit across Unite-Group portfolio', 'Map the idea to Unite-Group CRM, RestoreAssist, Synthex, ITR-Button, and client-service workflows.', ['portfolio-mapping', 'market-sizing-lite'], ['business fit matrix'], 'stop_if_no_business_owner'),
    move(4, 'board', 'Contrarian Board', 'Identify stop reasons and hidden costs', 'Produce the strongest reasons not to proceed, including privacy, compliance, maintenance, and operator-load risks.', ['board-risk-review', 'contrarian-review'], ['risk register'], 'stop_if_unbounded_risk'),
    move(5, 'senior_pm', 'Senior PM', 'Define the smallest valuable product slice', 'Turn the idea into a bounded MVP slice with acceptance criteria and explicit non-goals.', ['compound-development-loop', 'scope-control'], ['MVP brief', 'non-goals'], 'stop_if_scope_exceeds_mvp'),
    move(6, 'second_brain', 'Training Librarian', 'Create training-center learning object', 'Transform the idea and research into an internal training artifact for repeatable operator learning.', ['training-center', 'knowledge-distillation'], ['training note', 'learning objectives'], 'stop_if_claims_uncited'),
    move(7, 'hermes_preview', 'Hermes Planner', 'Draft Hermes Kanban preview payloads', 'Create Hermes-ready task previews for each approved workstream without creating tasks.', ['hermes-kanban-preview', 'dry-run-routing'], ['Hermes payload preview'], 'requires_board_approval_before_create'),
    move(8, 'linear_preview', 'Linear Planner', 'Draft Linear issue preview payloads', 'Create Linear-ready issue previews with titles, labels, evidence, and acceptance criteria without creating issues.', ['linear-preview', 'issue-shaping'], ['Linear payload preview'], 'requires_board_approval_before_create'),
    move(9, 'senior_pm', 'Senior PM', 'Sequence the first 5 build moves', 'Rank the first five build moves by dependency order, risk reduction, and verification clarity.', ['dependency-ranking', 'ev-ranking'], ['ranked first-five plan'], 'stop_if_dependency_unknown'),
    move(10, 'build', 'Codex Architect', 'Create implementation architecture note', 'Draft the local architecture, affected modules, data contracts, and tests needed before build begins.', ['architecture-note', 'codebase-scan'], ['architecture note'], 'stop_if_code_boundary_unclear'),
    move(11, 'build', 'Claude Builder', 'Prepare first implementation work packet', 'Create a builder-ready work packet for the first reversible implementation slice.', ['work-packet', 'acceptance-criteria'], ['builder packet'], 'requires_clean_worktree'),
    move(12, 'verification', 'QA Agent', 'Define verification gates', 'Define focused tests, type-check, lint, build, browser, and evidence checks required for the slice.', ['verification-plan', 'ci-gates'], ['verification checklist'], 'stop_if_no_test_path'),
    move(13, 'board', 'Margot + Board', 'Create approval question set', 'Produce the exact approval questions the founder must answer before Hermes/Linear creation or external execution.', ['approval-design', 'board-questions'], ['approval questions'], 'requires_founder_decision'),
    move(14, 'learning', 'Lessons Agent', 'Define learning-back capture', 'Specify what each PR must write back to the 2nd brain after merge: lessons, source links, decisions, and failed assumptions.', ['lessons-capture', 'post-merge-learning'], ['learning-back checklist'], 'stop_if_no_learning_path'),
    move(15, 'verification', 'Audit Agent', 'Run false-done audit preview', 'Check whether the plan proves implementation, connection, testing, UI visibility, and operator usability.', ['senior-pm-audit', 'false-done-check'], ['audit ledger'], 'stop_if_status_unverified'),
    move(16, 'research', 'Research Scout', 'Refresh current external references', 'Re-run live research just before build if the idea depends on changing models, APIs, libraries, or competitor behavior.', ['freshness-check', 'source-refresh'], ['freshness report'], 'stop_if_time_sensitive_unverified'),
    move(17, 'hermes_preview', 'Hermes Orchestrator', 'Assign candidate runners and CLI lanes', 'Map moves to Codex, Claude, MiniMax, Gemini, or OpenRouter lanes without starting execution.', ['runner-routing', 'max-plan-allocation'], ['runner assignment preview'], 'requires_operator_lane_available'),
    move(18, 'linear_preview', 'Linear Steward', 'Prepare batch project structure', 'Draft the Linear/Hermes batch structure so the autonomous loop can pull tasks in order after approval.', ['batch-planning', 'linear-project-structure'], ['batch structure preview'], 'requires_board_approval_before_create'),
    move(19, 'verification', 'Release Steward', 'Define merge and cleanup contract', 'Define branch, PR, CI, merge, worktree cleanup, and completion criteria for the batch.', ['release-contract', 'cleanup-loop'], ['merge contract'], 'stop_if_ci_unknown'),
    move(20, 'learning', 'Pi-CEO', 'Generate next 20 after first merge', 'After the first approved PR merges, regenerate the next 20 moves from fresh evidence and lessons.', ['pi-ceo-loop', 'compound-learning'], ['next-20 regeneration trigger'], 'requires_merged_evidence'),
  ].slice(0, maxMoves)

  return {
    ok: true,
    source: 'mobile_voice_compound_move_preview',
    packetId,
    title,
    moveCount: moves.length,
    boardApprovedForPreview: true,
    hermesQueueEnabled: false,
    linearTaskCreated: false,
    externalDispatchEnabled: false,
    productionExecutionEnabled: false,
    moves,
  }
}

export type MobileVoiceSource =
  | 'plaud_dev_api_webhook'
  | 'plaud_zapier_export'
  | 'plaud_manual_mobile_export'
  | 'mobile_voice_note'

export type MobileVoiceIntakeStatus = 'ready_for_mobile_capture' | 'blocked_auth' | 'design_only'

export interface MobileVoiceCaptureInput {
  source: MobileVoiceSource
  title?: string
  transcript: string
  summary?: string
  capturedAt?: string
  speakerLabelsIncluded?: boolean
  timestampsIncluded?: boolean
  sourceUrl?: string
}

export interface MobileVoiceCapturePacket {
  packetId: string
  source: MobileVoiceSource
  title: string
  status: 'captured_for_review'
  capturedAt: string
  transcriptCharacterCount: number
  speakerLabelsIncluded: boolean
  timestampsIncluded: boolean
  obsidianTargetPath: string
  secondBrainTags: string[]
  researchPrompt: string
  seniorPmWorkCandidates: string[]
  boardGate: 'mobile_voice_capture_review'
  externalDispatchEnabled: false
  autoPublishEnabled: false
  productionExecutionEnabled: false
}

export interface MobileVoiceIntakeStatusView {
  source: 'static_mobile_voice_intake'
  status: 'ready_for_mobile_capture'
  mobileFirst: true
  plaudSupported: true
  plaudIngressModes: MobileVoiceSource[]
  endpoint: '/api/hermes/operator-gateway/mobile-voice-intake'
  obsidianCaptureMode: 'source_note_then_research_queue'
  secondBrainTarget: 'Obsidian/2nd-brain'
  researchExpansionEnabled: true
  packetPersistenceEnabled: true
  sourceNoteWriteEnabled: true
  boardPacketGenerationEnabled: true
  boardReviewRequired: true
  hermesQueueRequired: true
  externalDispatchEnabled: false
  autoPublishEnabled: false
  productionExecutionEnabled: false
  noSharedCredentials: true
  noRawAudioStorage: true
  supportedMobileMoments: string[]
  requiredEvidence: string[]
  openGates: string[]
  nextAction: string
}

const DEFAULT_CAPTURED_AT = 'pending_mobile_timestamp'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'mobile-voice-capture'
}

function normalizeTitle(input: MobileVoiceCaptureInput): string {
  if (input.title?.trim()) return input.title.trim().slice(0, 140)
  const firstLine = input.transcript.trim().split(/\r?\n/)[0]?.trim()
  return (firstLine || 'Mobile voice capture').slice(0, 140)
}

export function buildMobileVoiceCapturePacket(input: MobileVoiceCaptureInput): MobileVoiceCapturePacket {
  const title = normalizeTitle(input)
  const capturedAt = input.capturedAt?.trim() || DEFAULT_CAPTURED_AT
  const transcript = input.transcript.trim()
  const slug = slugify(`${capturedAt}-${title}`)

  return {
    packetId: `mobile_voice_${slug}`,
    source: input.source,
    title,
    status: 'captured_for_review',
    capturedAt,
    transcriptCharacterCount: transcript.length,
    speakerLabelsIncluded: input.speakerLabelsIncluded === true,
    timestampsIncluded: input.timestampsIncluded === true,
    obsidianTargetPath: `2nd-brain/Mobile Voice Captures/${slug}.md`,
    secondBrainTags: ['mobile-capture', 'voice-intake', 'plaud', 'research-seed', 'board-review'],
    researchPrompt: [
      `Research and expand this mobile voice idea: ${title}`,
      input.summary?.trim() ? `Summary: ${input.summary.trim()}` : 'Summary: not supplied',
      `Transcript excerpt: ${transcript.slice(0, 1200)}`,
      'Return related products, market references, implementation paths, risks, and first safe tasks for Unite-Group Mission Control.',
    ].join('\n\n'),
    seniorPmWorkCandidates: [
      'Create Obsidian source note with transcript, summary, tags, and provenance.',
      'Run research expansion against GitHub, Hugging Face, web sources, and existing 2nd brain notes.',
      'Generate Board review packet with assumptions, risks, client/business mapping, and next actions.',
      'Create Hermes Kanban or Linear tasks only after Board approval.',
    ],
    boardGate: 'mobile_voice_capture_review',
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
  }
}

export function getMobileVoiceIntakeStatus(): MobileVoiceIntakeStatusView {
  return {
    source: 'static_mobile_voice_intake',
    status: 'ready_for_mobile_capture',
    mobileFirst: true,
    plaudSupported: true,
    plaudIngressModes: [
      'plaud_dev_api_webhook',
      'plaud_zapier_export',
      'plaud_manual_mobile_export',
      'mobile_voice_note',
    ],
    endpoint: '/api/hermes/operator-gateway/mobile-voice-intake',
    obsidianCaptureMode: 'source_note_then_research_queue',
    secondBrainTarget: 'Obsidian/2nd-brain',
    researchExpansionEnabled: true,
    packetPersistenceEnabled: true,
    sourceNoteWriteEnabled: true,
    boardPacketGenerationEnabled: true,
    boardReviewRequired: true,
    hermesQueueRequired: true,
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
    noSharedCredentials: true,
    noRawAudioStorage: true,
    supportedMobileMoments: [
      'driving podcast insight',
      'audio book idea',
      'Plaud conversation',
      'client call reflection',
      'field observation',
    ],
    requiredEvidence: [
      'transcript_or_summary',
      'source_provenance',
      'obsidian_source_note',
      'research_expansion',
      'board_review_packet',
    ],
    openGates: [
      'configure_plaud_dev_api_or_zapier_ingress',
      'connect_obsidian_mobile_capture_folder',
      'approve_board_review_to_hermes_queue',
    ],
    nextAction: 'Approve Board-reviewed packets before any automated Hermes queue or Linear task creation.',
  }
}

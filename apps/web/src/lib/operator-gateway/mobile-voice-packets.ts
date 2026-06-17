import type { MobileVoiceCapturePacket, MobileVoiceSource } from './mobile-voice-intake'

export interface MobileVoicePacketRecord {
  id: string
  founderId: string
  packetId: string
  source: MobileVoiceSource
  title: string
  status: 'captured_for_review'
  transcript: string
  summary: string | null
  capturedAt: string
  transcriptCharacterCount: number
  speakerLabelsIncluded: boolean
  timestampsIncluded: boolean
  sourceUrl: string | null
  obsidianTargetPath: string
  secondBrainTags: string[]
  researchPrompt: string
  seniorPmWorkCandidates: string[]
  boardGate: 'mobile_voice_capture_review'
  externalDispatchEnabled: false
  autoPublishEnabled: false
  productionExecutionEnabled: false
  rawAudioStored: false
  createdAt: string
  updatedAt: string
}

interface MobileVoicePacketRow {
  id: string
  founder_id: string
  packet_id: string
  source: MobileVoiceSource
  title: string
  status: 'captured_for_review'
  transcript: string
  summary: string | null
  captured_at_text: string
  transcript_character_count: number
  speaker_labels_included: boolean
  timestamps_included: boolean
  source_url: string | null
  obsidian_target_path: string
  second_brain_tags: string[] | null
  research_prompt: string
  senior_pm_work_candidates: string[] | null
  board_gate: 'mobile_voice_capture_review'
  external_dispatch_enabled: boolean
  auto_publish_enabled: boolean
  production_execution_enabled: boolean
  raw_audio_stored: boolean
  created_at: string
  updated_at: string
}

interface MobileVoicePacketInsert {
  founder_id: string
  packet_id: string
  source: MobileVoiceSource
  title: string
  status: 'captured_for_review'
  transcript: string
  summary: string | null
  captured_at_text: string
  transcript_character_count: number
  speaker_labels_included: boolean
  timestamps_included: boolean
  source_url: string | null
  obsidian_target_path: string
  second_brain_tags: string[]
  research_prompt: string
  senior_pm_work_candidates: string[]
  board_gate: 'mobile_voice_capture_review'
  external_dispatch_enabled: false
  auto_publish_enabled: false
  production_execution_enabled: false
  raw_audio_stored: false
  metadata: Record<string, unknown>
}

type MutationResult<T> = Promise<{ data: T | null; error: { message?: string } | null }>

export interface MobileVoicePacketWriteClient {
  from(table: 'mobile_voice_packets'): {
    insert(payload: MobileVoicePacketInsert): {
      select(columns: string): {
        single(): MutationResult<MobileVoicePacketRow>
      }
    }
  }
}

export interface PersistMobileVoicePacketOptions {
  founderId?: string
  client?: MobileVoicePacketWriteClient | null
  packet: MobileVoiceCapturePacket
  transcript: string
  summary?: string | null
  sourceUrl?: string | null
}

export type PersistMobileVoicePacketResult =
  | {
      ok: true
      status: 201
      source: 'mobile_voice_packet_insert'
      persisted: true
      tasksCreated: false
      externalDispatchEnabled: false
      autoPublishEnabled: false
      productionExecutionEnabled: false
      record: MobileVoicePacketRecord
    }
  | {
      ok: false
      status: 400 | 503
      source: 'validation_failed' | 'not_connected' | 'mobile_voice_packet_insert_failed'
      persisted: false
      tasksCreated: false
      externalDispatchEnabled: false
      autoPublishEnabled: false
      productionExecutionEnabled: false
      error: string
      reasons: string[]
    }

const MOBILE_VOICE_PACKET_SELECT = [
  'id',
  'founder_id',
  'packet_id',
  'source',
  'title',
  'status',
  'transcript',
  'summary',
  'captured_at_text',
  'transcript_character_count',
  'speaker_labels_included',
  'timestamps_included',
  'source_url',
  'obsidian_target_path',
  'second_brain_tags',
  'research_prompt',
  'senior_pm_work_candidates',
  'board_gate',
  'external_dispatch_enabled',
  'auto_publish_enabled',
  'production_execution_enabled',
  'raw_audio_stored',
  'created_at',
  'updated_at',
].join(',')

function mapMobileVoicePacketRow(row: MobileVoicePacketRow): MobileVoicePacketRecord | null {
  if (row.external_dispatch_enabled !== false) return null
  if (row.auto_publish_enabled !== false) return null
  if (row.production_execution_enabled !== false) return null
  if (row.raw_audio_stored !== false) return null
  if (row.board_gate !== 'mobile_voice_capture_review') return null
  if (row.status !== 'captured_for_review') return null

  return {
    id: row.id,
    founderId: row.founder_id,
    packetId: row.packet_id,
    source: row.source,
    title: row.title,
    status: row.status,
    transcript: row.transcript,
    summary: row.summary,
    capturedAt: row.captured_at_text,
    transcriptCharacterCount: row.transcript_character_count,
    speakerLabelsIncluded: row.speaker_labels_included,
    timestampsIncluded: row.timestamps_included,
    sourceUrl: row.source_url,
    obsidianTargetPath: row.obsidian_target_path,
    secondBrainTags: row.second_brain_tags ?? [],
    researchPrompt: row.research_prompt,
    seniorPmWorkCandidates: row.senior_pm_work_candidates ?? [],
    boardGate: row.board_gate,
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
    rawAudioStored: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

type PersistMobileVoicePacketFailureSource = Extract<PersistMobileVoicePacketResult, { ok: false }>['source']

function reject(status: 400 | 503, source: PersistMobileVoicePacketFailureSource, error: string, reasons: string[]): PersistMobileVoicePacketResult {
  return {
    ok: false,
    status,
    source,
    persisted: false,
    tasksCreated: false,
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
    error,
    reasons,
  }
}

export async function persistMobileVoicePacket(options: PersistMobileVoicePacketOptions): Promise<PersistMobileVoicePacketResult> {
  const { founderId, client, packet } = options
  const transcript = options.transcript.trim()

  if (!founderId) {
    return reject(400, 'validation_failed', 'Mobile voice packet persistence rejected.', ['founder/session is required'])
  }
  if (!transcript) {
    return reject(400, 'validation_failed', 'Mobile voice packet persistence rejected.', ['transcript is required'])
  }
  if (packet.externalDispatchEnabled || packet.autoPublishEnabled || packet.productionExecutionEnabled) {
    return reject(400, 'validation_failed', 'Mobile voice packet persistence rejected.', ['packet violates non-dispatch safety invariants'])
  }
  if (!client) {
    return reject(503, 'not_connected', 'mobile_voice_packets INSERT is unavailable; no production fallback exists.', ['mobile voice packet write client is not configured'])
  }

  const payload: MobileVoicePacketInsert = {
    founder_id: founderId,
    packet_id: packet.packetId,
    source: packet.source,
    title: packet.title,
    status: 'captured_for_review',
    transcript,
    summary: options.summary?.trim() || null,
    captured_at_text: packet.capturedAt,
    transcript_character_count: packet.transcriptCharacterCount,
    speaker_labels_included: packet.speakerLabelsIncluded,
    timestamps_included: packet.timestampsIncluded,
    source_url: options.sourceUrl?.trim() || null,
    obsidian_target_path: packet.obsidianTargetPath,
    second_brain_tags: packet.secondBrainTags,
    research_prompt: packet.researchPrompt,
    senior_pm_work_candidates: packet.seniorPmWorkCandidates,
    board_gate: 'mobile_voice_capture_review',
    external_dispatch_enabled: false,
    auto_publish_enabled: false,
    production_execution_enabled: false,
    raw_audio_stored: false,
    metadata: {
      noRawAudioStorage: true,
      tasksCreated: false,
      boardGateRequired: true,
    },
  }

  try {
    const { data, error } = await client
      .from('mobile_voice_packets')
      .insert(payload)
      .select(MOBILE_VOICE_PACKET_SELECT)
      .single()

    if (error || !data) {
      return reject(503, 'mobile_voice_packet_insert_failed', `mobile_voice_packets INSERT failed: ${error?.message ?? 'no row returned'}`, ['mobile voice packet insert failed'])
    }

    const record = mapMobileVoicePacketRow(data)
    if (!record) {
      return reject(503, 'mobile_voice_packet_insert_failed', 'mobile_voice_packets INSERT returned a row that violates safety invariants.', ['inserted row failed safety mapping'])
    }

    return {
      ok: true,
      status: 201,
      source: 'mobile_voice_packet_insert',
      persisted: true,
      tasksCreated: false,
      externalDispatchEnabled: false,
      autoPublishEnabled: false,
      productionExecutionEnabled: false,
      record,
    }
  } catch {
    return reject(503, 'mobile_voice_packet_insert_failed', 'Mobile voice packet persistence failed due to runtime error.', ['mobile voice packet write runtime error'])
  }
}

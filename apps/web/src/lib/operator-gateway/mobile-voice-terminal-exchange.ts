import {
  buildMobileVoiceCapturePacket,
  getMobileVoiceIntakeStatus,
  type MobileVoiceCaptureInput,
  type MobileVoiceSource,
} from './mobile-voice-intake'
import type { MobileVoicePacketRecord } from './mobile-voice-packets'
import { writeMobileVoiceBoardPacket } from './mobile-voice-board-packets'
import { writeMobileVoiceSourceNote } from './mobile-voice-source-notes'
import type { WriteEvidenceInput, WriteEvidenceResult } from '../obsidian/evidence'

export interface MobileVoiceTerminalExchangeInput {
  source?: MobileVoiceSource
  title?: string
  transcript: string
  summary?: string
  capturedAt?: string
  speakerLabelsIncluded?: boolean
  timestampsIncluded?: boolean
  sourceUrl?: string
  founderId?: string
  now?: Date
  writer?: (input: WriteEvidenceInput) => Promise<WriteEvidenceResult>
}

export interface MobileVoiceTerminalExchangeResult {
  ok: boolean
  source: 'mobile_voice_terminal_exchange'
  terminalExchange: true
  databasePersisted: false
  founderId: string
  packet?: MobileVoicePacketRecord
  sourceNote?: {
    relativePath: string
    notePath: string
    status: 'source_note_ready'
  }
  boardPacket?: {
    relativePath: string
    notePath: string
    status: 'board_review_ready'
  }
  tasksCreated: false
  hermesQueueEnabled: false
  linearTaskCreated: false
  externalDispatchEnabled: false
  autoPublishEnabled: false
  productionExecutionEnabled: false
  errors: string[]
}

const TERMINAL_FOUNDER_ID = 'terminal_exchange_founder'

function terminalUpdateClient() {
  return {
    from() {
      return {
        update() {
          return {
            eq() {
              return {
                async eq() {
                  return { error: null }
                },
              }
            },
          }
        },
      }
    },
  }
}

function toRecord(input: MobileVoiceCaptureInput, founderId: string, now: Date): MobileVoicePacketRecord {
  const packet = buildMobileVoiceCapturePacket(input)
  return {
    id: `terminal_${packet.packetId}`,
    founderId,
    packetId: packet.packetId,
    source: packet.source,
    title: packet.title,
    status: 'captured_for_review',
    transcript: input.transcript.trim(),
    summary: input.summary?.trim() || null,
    capturedAt: packet.capturedAt,
    transcriptCharacterCount: packet.transcriptCharacterCount,
    speakerLabelsIncluded: packet.speakerLabelsIncluded,
    timestampsIncluded: packet.timestampsIncluded,
    sourceUrl: input.sourceUrl?.trim() || null,
    obsidianTargetPath: packet.obsidianTargetPath,
    secondBrainTags: packet.secondBrainTags,
    researchPrompt: packet.researchPrompt,
    seniorPmWorkCandidates: packet.seniorPmWorkCandidates,
    boardGate: packet.boardGate,
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
    rawAudioStored: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
}

function failure(founderId: string, errors: string[]): MobileVoiceTerminalExchangeResult {
  return {
    ok: false,
    source: 'mobile_voice_terminal_exchange',
    terminalExchange: true,
    databasePersisted: false,
    founderId,
    tasksCreated: false,
    hermesQueueEnabled: false,
    linearTaskCreated: false,
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
    errors,
  }
}

export async function runMobileVoiceTerminalExchange(
  input: MobileVoiceTerminalExchangeInput,
): Promise<MobileVoiceTerminalExchangeResult> {
  const founderId = input.founderId?.trim() || TERMINAL_FOUNDER_ID
  const transcript = input.transcript.trim()
  if (!transcript) return failure(founderId, ['transcript is required'])

  const source = input.source ?? 'mobile_voice_note'
  if (!getMobileVoiceIntakeStatus().plaudIngressModes.includes(source)) {
    return failure(founderId, [`unsupported mobile voice source: ${source}`])
  }

  const now = input.now ?? new Date()
  const record = toRecord({
    source,
    title: input.title,
    transcript,
    summary: input.summary,
    capturedAt: input.capturedAt || now.toISOString(),
    speakerLabelsIncluded: input.speakerLabelsIncluded,
    timestampsIncluded: input.timestampsIncluded,
    sourceUrl: input.sourceUrl,
  }, founderId, now)

  const updateClient = terminalUpdateClient()
  const sourceNote = await writeMobileVoiceSourceNote({
    founderId,
    client: updateClient,
    record,
    writer: input.writer,
    now,
  })
  if (!sourceNote.ok) return failure(founderId, [sourceNote.error, ...sourceNote.reasons])

  const boardPacket = await writeMobileVoiceBoardPacket({
    founderId,
    client: updateClient,
    record,
    sourceNote: sourceNote.note,
    writer: input.writer,
    now,
  })
  if (!boardPacket.ok) return failure(founderId, [boardPacket.error, ...boardPacket.reasons])

  return {
    ok: true,
    source: 'mobile_voice_terminal_exchange',
    terminalExchange: true,
    databasePersisted: false,
    founderId,
    packet: record,
    sourceNote: {
      relativePath: sourceNote.note.relativePath,
      notePath: sourceNote.note.notePath,
      status: sourceNote.note.status,
    },
    boardPacket: {
      relativePath: boardPacket.boardPacket.relativePath,
      notePath: boardPacket.boardPacket.notePath,
      status: boardPacket.boardPacket.status,
    },
    tasksCreated: false,
    hermesQueueEnabled: false,
    linearTaskCreated: false,
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
    errors: [],
  }
}

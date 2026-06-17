import { writeEvidence, type WriteEvidenceInput, type WriteEvidenceResult } from '@/lib/obsidian/evidence'
import type { MobileVoicePacketRecord } from './mobile-voice-packets'
import type { MobileVoiceSourceNoteRecord } from './mobile-voice-source-notes'

export interface MobileVoiceBoardPacketRecord {
  packetId: string
  relativePath: string
  notePath: string
  suffixed: boolean
  status: 'board_review_ready'
  tasksCreated: false
  hermesQueueEnabled: false
  linearTaskCreated: false
  externalDispatchEnabled: false
  autoPublishEnabled: false
  productionExecutionEnabled: false
}

export interface MobileVoiceBoardPacketUpdateClient {
  from(table: 'mobile_voice_packets'): {
    update(payload: {
      status: 'board_review_ready'
      board_review_packet_path: string
      board_review_packet_written_at: string
    }): {
      eq(column: 'founder_id', value: string): {
        eq(column: 'packet_id', value: string): Promise<{ error: { message?: string } | null }>
      }
    }
  }
}

export interface WriteMobileVoiceBoardPacketOptions {
  founderId?: string
  client?: MobileVoiceBoardPacketUpdateClient | null
  record: MobileVoicePacketRecord
  sourceNote?: MobileVoiceSourceNoteRecord | null
  writer?: (input: WriteEvidenceInput) => Promise<WriteEvidenceResult>
  now?: Date
}

export type WriteMobileVoiceBoardPacketResult =
  | {
      ok: true
      status: 201
      source: 'mobile_voice_board_packet_written'
      boardReviewPacketWritten: true
      boardPacket: MobileVoiceBoardPacketRecord
    }
  | {
      ok: false
      status: 400 | 503
      source: 'validation_failed' | 'mobile_voice_board_packet_write_failed' | 'mobile_voice_board_packet_update_failed'
      boardReviewPacketWritten: false
      error: string
      reasons: string[]
    }

function reject(
  status: 400 | 503,
  source: Extract<WriteMobileVoiceBoardPacketResult, { ok: false }>['source'],
  error: string,
  reasons: string[],
): WriteMobileVoiceBoardPacketResult {
  return { ok: false, status, source, boardReviewPacketWritten: false, error, reasons }
}

function list(values: string[]): string {
  if (!values.length) return '- Not supplied'
  return values.map((value) => `- ${value}`).join('\n')
}

export function buildMobileVoiceBoardPacketBody(
  record: MobileVoicePacketRecord,
  sourceNote?: MobileVoiceSourceNoteRecord | null,
): string {
  return [
    '## Decision Ask',
    '',
    `Should the Board approve this mobile voice capture for research expansion and bounded Hermes/Linear task creation after review?`,
    '',
    '## Source Note',
    '',
    sourceNote?.relativePath
      ? `- Source note: \`${sourceNote.relativePath}\``
      : '- Source note: not yet linked',
    `- Packet: \`${record.packetId}\``,
    `- Source: \`${record.source}\``,
    `- Captured: ${record.capturedAt}`,
    '',
    '## Founder Intent',
    '',
    record.summary?.trim() || record.title,
    '',
    '## Research Expansion Prompt',
    '',
    record.researchPrompt.trim(),
    '',
    '## Senior PM Candidate Work',
    '',
    list(record.seniorPmWorkCandidates),
    '',
    '## Assumptions To Test',
    '',
    [
      '- The captured idea maps to at least one active Unite-Group business or client workflow.',
      '- Research expansion can produce useful evidence without using private credentials or external execution.',
      '- Any Hermes/Linear tasks can be decomposed into small, reversible, testable work packets.',
      '- Mobile capture remains text-only; raw audio is not required for delivery.',
    ].join('\n'),
    '',
    '## Risks And Stop Gates',
    '',
    [
      '- Stop if the transcript contains credentials, private client data that should not enter the 2nd brain, or legal/medical/financial advice requiring specialist review.',
      '- Stop if the idea requires production execution, publishing, payment, email send, browser/computer-use action, or irreversible data changes.',
      '- Stop if Board review cannot identify a clear business outcome, owner, or verification path.',
      '- Stop if the source note path is missing or cannot be audited.',
    ].join('\n'),
    '',
    '## Recommended Board Outcome',
    '',
    [
      '- Default stance: `HOLD_FOR_BOARD_REVIEW`.',
      '- Approve only bounded research, evidence gathering, and sandbox planning until a named Board gate authorises Hermes/Linear execution.',
      '- Create Hermes Kanban or Linear tasks only after Board approval.',
    ].join('\n'),
    '',
    '## Execution State',
    '',
    [
      '- Hermes queue: `disabled`',
      '- Linear task creation: `disabled`',
      '- External dispatch: `disabled`',
      '- Auto publish: `disabled`',
      '- Production execution: `disabled`',
      `- Board gate: \`${record.boardGate}\``,
    ].join('\n'),
  ].join('\n')
}

export function buildMobileVoiceBoardPacketInput(
  record: MobileVoicePacketRecord,
  sourceNote?: MobileVoiceSourceNoteRecord | null,
): WriteEvidenceInput {
  const sources = [
    `mobile_voice_packet:${record.packetId}`,
    sourceNote?.relativePath ? `source_note:${sourceNote.relativePath}` : null,
    record.sourceUrl ? `source_url:${record.sourceUrl}` : null,
    `target:${record.obsidianTargetPath}`,
  ].filter((value): value is string => Boolean(value))

  return {
    project: 'mobile-voice-intake',
    taskId: `${record.packetId}-board`,
    kind: 'board-packet',
    frontmatter: {
      title: `Board review packet — ${record.title}`,
      type: 'board-packet',
      tags: [...new Set([...record.secondBrainTags, 'board-review', 'mobile-voice-board-packet'])],
      confidence: 'medium',
      packetId: record.packetId,
      source: record.source,
      capturedAt: record.capturedAt,
      boardGate: record.boardGate,
      sourceNotePath: sourceNote?.relativePath ?? '',
    },
    body: buildMobileVoiceBoardPacketBody(record, sourceNote),
    sources,
  }
}

export async function writeMobileVoiceBoardPacket(
  options: WriteMobileVoiceBoardPacketOptions,
): Promise<WriteMobileVoiceBoardPacketResult> {
  const { founderId, client, record, sourceNote } = options
  if (!founderId) {
    return reject(400, 'validation_failed', 'Mobile voice Board packet rejected.', ['founder/session is required'])
  }
  if (!record.transcript.trim()) {
    return reject(400, 'validation_failed', 'Mobile voice Board packet rejected.', ['transcript is required'])
  }
  if (!sourceNote?.relativePath) {
    return reject(400, 'validation_failed', 'Mobile voice Board packet rejected.', ['written source note is required'])
  }
  if (record.externalDispatchEnabled || record.autoPublishEnabled || record.productionExecutionEnabled || record.rawAudioStored) {
    return reject(400, 'validation_failed', 'Mobile voice Board packet rejected.', ['record violates non-execution safety invariants'])
  }

  const writer = options.writer ?? writeEvidence
  let written: WriteEvidenceResult
  try {
    written = await writer(buildMobileVoiceBoardPacketInput(record, sourceNote))
  } catch {
    return reject(503, 'mobile_voice_board_packet_write_failed', 'Mobile voice Board packet write failed.', ['obsidian/evidence writer failed'])
  }

  if (!client) {
    return reject(503, 'mobile_voice_board_packet_update_failed', 'Mobile voice Board packet write succeeded but packet status update is unavailable.', ['mobile voice packet update client is not configured'])
  }

  try {
    const { error } = await client
      .from('mobile_voice_packets')
      .update({
        status: 'board_review_ready',
        board_review_packet_path: written.relativePath,
        board_review_packet_written_at: (options.now ?? new Date()).toISOString(),
      })
      .eq('founder_id', founderId)
      .eq('packet_id', record.packetId)

    if (error) {
      return reject(503, 'mobile_voice_board_packet_update_failed', `mobile_voice_packets Board packet update failed: ${error.message ?? 'unknown error'}`, ['mobile voice packet Board packet update failed'])
    }
  } catch {
    return reject(503, 'mobile_voice_board_packet_update_failed', 'Mobile voice Board packet update failed due to runtime error.', ['mobile voice packet Board packet update runtime error'])
  }

  return {
    ok: true,
    status: 201,
    source: 'mobile_voice_board_packet_written',
    boardReviewPacketWritten: true,
    boardPacket: {
      packetId: record.packetId,
      relativePath: written.relativePath,
      notePath: written.notePath,
      suffixed: written.suffixed,
      status: 'board_review_ready',
      tasksCreated: false,
      hermesQueueEnabled: false,
      linearTaskCreated: false,
      externalDispatchEnabled: false,
      autoPublishEnabled: false,
      productionExecutionEnabled: false,
    },
  }
}

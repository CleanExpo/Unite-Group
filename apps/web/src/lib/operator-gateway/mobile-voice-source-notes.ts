import { writeEvidence, type WriteEvidenceInput, type WriteEvidenceResult } from '@/lib/obsidian/evidence'
import type { MobileVoicePacketRecord } from './mobile-voice-packets'

export interface MobileVoiceSourceNoteRecord {
  packetId: string
  relativePath: string
  notePath: string
  suffixed: boolean
  status: 'source_note_ready'
  tasksCreated: false
  externalDispatchEnabled: false
  autoPublishEnabled: false
  productionExecutionEnabled: false
}

export interface MobileVoiceSourceNoteUpdateClient {
  from(table: 'mobile_voice_packets'): {
    update(payload: {
      status: 'source_note_ready'
      obsidian_source_note_path: string
      obsidian_source_note_written_at: string
    }): {
      eq(column: 'founder_id', value: string): {
        eq(column: 'packet_id', value: string): Promise<{ error: { message?: string } | null }>
      }
    }
  }
}

export interface WriteMobileVoiceSourceNoteOptions {
  founderId?: string
  client?: MobileVoiceSourceNoteUpdateClient | null
  record: MobileVoicePacketRecord
  writer?: (input: WriteEvidenceInput) => Promise<WriteEvidenceResult>
  now?: Date
}

export type WriteMobileVoiceSourceNoteResult =
  | {
      ok: true
      status: 201
      source: 'mobile_voice_source_note_written'
      obsidianSourceNoteWritten: true
      note: MobileVoiceSourceNoteRecord
    }
  | {
      ok: false
      status: 400 | 503
      source: 'validation_failed' | 'mobile_voice_source_note_write_failed' | 'mobile_voice_source_note_update_failed'
      obsidianSourceNoteWritten: false
      error: string
      reasons: string[]
    }

function reject(
  status: 400 | 503,
  source: Extract<WriteMobileVoiceSourceNoteResult, { ok: false }>['source'],
  error: string,
  reasons: string[],
): WriteMobileVoiceSourceNoteResult {
  return { ok: false, status, source, obsidianSourceNoteWritten: false, error, reasons }
}

function bulletList(values: string[]): string {
  if (!values.length) return '- Not supplied'
  return values.map((value) => `- ${value}`).join('\n')
}

export function buildMobileVoiceSourceNoteBody(record: MobileVoicePacketRecord): string {
  return [
    '## Capture',
    '',
    `- Packet: \`${record.packetId}\``,
    `- Source: \`${record.source}\``,
    `- Captured: ${record.capturedAt}`,
    `- Transcript characters: ${record.transcriptCharacterCount}`,
    `- Speaker labels included: ${record.speakerLabelsIncluded ? 'yes' : 'no'}`,
    `- Timestamps included: ${record.timestampsIncluded ? 'yes' : 'no'}`,
    `- Raw audio stored: ${record.rawAudioStored ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
    record.summary?.trim() || 'No summary supplied.',
    '',
    '## Transcript',
    '',
    record.transcript.trim(),
    '',
    '## Research Prompt',
    '',
    record.researchPrompt.trim(),
    '',
    '## Senior PM Work Candidates',
    '',
    bulletList(record.seniorPmWorkCandidates),
    '',
    '## Board Gate',
    '',
    [
      `- Gate: \`${record.boardGate}\``,
      '- Hermes/Linear task creation: `disabled`',
      '- External dispatch: `disabled`',
      '- Auto publish: `disabled`',
      '- Production execution: `disabled`',
    ].join('\n'),
  ].join('\n')
}

export function buildMobileVoiceSourceNoteInput(record: MobileVoicePacketRecord): WriteEvidenceInput {
  const sources = [
    `mobile_voice_packet:${record.packetId}`,
    record.sourceUrl ? `source_url:${record.sourceUrl}` : null,
    `target:${record.obsidianTargetPath}`,
  ].filter((value): value is string => Boolean(value))

  return {
    project: 'mobile-voice-intake',
    taskId: record.packetId,
    kind: 'source-note',
    frontmatter: {
      title: `Mobile voice source — ${record.title}`,
      type: 'source-note',
      tags: [...new Set([...record.secondBrainTags, 'second-brain', 'mobile-voice-source'])],
      confidence: 'medium',
      packetId: record.packetId,
      source: record.source,
      capturedAt: record.capturedAt,
      boardGate: record.boardGate,
    },
    body: buildMobileVoiceSourceNoteBody(record),
    sources,
  }
}

export async function writeMobileVoiceSourceNote(
  options: WriteMobileVoiceSourceNoteOptions,
): Promise<WriteMobileVoiceSourceNoteResult> {
  const { founderId, client, record } = options
  if (!founderId) {
    return reject(400, 'validation_failed', 'Mobile voice source note rejected.', ['founder/session is required'])
  }
  if (!record.transcript.trim()) {
    return reject(400, 'validation_failed', 'Mobile voice source note rejected.', ['transcript is required'])
  }
  if (record.externalDispatchEnabled || record.autoPublishEnabled || record.productionExecutionEnabled || record.rawAudioStored) {
    return reject(400, 'validation_failed', 'Mobile voice source note rejected.', ['record violates non-execution safety invariants'])
  }

  const writer = options.writer ?? writeEvidence
  let written: WriteEvidenceResult
  try {
    written = await writer(buildMobileVoiceSourceNoteInput(record))
  } catch {
    return reject(503, 'mobile_voice_source_note_write_failed', 'Mobile voice source note write failed.', ['obsidian/evidence writer failed'])
  }

  if (!client) {
    return reject(503, 'mobile_voice_source_note_update_failed', 'Mobile voice source note write succeeded but packet status update is unavailable.', ['mobile voice packet update client is not configured'])
  }

  try {
    const { error } = await client
      .from('mobile_voice_packets')
      .update({
        status: 'source_note_ready',
        obsidian_source_note_path: written.relativePath,
        obsidian_source_note_written_at: (options.now ?? new Date()).toISOString(),
      })
      .eq('founder_id', founderId)
      .eq('packet_id', record.packetId)

    if (error) {
      return reject(503, 'mobile_voice_source_note_update_failed', `mobile_voice_packets source-note update failed: ${error.message ?? 'unknown error'}`, ['mobile voice packet source-note update failed'])
    }
  } catch {
    return reject(503, 'mobile_voice_source_note_update_failed', 'Mobile voice source note update failed due to runtime error.', ['mobile voice packet update runtime error'])
  }

  return {
    ok: true,
    status: 201,
    source: 'mobile_voice_source_note_written',
    obsidianSourceNoteWritten: true,
    note: {
      packetId: record.packetId,
      relativePath: written.relativePath,
      notePath: written.notePath,
      suffixed: written.suffixed,
      status: 'source_note_ready',
      tasksCreated: false,
      externalDispatchEnabled: false,
      autoPublishEnabled: false,
      productionExecutionEnabled: false,
    },
  }
}

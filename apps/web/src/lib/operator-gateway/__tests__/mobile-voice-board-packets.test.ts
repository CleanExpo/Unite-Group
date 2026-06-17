import { describe, expect, it, vi } from 'vitest'
import {
  buildMobileVoiceBoardPacketInput,
  writeMobileVoiceBoardPacket,
  type MobileVoiceBoardPacketUpdateClient,
} from '../mobile-voice-board-packets'
import type { MobileVoicePacketRecord } from '../mobile-voice-packets'
import type { MobileVoiceSourceNoteRecord } from '../mobile-voice-source-notes'

function record(overrides: Partial<MobileVoicePacketRecord> = {}): MobileVoicePacketRecord {
  return {
    id: 'row-1',
    founderId: 'founder-1',
    packetId: 'mobile_voice_audio-book-idea',
    source: 'plaud_zapier_export',
    title: 'Audio book idea',
    status: 'captured_for_review',
    transcript: 'Capture this driving thought into the second brain and research adjacent products.',
    summary: 'Driving insight',
    capturedAt: '2026-06-17T02:30:00.000Z',
    transcriptCharacterCount: 78,
    speakerLabelsIncluded: false,
    timestampsIncluded: false,
    sourceUrl: 'https://example.test/plaud',
    obsidianTargetPath: '2nd-brain/Mobile Voice Captures/audio-book-idea.md',
    secondBrainTags: ['mobile-capture', 'plaud', 'research-seed'],
    researchPrompt: 'Research and expand this mobile voice idea.',
    seniorPmWorkCandidates: [
      'Create Obsidian source note with transcript, summary, tags, and provenance.',
      'Create Hermes Kanban or Linear tasks only after Board approval.',
    ],
    boardGate: 'mobile_voice_capture_review',
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
    rawAudioStored: false,
    createdAt: '2026-06-17T02:31:00.000Z',
    updatedAt: '2026-06-17T02:31:00.000Z',
    ...overrides,
  }
}

function sourceNote(): MobileVoiceSourceNoteRecord {
  return {
    packetId: 'mobile_voice_audio-book-idea',
    relativePath: 'raw/command-centre/mobile-voice-intake/mobile-voice-source.md',
    notePath: '/tmp/wiki/raw/command-centre/mobile-voice-intake/mobile-voice-source.md',
    suffixed: false,
    status: 'source_note_ready',
    tasksCreated: false,
    externalDispatchEnabled: false,
    autoPublishEnabled: false,
    productionExecutionEnabled: false,
  }
}

function updateClient() {
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  }))

  const client: MobileVoiceBoardPacketUpdateClient = {
    from: vi.fn(() => ({ update })),
  }

  return { client, update }
}

describe('mobile voice Board packets', () => {
  it('builds a Board review packet with decision ask, assumptions, risks, and stop gates', () => {
    const input = buildMobileVoiceBoardPacketInput(record(), sourceNote())

    expect(input.project).toBe('mobile-voice-intake')
    expect(input.kind).toBe('board-packet')
    expect(input.frontmatter.title).toContain('Audio book idea')
    expect(input.frontmatter.tags).toEqual(expect.arrayContaining(['board-review', 'mobile-voice-board-packet']))
    expect(input.sources).toEqual(expect.arrayContaining([
      'mobile_voice_packet:mobile_voice_audio-book-idea',
      'source_note:raw/command-centre/mobile-voice-intake/mobile-voice-source.md',
      'source_url:https://example.test/plaud',
    ]))
    expect(input.body).toContain('## Decision Ask')
    expect(input.body).toContain('## Assumptions To Test')
    expect(input.body).toContain('## Risks And Stop Gates')
    expect(input.body).toContain('Hermes queue: `disabled`')
    expect(input.body).toContain('Linear task creation: `disabled`')
  })

  it('writes the Board packet and marks the packet board_review_ready without creating tasks', async () => {
    const { client, update } = updateClient()
    const writer = vi.fn(async () => ({
      notePath: '/tmp/wiki/raw/command-centre/mobile-voice-intake/mobile-voice-board.md',
      relativePath: 'raw/command-centre/mobile-voice-intake/mobile-voice-board.md',
      suffixed: false,
    }))

    const result = await writeMobileVoiceBoardPacket({
      founderId: 'founder-1',
      client,
      record: record(),
      sourceNote: sourceNote(),
      writer,
      now: new Date('2026-06-17T03:15:00.000Z'),
    })

    expect(result).toMatchObject({
      ok: true,
      boardReviewPacketWritten: true,
      boardPacket: {
        status: 'board_review_ready',
        tasksCreated: false,
        hermesQueueEnabled: false,
        linearTaskCreated: false,
        externalDispatchEnabled: false,
        autoPublishEnabled: false,
        productionExecutionEnabled: false,
      },
    })
    expect(writer).toHaveBeenCalledWith(expect.objectContaining({ kind: 'board-packet' }))
    expect(update).toHaveBeenCalledWith({
      status: 'board_review_ready',
      board_review_packet_path: 'raw/command-centre/mobile-voice-intake/mobile-voice-board.md',
      board_review_packet_written_at: '2026-06-17T03:15:00.000Z',
    })
  })

  it('rejects Board packet generation until a source note exists', async () => {
    const writer = vi.fn()
    const result = await writeMobileVoiceBoardPacket({
      founderId: 'founder-1',
      client: updateClient().client,
      record: record(),
      sourceNote: null,
      writer,
    })

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      source: 'validation_failed',
      boardReviewPacketWritten: false,
    })
    expect(writer).not.toHaveBeenCalled()
  })
})

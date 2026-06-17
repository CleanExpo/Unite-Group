import { describe, expect, it, vi } from 'vitest'
import {
  buildMobileVoiceSourceNoteInput,
  writeMobileVoiceSourceNote,
  type MobileVoiceSourceNoteUpdateClient,
} from '../mobile-voice-source-notes'
import type { MobileVoicePacketRecord } from '../mobile-voice-packets'

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

function updateClient() {
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  }))

  const client: MobileVoiceSourceNoteUpdateClient = {
    from: vi.fn(() => ({ update })),
  }

  return { client, update }
}

describe('mobile voice source notes', () => {
  it('builds an Obsidian source note input from a persisted packet', () => {
    const input = buildMobileVoiceSourceNoteInput(record())

    expect(input.project).toBe('mobile-voice-intake')
    expect(input.kind).toBe('source-note')
    expect(input.frontmatter.title).toContain('Audio book idea')
    expect(input.frontmatter.tags).toEqual(expect.arrayContaining(['mobile-capture', 'mobile-voice-source']))
    expect(input.sources).toEqual(expect.arrayContaining([
      'mobile_voice_packet:mobile_voice_audio-book-idea',
      'source_url:https://example.test/plaud',
      'target:2nd-brain/Mobile Voice Captures/audio-book-idea.md',
    ]))
    expect(input.body).toContain('## Transcript')
    expect(input.body).toContain('Capture this driving thought')
    expect(input.body).toContain('Hermes/Linear task creation: `disabled`')
    expect(input.body).toContain('Production execution: `disabled`')
  })

  it('writes the source note and marks the packet source_note_ready without creating tasks', async () => {
    const { client, update } = updateClient()
    const writer = vi.fn(async () => ({
      notePath: '/tmp/wiki/raw/command-centre/mobile-voice-intake/mobile-voice-source.md',
      relativePath: 'raw/command-centre/mobile-voice-intake/mobile-voice-source.md',
      suffixed: false,
    }))

    const result = await writeMobileVoiceSourceNote({
      founderId: 'founder-1',
      client,
      record: record(),
      writer,
      now: new Date('2026-06-17T02:35:00.000Z'),
    })

    expect(result).toMatchObject({
      ok: true,
      obsidianSourceNoteWritten: true,
      note: {
        status: 'source_note_ready',
        tasksCreated: false,
        externalDispatchEnabled: false,
        autoPublishEnabled: false,
        productionExecutionEnabled: false,
      },
    })
    expect(writer).toHaveBeenCalledWith(expect.objectContaining({ kind: 'source-note' }))
    expect(update).toHaveBeenCalledWith({
      status: 'source_note_ready',
      obsidian_source_note_path: 'raw/command-centre/mobile-voice-intake/mobile-voice-source.md',
      obsidian_source_note_written_at: '2026-06-17T02:35:00.000Z',
    })
  })

  it('rejects unsafe records before writing an Obsidian note', async () => {
    const writer = vi.fn()
    const result = await writeMobileVoiceSourceNote({
      founderId: 'founder-1',
      client: updateClient().client,
      record: record({ externalDispatchEnabled: true as false }),
      writer,
    })

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      source: 'validation_failed',
      obsidianSourceNoteWritten: false,
    })
    expect(writer).not.toHaveBeenCalled()
  })
})

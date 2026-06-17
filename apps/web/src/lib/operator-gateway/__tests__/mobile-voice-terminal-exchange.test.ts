import { describe, expect, it, vi } from 'vitest'
import { runMobileVoiceTerminalExchange } from '../mobile-voice-terminal-exchange'

describe('mobile voice terminal exchange', () => {
  it('creates source and Board packet artifacts from a terminal transcript without execution', async () => {
    const writer = vi
      .fn()
      .mockResolvedValueOnce({
        notePath: '/tmp/wiki/raw/command-centre/mobile-voice-intake/mobile-source.md',
        relativePath: 'raw/command-centre/mobile-voice-intake/mobile-source.md',
        suffixed: false,
      })
      .mockResolvedValueOnce({
        notePath: '/tmp/wiki/raw/command-centre/mobile-voice-intake/mobile-board.md',
        relativePath: 'raw/command-centre/mobile-voice-intake/mobile-board.md',
        suffixed: false,
      })

    const result = await runMobileVoiceTerminalExchange({
      source: 'plaud_manual_mobile_export',
      title: 'Driving product idea',
      transcript: 'Capture this mobile thought into the second brain and prepare it for Board review.',
      summary: 'Terminal capture',
      capturedAt: '2026-06-17T03:30:00.000Z',
      founderId: 'founder-terminal',
      writer,
      now: new Date('2026-06-17T03:31:00.000Z'),
    })

    expect(result.ok).toBe(true)
    expect(result.terminalExchange).toBe(true)
    expect(result.databasePersisted).toBe(false)
    expect(result.tasksCreated).toBe(false)
    expect(result.hermesQueueEnabled).toBe(false)
    expect(result.linearTaskCreated).toBe(false)
    expect(result.externalDispatchEnabled).toBe(false)
    expect(result.sourceNote?.relativePath).toBe('raw/command-centre/mobile-voice-intake/mobile-source.md')
    expect(result.boardPacket?.relativePath).toBe('raw/command-centre/mobile-voice-intake/mobile-board.md')
    expect(result.packet?.source).toBe('plaud_manual_mobile_export')
    expect(result.packet?.boardGate).toBe('mobile_voice_capture_review')
    expect(writer).toHaveBeenNthCalledWith(1, expect.objectContaining({
      kind: 'source-note',
      body: expect.stringContaining('## Transcript'),
    }))
    expect(writer).toHaveBeenNthCalledWith(2, expect.objectContaining({
      kind: 'board-packet',
      body: expect.stringContaining('## Decision Ask'),
    }))
  })

  it('rejects empty or unsupported terminal exchanges before writing artifacts', async () => {
    const writer = vi.fn()

    await expect(runMobileVoiceTerminalExchange({
      transcript: '   ',
      writer,
    })).resolves.toMatchObject({
      ok: false,
      errors: ['transcript is required'],
    })

    await expect(runMobileVoiceTerminalExchange({
      source: 'not_supported' as never,
      transcript: 'hello',
      writer,
    })).resolves.toMatchObject({
      ok: false,
      errors: ['unsupported mobile voice source: not_supported'],
    })

    expect(writer).not.toHaveBeenCalled()
  })
})

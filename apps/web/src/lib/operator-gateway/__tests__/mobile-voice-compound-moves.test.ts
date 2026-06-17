import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildMobileVoiceCompoundMoveArtifactInput,
  buildMobileVoiceCompoundMovePreview,
  getLatestMobileVoiceCompoundMoveArtifactView,
  writeMobileVoiceCompoundMoveArtifact,
} from '../mobile-voice-compound-moves'

const boardPacket = `---
title: "Board review packet — Terminal exchange proof"
packetId: "mobile_voice_terminal-proof"
type: "board-packet"
---

# Board review packet — Terminal exchange proof

## Decision Ask

Should the Board approve this mobile voice capture for research expansion?

## Founder Intent

Turn a driving idea into a researched product path.

## Research Expansion Prompt

Research adjacent creator tooling, GitHub repos, Hugging Face resources, and implementation paths.
`

const originalWikiPath = process.env.WIKI_PATH
const tempDirs: string[] = []

afterEach(async () => {
  process.env.WIKI_PATH = originalWikiPath
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('mobile voice compound moves', () => {
  it('generates 15-20 gated compound-engineering moves from a Board packet', () => {
    const preview = buildMobileVoiceCompoundMovePreview({
      boardPacketText: boardPacket,
      maxMoves: 20,
    })

    expect(preview.ok).toBe(true)
    expect(preview.packetId).toBe('mobile_voice_terminal-proof')
    expect(preview.title).toBe('Terminal exchange proof')
    expect(preview.moveCount).toBe(20)
    expect(preview.hermesQueueEnabled).toBe(false)
    expect(preview.linearTaskCreated).toBe(false)
    expect(preview.externalDispatchEnabled).toBe(false)
    expect(preview.productionExecutionEnabled).toBe(false)
    expect(preview.moves).toHaveLength(20)
    expect(preview.moves[0]).toMatchObject({
      rank: 1,
      lane: 'second_brain',
      hermesPreview: { createTask: false },
      linearPreview: { createIssue: false },
    })
    expect(preview.moves.map((move) => move.stopGate)).toEqual(expect.arrayContaining([
      'requires_board_approval_before_create',
      'requires_founder_decision',
      'requires_merged_evidence',
    ]))
  })

  it('clamps move count to the 15-20 operating window', () => {
    expect(buildMobileVoiceCompoundMovePreview({ boardPacketText: boardPacket, maxMoves: 1 }).moveCount).toBe(15)
    expect(buildMobileVoiceCompoundMovePreview({ boardPacketText: boardPacket, maxMoves: 50 }).moveCount).toBe(20)
  })

  it('formats and writes the Next 20 Moves artifact without enabling execution', async () => {
    const preview = buildMobileVoiceCompoundMovePreview({ boardPacketText: boardPacket, maxMoves: 20 })
    const input = buildMobileVoiceCompoundMoveArtifactInput(preview)

    expect(input.kind).toBe('compound-moves')
    expect(input.frontmatter.title).toContain('Next 20 compound moves')
    expect(input.body).toContain('## Next Moves')
    expect(input.body).toContain('Hermes queue enabled: `false`')
    expect(input.body).toContain('Linear task created: `false`')
    expect(input.body).toContain('Founder/Board approval is required')

    const writer = vi.fn(async () => ({
      notePath: '/tmp/wiki/raw/command-centre/mobile-voice-intake/next-20.md',
      relativePath: 'raw/command-centre/mobile-voice-intake/next-20.md',
      suffixed: false,
    }))
    await expect(writeMobileVoiceCompoundMoveArtifact(preview, writer)).resolves.toEqual({
      written: true,
      notePath: '/tmp/wiki/raw/command-centre/mobile-voice-intake/next-20.md',
      relativePath: 'raw/command-centre/mobile-voice-intake/next-20.md',
      suffixed: false,
    })
    expect(writer).toHaveBeenCalledWith(input)
  })

  it('reads the latest written Next 20 Moves artifact for Mission Control', async () => {
    const tempWiki = await mkdtemp(path.join(tmpdir(), 'mobile-voice-next20-'))
    tempDirs.push(tempWiki)
    process.env.WIKI_PATH = tempWiki

    const preview = buildMobileVoiceCompoundMovePreview({ boardPacketText: boardPacket, maxMoves: 20 })
    await writeMobileVoiceCompoundMoveArtifact(preview)

    const view = getLatestMobileVoiceCompoundMoveArtifactView()

    expect(view.status).toBe('available')
    expect(view.secondBrainRoot).toBe(tempWiki)
    expect(view.relativePath).toContain('raw/command-centre/mobile-voice-intake/')
    expect(view.title).toContain('Next 20 compound moves')
    expect(view.packetId).toBe('mobile_voice_terminal-proof')
    expect(view.moveCount).toBe(20)
    expect(view.previewMoves).toHaveLength(5)
    expect(view.previewMoves[0]).toMatchObject({
      rank: 1,
      lane: 'second_brain',
      agent: 'Obsidian Librarian',
      stopGate: 'stop_if_source_note_missing',
    })
    expect(view.hermesQueueEnabled).toBe(false)
    expect(view.linearTaskCreated).toBe(false)
    expect(view.nextApprovalGate).toBe('approve_selected_next_20_moves_to_hermes_or_linear_preview')
  })
})

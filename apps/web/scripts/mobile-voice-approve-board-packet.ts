#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import process from 'node:process'
import {
  buildMobileVoiceCompoundMovePreview,
  writeMobileVoiceCompoundMoveArtifact,
} from '../src/lib/operator-gateway/mobile-voice-compound-moves'

interface Args {
  boardPacket?: string
  text?: string
  packetId?: string
  title?: string
  maxMoves?: number
  writeArtifact?: boolean
  pretty?: boolean
}

function usage(): string {
  return [
    'Usage:',
    '  pnpm mobile-voice:approve-board-packet -- --board-packet ./board-packet.md --max-moves 20 --pretty',
    '  cat board-packet.md | pnpm mobile-voice:approve-board-packet -- --packet-id mobile_voice_x',
    '',
    'Options:',
    '  --board-packet <path>   Read Board packet markdown from a file',
    '  --text <markdown>       Use inline Board packet markdown',
    '  --packet-id <id>        Override/inject packet id',
    '  --title <title>         Override/inject title',
    '  --max-moves <15-20>     Number of moves to emit, clamped to 15-20',
    '  --write-artifact        Write the Next 20 Moves artifact to WIKI_PATH',
    '  --pretty                Pretty-print JSON output',
  ].join('\n')
}

function parseArgs(argv: string[]): Args {
  const args: Args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => {
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`)
      i += 1
      return value
    }

    if (arg === '--help' || arg === '-h') {
      console.log(usage())
      process.exit(0)
    } else if (arg === '--board-packet') args.boardPacket = next()
    else if (arg === '--text') args.text = next()
    else if (arg === '--packet-id') args.packetId = next()
    else if (arg === '--title') args.title = next()
    else if (arg === '--max-moves') args.maxMoves = Number(next())
    else if (arg === '--write-artifact') args.writeArtifact = true
    else if (arg === '--pretty') args.pretty = true
    else if (arg === '--') continue
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function resolveBoardPacket(args: Args): Promise<string> {
  if (args.text?.trim()) return args.text
  if (args.boardPacket) return readFile(args.boardPacket, 'utf8')
  return readStdin()
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2))
    const boardPacketText = await resolveBoardPacket(args)
    const preview = buildMobileVoiceCompoundMovePreview({
      boardPacketText,
      packetId: args.packetId,
      title: args.title,
      maxMoves: args.maxMoves,
    })
    const artifact = args.writeArtifact
      ? await writeMobileVoiceCompoundMoveArtifact(preview)
      : null
    console.log(JSON.stringify({ ...preview, artifact }, null, args.pretty ? 2 : 0))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error('')
    console.error(usage())
    process.exit(1)
  }
}

void main()

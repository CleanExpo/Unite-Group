#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import process from 'node:process'
import {
  runMobileVoiceTerminalExchange,
  type MobileVoiceTerminalExchangeInput,
} from '../src/lib/operator-gateway/mobile-voice-terminal-exchange'
import type { MobileVoiceSource } from '../src/lib/operator-gateway/mobile-voice-intake'

interface Args {
  file?: string
  transcript?: string
  source?: MobileVoiceSource
  title?: string
  summary?: string
  capturedAt?: string
  sourceUrl?: string
  founderId?: string
  speakerLabelsIncluded?: boolean
  timestampsIncluded?: boolean
  pretty?: boolean
}

function usage(): string {
  return [
    'Usage:',
    '  pnpm mobile-voice:terminal-exchange -- --file ./transcript.txt --title "Podcast idea"',
    '  cat transcript.txt | pnpm mobile-voice:terminal-exchange -- --source plaud_zapier_export --summary "Driving note"',
    '',
    'Options:',
    '  --file <path>                 Read transcript from a file',
    '  --transcript <text>           Use inline transcript text',
    '  --source <source>             plaud_dev_api_webhook | plaud_zapier_export | plaud_manual_mobile_export | mobile_voice_note',
    '  --title <title>               Optional title',
    '  --summary <summary>           Optional summary',
    '  --captured-at <iso|string>    Optional capture timestamp/string',
    '  --source-url <url>            Optional Plaud/source URL',
    '  --founder-id <id>             Optional founder id label for terminal mode',
    '  --speaker-labels              Mark transcript as containing speaker labels',
    '  --timestamps                  Mark transcript as containing timestamps',
    '  --pretty                      Pretty-print JSON output',
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
    } else if (arg === '--file') args.file = next()
    else if (arg === '--transcript') args.transcript = next()
    else if (arg === '--source') args.source = next() as MobileVoiceSource
    else if (arg === '--title') args.title = next()
    else if (arg === '--summary') args.summary = next()
    else if (arg === '--captured-at') args.capturedAt = next()
    else if (arg === '--source-url') args.sourceUrl = next()
    else if (arg === '--founder-id') args.founderId = next()
    else if (arg === '--speaker-labels') args.speakerLabelsIncluded = true
    else if (arg === '--timestamps') args.timestampsIncluded = true
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

async function resolveTranscript(args: Args): Promise<string> {
  if (args.transcript?.trim()) return args.transcript
  if (args.file) return readFile(args.file, 'utf8')
  return readStdin()
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2))
    const transcript = await resolveTranscript(args)
    const input: MobileVoiceTerminalExchangeInput = {
      source: args.source,
      title: args.title,
      transcript,
      summary: args.summary,
      capturedAt: args.capturedAt,
      sourceUrl: args.sourceUrl,
      founderId: args.founderId,
      speakerLabelsIncluded: args.speakerLabelsIncluded,
      timestampsIncluded: args.timestampsIncluded,
    }

    const result = await runMobileVoiceTerminalExchange(input)
    console.log(JSON.stringify(result, null, args.pretty ? 2 : 0))
    process.exit(result.ok ? 0 : 1)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error('')
    console.error(usage())
    process.exit(1)
  }
}

void main()

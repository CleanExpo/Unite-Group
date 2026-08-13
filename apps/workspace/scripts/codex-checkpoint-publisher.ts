import { readFileSync } from 'node:fs'
import { writeCodexCheckpoint } from '../src/server/codex-runtime-checkpoint'

function inputPathFromArgs(args: Array<string>): string {
  const index = args.indexOf('--input')
  const value = index >= 0 ? args[index + 1] : null
  if (!value || value.startsWith('--')) {
    throw new Error('Usage: pnpm codex:checkpoint --input <status-receipt.json>')
  }
  return value
}

// Status publication only. This command does not dispatch, message, deploy,
// or read credentials. The local bridge will fail closed for stale receipts.
const inputPath = inputPathFromArgs(process.argv.slice(2))
const checkpoint = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown
const published = writeCodexCheckpoint({ checkpoint })
console.log(JSON.stringify({ published: true, observedAt: published.observedAt }))

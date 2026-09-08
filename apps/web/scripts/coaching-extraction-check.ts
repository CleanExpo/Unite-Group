/**
 * Acceptance check for coaching transcript extraction.
 *
 *   COACHING_TRANSCRIPT_PATH=/path/to/transcript npx tsx scripts/coaching-extraction-check.ts find
 *                                                        -> the three known
 *       commitments from Klim session 1 must come back as kind=commitment.
 *   npx tsx scripts/coaching-extraction-check.ts find /path/to/transcript
 *                                                        -> equivalent path argument
 *   npx tsx scripts/coaching-extraction-check.ts falsify  -> an unrelated
 *       transcript must return ZERO commitments.
 *
 * Both halves are required. A check that always finds three is not a check; the
 * falsify run is what proves the find run means anything.
 *
 * THREE, not four — the count here must match KNOWN_COMMITMENTS below, which
 * enumerates three. See the note about the removed fourth item further down.
 *
 * This is an acceptance script, deliberately NOT a *.test.ts — it makes a real,
 * paid model call and must not run in CI on every push.
 */

import { readFileSync } from 'node:fs'
import { extractFromTranscript } from '@/lib/coaching/extract'

const CONTROL = new URL('./fixtures/unrelated-transcript.txt', import.meta.url).pathname

/**
 * The commitments session 1 is known to contain, each verified against the
 * TRANSCRIPT (not against a summary of it) at the line cited.
 *
 * A fourth item — "time himself for a quoting baseline" — was asserted here and
 * in the earlier hand-built client file, and it is WRONG. Transcript line 22 is
 * Phill giving general methodology ("go clean some carpet and find out how long
 * does it take to clean carpet"), phrased hypothetically. Klim agrees to nothing
 * there. It was removed after checking the primary source; an extractor that
 * returned it would be inventing a commitment, which is the more expensive
 * error in a coaching record — the coach chases the client for something they
 * never agreed to.
 */
const KNOWN_COMMITMENTS: Array<{ label: string; pattern: RegExp }> = [
  // L61 "just send me your email address, will you?" / L165 "Text me your email address"
  { label: 'text/send his email address', pattern: /e-?mail/i },
  // L60 "the biggest thing that you can do now is write SOPs for everything"
  { label: 'hand-write SOPs', pattern: /\bSOPs?\b|standard operating|procedure/i },
  // L65 "I'll send you a link to what I'm building" (the strata/OHS pack)
  { label: 'build/send the strata pack', pattern: /strata|OHS|WHS|accreditation/i },
]

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}

async function main() {
  const mode = process.argv[2]
  if (mode !== 'find' && mode !== 'falsify') fail('usage: coaching-extraction-check.ts find|falsify')

  const suppliedTranscript = process.argv[3]?.trim() || process.env.COACHING_TRANSCRIPT_PATH?.trim()
  if (mode === 'find' && !suppliedTranscript) {
    fail('find mode requires a transcript path argument or COACHING_TRANSCRIPT_PATH')
  }

  const path = mode === 'find' ? suppliedTranscript : CONTROL
  let transcript: string
  try {
    transcript = readFileSync(path, 'utf8')
  } catch (e) {
    fail(`could not read transcript at ${path}: ${(e as Error).message}`)
  }

  if (transcript.trim().length < 500) {
    fail(`transcript at ${path} is only ${transcript.trim().length} chars — too short to be a fair check`)
  }

  const result = await extractFromTranscript(transcript)
  const commitments = result.extractions.filter((e) => e.kind === 'commitment')

  console.log(
    `mode=${mode} chars=${transcript.length} extractions=${result.extractions.length} ` +
      `commitments=${commitments.length} in=${result.input_tokens} out=${result.output_tokens}`
  )

  // Grounding rule: every extraction must carry the client's own words.
  const ungrounded = result.extractions.filter(
    (e) => !e.transcript_quote?.trim() || !transcript.includes(e.transcript_quote),
  )
  if (ungrounded.length > 0) {
    fail(`${ungrounded.length} extraction(s) carry an empty or absent transcript_quote — ungrounded`)
  }

  if (mode === 'falsify') {
    if (commitments.length !== 0) {
      console.error('Commitments wrongly found in the unrelated control transcript:')
      for (const c of commitments) console.error(`  - ${c.body}  <<${c.transcript_quote}>>`)
      fail(`expected 0 commitments from the control transcript, got ${commitments.length}`)
    }
    console.log('PASS falsification: 0 commitments from the unrelated transcript')
    return
  }

  // mode === 'find'
  const haystack = commitments.map((c) => `${c.body} ${c.transcript_quote}`).join('\n')
  const missing = KNOWN_COMMITMENTS.filter((k) => !k.pattern.test(haystack))

  console.log(`commitments returned (${commitments.length}):`)
  for (const c of commitments) console.log(`  - [${c.confidence}] ${c.body}`)

  if (missing.length > 0) {
    fail(`missing known commitment(s): ${missing.map((m) => m.label).join('; ')}`)
  }

  console.log(`PASS: all ${KNOWN_COMMITMENTS.length} known commitments found, all grounded in quotes`)
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)))

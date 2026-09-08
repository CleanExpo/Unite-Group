/**
 * Acceptance check for the consent gate.
 *
 *   npx tsx scripts/coaching-consent-check.ts
 *
 * Every case below is a state that must be REFUSED, plus the one state that
 * must be allowed. The refusals are the point: a gate that only proves it can
 * say yes has proven nothing.
 */

import { checkConsent, type ConsentState } from '@/lib/coaching/consent'

type Case = { name: string; input: ConsentState | null; expectAllowed: boolean }

const CASES: Case[] = [
  // Must be refused.
  { name: 'engagement missing', input: null, expectAllowed: false },
  {
    name: 'consent never given',
    input: { consent_given: false, consent_date: null, consent_method: null, consent_disclosure: null },
    expectAllowed: false,
  },
  {
    name: 'consent given but no date (half-recorded)',
    input: { consent_given: true, consent_date: null, consent_method: 'email', consent_disclosure: 'AI use' },
    expectAllowed: false,
  },
  {
    name: 'consent given but no method (half-recorded)',
    input: { consent_given: true, consent_date: '2026-08-19', consent_method: null, consent_disclosure: 'AI use' },
    expectAllowed: false,
  },
  {
    name: 'consent method not one the schema permits',
    input: { consent_given: true, consent_date: '2026-08-19', consent_method: 'assumed', consent_disclosure: 'AI use' },
    expectAllowed: false,
  },
  {
    name: 'consent_given falsy-but-not-false (guards a truthiness slip)',
    input: { consent_given: 0 as unknown as boolean, consent_date: '2026-08-19', consent_method: 'email', consent_disclosure: 'AI use' },
    expectAllowed: false,
  },
  {
    name: 'consent given but disclosure is blank',
    input: { consent_given: true, consent_date: '2026-08-19', consent_method: 'email', consent_disclosure: '  ' },
    expectAllowed: false,
  },
  // Must be allowed — without this the gate could simply always refuse.
  {
    name: 'complete written consent',
    input: { consent_given: true, consent_date: '2026-08-19', consent_method: 'written', consent_disclosure: 'AI use' },
    expectAllowed: true,
  },
]

let failures = 0
for (const c of CASES) {
  const verdict = checkConsent(c.input)
  const ok = verdict.allowed === c.expectAllowed
  if (!ok) failures++
  const detail = verdict.allowed ? 'allowed' : `refused (${verdict.reason})`
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${c.name} -> ${detail}`)
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} of ${CASES.length} consent cases behaved wrongly`)
  process.exit(1)
}
console.log(`\nPASS: ${CASES.length} consent cases, ${CASES.filter((c) => !c.expectAllowed).length} refusals proven`)

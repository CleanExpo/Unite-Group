/**
 * SIMULATED fixtures for the UNI-3411 investigation engine. Not training content: no health, exposure or standard claim,
 * no real finding. Used only by tests, the Done walk and the client fixture writer (l2_values.ts). Nothing reachable
 * from service/serve.ts imports this file.
 *
 * SHAPE: 4 causes, 2 accepted, 2 steps, one unsafe option, options that rule out nothing; every text unique.
 * MAX: 5 steps, 6 causes, 4 options per step, every text at its cap (for the client layout check).
 */
import { TEXT_CAPS, type Investigation, type InvestigationOptionData, type Investigations } from './investigation'

const SOURCE = 'test fixture, not training content'

function option(id: string, step: string, points: number, rulesOut: string[], unsafe = false): InvestigationOptionData {
  return {
    id, label: `SIMULATED fixture choice ${step}-${id}`, points, rulesOut, unsafe,
    finding: `SIMULATED fixture finding ${step}-${id}.`,
    why: `SIMULATED fixture reason ${step}-${id}${unsafe ? ': acting before the cause is known costs points.' : '.'}`,
    source: `${SOURCE} (${step}-${id})`,
  }
}

export const SHAPE: Investigation = Object.freeze({
  simulated: true,
  causes: [
    { id: 'c-a', label: 'SIMULATED fixture cause A' },
    { id: 'c-b', label: 'SIMULATED fixture cause B' },
    { id: 'c-c', label: 'SIMULATED fixture cause C' },
    { id: 'c-d', label: 'SIMULATED fixture cause D' },
  ],
  steps: [
    { id: 's1', prompt: 'SIMULATED fixture step 1: what do you check first?', options: [
      option('o1', 's1', 2, ['c-c']), option('o2', 's1', 0, []), option('o3', 's1', -3, [], true)] },
    { id: 's2', prompt: 'SIMULATED fixture step 2: what do you check next?', options: [
      option('o1', 's2', 2, ['c-d']), option('o2', 's2', 1, ['c-c'])] },
  ],
  accepted: ['c-a', 'c-b'],
})

/** Pads a unique opening to exactly n characters. */
const fill = (head: string, n: number) => (head + ' ' + '.'.repeat(n)).slice(0, n)

function maxOption(id: string, step: number, points: number, rulesOut: string[], unsafe = false): InvestigationOptionData {
  const tag = `s${step}-${id}`
  return {
    id, points, rulesOut, unsafe,
    label: fill(`SIMULATED fixture MAX choice ${tag}:`, TEXT_CAPS.label),
    finding: fill(`SIMULATED fixture MAX finding ${tag}:`, TEXT_CAPS.finding),
    why: fill(`SIMULATED fixture MAX reason ${tag}:`, TEXT_CAPS.why),
    source: fill(`${SOURCE} MAX ${tag}:`, TEXT_CAPS.source),
  }
}

export const MAX: Investigation = Object.freeze({
  simulated: true,
  causes: [1, 2, 3, 4, 5, 6].map(i => ({ id: `c${i}`, label: fill(`SIMULATED fixture MAX cause ${i}:`, TEXT_CAPS.label) })),
  steps: [1, 2, 3, 4, 5].map(i => ({
    id: `s${i}`,
    prompt: fill(`SIMULATED fixture MAX step ${i}:`, TEXT_CAPS.prompt),
    options: [
      maxOption('o1', i, 3, [`c${i + 1}`]),
      maxOption('o2', i, 1, []),
      maxOption('o3', i, 0, [`c${i + 1}`]),
      maxOption('o4', i, -2, [], true),
    ],
  })),
  accepted: ['c1'],
})

/** The fixture table: SHAPE on W1 (a job with a water call), MAX on M1 (a job without one). */
export const FIXTURES: Investigations = Object.freeze({ W1: SHAPE, M1: MAX })

/**
 * UNI-3411 part 1: the investigation engine. A job may carry an investigation: competing causes that stay open, steps
 * that rule causes out, points for each choice (negative for an unsafe one), then a cause call. Pure data and judging;
 * library.ts applies it in revealJob and checkLibrary, scenario.ts in the reducer.
 *
 * Production has no investigation content yet: INVESTIGATIONS is empty, so every job's investigation is null and plays
 * exactly as at schema v8. Content arrives with the UNI-3410 research release. Tests pass the SIMULATED fixtures in
 * (investigation.fixture.ts); nothing the service starts from imports them.
 */

export interface InvestigationCause {
  readonly id: string
  readonly label: string
}

export interface InvestigationOptionData {
  readonly id: string
  readonly label: string
  /** What the player finds. A finding is a fact: a poor choice wastes time or is unsafe, it never gives false evidence. */
  readonly finding: string
  readonly rulesOut: readonly string[]
  readonly points: number
  readonly unsafe: boolean
  readonly why: string
  readonly source: string
}

export interface InvestigationStepData {
  readonly id: string
  readonly prompt: string
  readonly options: readonly InvestigationOptionData[]
}

export interface Investigation {
  /** Literal true: no investigation can be typed without the label until real content passes UNI-3410's gates. */
  readonly simulated: true
  readonly causes: readonly InvestigationCause[]
  readonly steps: readonly InvestigationStepData[]
  /** The causes the sound path leaves standing. */
  readonly accepted: readonly string[]
}

export type Investigations = Readonly<Partial<Record<string, Investigation>>>

/** Production table: empty until UNI-3410 content lands. Frozen so no code can add to it at run time. */
export const INVESTIGATIONS: Investigations = Object.freeze({})

/** Points for a right cause call. The one owner of this number. */
export const CAUSE_POINTS = 2

export const TEXT_CAPS = Object.freeze({ prompt: 160, label: 80, finding: 200, why: 240, source: 80 })

/** A step's call as the job shows it, after the step is called. */
export interface StepCall {
  readonly optionId: string
  readonly finding: string
  readonly rulesOut: readonly string[]
  readonly points: number
  readonly unsafe: boolean
  readonly why: string
  readonly source: string
}

/** A step as the job shows it: the prompt and option labels, and no answer until it is called. */
export interface InvestigationStep {
  readonly id: string
  readonly prompt: string
  readonly options: ReadonlyArray<Readonly<{ id: string; label: string }>>
  readonly call: StepCall | null
}

export interface CauseCall {
  readonly causeId: string
  readonly correct: boolean
  readonly acceptedCauses: readonly string[]
  readonly stillOpen: readonly string[]
  readonly why: string
}

export interface JobInvestigation {
  readonly causes: readonly InvestigationCause[]
  /** Cause ids not ruled out by the steps called so far, in list order. Derived by revealInvestigation. */
  readonly open: readonly string[]
  /** The steps called, plus the next one, in order; empty until the stops (and water call) are made. */
  readonly steps: readonly InvestigationStep[]
  readonly causeCall: CauseCall | null
  /** null until the first step is called; then the sum of called points, plus CAUSE_POINTS once the cause is called right. */
  readonly score: number | null
  readonly simulated: true
}

export function newJobInvestigation(x: Investigation): JobInvestigation {
  return revealInvestigation(x, { causes: [], open: [], steps: [], causeCall: null, score: null, simulated: true }, false)
}

/** The step calls a job holds, in step order. */
export function stepCalls(j: JobInvestigation): StepCall[] {
  return j.steps.flatMap(s => (s.call ? [s.call] : []))
}

export function openCauses(x: Investigation, calls: readonly StepCall[]): string[] {
  return x.causes.map(c => c.id).filter(id => !calls.some(call => call.rulesOut.includes(id)))
}

/**
 * The one rule for what an investigation shows. Steps appear only once the job is ready (stops, and the water call where
 * the job has one), one at a time, each after the one before it is called. An uncalled option shows only its label.
 */
export function revealInvestigation(x: Investigation, j: JobInvestigation, ready: boolean): JobInvestigation {
  const calls = new Map(j.steps.map(s => [s.id, s.call]))
  const steps: InvestigationStep[] = []
  if (ready) {
    for (const s of x.steps) {
      const call = calls.get(s.id) ?? null
      steps.push({ id: s.id, prompt: s.prompt, options: s.options.map(o => ({ id: o.id, label: o.label })), call })
      if (call === null) break
    }
  }
  const called = steps.flatMap(s => (s.call ? [s.call] : []))
  const sum = called.reduce((a, c) => a + c.points, 0)
  return {
    causes: x.causes.map(c => ({ id: c.id, label: c.label })),
    open: openCauses(x, called),
    steps,
    causeCall: j.causeCall,
    score: called.length === 0 ? null : sum + (j.causeCall?.correct ? CAUSE_POINTS : 0),
    simulated: true,
  }
}

export function judgeStep(option: InvestigationOptionData): StepCall {
  return {
    optionId: option.id, finding: option.finding, rulesOut: [...option.rulesOut], points: option.points, unsafe: option.unsafe,
    why: option.why, source: option.source,
  }
}

/** Any listed cause may be called. It is right when accepted. The why always names every cause still open. */
export function judgeCause(x: Investigation, open: readonly string[], causeId: string): CauseCall {
  const label = (id: string) => x.causes.find(c => c.id === id)?.label ?? id
  const correct = x.accepted.includes(causeId)
  const verdict = correct
    ? `Right: the evidence supports ${label(causeId)}.`
    : `Not supported: ${label(causeId)} is not what the evidence points to. Supported: ${x.accepted.map(label).join('; ')}.`
  return {
    causeId, correct, acceptedCauses: [...x.accepted], stillOpen: [...open],
    why: `${verdict} Not ruled out: ${open.map(label).join('; ')}.`,
  }
}

/** Load-time rules (spec V2-2). Returns the problems; checkLibrary refuses to start on any. */
export function checkInvestigation(id: string, x: Investigation): string[] {
  const p: string[] = []
  const at = (m: string) => p.push(`investigation ${id}: ${m}`)
  if ((x as { simulated: unknown }).simulated !== true) at('not marked simulated')
  const causeIds = x.causes.map(c => c.id)
  if (x.causes.length < 2 || x.causes.length > 6) at(`${x.causes.length} causes, expected 2 to 6`)
  if (new Set(causeIds).size !== causeIds.length) at('repeats a cause id')
  if (x.steps.length < 1 || x.steps.length > 5) at(`${x.steps.length} steps, expected 1 to 5`)
  if (new Set(x.steps.map(s => s.id)).size !== x.steps.length) at('repeats a step id')
  if (x.accepted.length === 0) at('accepts no cause')
  for (const a of x.accepted) if (!causeIds.includes(a)) at(`accepts unknown cause ${a}`)
  const text = (where: string, value: string, cap: number) => {
    if (!value.trim()) at(`${where} is empty`)
    if (value.length > cap) at(`${where} is ${value.length} characters, over ${cap}`)
  }
  for (const c of x.causes) text(`cause ${c.id} label`, c.label, TEXT_CAPS.label)
  for (const s of x.steps) {
    text(`${s.id} prompt`, s.prompt, TEXT_CAPS.prompt)
    if (s.options.length < 2 || s.options.length > 4) at(`${s.id} has ${s.options.length} options, expected 2 to 4`)
    if (new Set(s.options.map(o => o.id)).size !== s.options.length) at(`${s.id} repeats an option id`)
    for (const o of s.options) {
      const w = `${s.id}/${o.id}`
      text(`${w} label`, o.label, TEXT_CAPS.label)
      text(`${w} finding`, o.finding, TEXT_CAPS.finding)
      text(`${w} why`, o.why, TEXT_CAPS.why)
      text(`${w} source`, o.source, TEXT_CAPS.source)
      if (!Number.isInteger(o.points)) at(`${w} points is not a whole number`)
      for (const r of o.rulesOut) {
        if (!causeIds.includes(r)) at(`${w} rules out unknown cause ${r}`)
        // (a) a finding is a fact, so the accepted causes stay open on every path and the player is never stuck.
        if (x.accepted.includes(r)) at(`${w} rules out accepted cause ${r}`)
      }
      // (d) an unsafe choice always costs points.
      if (o.unsafe && o.points >= 0) at(`${w} is unsafe but scores ${o.points}`)
    }
    // (b) exactly one best option per step.
    const top = Math.max(...s.options.map(o => o.points))
    if (s.options.filter(o => o.points === top).length !== 1) at(`${s.id} has no single best option`)
  }
  // (c) the best option at every step leaves open exactly the accepted causes.
  if (p.length === 0) {
    const best = x.steps.map(s => judgeStep(s.options.reduce((a, b) => (b.points > a.points ? b : a))))
    const open = openCauses(x, best)
    if (open.length !== x.accepted.length || open.some(c => !x.accepted.includes(c))) at(`the best path leaves open ${open.join(', ')}, not the accepted causes`)
  }
  return p
}

/**
 * UNI-2774 slice 0: an original, deterministic, in-memory simulation.
 * This is NOT a persistence or professional-evidence service. A future trusted
 * server must rebuild from its own authenticated events, never accept a browser
 * snapshot/score as authority. No CARSI XP, credentials or entitlements are issued.
 *
 * UNI-2953 (L1): the owner's fictional business profile and home base. The service owns the address rules
 * (Australia or New Zealand only), the currency and time zone derived from the address, the five home-base
 * areas and the simulation stats (two on the business, three on the person since SP-50a-2a-1). The client renders them
 * and computes none.
 *
 * L2: the technician's first claim, a fictional water loss in a single-storey house (laundry and lounge). The service
 * owns the moisture zones, the decision card (four options, four effects each, one unsafe shortcut marked as a
 * simulation boundary and shown with its consequence), the outcome of the chosen option and the change to the business
 * stats when the claim completes. Effects are scenario data held here; a command can only name an option.
 *
 * B1 (founder 21/10/2026, "build the game"): the job builder. The home base offers two choices, the water source and the
 * time before the technician arrives, which give four jobs (JOBS). A built job asks the technician to call the water's
 * Category before any plan; the service judges the call against S500:2021 (section 2, in our own words: Category can
 * worsen with time and warmth, 1 to 2 or 3 and 2 to 3) and each job carries its own card and outcomes. enter-claim with
 * no setup is today's claim, unchanged apart from three empty fields (founder default G1).
 */
import {
  DECISIONS, houseById, judgeDecision, judgeStops, judgeWater, LIBRARY, newLibraryJob, SAFETY_STOPS, scenarioById,
  type HouseTypeId, type Library, type LibraryCategory, type LibraryJob, type SafetyStop, type ScenarioId, type WaterClass,
} from './library'
import {
  candidateById, CANDIDATES, parseStaffRoles, PLAYER_ID, PLAYER_NAME, staffById,
  type PersonEntry, type StaffRole, type Vacancy,
} from './workforce'

export type Choice = 'seek-support' | 'rush-response'
export type Stage = 'briefing' | 'consequence' | 'reflected' | 'complete'
export type Country = 'AU' | 'NZ'
export type Currency = 'AUD' | 'NZD'
export type AreaId = 'office' | 'dispatch' | 'equipment-bay' | 'vehicle-area' | 'drying-storage'
export type AddressReason = 'country-outside-au-nz' | 'region-unknown' | 'postcode-invalid'
export type ClaimStage = 'on-site' | 'decided' | 'complete'
export type ZoneId = 'laundry-floor' | 'lounge-carpet' | 'lounge-wall'
export type ZoneSurface = 'tile' | 'carpet' | 'plasterboard'
export type OptionId = 'dry-in-place' | 'lift-and-dry' | 'replace-flooring' | 'power-on-shortcut'
export type WaterSource = 'supply-hose' | 'drain-hose'
export type TimeBeforeArrival = 'same-day' | 'four-warm-days'
export type WaterCategory = 1 | 2 | 3

/** The two choices on the job builder. Every pair is one job in JOBS. */
export interface JobSetup {
  readonly waterSource: WaterSource
  readonly timeBeforeArrival: TimeBeforeArrival
}

/** The service's judgement of the technician's Category call. The client shows it and computes none of it. */
export interface CategoryCall {
  readonly called: WaterCategory
  /** The Category the job is written as. */
  readonly actual: WaterCategory
  /** Every call the job accepts as right: more than one where S500 leaves the call to judgement (founder default G2). */
  readonly accepted: readonly WaterCategory[]
  readonly correct: boolean
  readonly why: string
}

export interface Address {
  readonly line1: string
  readonly suburb: string
  readonly region: string
  readonly postcode: string
  readonly country: Country
}

export type WorldCommand = Readonly<
  { id: string; expectedRevision: number } & (
    | { type: 'decide'; choice: Choice }
    | { type: 'reflect' }
    | { type: 'complete' }
    | { type: 'create-business'; name: string; address: Address }
    | { type: 'enter-claim' }
    | { type: 'enter-claim'; setup: JobSetup }
    | { type: 'call-category'; category: WaterCategory }
    | { type: 'decide-claim'; optionId: OptionId }
    | { type: 'complete-claim' }
    | { type: 'start-job'; scenarioId: ScenarioId; houseType: HouseTypeId }
    | { type: 'call-stops'; stops: readonly SafetyStop[] }
    | { type: 'call-water'; category: LibraryCategory; waterClass: WaterClass | null }
    | { type: 'call-decision'; decisionId: string; optionId: string }
    | { type: 'finish-job' }
    | { type: 'add-person'; personId: string; roles: readonly StaffRole[] }
    | { type: 'change-roles'; personId: string; roles: readonly StaffRole[] }
    | { type: 'post-vacancy'; role: StaffRole }
    | { type: 'hire-candidate'; vacancyId: string; candidateId: string }
  )
>

export interface MoistureZone {
  readonly id: ZoneId
  readonly label: string
  readonly surface: ZoneSurface
  readonly wetAreaPercent: number
  readonly dryingProgressPercent: number
}

/** The four effects every option carries (L2 ACC-2c). Simulation values; the client shows them and sends none. */
export interface Effects {
  readonly dryingTimeHours: number
  readonly costAud: number
  readonly clientSatisfaction: number
  readonly reputation: number
}

export interface ClaimOption {
  readonly id: OptionId
  readonly label: string
  readonly effects: Effects
  /**
   * True only for the unsafe shortcut: the card marks it and shows its consequence before the choice (L2 RUL-2b). The
   * mark does not stop the claim. The choice plays out like any other: drying waits for the electrician, and completing
   * the claim moves the stats by its effects (L2 ACC-2e), so the shortcut costs reputation and credits.
   */
  readonly simulationBoundary: boolean
  /** Shown on the card before the choice. Required for the unsafe shortcut, null for every other option. */
  readonly shownConsequence: string | null
}

export interface Claim {
  readonly id: 'l2-water-loss'
  readonly title: string
  readonly site: string
  readonly lossType: 'water'
  readonly tier: 'beginner'
  readonly technician: string
  readonly feeAud: number
  readonly stage: ClaimStage
  readonly zones: readonly MoistureZone[]
  readonly options: readonly ClaimOption[]
  readonly chosenOptionId: OptionId | null
  /** What happened after the choice; null until decide-claim. */
  readonly consequence: string | null
  readonly learningOutcome: string
  readonly evidenceLevel: 'simulated'
  /** The job builder's choices; null for today's claim (enter-claim with no setup). */
  readonly setup: JobSetup | null
  /** What the technician sees and smells on arrival: the evidence for the Category call. Empty for today's claim. */
  readonly siteNotes: readonly string[]
  /** Null until call-category; always null for today's claim. */
  readonly categoryCall: CategoryCall | null
}

export interface Business {
  readonly name: string
  readonly address: Address
  readonly currency: Currency
  readonly timeZone: string
  /** The business's own values (DR-004), never combined into one number. Both 0 at L1. The person's are on Person. */
  readonly stats: Readonly<{ reputation: number; businessCredits: number }>
  /** L3: everyone in the business, the player first. Each person has one entry and one id, whatever roles they hold. */
  readonly people: readonly PersonEntry[]
  /** L3: the last vacancy posted, open or closed; null until the first. */
  readonly vacancy: Vacancy | null
}

/** One business the person has worked in. The name is a copy taken when the tenure starts, a label and not a key. */
export interface BusinessTenure {
  readonly name: string
  readonly startRevision: number
  /** Null while the tenure is open. SP-50a-2b ends one. */
  readonly endRevision: null
}

/**
 * SP-50a-2a-1 (P2, DR-004): what belongs to the player and goes with them if they leave a business. Capability, Industry
 * Contribution, credentials and hours stay at zero until SP-51; complete-claim moves the person's reputation.
 */
export interface Person {
  readonly stats: Readonly<{ capability: number; industryContribution: number; reputation: number }>
  readonly credentials: readonly never[]
  readonly hours: number
  readonly businesses: readonly BusinessTenure[]
}

export interface JobBuilder {
  readonly waterSources: ReadonlyArray<Readonly<{ id: WaterSource; label: string }>>
  readonly timesBeforeArrival: ReadonlyArray<Readonly<{ id: TimeBeforeArrival; label: string }>>
}

export interface HomeBase {
  readonly areas: ReadonlyArray<Readonly<{ id: AreaId; label: string }>>
  /** B1: the choices the entry panel offers. The client renders these and sends the ids back. */
  readonly jobBuilder: JobBuilder
  /** A1: every house and scenario the player can choose from, without the answers. */
  readonly library: Library
}

/** The wire schema version this code speaks. world.schema.json's const and title must agree (schema.test.ts). */
export const SCHEMA_VERSION = 7 as const

export interface WorldState {
  readonly schemaVersion: typeof SCHEMA_VERSION
  readonly scenarioVersion: 'capacity-pressure-v1'
  readonly source: 'simulation'
  readonly role: 'technician'
  readonly stage: Stage
  readonly revision: number
  readonly warehouse: Readonly<{ name: string; availableCapacity: number }>
  readonly consequence: Readonly<{
    kind: 'support-requested' | 'work-stopped'
    summary: string
  }> | null
  readonly progression: Readonly<{ reflections: 0 | 1; completedScenarios: 0 | 1 }>
  readonly professionalEvidence: 'not-assessed'
  readonly business: Business | null
  readonly person: Person
  readonly homeBase: HomeBase | null
  readonly claim: Claim | null
  /** A1: the library job in play, or the last one finished; null until the first start-job. */
  readonly job: LibraryJob | null
  readonly history: readonly WorldCommand[]
}

export type WorldResult =
  | { ok: true; state: WorldState; replayed: boolean }
  | { ok: false; code: 'invalid-command' | 'id-conflict' | 'stale-revision' | 'invalid-stage' | 'category-not-called' | 'category-already-called'
      | 'house-not-suited' | 'stops-not-called' | 'stops-already-called' | 'water-not-called' | 'water-already-called'
      | 'decision-already-called' | 'decisions-open' | 'person-unknown' | 'person-already-added' | 'vacancy-already-open'
      | 'vacancy-not-open' | 'no-candidates'; state: WorldState }
  | { ok: false; code: 'invalid-address'; reason: AddressReason; state: WorldState }

/** Australian states and territories with their time zones (zone names; the client shows the name, not an offset). */
const AU_REGIONS: Readonly<Record<string, string>> = Object.freeze({
  ACT: 'Australia/Sydney', NSW: 'Australia/Sydney', NT: 'Australia/Darwin', QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide', TAS: 'Australia/Hobart', VIC: 'Australia/Melbourne', WA: 'Australia/Perth',
})
/** New Zealand regions. All on Pacific/Auckland (the Chatham Islands are not a region and are out of scope). */
const NZ_REGIONS: readonly string[] = Object.freeze([
  'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay", 'Taranaki', 'Manawatu-Whanganui',
  'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland',
])
const POSTCODE = /^\d{4}$/

/** The five home-base areas every business starts with (L1 ACC-1b). Fixed by the service, rendered by the client. */
export const HOME_BASE_AREAS: HomeBase['areas'] = Object.freeze([
  Object.freeze({ id: 'office' as AreaId, label: 'Office' }),
  Object.freeze({ id: 'dispatch' as AreaId, label: 'Dispatch' }),
  Object.freeze({ id: 'equipment-bay' as AreaId, label: 'Equipment bay' }),
  Object.freeze({ id: 'vehicle-area' as AreaId, label: 'Vehicle area' }),
  Object.freeze({ id: 'drying-storage' as AreaId, label: 'Drying storage' }),
])

/** B1: the job builder's two choices, in the order the entry panel shows them. */
export const JOB_BUILDER: JobBuilder = Object.freeze({
  waterSources: Object.freeze([
    // Short: the game shows each in one picker of a play bar about 450 px wide (client UI audit, 21/10/2026).
    Object.freeze({ id: 'supply-hose' as WaterSource, label: 'Supply hose: clean water coming in' }),
    Object.freeze({ id: 'drain-hose' as WaterSource, label: 'Drain hose: used wash water going out' }),
  ]),
  timesBeforeArrival: Object.freeze([
    Object.freeze({ id: 'same-day' as TimeBeforeArrival, label: 'Found the same day' }),
    Object.freeze({ id: 'four-warm-days' as TimeBeforeArrival, label: 'Found after four warm days' }),
  ]),
})

/** L2: the claim fee the business earns; on completion businessCredits move by the fee minus the chosen option's cost. */
export const CLAIM_FEE_AUD = 3500

const OPTION_IDS: readonly OptionId[] = Object.freeze(['dry-in-place', 'lift-and-dry', 'replace-flooring', 'power-on-shortcut'])
/** The three zones of the L2 house, in the order the claim lists them. */
const ZONE_IDS: readonly ZoneId[] = Object.freeze(['laundry-floor', 'lounge-carpet', 'lounge-wall'])
const WATER_CATEGORIES: readonly WaterCategory[] = Object.freeze([1, 2, 3])

/** The decision card (L2 ACC-2c). Fictional training values, not industry prices or times. */
const CLAIM_OPTIONS: readonly ClaimOption[] = [
  {
    id: 'dry-in-place',
    label: 'Extract the water, dry the carpet in place with air movers and a dehumidifier, and take daily moisture readings',
    effects: { dryingTimeHours: 72, costAud: 1850, clientSatisfaction: 8, reputation: 6 },
    simulationBoundary: false,
    shownConsequence: null,
  },
  {
    id: 'lift-and-dry',
    label: 'Lift the carpet, discard the wet underlay, dry the subfloor and the wall, then relay the carpet on new underlay',
    effects: { dryingTimeHours: 60, costAud: 2600, clientSatisfaction: 5, reputation: 4 },
    simulationBoundary: false,
    shownConsequence: null,
  },
  {
    id: 'replace-flooring',
    label: 'Replace the carpet and underlay straight away and leave the wall to dry on its own',
    effects: { dryingTimeHours: 48, costAud: 4300, clientSatisfaction: 2, reputation: -4 },
    simulationBoundary: false,
    shownConsequence: null,
  },
  {
    id: 'power-on-shortcut',
    label: "Switch the laundry power back on yourself so the equipment can start sooner, without an electrician's check",
    effects: { dryingTimeHours: 96, costAud: 2950, clientSatisfaction: -12, reputation: -15 },
    simulationBoundary: true,
    shownConsequence: 'Simulation boundary: never restore power to a wet area yourself. Wet power points are a shock and fire risk; a licensed electrician must make the circuit safe first.',
  },
]

/** The one option on the L2 card that is an unsafe shortcut. */
const UNSAFE_OPTION_ID: OptionId = 'power-on-shortcut'

/**
 * L2 NEG-2b authoring check for a decision card. A card needs exactly four options with distinct ids; the unsafe
 * shortcut, and only it, carries the mark (simulationBoundary), and it must carry the consequence it shows; an option
 * that shows a consequence must carry the mark. The mark is bound to the option id, so a card that moves it to a safe
 * option is refused (gate review of 99984f47: a swapped mark passed). Returns the problems; an empty list means the card
 * may be served.
 */
export function checkDecisionCard(options: readonly ClaimOption[]): string[] {
  const problems: string[] = []
  if (options.length !== 4) problems.push(`the card has ${options.length} options, it needs 4`)
  if (new Set(options.map(o => o.id)).size !== options.length) problems.push('two options share an id')
  for (const o of options) {
    if (o.simulationBoundary && o.id !== UNSAFE_OPTION_ID) {
      problems.push(`${o.id}: marked as the unsafe shortcut, which is ${UNSAFE_OPTION_ID}`)
    }
    if (o.simulationBoundary && (o.shownConsequence === null || o.shownConsequence.trim() === '')) {
      problems.push(`${o.id}: unsafe shortcut without the consequence it shows`)
    }
    if (!o.simulationBoundary && o.shownConsequence !== null) {
      problems.push(`${o.id}: shows a consequence without the simulation-boundary mark`)
    }
  }
  if (!options.some(o => o.id === UNSAFE_OPTION_ID && o.simulationBoundary)) {
    problems.push(`${UNSAFE_OPTION_ID}: the unsafe shortcut is missing or not marked`)
  }
  return problems
}

// The card is checked when the module loads, so a service with a bad card never serves a claim.
const CARD_PROBLEMS = checkDecisionCard(CLAIM_OPTIONS)
if (CARD_PROBLEMS.length > 0) throw new Error(`L2 decision card refused: ${CARD_PROBLEMS.join('; ')}`)

/** What an option does to each zone (drying progress percent, keyed by zone) and what happens after the choice. */
interface Outcome {
  readonly progress: Readonly<Record<ZoneId, number>>
  readonly consequence: string
}
type Outcomes = Readonly<Record<OptionId, Outcome>>

function progress(laundryFloor: number, loungeCarpet: number, loungeWall: number): Record<ZoneId, number> {
  return { 'laundry-floor': laundryFloor, 'lounge-carpet': loungeCarpet, 'lounge-wall': loungeWall }
}

const POWER_ON_OUTCOME: Outcome = {
  progress: progress(0, 0, 0),
  consequence: 'In the simulation the job stops: the wet circuit is unsafe. An electrician makes it safe before drying can start, the job runs four days and the client loses trust.',
}

/** Today's claim (Category 1, found the same day). */
const OUTCOMES: Outcomes = {
  'dry-in-place': {
    progress: progress(100, 100, 100),
    consequence: 'The fictional site reaches its drying goal on day three. Daily readings show every zone dry, the carpet stays in place and the client keeps the room in use.',
  },
  'lift-and-dry': {
    progress: progress(100, 100, 100),
    consequence: 'The fictional site dries in two and a half days. New underlay adds cost and a second visit to relay the carpet.',
  },
  'replace-flooring': {
    progress: progress(100, 100, 40),
    consequence: 'New carpet goes down quickly, but the wall behind the laundry is still wet when the job closes. Hidden moisture is a mould risk, and the client is unhappy about the cost.',
  },
  'power-on-shortcut': POWER_ON_OUTCOME,
}

// B1 card variants. A Category 2 plan names the cleaning (S500 carpet section, our words: after Category 2 water the
// underlay is discarded and the carpet is cleaned and dried). A Category 3 plan takes the carpet and underlay out and
// cleans and checks the floor below.
const [DRY_IN_PLACE, LIFT_AND_DRY_CLEAN, REPLACE_LEAVE_WALL, POWER_ON] = [
  CLAIM_OPTIONS[0].label, 'Lift the carpet, discard the wet underlay, clean and dry the carpet, dry the subfloor and the wall, then relay the carpet on new underlay',
  CLAIM_OPTIONS[2].label, CLAIM_OPTIONS[3].label,
]
const REMOVE_ALL = 'Remove and discard the carpet and underlay, clean and check the floor below, dry the floor and the wall, then lay new flooring'

function card(rows: ReadonlyArray<readonly [OptionId, string, Effects]>): ClaimOption[] {
  return rows.map(([id, label, effects]) => {
    const unsafe = CLAIM_OPTIONS.find(o => o.id === id && o.simulationBoundary)
    return { id, label, effects, simulationBoundary: !!unsafe, shownConsequence: unsafe ? unsafe.shownConsequence : null }
  })
}
const UNSAFE_EFFECTS = CLAIM_OPTIONS[3].effects

/** Water that became Category 2 (used wash water, or clean water left warm for days). */
const CATEGORY_2_CARD = card([
  ['dry-in-place', DRY_IN_PLACE, { dryingTimeHours: 72, costAud: 1850, clientSatisfaction: -6, reputation: -8 }],
  ['lift-and-dry', LIFT_AND_DRY_CLEAN, { dryingTimeHours: 60, costAud: 2900, clientSatisfaction: 7, reputation: 6 }],
  ['replace-flooring', REPLACE_LEAVE_WALL, { dryingTimeHours: 48, costAud: 4300, clientSatisfaction: 2, reputation: -4 }],
  ['power-on-shortcut', POWER_ON, UNSAFE_EFFECTS],
])
const CATEGORY_2_OUTCOMES: Outcomes = {
  'dry-in-place': {
    progress: progress(100, 100, 100),
    consequence: 'The readings reach the drying goal on day three, but the underlay soaked in dirty water stays under the carpet and the carpet was never cleaned. A musty smell comes back within a week and the client calls you back.',
  },
  'lift-and-dry': {
    progress: progress(100, 100, 100),
    consequence: 'The wet underlay goes, the carpet is cleaned and dried, and the subfloor and wall reach the drying goal in two and a half days. The room smells clean and the client keeps the carpet.',
  },
  'replace-flooring': OUTCOMES['replace-flooring'],
  'power-on-shortcut': POWER_ON_OUTCOME,
}

/** Clean water left four warm days: Category 2 at least, 3 if it has gone bad. Both careful plans are right. */
const DEGRADED_CARD = card([
  ['dry-in-place', DRY_IN_PLACE, { dryingTimeHours: 72, costAud: 1850, clientSatisfaction: -6, reputation: -8 }],
  ['lift-and-dry', LIFT_AND_DRY_CLEAN, { dryingTimeHours: 60, costAud: 2900, clientSatisfaction: 7, reputation: 6 }],
  ['replace-flooring', REMOVE_ALL, { dryingTimeHours: 72, costAud: 4600, clientSatisfaction: 5, reputation: 5 }],
  ['power-on-shortcut', POWER_ON, UNSAFE_EFFECTS],
])
const DEGRADED_OUTCOMES: Outcomes = {
  ...CATEGORY_2_OUTCOMES,
  'replace-flooring': {
    progress: progress(100, 100, 100),
    consequence: 'Taking everything out is the cautious plan for water that sat four warm days. It costs more, and the floor below is clean, checked and dry on day three.',
  },
}

/** Used wash water left four warm days: Category 3. Only taking the carpet and underlay out is right. */
const CATEGORY_3_CARD = card([
  ['dry-in-place', DRY_IN_PLACE, { dryingTimeHours: 72, costAud: 1850, clientSatisfaction: -10, reputation: -14 }],
  ['lift-and-dry', LIFT_AND_DRY_CLEAN, { dryingTimeHours: 60, costAud: 2900, clientSatisfaction: -6, reputation: -10 }],
  ['replace-flooring', REMOVE_ALL, { dryingTimeHours: 72, costAud: 4600, clientSatisfaction: 6, reputation: 6 }],
  ['power-on-shortcut', POWER_ON, UNSAFE_EFFECTS],
])
const CATEGORY_3_OUTCOMES: Outcomes = {
  'dry-in-place': {
    progress: progress(100, 100, 100),
    consequence: 'The readings say dry, but carpet and underlay that sat in grossly contaminated water stay in the home. Drying does not remove what the water carried. The family is exposed and the client loses trust.',
  },
  'lift-and-dry': {
    progress: progress(100, 100, 100),
    consequence: 'Cleaning cannot make carpet that sat in Category 3 water safe to relay. The contamination goes back down on new underlay, and the client has to pay twice when it is found.',
  },
  'replace-flooring': {
    progress: progress(100, 100, 100),
    consequence: 'The contaminated carpet and underlay go. The floor below is cleaned and checked, the floor and wall reach the drying goal, and new flooring goes down on day three. It costs more, and it is the safe plan.',
  },
  'power-on-shortcut': POWER_ON_OUTCOME,
}

interface Job {
  readonly setup: JobSetup
  readonly title: string
  readonly siteNotes: readonly string[]
  readonly category: Readonly<{ actual: WaterCategory; accepted: readonly WaterCategory[]; why: string }>
  readonly options: readonly ClaimOption[]
  readonly outcomes: Outcomes
  readonly learningOutcome: string
}

const JOB_LEARNING = 'Read where the water came from and how long it sat before you choose a plan: the Category decides what can be saved.'

/** B1: the four jobs, one per pair of job-builder choices. Fictional training values, not industry prices or times. */
export const JOBS: readonly Job[] = [
  {
    setup: { waterSource: 'supply-hose', timeBeforeArrival: 'same-day' },
    title: 'Burst washing machine supply hose, found the same day: laundry and lounge',
    siteNotes: ['The water is clear and has no smell.', 'The client found it within hours and turned the tap off.'],
    category: { actual: 1, accepted: [1], why: 'A supply hose carries clean mains water: Category 1. It was found within hours, so it had no time to go bad.' },
    options: CLAIM_OPTIONS,
    outcomes: OUTCOMES,
    learningOutcome: JOB_LEARNING,
  },
  {
    setup: { waterSource: 'supply-hose', timeBeforeArrival: 'four-warm-days' },
    title: 'Burst washing machine supply hose, found after four warm days: laundry and lounge',
    siteNotes: ['The water started clean, but the house has been closed and warm for four days.', 'The carpet smells musty.'],
    category: { actual: 2, accepted: [2, 3], why: 'The water started clean, but four warm days let it go bad, and the smell says so. Clean water left that long is at least Category 2, and Category 3 is a fair call when it smells. Category 1 is not.' },
    options: DEGRADED_CARD,
    outcomes: DEGRADED_OUTCOMES,
    learningOutcome: JOB_LEARNING,
  },
  {
    setup: { waterSource: 'drain-hose', timeBeforeArrival: 'same-day' },
    title: 'Split washing machine drain hose, found the same day: laundry and lounge',
    siteNotes: ['The water is grey, with lint and a detergent smell.', 'The client found it within hours, mid-wash.'],
    category: { actual: 2, accepted: [2], why: 'A drain hose carries used wash water with soil, lint and detergent: Category 2 from the start, even when found quickly.' },
    options: CATEGORY_2_CARD,
    outcomes: CATEGORY_2_OUTCOMES,
    learningOutcome: JOB_LEARNING,
  },
  {
    setup: { waterSource: 'drain-hose', timeBeforeArrival: 'four-warm-days' },
    title: 'Split washing machine drain hose, found after four warm days: laundry and lounge',
    siteNotes: ['The water is grey and the carpet smells sour.', 'The house has been closed and warm for four days.'],
    category: { actual: 3, accepted: [3], why: 'Used wash water is Category 2 from the start, and four warm days turned it into Category 3.' },
    options: CATEGORY_3_CARD,
    outcomes: CATEGORY_3_OUTCOMES,
    learningOutcome: JOB_LEARNING,
  },
]

function jobFor(setup: JobSetup): Job | undefined {
  return JOBS.find(j => j.setup.waterSource === setup.waterSource && j.setup.timeBeforeArrival === setup.timeBeforeArrival)
}

/**
 * B1 authoring check for the job table, run when the module loads. Each pair of job-builder choices has exactly one job;
 * each job's card passes checkDecisionCard; each option has an outcome with a progress value for every zone; the actual
 * Category is one the job accepts. Returns the problems; an empty list means the jobs may be served.
 */
export function checkJobs(jobs: readonly Job[]): string[] {
  const problems: string[] = []
  for (const source of JOB_BUILDER.waterSources) {
    for (const time of JOB_BUILDER.timesBeforeArrival) {
      const n = jobs.filter(j => j.setup.waterSource === source.id && j.setup.timeBeforeArrival === time.id).length
      if (n !== 1) problems.push(`${source.id} / ${time.id}: ${n} jobs, it needs 1`)
    }
  }
  if (jobs.length !== JOB_BUILDER.waterSources.length * JOB_BUILDER.timesBeforeArrival.length) problems.push(`${jobs.length} jobs`)
  for (const job of jobs) {
    const name = `${job.setup.waterSource} / ${job.setup.timeBeforeArrival}`
    for (const p of checkDecisionCard(job.options)) problems.push(`${name}: ${p}`)
    for (const option of job.options) {
      const outcome = job.outcomes[option.id]
      if (!outcome) problems.push(`${name}: ${option.id} has no outcome`)
      else for (const zone of ZONE_IDS) {
        if (!Number.isInteger(outcome.progress[zone])) problems.push(`${name}: ${option.id} has no progress for ${zone}`)
      }
    }
    if (!job.category.accepted.includes(job.category.actual)) problems.push(`${name}: actual Category ${job.category.actual} is not accepted`)
    if (job.siteNotes.length === 0) problems.push(`${name}: no site notes`)
  }
  return problems
}

// The jobs are checked when the module loads, so a service with a bad job never serves one.
const JOB_PROBLEMS = checkJobs(JOBS)
if (JOB_PROBLEMS.length > 0) throw new Error(`B1 job table refused: ${JOB_PROBLEMS.join('; ')}`)

/**
 * The claim as the technician finds it on entering the site (L2 ACC-2a, ACC-2b). With no job it is today's claim; a job
 * from the builder brings its own title, site notes, card and learning outcome to the same house.
 */
function newClaim(job?: Job): Claim {
  return {
    id: 'l2-water-loss',
    title: job ? job.title : 'Burst washing machine supply hose: laundry and lounge',
    site: 'Single-storey house (fictional)',
    lossType: 'water',
    tier: 'beginner',
    technician: 'Fictional Technician',
    feeAud: CLAIM_FEE_AUD,
    stage: 'on-site',
    zones: [
      { id: 'laundry-floor', label: 'Laundry floor tiles', surface: 'tile', wetAreaPercent: 100, dryingProgressPercent: 0 },
      { id: 'lounge-carpet', label: 'Lounge carpet by the doorway', surface: 'carpet', wetAreaPercent: 45, dryingProgressPercent: 0 },
      { id: 'lounge-wall', label: 'Lounge wall behind the laundry', surface: 'plasterboard', wetAreaPercent: 30, dryingProgressPercent: 0 },
    ],
    options: (job ? job.options : CLAIM_OPTIONS).map(o => ({ ...o, effects: { ...o.effects } })),
    chosenOptionId: null,
    consequence: null,
    learningOutcome: job ? job.learningOutcome : 'Make the site safe for people first, then choose a drying plan and confirm each zone dry with readings.',
    evidenceLevel: 'simulated',
    setup: job ? { ...job.setup } : null,
    siteNotes: job ? [...job.siteNotes] : [],
    categoryCall: null,
  }
}

/** Objects this module has frozen all the way down. A frozen object not in this set may still hold writable children. */
const DEEP_FROZEN = new WeakSet<object>()

/**
 * Freezes a value and everything it holds. The one owner of the freeze rule: every world state and every value the
 * service hands out goes through it, so a field added later is frozen without anyone listing it (review of 42eae88e,
 * P1: job.decisions was writable because the old per-field freeze did not name it). It visits only objects it has not
 * deep-frozen before, so freezing the next state costs the new objects, not the whole history again.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || DEEP_FROZEN.has(value)) return value
  for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key])
  Object.freeze(value)
  DEEP_FROZEN.add(value)
  return value
}

function freezeWorld(state: WorldState): WorldState {
  return deepFreeze(state)
}

export function createWorld(): WorldState {
  return freezeWorld({
    schemaVersion: SCHEMA_VERSION,
    scenarioVersion: 'capacity-pressure-v1',
    source: 'simulation',
    role: 'technician',
    stage: 'briefing',
    revision: 0,
    warehouse: { name: 'Fictional training warehouse', availableCapacity: 100 },
    consequence: null,
    progression: { reflections: 0, completedScenarios: 0 },
    professionalEvidence: 'not-assessed',
    business: null,
    person: { stats: { capability: 0, industryContribution: 0, reputation: 0 }, credentials: [], hours: 0, businesses: [] },
    homeBase: null,
    claim: null,
    job: null,
    history: [],
  })
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && value.trim() === value
}

/** Shape only: five text fields, exact key set. Whether the address is allowed is decided by addressReason. */
function parseAddress(value: unknown): Address | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const a = value as Record<string, unknown>
  if (Object.keys(a).sort().join(',') !== 'country,line1,postcode,region,suburb') return null
  if (!text(a.line1, 120) || !text(a.suburb, 80) || !text(a.region, 40) || !text(a.postcode, 10) || !text(a.country, 2)) return null
  return { line1: a.line1, suburb: a.suburb, region: a.region, postcode: a.postcode, country: a.country as Country }
}

/** Why an address is refused, or null when it is an Australian or New Zealand address the service accepts. */
export function addressReason(address: Address): AddressReason | null {
  if (address.country !== 'AU' && address.country !== 'NZ') return 'country-outside-au-nz'
  // Own properties only: `in` also found inherited names (toString, constructor, __proto__), so those passed as regions
  // and the state took an object-valued time zone (review L1 round 1, finding 1).
  const known = address.country === 'AU' ? Object.hasOwn(AU_REGIONS, address.region) : NZ_REGIONS.includes(address.region)
  if (!known) return 'region-unknown'
  if (!POSTCODE.test(address.postcode)) return 'postcode-invalid'
  return null
}

function timeZoneFor(address: Address): string {
  return address.country === 'AU' ? AU_REGIONS[address.region] : 'Pacific/Auckland'
}

function parseSetup(value: unknown): JobSetup | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const s = value as Record<string, unknown>
  if (Object.keys(s).sort().join(',') !== 'timeBeforeArrival,waterSource') return null
  const source = JOB_BUILDER.waterSources.find(o => o.id === s.waterSource)
  const time = JOB_BUILDER.timesBeforeArrival.find(o => o.id === s.timeBeforeArrival)
  return source && time ? { waterSource: source.id, timeBeforeArrival: time.id } : null
}

function parseCommand(value: unknown): WorldCommand | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const command = value as Record<string, unknown>
  if (typeof command.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(command.id)) return null
  if (!Number.isSafeInteger(command.expectedRevision) || (command.expectedRevision as number) < 0) return null
  const keys = Object.keys(command).sort().join(',')
  const common = { id: command.id, expectedRevision: command.expectedRevision as number }
  if (command.type === 'decide' && keys === 'choice,expectedRevision,id,type' &&
      (command.choice === 'seek-support' || command.choice === 'rush-response')) {
    return { ...common, type: 'decide', choice: command.choice }
  }
  if (keys === 'expectedRevision,id,type' && (command.type === 'reflect' || command.type === 'complete')) {
    return { ...common, type: command.type }
  }
  if (command.type === 'create-business' && keys === 'address,expectedRevision,id,name,type' && text(command.name, 80)) {
    const address = parseAddress(command.address)
    if (address) return { ...common, type: 'create-business', name: command.name, address }
  }
  // Two returns: with two enter-claim shapes, TypeScript no longer narrows a union type value to one command.
  if (keys === 'expectedRevision,id,type' && command.type === 'enter-claim') return { ...common, type: 'enter-claim' }
  if (keys === 'expectedRevision,id,type' && command.type === 'complete-claim') return { ...common, type: 'complete-claim' }
  // B1: a setup names one choice per job-builder axis, both known, and nothing else.
  if (command.type === 'enter-claim' && keys === 'expectedRevision,id,setup,type') {
    const setup = parseSetup(command.setup)
    if (setup) return { ...common, type: 'enter-claim', setup }
  }
  if (command.type === 'call-category' && keys === 'category,expectedRevision,id,type' &&
      WATER_CATEGORIES.includes(command.category as WaterCategory)) {
    return { ...common, type: 'call-category', category: command.category as WaterCategory }
  }
  // A1: ids only. Whether the house suits the scenario is a rule, checked in the reducer so the refusal can say why.
  if (command.type === 'start-job' && keys === 'expectedRevision,houseType,id,scenarioId,type' &&
      typeof command.scenarioId === 'string' && typeof command.houseType === 'string' &&
      scenarioById(command.scenarioId) && houseById(command.houseType)) {
    return { ...common, type: 'start-job', scenarioId: command.scenarioId as ScenarioId, houseType: command.houseType as HouseTypeId }
  }
  // Known stops, no repeats, kept in the library's order so the canonical form does not depend on click order.
  if (command.type === 'call-stops' && keys === 'expectedRevision,id,stops,type' && Array.isArray(command.stops) &&
      command.stops.length <= SAFETY_STOPS.length && new Set(command.stops).size === command.stops.length &&
      command.stops.every(x => SAFETY_STOPS.includes(x as SafetyStop))) {
    const stops = command.stops as SafetyStop[]
    return { ...common, type: 'call-stops', stops: SAFETY_STOPS.filter(x => stops.includes(x)) }
  }
  if (command.type === 'call-water' && keys === 'category,expectedRevision,id,type,waterClass' &&
      WATER_CATEGORIES.includes(command.category as WaterCategory) &&
      (command.waterClass === null || [1, 2, 3, 4].includes(command.waterClass as number))) {
    return { ...common, type: 'call-water', category: command.category as LibraryCategory, waterClass: command.waterClass as WaterClass | null }
  }
  // A3: ids only. Whether they name a decision and an option of the job on site is checked in the reducer.
  if (command.type === 'call-decision' && keys === 'decisionId,expectedRevision,id,optionId,type' &&
      typeof command.decisionId === 'string' && typeof command.optionId === 'string') {
    return { ...common, type: 'call-decision', decisionId: command.decisionId, optionId: command.optionId }
  }
  if (keys === 'expectedRevision,id,type' && command.type === 'finish-job') return { ...common, type: 'finish-job' }
  // L3: ids and role names only. Whether the person or candidate exists is a rule, checked in the reducer. A command that
  // also carries a name or any other detail is invalid: the client never sends a person's details.
  if ((command.type === 'add-person' || command.type === 'change-roles') && keys === 'expectedRevision,id,personId,roles,type' &&
      typeof command.personId === 'string' && /^[a-z0-9-]{1,64}$/.test(command.personId)) {
    const roles = parseStaffRoles(command.roles)
    if (roles) return { ...common, type: command.type, personId: command.personId, roles }
  }
  if (command.type === 'post-vacancy' && keys === 'expectedRevision,id,role,type') {
    const roles = parseStaffRoles([command.role])
    if (roles) return { ...common, type: 'post-vacancy', role: roles[0] }
  }
  if (command.type === 'hire-candidate' && keys === 'candidateId,expectedRevision,id,type,vacancyId' &&
      typeof command.vacancyId === 'string' && typeof command.candidateId === 'string') {
    return { ...common, type: 'hire-candidate', vacancyId: command.vacancyId, candidateId: command.candidateId }
  }
  // An option id only: a command that also carries effects (or any other key) is invalid (L2 NEG-2a).
  if (command.type === 'decide-claim' && keys === 'expectedRevision,id,optionId,type' &&
      typeof command.optionId === 'string' && OPTION_IDS.includes(command.optionId as OptionId)) {
    return { ...common, type: 'decide-claim', optionId: command.optionId as OptionId }
  }
  return null
}

/** Parsed commands have a fixed key order, so their JSON text is a canonical form. */
function sameCommand(a: WorldCommand, b: WorldCommand): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** State is produced in-process by this module, not deserialised from a client. */
export function reduceWorld(state: WorldState, input: unknown): WorldResult {
  const command = parseCommand(input)
  if (!command) return { ok: false, code: 'invalid-command', state }
  const previous = state.history.find(event => event.id === command.id)
  if (previous) {
    return sameCommand(previous, command)
      ? { ok: true, state, replayed: true }
      : { ok: false, code: 'id-conflict', state }
  }
  if (command.expectedRevision !== state.revision) return { ok: false, code: 'stale-revision', state }

  let next: WorldState
  if (command.type === 'decide' && state.stage === 'briefing') {
    const supported = command.choice === 'seek-support'
    next = {
      ...state,
      stage: 'consequence',
      warehouse: { ...state.warehouse, availableCapacity: supported ? 60 : 20 },
      consequence: supported
        ? { kind: 'support-requested', summary: 'The fictional response waits for qualified support. Capacity is reserved and the customer receives an honest delay.' }
        : { kind: 'work-stopped', summary: 'The fictional response is stopped because site risks and support were not confirmed. Rework consumes capacity; rushing did not complete the job.' },
    }
  } else if (command.type === 'reflect' && state.stage === 'consequence') {
    next = { ...state, stage: 'reflected', progression: { ...state.progression, reflections: 1 } }
  } else if (command.type === 'complete' && state.stage === 'reflected') {
    next = { ...state, stage: 'complete', progression: { ...state.progression, completedScenarios: 1 } }
  } else if (command.type === 'create-business') {
    // The address rule is checked before "already exists", so a refused address is always reported as such (L1 NEG-1).
    const reason = addressReason(command.address)
    if (reason) return { ok: false, code: 'invalid-address', reason, state }
    if (state.business) return { ok: false, code: 'invalid-stage', state }
    next = {
      ...state,
      business: {
        name: command.name,
        address: { ...command.address },
        currency: command.address.country === 'AU' ? 'AUD' : 'NZD',
        timeZone: timeZoneFor(command.address),
        stats: { reputation: 0, businessCredits: 0 },
        people: [{ id: PLAYER_ID, name: PLAYER_NAME, roles: ['owner'], progression: null }],
        vacancy: null,
      },
      // startRevision is the revision this command produces: the shared tail below writes state.revision + 1.
      person: {
        ...state.person,
        businesses: [...state.person.businesses, { name: command.name, startRevision: state.revision + 1, endRevision: null }],
      },
      homeBase: { areas: HOME_BASE_AREAS, jobBuilder: JOB_BUILDER, library: LIBRARY },
    }
  } else if (command.type === 'enter-claim' && !('setup' in command) && state.business && !state.claim &&
      state.job?.stage !== 'on-site') {
    next = { ...state, claim: newClaim() }
  } else if (command.type === 'enter-claim' && 'setup' in command && state.business &&
      (!state.claim || state.claim.stage === 'complete') && state.job?.stage !== 'on-site') {
    // A1: no L2 claim while a library job is on site, as start-job refuses while a claim is in play.
    // A built job may follow a completed claim, so a person can play the next job; today's claim stays one per world.
    const job = jobFor(command.setup)
    if (!job) return { ok: false, code: 'invalid-command', state }
    next = { ...state, claim: newClaim(job) }
  } else if (command.type === 'call-category' && state.claim?.stage === 'on-site' && state.claim.setup) {
    if (state.claim.categoryCall) return { ok: false, code: 'category-already-called', state }
    const job = jobFor(state.claim.setup)
    if (!job) return { ok: false, code: 'invalid-stage', state }
    const correct = job.category.accepted.includes(command.category)
    const verdict = correct
      ? `Right: you called Category ${command.category}.`
      : command.category < job.category.actual
        ? `Too low: you called Category ${command.category}. A call that is too low dries contaminated material in place, which puts people at risk.`
        : `Too high: you called Category ${command.category}. A call that is too high throws out material that could be saved, at the client's cost.`
    next = {
      ...state,
      claim: {
        ...state.claim,
        categoryCall: {
          called: command.category, actual: job.category.actual, accepted: [...job.category.accepted], correct,
          why: `${verdict} ${job.category.why}`,
        },
      },
    }
  } else if (command.type === 'decide-claim' && state.claim?.stage === 'on-site') {
    // A built job takes no plan until the Category is called (B1); today's claim has no call to make.
    if (state.claim.setup && !state.claim.categoryCall) return { ok: false, code: 'category-not-called', state }
    const job = state.claim.setup ? jobFor(state.claim.setup) : undefined
    const outcome = (job ? job.outcomes : OUTCOMES)[command.optionId]
    next = {
      ...state,
      claim: {
        ...state.claim,
        stage: 'decided',
        chosenOptionId: command.optionId,
        consequence: outcome.consequence,
        zones: state.claim.zones.map(zone => ({ ...zone, dryingProgressPercent: outcome.progress[zone.id] })),
      },
    }
  } else if (command.type === 'complete-claim' && state.claim?.stage === 'decided' && state.business) {
    const chosen = state.claim.options.find(o => o.id === state.claim?.chosenOptionId)
    if (!chosen) return { ok: false, code: 'invalid-stage', state }
    const stats = state.business.stats
    next = {
      ...state,
      claim: { ...state.claim, stage: 'complete' },
      business: {
        ...state.business,
        address: { ...state.business.address },
        stats: {
          ...stats,
          reputation: stats.reputation + chosen.effects.reputation,
          businessCredits: stats.businessCredits + state.claim.feeAud - chosen.effects.costAud,
        },
      },
      // The same effect moves the person's reputation, from the person's own previous value (DR-004).
      person: {
        ...state.person,
        stats: { ...state.person.stats, reputation: state.person.stats.reputation + chosen.effects.reputation },
      },
    }
  } else if (command.type === 'start-job' && state.business && state.job?.stage !== 'on-site' &&
      (!state.claim || state.claim.stage === 'complete')) {
    // A1: one job at a time, never while an L2 claim is in play.
    const scenario = scenarioById(command.scenarioId)
    const house = houseById(command.houseType)
    if (!scenario || !house) return { ok: false, code: 'invalid-command', state }
    if (!scenario.houses.includes(house.id)) return { ok: false, code: 'house-not-suited', state }
    next = { ...state, job: newLibraryJob(scenario, house) }
  } else if (command.type === 'call-stops' && state.job?.stage === 'on-site') {
    if (state.job.stopsCall) return { ok: false, code: 'stops-already-called', state }
    const scenario = scenarioById(state.job.scenarioId)
    const house = houseById(state.job.houseType)
    if (!scenario || !house) return { ok: false, code: 'invalid-stage', state }
    next = { ...state, job: { ...state.job, stopsCall: judgeStops(scenario, house, command.stops) } }
  } else if (command.type === 'call-water' && state.job?.stage === 'on-site' && state.job.needsWaterCall) {
    // Safety first: no water call until the stops are called.
    if (!state.job.stopsCall) return { ok: false, code: 'stops-not-called', state }
    if (state.job.waterCall) return { ok: false, code: 'water-already-called', state }
    const answer = scenarioById(state.job.scenarioId)?.water
    if (!answer) return { ok: false, code: 'invalid-stage', state }
    // A job with no Class to call takes waterClass null, and a job with one takes a number.
    if ((answer.classes === null) !== (command.waterClass === null)) return { ok: false, code: 'invalid-command', state }
    next = { ...state, job: { ...state.job, waterCall: judgeWater(answer, command.category, command.waterClass) } }
  } else if (command.type === 'call-decision' && state.job?.stage === 'on-site') {
    // A3: the job's decisions come after the safety stops and the water call, in any order, each once.
    if (!state.job.stopsCall) return { ok: false, code: 'stops-not-called', state }
    if (state.job.needsWaterCall && !state.job.waterCall) return { ok: false, code: 'water-not-called', state }
    const decision = DECISIONS[state.job.scenarioId]?.find(x => x.id === command.decisionId)
    if (!decision || !decision.options.some(o => o.id === command.optionId)) return { ok: false, code: 'invalid-command', state }
    if (state.job.decisions.find(x => x.id === decision.id)?.call) return { ok: false, code: 'decision-already-called', state }
    const call = judgeDecision(decision, command.optionId)
    next = { ...state, job: { ...state.job, decisions: state.job.decisions.map(x => x.id === decision.id ? { ...x, call } : x) } }
  } else if (command.type === 'add-person' && state.business) {
    const staff = staffById(command.personId)
    if (!staff) return { ok: false, code: 'person-unknown', state }
    if (state.business.people.some(p => p.id === staff.id)) return { ok: false, code: 'person-already-added', state }
    next = withPeople(state, [...state.business.people,
      { id: staff.id, name: staff.name, roles: [...command.roles], progression: staff.progression }], state.business.vacancy)
  } else if (command.type === 'change-roles' && state.business) {
    // The owner's own role is not changed at L3. Only the roles change; id, name and progression are kept (RUL-3a).
    if (command.personId === PLAYER_ID || !state.business.people.some(p => p.id === command.personId)) {
      return { ok: false, code: 'person-unknown', state }
    }
    next = withPeople(state, state.business.people.map(p => p.id === command.personId ? { ...p, roles: [...command.roles] } : p),
      state.business.vacancy)
  } else if (command.type === 'post-vacancy' && state.business) {
    if (state.business.vacancy?.status === 'open') return { ok: false, code: 'vacancy-already-open', state }
    const people = state.business.people
    const candidates = CANDIDATES[command.role].filter(c => !people.some(p => p.id === c.id))
      .map(c => ({ id: c.id, name: c.name, summary: c.summary }))
    if (candidates.length === 0) return { ok: false, code: 'no-candidates', state }
    next = withPeople(state, people,
      { id: `vacancy-${state.revision + 1}`, role: command.role, status: 'open', candidates, hiredId: null })
  } else if (command.type === 'hire-candidate' && state.business) {
    const vacancy = state.business.vacancy
    if (!vacancy || vacancy.status !== 'open' || vacancy.id !== command.vacancyId) return { ok: false, code: 'vacancy-not-open', state }
    const listed = vacancy.candidates.find(c => c.id === command.candidateId)
    const candidate = listed && candidateById(listed.id)
    if (!candidate) return { ok: false, code: 'person-unknown', state }
    next = withPeople(state, [...state.business.people,
      { id: candidate.id, name: candidate.name, roles: [vacancy.role], progression: candidate.progression }],
      { ...vacancy, status: 'closed', hiredId: candidate.id })
  } else if (command.type === 'finish-job' && state.job?.stage === 'on-site') {
    if (!state.job.stopsCall) return { ok: false, code: 'stops-not-called', state }
    if (state.job.needsWaterCall && !state.job.waterCall) return { ok: false, code: 'water-not-called', state }
    if (state.job.decisions.some(x => !x.call)) return { ok: false, code: 'decisions-open', state }
    next = { ...state, job: { ...state.job, stage: 'complete' } }
  } else {
    return { ok: false, code: 'invalid-stage', state }
  }
  return {
    ok: true,
    replayed: false,
    state: freezeWorld({
      ...next,
      source: 'simulation',
      professionalEvidence: 'not-assessed',
      revision: state.revision + 1,
      history: [...state.history, command],
    }),
  }
}

/** A copy of the state with the business's people and vacancy replaced. Address and stats are copied, not shared. */
function withPeople(state: WorldState, people: readonly PersonEntry[], vacancy: Vacancy | null): WorldState {
  const business = state.business as Business
  return {
    ...state,
    business: {
      ...business,
      address: { ...business.address },
      stats: { ...business.stats },
      people: people.map(p => ({ ...p, roles: [...p.roles] })),
      vacancy: vacancy && { ...vacancy, candidates: vacancy.candidates.map(c => ({ ...c })) },
    },
  }
}

/** Bounded replay of a command list from outside the service, useful to test renderer-independent behaviour. */
export function replayWorld(commands: readonly unknown[]): WorldResult {
  if (commands.length > 256) return { ok: false, code: 'invalid-command', state: createWorld() }
  return replayLog(commands)
}

/**
 * Unbounded replay of an accepted-command log. The service rebuilds with this, so the replay never refuses a log the
 * service accepted; the 256 bound belongs only to replayWorld's untrusted input.
 */
export function replayLog(commands: readonly unknown[]): WorldResult {
  let state = createWorld()
  for (const command of commands) {
    const result = reduceWorld(state, command)
    if (!result.ok) return result
    state = result.state
  }
  return { ok: true, state, replayed: false }
}

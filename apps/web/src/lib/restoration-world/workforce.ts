/**
 * L3 (founder approved 16/11/2026, docs/checks/L3-exact-checks.md in the Restoration World repo): the business's people,
 * their roles, the fictional staff the owner may add, the fictional candidates a vacancy lists, and each person's
 * restricted employment record. Every person and candidate here is fictional.
 *
 * Data only. What a command does is in scenario.ts; who may send it (the permission table) is in service/world-service.ts.
 * The employment record is never part of the world state: the service builds it on a permitted read only.
 */

export type Role = 'owner' | 'senior-technician' | 'administrator'
export type StaffRole = Exclude<Role, 'owner'>

/** Every role, in the order a person's roles are always listed. */
export const ROLES: readonly Role[] = Object.freeze(['owner', 'senior-technician', 'administrator'])
/** The roles the owner may give. There is one owner, the player, and the role is not given to anyone else at L3. */
export const STAFF_ROLES: readonly StaffRole[] = Object.freeze(['senior-technician', 'administrator'])

/** The player's own entry in the people list. Their progression is the world's `person` record (DR-004), not a copy. */
export const PLAYER_ID = 'player'
export const PLAYER_NAME = 'You'

/** What belongs to a person and goes with them (DR-004). A role change never touches it (L3 RUL-3a). */
export interface Progression {
  readonly stats: Readonly<{ capability: number; industryContribution: number; reputation: number }>
  readonly credentials: readonly string[]
  readonly hours: number
}

export interface PersonEntry {
  readonly id: string
  readonly name: string
  readonly roles: readonly Role[]
  /** Null only for the player, whose progression is the world's `person` record. */
  readonly progression: Progression | null
}

export interface Candidate {
  readonly id: string
  readonly name: string
  readonly summary: string
}

export interface Vacancy {
  readonly id: string
  readonly role: StaffRole
  readonly status: 'open' | 'closed'
  readonly candidates: readonly Candidate[]
  readonly hiredId: string | null
}

/** Restricted: returned only to a role the permission table allows. No dollar figure, a fictional pay level label only. */
export interface EmploymentRecord {
  readonly personId: string
  readonly name: string
  readonly roles: readonly Role[]
  readonly startDate: string
  readonly payLevel: string
}

interface Profile {
  readonly id: string
  readonly name: string
  readonly summary: string
  readonly progression: Progression
  readonly startDate: string
  readonly payLevel: string
}

function profile(id: string, name: string, summary: string, stats: [number, number, number], credentials: string[], hours: number,
  startDate: string, payLevel: string): Profile {
  const [capability, industryContribution, reputation] = stats
  return Object.freeze({
    id, name, summary, startDate, payLevel,
    progression: Object.freeze({
      stats: Object.freeze({ capability, industryContribution, reputation }),
      credentials: Object.freeze(credentials),
      hours,
    }),
  })
}

/** The two fictional people the owner can add (L3 ACC-3a). Their progression is not zero, so a reset would show (RUL-3a). */
export const STAFF: readonly Profile[] = Object.freeze([
  profile('riley-okafor', 'Riley Okafor', 'Fictional technician with two years of drying work.', [2, 0, 1],
    ['Fictional training record: water damage basics'], 640, '03/02/2025', 'Level 4 (fictional)'),
  profile('jordan-pike', 'Jordan Pike', 'Fictional office lead who also holds site experience.', [3, 1, 2],
    ['Fictional training record: office systems'], 1200, '14/07/2024', 'Level 3 (fictional)'),
])

/** Fictional candidates, by the role a vacancy is for (L3 ACC-3d). The client never sends a candidate's details. */
export const CANDIDATES: Readonly<Record<StaffRole, readonly Profile[]>> = Object.freeze({
  'senior-technician': Object.freeze([
    profile('mia-tran', 'Mia Tran', 'Fictional: five years drying homes after storms.', [4, 1, 2],
      ['Fictional training record: structural drying'], 2400, '01/12/2026', 'Level 4 (fictional)'),
    profile('leo-hart', 'Leo Hart', 'Fictional: three years on carpet and contents work.', [2, 0, 1],
      ['Fictional training record: carpet restoration'], 1500, '08/12/2026', 'Level 3 (fictional)'),
    profile('ava-nolan', 'Ava Nolan', 'Fictional: a new starter with a trade background.', [1, 0, 0],
      [], 300, '15/12/2026', 'Level 2 (fictional)'),
  ]),
  administrator: Object.freeze([
    profile('sam-ellis', 'Sam Ellis', 'Fictional: four years running a trade office.', [2, 1, 1],
      ['Fictional training record: job scheduling'], 1800, '01/12/2026', 'Level 3 (fictional)'),
    profile('noor-haddad', 'Noor Haddad', 'Fictional: two years in insurance claims support.', [1, 1, 0],
      [], 900, '08/12/2026', 'Level 2 (fictional)'),
  ]),
})

const PLAYER_RECORD = Object.freeze({ startDate: 'Founded the business', payLevel: 'Owner: no pay level' })

export function staffById(id: string): Profile | undefined {
  return STAFF.find(p => p.id === id)
}

export function candidateById(id: string): Profile | undefined {
  return STAFF_ROLES.flatMap(role => CANDIDATES[role]).find(p => p.id === id)
}

/** Roles as the service always lists them: known staff roles only, each once, in ROLES order, at least one. Null otherwise. */
export function parseStaffRoles(value: unknown): StaffRole[] | null {
  if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length) return null
  if (!value.every(r => STAFF_ROLES.includes(r as StaffRole))) return null
  return STAFF_ROLES.filter(r => value.includes(r))
}

/** The restricted record for one person in the list, or null when there is no such person. */
export function employmentRecord(people: readonly PersonEntry[], personId: string): EmploymentRecord | null {
  const entry = people.find(p => p.id === personId)
  if (!entry) return null
  const source = entry.id === PLAYER_ID ? PLAYER_RECORD : staffById(entry.id) ?? candidateById(entry.id)
  if (!source) return null
  return Object.freeze({ personId: entry.id, name: entry.name, roles: Object.freeze([...entry.roles]),
    startDate: source.startDate, payLevel: source.payLevel })
}

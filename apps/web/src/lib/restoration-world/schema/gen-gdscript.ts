/**
 * Generate GDScript wire types from world.schema.json.
 *   tsx src/lib/restoration-world/schema/gen-gdscript.ts <out.gd>
 * The output carries the schema's SHA-256. The Godot client's check fails if the two differ (stale types).
 * Values only: no rules are generated. The client uses these to build commands and read state.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ACTOR_HEADER } from '../service/http-server'
import { LOCAL_TEST_IDENTITY } from '../service/world-service'

const here = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(here, 'world.schema.json')

export function schemaSha256(text: string): string {
  // Normalise line endings so the hash is the same on Windows and Linux checkouts.
  return createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
}

function constName(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
}

export function generate(schemaText: string): string {
  const schema = JSON.parse(schemaText) as {
    $defs: Record<string, { enum?: unknown[]; required?: string[]; properties?: Record<string, { const?: unknown }> }>
  }
  const defs = schema.$defs
  const versionPath = '$defs.WorldState.properties.schemaVersion.const'
  const version = defs.WorldState?.properties?.schemaVersion?.const
  if (!Number.isInteger(version)) {
    const found = version === undefined ? 'absent' : `got ${JSON.stringify(version)} (${typeof version})`
    throw new Error(`${versionPath} must be an integer: ${found}`)
  }
  const lines: string[] = []
  lines.push('# GENERATED from apps/web/src/lib/restoration-world/schema/world.schema.json. Do not edit.')
  lines.push('# Values only. Rules live in the service (scenario.ts); the client owns none.')
  lines.push('class_name RWTypes')
  lines.push('extends RefCounted')
  lines.push('')
  lines.push(`const SCHEMA_SHA256 := "${schemaSha256(schemaText)}"`)
  lines.push(`const SCHEMA_VERSION := ${version}`)
  lines.push(`const ACTOR_HEADER := "${ACTOR_HEADER}"`)
  lines.push(`const LOCAL_TEST_IDENTITY_ID := "${LOCAL_TEST_IDENTITY.id}"`)
  lines.push('')
  for (const name of ['Stage', 'Choice', 'CommandType', 'ResultCode', 'ServiceCode', 'DenialReason', 'AddressReason', 'ConsequenceKind',
    'ServiceMode', 'Country', 'Currency', 'AreaId', 'ClaimStage', 'ZoneId', 'ZoneSurface', 'OptionId', 'WaterSource', 'TimeBeforeArrival',
    'HouseTypeId', 'ScenarioId', 'ScenarioFamily', 'SafetyStop', 'JobStage', 'WaterCallKind', 'Role', 'StaffRole', 'L3Action', 'VacancyStatus']) {
    const values = (defs[name].enum ?? []) as string[]
    for (const value of values) lines.push(`const ${constName(name)}_${constName(value)} := "${value}"`)
    lines.push(`const ${constName(name)}_ALL: Array[String] = [${values.map(v => `"${v}"`).join(', ')}]`)
    lines.push('')
  }
  // Water Categories are numbers on the wire; Godot reads JSON numbers as floats, so callers compare with int().
  const categories = (defs.WaterCategory?.enum ?? []) as unknown[]
  if (categories.length === 0 || !categories.every(Number.isInteger)) throw new Error('$defs.WaterCategory.enum must list whole numbers')
  lines.push(`const WATERCATEGORY_ALL: Array[int] = [${categories.join(', ')}]`)
  const classes = (defs.WaterClass?.enum ?? []) as unknown[]
  if (classes.length === 0 || !classes.every(Number.isInteger)) throw new Error('$defs.WaterClass.enum must list whole numbers')
  lines.push(`const WATERCLASS_ALL: Array[int] = [${classes.join(', ')}]`)
  lines.push('')
  const required = (defs.WorldState.required ?? []) as string[]
  lines.push(`const WORLD_STATE_KEYS: Array[String] = [${required.map(v => `"${v}"`).join(', ')}]`)
  lines.push('')
  lines.push('static func decide(id: String, expected_revision: int, choice: String) -> Dictionary:')
  lines.push('\tassert(CHOICE_ALL.has(choice))')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_DECIDE, "choice": choice}')
  lines.push('')
  lines.push('static func reflect(id: String, expected_revision: int) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_REFLECT}')
  lines.push('')
  lines.push('static func complete(id: String, expected_revision: int) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_COMPLETE}')
  lines.push('')
  lines.push('## address: {"line1", "suburb", "region", "postcode", "country"}. The service decides whether it is allowed.')
  lines.push('static func create_business(id: String, expected_revision: int, name: String, address: Dictionary) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CREATE_BUSINESS, "name": name, "address": address}')
  lines.push('')
  lines.push('static func enter_claim(id: String, expected_revision: int) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_ENTER_CLAIM}')
  lines.push('')
  lines.push('## B1: a job from the job builder. The service picks the job for this pair of choices.')
  lines.push('static func enter_job(id: String, expected_revision: int, water_source: String, time_before_arrival: String) -> Dictionary:')
  lines.push('\tassert(WATERSOURCE_ALL.has(water_source) and TIMEBEFOREARRIVAL_ALL.has(time_before_arrival))')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_ENTER_CLAIM,')
  lines.push('\t\t"setup": {"waterSource": water_source, "timeBeforeArrival": time_before_arrival}}')
  lines.push('')
  lines.push('## B1: the technician\'s Category call. The service judges it.')
  lines.push('static func call_category(id: String, expected_revision: int, category: int) -> Dictionary:')
  lines.push('\tassert(WATERCATEGORY_ALL.has(category))')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CALL_CATEGORY, "category": category}')
  lines.push('')
  lines.push('## The command names an option only. Its effects live in the service (L2 NEG-2a).')
  lines.push('static func decide_claim(id: String, expected_revision: int, option_id: String) -> Dictionary:')
  lines.push('\tassert(OPTIONID_ALL.has(option_id))')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_DECIDE_CLAIM, "optionId": option_id}')
  lines.push('')
  lines.push('static func complete_claim(id: String, expected_revision: int) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_COMPLETE_CLAIM}')
  lines.push('')
  lines.push('## A1: a library job, one scenario on one house. The service refuses a house that does not suit the scenario.')
  lines.push('static func start_job(id: String, expected_revision: int, scenario_id: String, house_type: String) -> Dictionary:')
  lines.push('\tassert(SCENARIOID_ALL.has(scenario_id) and HOUSETYPEID_ALL.has(house_type))')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_START_JOB, "scenarioId": scenario_id, "houseType": house_type}')
  lines.push('')
  lines.push('## A1: the safety stops called before entry. The service judges them.')
  lines.push('static func call_stops(id: String, expected_revision: int, stops: Array) -> Dictionary:')
  lines.push('\tfor s in stops:')
  lines.push('\t\tassert(SAFETYSTOP_ALL.has(String(s)))')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CALL_STOPS, "stops": stops.duplicate()}')
  lines.push('')
  lines.push('## A1: the water call. water_class is null when the job has no Class to call.')
  lines.push('static func call_water(id: String, expected_revision: int, category: int, water_class: Variant) -> Dictionary:')
  lines.push('\tassert(WATERCATEGORY_ALL.has(category) and (water_class == null or WATERCLASS_ALL.has(int(water_class))))')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CALL_WATER, "category": category, "waterClass": water_class}')
  lines.push('')
  lines.push('## A3: one decision on the job card. The ids come from the job the service sent; the service judges the call.')
  lines.push('static func call_decision(id: String, expected_revision: int, decision_id: String, option_id: String) -> Dictionary:')
  lines.push('\tassert(decision_id != "" and option_id != "")')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CALL_DECISION, "decisionId": decision_id, "optionId": option_id}')
  lines.push('')
  lines.push('## UNI-3411: one investigation step. The ids come from the job the service sent; the service judges the call.')
  lines.push('static func call_step(id: String, expected_revision: int, step_id: String, option_id: String) -> Dictionary:')
  lines.push('\tassert(step_id != "" and option_id != "")')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CALL_STEP, "stepId": step_id, "optionId": option_id}')
  lines.push('')
  lines.push('## UNI-3411: the cause call, after the last step. The service judges it.')
  lines.push('static func call_cause(id: String, expected_revision: int, cause_id: String) -> Dictionary:')
  lines.push('\tassert(cause_id != "")')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CALL_CAUSE, "causeId": cause_id}')
  lines.push('')
  lines.push('static func finish_job(id: String, expected_revision: int) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_FINISH_JOB}')
  lines.push('')
  lines.push('# L3: ids and role names only. The service holds every person, candidate and record.')
  lines.push('static func add_person(id: String, expected_revision: int, person_id: String, roles: Array) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_ADD_PERSON, "personId": person_id, "roles": roles.duplicate()}')
  lines.push('')
  lines.push('static func change_roles(id: String, expected_revision: int, person_id: String, roles: Array) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_CHANGE_ROLES, "personId": person_id, "roles": roles.duplicate()}')
  lines.push('')
  lines.push('static func post_vacancy(id: String, expected_revision: int, role: String) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_POST_VACANCY, "role": role}')
  lines.push('')
  lines.push('static func hire_candidate(id: String, expected_revision: int, vacancy_id: String, candidate_id: String) -> Dictionary:')
  lines.push('\treturn {"id": id, "expectedRevision": expected_revision, "type": COMMANDTYPE_HIRE_CANDIDATE, "vacancyId": vacancy_id, "candidateId": candidate_id}')
  lines.push('')
  lines.push('## True when a state dictionary from the service has exactly the schema keys.')
  lines.push('static func is_world_state(value: Variant) -> bool:')
  lines.push('\tif typeof(value) != TYPE_DICTIONARY:')
  lines.push('\t\treturn false')
  lines.push('\tvar keys: Array = (value as Dictionary).keys()')
  lines.push('\tif keys.size() != WORLD_STATE_KEYS.size():')
  lines.push('\t\treturn false')
  lines.push('\tfor key in WORLD_STATE_KEYS:')
  lines.push('\t\tif not (value as Dictionary).has(key):')
  lines.push('\t\t\treturn false')
  lines.push('\treturn STAGE_ALL.has(String((value as Dictionary)["stage"]))')
  lines.push('')
  return lines.join('\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = process.argv[2]
  if (!out) {
    process.stderr.write('usage: gen-gdscript.ts <out.gd>\n')
    process.exit(2)
  }
  writeFileSync(out, generate(readFileSync(schemaPath, 'utf8')), 'utf8')
  process.stdout.write(`wrote ${out}\n`)
}

/**
 * A1 scenario library (founder, 21/10/2026: about 10 Australian house styles, every catalogue scenario, the player
 * chooses). Houses and scenarios are data. Every scenario plays at triage: the safety stops before entry, then the water
 * Category and Class where the scenario has water. Answers come only from the catalogue rows (workflow wf_6ec7c8c4-998,
 * section 3 and 4, copied to session-artifacts/2026-10-21-d2fd6200/house-library/scenario-catalogue.md) and the house
 * research (house-library/house-styles.md). Every value is indicative until checked against a named source.
 */

export type HouseTypeId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'T9' | 'T10'
export type ScenarioFamily =
  | 'water' | 'water-mould' | 'mould' | 'fire' | 'crime-scene' | 'biohazard'
  | 'storm' | 'sewage' | 'hoarding' | 'clandestine-lab' | 'asbestos'
export type SafetyStop = 'ELEC' | 'STRUC' | 'ASB' | 'LEAD' | 'PPE' | 'HBV' | 'TRADE' | 'POLICE' | 'WASTE'
export type WaterClass = 1 | 2 | 3 | 4
export type LibraryCategory = 1 | 2 | 3

export interface HouseType {
  readonly id: HouseTypeId
  readonly name: string
  readonly era: string
  /** One line each, shown in the briefing so the player can reason about hazards from the build. */
  readonly floor: string
  readonly walls: string
  readonly lining: string
  readonly roof: string
  readonly storeys: string
  /** Built before 1990: asbestos is presumed until tested (catalogue section 4). */
  readonly asbestosPresumed: boolean
  /** Built mostly before 1970: older painted surfaces may hold lead (catalogue section 4, AS 4361.1). */
  readonly leadPaintPresumed: boolean
  readonly model: HouseModel
}

export type WallFinish = 'brick' | 'weatherboard' | 'fibro' | 'concrete'
export type RoofForm = 'hip' | 'gable' | 'flat'
export type RoofFinish = 'tile' | 'iron' | 'slate' | 'membrane'

/**
 * A2: the numbers the client builds the house in 3D from (RUL-1: the client owns no numbers). Footprints sit on the
 * room kit's 2 m grid. `sources` names the research row (house-library/house-styles.md) behind each number; every other
 * number is a typical value marked UNV (unverified) until a named source checks it.
 */
export interface HouseModel {
  readonly widthM: number
  readonly depthM: number
  /** Ground to the top of the ground floor; 0 for a slab on ground. */
  readonly floorHeightM: number
  readonly storeys: number
  readonly wallFinish: WallFinish
  readonly roofForm: RoofForm
  readonly roofPitchDeg: number
  readonly roofFinish: RoofFinish
  /** A verandah or porch across the front. */
  readonly verandah: boolean
  /** Shares party walls with the neighbours (a terrace row). */
  readonly attached: boolean
  /** A parapet wall stands above the roof at the front (all round on a flat roof). */
  readonly parapet: boolean
  readonly sources: string
}

/** The one-line reason for each stop, shown when the player misses it (catalogue section 4). */
export const STOP_LABELS: Readonly<Record<SafetyStop, Readonly<{ label: string; why: string }>>> = Object.freeze({
  ELEC: { label: 'Electrical isolation', why: 'No re-energising or touching wet or damaged circuits until a licensed electrician clears them.' },
  STRUC: { label: 'Structural check', why: 'Wet or burnt ceilings, floors and roofs can fail; treat the load path as unknown until assessed.' },
  ASB: { label: 'Asbestos presumed', why: 'A building from before 1990 is presumed to contain asbestos until tested; do not cut, break or sand.' },
  LEAD: { label: 'Lead paint presumed', why: 'Older painted surfaces may contain lead; do not sand or strip them without controls.' },
  PPE: { label: 'PPE matched to the hazard', why: 'The respirator, gloves and suit must match the hazard on this job.' },
  HBV: { label: 'Blood work: hepatitis B vaccination', why: 'Blood and body fluids need vaccinated workers and bloodborne-virus controls.' },
  TRADE: { label: 'Licensed trade first', why: 'Part of this job is licensed work (plumber, electrician, gas fitter, waterproofer, HVAC or flue); it is not yours.' },
  POLICE: { label: 'Police release', why: 'Never enter before the police have released the scene.' },
  WASTE: { label: 'Waste classified', why: 'This waste is classified under state EPA rules and cannot go in a skip.' },
})
export const SAFETY_STOPS: readonly SafetyStop[] = Object.freeze(Object.keys(STOP_LABELS) as SafetyStop[])

/** Ten house styles. Build lines are the research file's typical values; thicknesses there are mostly unsourced. */
export const HOUSE_TYPES: readonly HouseType[] = Object.freeze([
  { id: 'T1', name: 'Slab-on-ground brick veneer project home', era: '1990 to now',
    floor: 'Concrete slab on ground', walls: 'Brick veneer: 110 mm brick, cavity, wall wrap, timber stud with batts',
    lining: 'Plasterboard; tiled wet areas on a membrane', roof: 'Concrete tile or steel sheet', storeys: '1 or 2',
    asbestosPresumed: false, leadPaintPresumed: false,
    model: { widthM: 12, depthM: 10, floorHeightM: 0, storeys: 1, wallFinish: 'brick', roofForm: 'hip',
      roofPitchDeg: 22.5, roofFinish: 'tile', verandah: false, attached: false, parapet: false,
      sources: 'Slab floor, brick veneer and tile roof from the build line; pitch and footprint UNV' } },
  { id: 'T2', name: 'Post-war to 1980s brick veneer cottage', era: '1945 to 1989',
    floor: 'Timber subfloor on piers, or slab', walls: 'Brick veneer: 110 mm brick, cavity, hardwood stud',
    lining: 'Plasterboard; fibro sheet in wet areas', roof: 'Terracotta or concrete tile', storeys: '1',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 10, depthM: 8, floorHeightM: 0.4, storeys: 1, wallFinish: 'brick', roofForm: 'hip',
      roofPitchDeg: 25, roofFinish: 'tile', verandah: false, attached: false, parapet: false,
      sources: 'Floor 0.4 m is the current NCC subfloor clearance where termite inspection is needed (S3), not a measured value for this era; pitch and footprint UNV' } },
  { id: 'T3', name: 'Queenslander: raised timber house on stumps', era: '1880 to 1940s',
    floor: 'Timber floor on stumps, high set', walls: 'Weatherboard, no cavity, hardwood stud',
    lining: 'VJ timber boards; later fibro or hardboard', roof: 'Corrugated galvanised iron', storeys: '1, raised',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 10, depthM: 10, floorHeightM: 2.1, storeys: 1, wallFinish: 'weatherboard', roofForm: 'hip',
      roofPitchDeg: 30, roofFinish: 'iron', verandah: true, attached: false, parapet: false,
      sources: 'Clearance 1.5 to 1.8 m under the bearers (S8) plus about 0.3 m of bearer, joist and board (UNV); pyramid roof and verandah (S7); pitch 25 to 35 degrees UNV; footprint UNV' } },
  { id: 'T4', name: 'Fibro cottage', era: '1940s to 1980s',
    floor: 'Timber subfloor on stumps (slab from the 1960s)', walls: 'Flat fibro (asbestos cement) sheet with cover strips on timber stud',
    lining: 'Flat fibro with cover strips; fibro in wet areas', roof: 'Corrugated cement sheet or iron', storeys: '1',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 8, depthM: 8, floorHeightM: 0.45, storeys: 1, wallFinish: 'fibro', roofForm: 'hip',
      roofPitchDeg: 20, roofFinish: 'iron', verandah: false, attached: false, parapet: false,
      sources: 'Fibro walls and iron roof from the build line; floor height, pitch and footprint UNV' } },
  { id: 'T5', name: 'Federation or interwar double brick house', era: '1890 to 1940',
    floor: 'Timber floor on brick piers over a ventilated subfloor', walls: 'Solid double brick, plaster on brick',
    lining: 'Lath and plaster, fibrous plaster, pressed metal ceilings', roof: 'Terracotta Marseilles tile or iron', storeys: '1 or 2',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 12, depthM: 10, floorHeightM: 0.45, storeys: 1, wallFinish: 'brick', roofForm: 'hip',
      roofPitchDeg: 35, roofFinish: 'tile', verandah: true, attached: false, parapet: false,
      sources: 'Steep roof in terracotta tile (S16), 35 degrees UNV; floor height, verandah and footprint UNV' } },
  { id: 'T6', name: 'Low-rise strata walk-up flats', era: '1930s to 1980s',
    floor: 'Concrete slabs between units', walls: 'Cavity or double brick',
    lining: 'Hard plaster on brick; fibro in wet areas', roof: 'Tile or sheet', storeys: '2 or 3',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 12, depthM: 10, floorHeightM: 0, storeys: 3, wallFinish: 'brick', roofForm: 'hip',
      roofPitchDeg: 15, roofFinish: 'tile', verandah: false, attached: false, parapet: false,
      sources: 'Three storeys and brick from the build line; pitch and footprint UNV' } },
  { id: 'T7', name: 'Victorian terrace', era: '1850 to 1900',
    floor: 'Timber boards over a shallow subfloor', walls: 'Brick, with brick party walls shared with the neighbours',
    lining: 'Lime plaster on brick; lath and plaster ceilings', roof: 'Slate or corrugated iron, box gutters', storeys: '1 or 2',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 6, depthM: 12, floorHeightM: 0.3, storeys: 2, wallFinish: 'brick', roofForm: 'gable',
      roofPitchDeg: 25, roofFinish: 'slate', verandah: true, attached: true, parapet: true,
      sources: 'Brick party walls, slate roof and box gutters from the build line; front parapet, floor height, pitch and footprint UNV' } },
  { id: 'T8', name: 'Californian bungalow', era: '1915 to 1940',
    floor: 'Timber floor on brick piers over a ventilated subfloor', walls: 'Red brick, solid or cavity, or weatherboard',
    lining: 'Lath and plaster, fibrous plaster', roof: 'Terracotta Marseilles tile or iron', storeys: '1',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 10, depthM: 12, floorHeightM: 0.45, storeys: 1, wallFinish: 'brick', roofForm: 'gable',
      roofPitchDeg: 25, roofFinish: 'tile', verandah: true, attached: false, parapet: false,
      sources: 'Broad gable at about 25 degrees, red brick, Marseilles tile and porch piers (S15); floor height and footprint UNV' } },
  { id: 'T9', name: 'Post-war weatherboard cottage', era: '1945 to 1970s',
    floor: 'Timber floor on stumps or piers', walls: 'Weatherboard on timber stud',
    lining: 'Fibro or hardboard with cover strips; plasterboard from the 1960s', roof: 'Corrugated iron or tile', storeys: '1',
    asbestosPresumed: true, leadPaintPresumed: true,
    model: { widthM: 8, depthM: 8, floorHeightM: 0.45, storeys: 1, wallFinish: 'weatherboard', roofForm: 'hip',
      roofPitchDeg: 22, roofFinish: 'iron', verandah: false, attached: false, parapet: false,
      sources: 'Weatherboard and iron roof from the build line; floor height, pitch and footprint UNV' } },
  { id: 'T10', name: 'High-rise apartment tower (post-1990)', era: '1990 to now',
    floor: 'Suspended concrete slab', walls: 'Concrete panel or glass curtain wall; steel stud plasterboard inside',
    lining: 'Plasterboard on steel stud; fire-rated walls between units', roof: 'Membrane roof', storeys: '8 or more, sprinklered',
    asbestosPresumed: false, leadPaintPresumed: false,
    model: { widthM: 12, depthM: 12, floorHeightM: 0, storeys: 8, wallFinish: 'concrete', roofForm: 'flat',
      roofPitchDeg: 0, roofFinish: 'membrane', verandah: false, attached: false, parapet: true,
      sources: 'Eight storeys is the catalogue minimum; membrane roof from the build line; parapet and footprint UNV' } },
].map(h => Object.freeze({ ...h, model: Object.freeze(h.model) } as HouseType)))

export type ScenarioId =
  | 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7' | 'W8' | 'W9' | 'W10'
  | 'WM1' | 'WM2' | 'WM3' | 'WM4' | 'WM5' | 'WM6' | 'WM7' | 'WM8' | 'WM9' | 'WM10'
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'C1' | 'C2' | 'C3' | 'B1' | 'B2' | 'B3'
  | 'ST1' | 'ST2' | 'ST3' | 'ST4' | 'SW1' | 'SW2' | 'SW3' | 'HS1' | 'HS2' | 'CL1' | 'CL2' | 'AS1' | 'AS2'

/** The water call a scenario asks for; null classes means the catalogue gives no Class and the player calls none. */
export interface WaterAnswer {
  readonly categories: readonly LibraryCategory[]
  readonly classes: readonly WaterClass[] | null
  /** The catalogue's own words for the water state. */
  readonly catalogue: string
}

export interface LibraryScenario {
  readonly id: ScenarioId
  readonly family: ScenarioFamily
  readonly title: string
  /** Rooms and materials, or the hazard, from the catalogue: shown in the briefing. */
  readonly site: string
  readonly keyDecisions: string
  /** The scenario's own stops; the house adds asbestos and lead (stopsFor). */
  readonly stops: readonly SafetyStop[]
  readonly water: WaterAnswer | null
  readonly houses: readonly HouseTypeId[]
  /** Why the house list is narrower than all ten; null when every house suits. */
  readonly houseRule: string | null
}

const ALL: readonly HouseTypeId[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10']
const LOW: readonly HouseTypeId[] = ALL.filter(h => h !== 'T10')
const STRATA: readonly HouseTypeId[] = ['T6', 'T10']
const SLAB: readonly HouseTypeId[] = ['T1', 'T2', 'T6']
const RAISED: readonly HouseTypeId[] = ['T3', 'T4', 'T9']
const DETACHED: readonly HouseTypeId[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T8', 'T9']
const PRE_1990: readonly HouseTypeId[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9']
const RULE = {
  low: 'Needs a pitched roof or ground-level rooms, which the high-rise tower does not have.',
  strata: 'Needs units above or beside each other: the walk-up flats or the tower.',
  slab: 'Needs a concrete slab on the ground.',
  raised: 'Needs a raised timber house with a subfloor.',
  detached: 'Needs a free-standing house.',
  old: 'Needs a house built before 1990, when asbestos products were used.',
}

function w(categories: LibraryCategory[], classes: WaterClass[] | null, catalogue: string): WaterAnswer {
  return { categories, classes, catalogue }
}

function s(id: ScenarioId, family: ScenarioFamily, title: string, site: string, keyDecisions: string, stops: SafetyStop[],
  water: WaterAnswer | null = null, houses: readonly HouseTypeId[] = ALL, houseRule: string | null = null): LibraryScenario {
  return { id, family, title, site, keyDecisions, stops, water, houses, houseRule }
}

/** Every catalogue scenario, in catalogue order. */
export const SCENARIOS: readonly LibraryScenario[] = [
  s('W1', 'water', 'Washing machine hose burst', 'Laundry and hall; plasterboard, vinyl, carpet', 'Isolate water, extract, set equipment, move contents', ['ELEC', 'TRADE'], w([1], [2], 'Cat 1, Class 2')),
  s('W2', 'water', 'Hot water system or tempering valve leak', 'Laundry or garage, cupboard, adjoining walls', 'Shut off supply; scald risk; wall cavity drying', ['ELEC', 'TRADE'], w([1], [2], 'Cat 1, Class 2')),
  s('W3', 'water', 'Flexi hose under a sink burst while the owners were away', 'Kitchen cabinetry, floor, adjoining rooms', 'Remove cabinetry or dry in place; hidden wet under cabinets', ['ELEC', 'TRADE'], w([1], [2, 3], 'Cat 1, Class 2 to 3')),
  s('W4', 'water', 'Concealed pipe leak in a wall', 'Wall cavity and floor; plasterboard', 'Find the source; cavity drying or removal; time since it started', ['ELEC', 'TRADE'], w([2], [2], 'Cat 1 aged to Cat 2, Class 2')),
  s('W5', 'water', 'Shower waterproofing failure', 'Bathroom and adjoining rooms; tile, screed, timber floor', 'Moisture mapping; tile lift; the cause is a building defect', ['TRADE'], w([2], [2, 3], 'Cat 2, Class 2 to 3')),
  s('W6', 'water', 'Roof leak after a storm or failed flashing', 'Ceiling, insulation, roof void; plasterboard', 'Ceiling collapse risk; insulation removal; make safe', ['STRUC', 'ELEC'], w([1, 2], [2], 'Cat 1 to 2, Class 2'), LOW, RULE.low),
  s('W7', 'water', 'Overflow from the unit above', 'Ceilings, walls, flooring; shared services', 'Authority to act (body corporate), cross-unit liability, records', ['ELEC', 'TRADE'], w([1, 2], [2], 'Cat 1 to 2, Class 2'), STRATA, RULE.strata),
  s('W8', 'water', 'Under-slab pipe leak', 'Floor coverings, slab, skirting', 'Slab drying plan; flooring decision; long timeline', ['ELEC', 'TRADE'], w([1], [3, 4], 'Cat 1, Class 3 or 4'), SLAB, RULE.slab),
  s('W9', 'water', 'Dishwasher or fridge ice-maker supply leak', 'Kitchen floor, timber flooring; cupping', 'Dry the timber floor or replace it; moisture trend', ['ELEC'], w([1], [2], 'Cat 1, Class 2')),
  s('W10', 'water', 'Fire sprinkler discharge', 'Several rooms and floors; mixed finishes', 'Rapid scale-up; multi-room records', ['ELEC', 'TRADE'], w([1, 2], [3], 'Cat 1 to 2, Class 3'), STRATA, RULE.strata),
  s('WM1', 'water-mould', 'Pipe leak found after weeks', 'Wall cavity, plasterboard, skirting', 'Containment; remove or clean; sample or not', ['PPE', 'ELEC'], w([2], [2], 'Cat 2 aged, Class 2, mould present')),
  s('WM2', 'water-mould', 'Weekend burst pipe, nobody there for 72 hours or more', 'Floors and lower walls', 'Treat as contaminated; discard porous contents', ['PPE'], w([2, 3], [2], 'Cat 2 to 3 by time, Class 2')),
  s('WM3', 'water-mould', 'Roof leak into the ceiling, insulation soaked', 'Ceiling and insulation', 'Remove wet insulation; mould on the back of the plasterboard', ['PPE', 'STRUC', 'ELEC'], w([2], [2], 'Cat 2, Class 2'), LOW, RULE.low),
  s('WM4', 'water-mould', 'Waterproofing failure with hidden mould in the wall', 'Bathroom and the room next to it', 'Tile removal; containment', ['PPE', 'TRADE'], w([2], [3], 'Cat 2, Class 3')),
  s('WM5', 'water-mould', 'Subfloor flooding under a raised timber house', 'Subfloor, bearers, timber floor', 'Ventilation, timber moisture, termite risk', ['PPE', 'STRUC', 'TRADE'], w([2], [2], 'Cat 2, Class 2'), RAISED, RULE.raised),
  s('WM6', 'water-mould', 'Air conditioner condensate overflow', 'Ceiling and walls', 'Source repair and a mould assessment', ['ELEC', 'PPE'], w([1, 2], [2], 'Cat 1 to 2, Class 2')),
  s('WM7', 'water-mould', 'Rental property, tenant complaint ignored', 'Bedroom walls, wardrobe', 'Records duty, tenant health, who orders the work', ['PPE'], w([1, 2], [1, 2], 'Chronic dampness, Class 1 to 2; the catalogue gives no Category, so 1 or 2 is accepted')),
  s('WM8', 'water-mould', 'Flooded house, mould after five days', 'Whole ground floor', 'Scale; gut or clean; contents disposal', ['PPE', 'ELEC'], w([3], [3], 'Cat 3 base, Class 3'), LOW, RULE.low),
  s('WM9', 'water-mould', 'Leak from a neighbouring unit, mould found at handover', 'One unit, shared wall', 'Cross-unit responsibility; ventilation', ['PPE'], w([1, 2], [2], 'Cat 1 to 2, Class 2'), STRATA, RULE.strata),
  s('WM10', 'water-mould', 'Hidden slab moisture under new flooring', 'Floating floor, underlay', 'Lift the floor or test moisture; adhesive failure', ['PPE'], w([1], [3, 4], 'Cat 1, Class 3 or 4, mould under the floor'), SLAB, RULE.slab),
  s('M1', 'mould', 'Chronic condensation in a poorly ventilated bedroom', 'External walls, curtains, wardrobe', 'Fix ventilation first; clean or remediate; no biocide as a fix', ['PPE']),
  s('M2', 'mould', 'Bathroom with no extraction', 'Ceiling, grout', 'Clean or replace; fit an extraction fan', ['PPE', 'ELEC']),
  s('M3', 'mould', 'Wardrobe and stored contents in a damp house', 'Soft furnishings, books', 'Salvage or dispose of contents', ['PPE']),
  s('M4', 'mould', 'Roof void mould after a sarking and insulation upgrade', 'Roof void, timber', 'Containment; ventilation design', ['PPE', 'STRUC'], null, LOW, RULE.low),
  s('M5', 'mould', 'Mould in the air conditioning ducts', 'Ducts, vents', 'Clean or replace; cross-contamination', ['PPE', 'TRADE']),
  s('F1', 'fire', 'Kitchen cooking fire (oil, unattended)', 'Kitchen and range hood; adjoining rooms', 'Remove the odour source; clean or replace cabinetry', ['ELEC', 'PPE']),
  s('F2', 'fire', 'Electrical fault in a wall or ceiling', 'One room and its cavity; wiring, insulation', 'Inspect the cavity; nothing re-energised until an electrician clears it', ['ELEC', 'TRADE', 'STRUC']),
  s('F3', 'fire', 'Lithium-ion battery fire (e-bike or scooter charging)', 'Hallway, garage, carport; plastics, textiles', 'Re-ignition risk; battery quarantine; contents loss', ['PPE', 'WASTE', 'ELEC']),
  s('F4', 'fire', 'Bushfire ember attack on the roof or subfloor', 'Roof void, eaves, garden structures', 'Smoke through the insulation; water used in fire fighting', ['STRUC', 'PPE'], null, DETACHED, RULE.detached),
  s('F5', 'fire', 'Puffback from a heater or a failed flue', 'Living areas; soft furnishings', 'Soot smearing; ducts contaminated; contents cleaning', ['PPE', 'TRADE']),
  s('C1', 'crime-scene', 'Assault scene released by police', 'Lounge and hallway; carpet, plaster, upholstery', 'Wait for police release; removal or cleaning; waste classification', ['POLICE', 'PPE', 'WASTE', 'HBV']),
  s('C2', 'crime-scene', 'Death by suicide at home', 'Bedroom or garage; mattress, flooring', 'Family contact, scope, staff welfare', ['PPE', 'WASTE']),
  s('C3', 'crime-scene', 'Burglary with fingerprint powder and capsicum spray', 'Entry points, several rooms', 'Powder cleaning; ducts; ventilation', ['PPE']),
  s('B1', 'biohazard', 'Unattended death, several days', 'Body fluids, bacteria, larvae, strong odour', 'Mattress and flooring removal; subfloor contamination; odour control', ['PPE', 'WASTE', 'HBV']),
  s('B2', 'biohazard', 'Sharps and blood in a squalid share house', 'Needles, blood, mould', 'Sharps protocol; scene triage', ['PPE', 'WASTE']),
  s('B3', 'biohazard', 'Gastro outbreak in a share house or care home', 'Faecal-oral pathogens', 'Disinfectant choice and contact time; cross-contamination', ['PPE']),
  s('ST1', 'storm', 'River or flash flood in a Queensland town', 'Ground floor; silt, sewage, chemicals', 'Gut or dry; electrical inspection first', ['ELEC', 'PPE'], w([3], null, 'Cat 3'), LOW, RULE.low),
  s('ST2', 'storm', 'Cyclone takes part of the roof', 'Roof, ceilings, rooms below', 'Tarp and make safe', ['STRUC', 'ELEC'], null, LOW, RULE.low),
  s('ST3', 'storm', 'Hail breaks through the roof', 'Broken tiles, ceiling water', 'Temporary cover; ceiling', ['STRUC'], null, LOW, RULE.low),
  s('ST4', 'storm', 'King tide or storm surge, salt water', 'Ground floor; salt corrosion', 'Rinse and dry; electronics', ['ELEC'], w([3], null, 'Cat 3'), LOW, RULE.low),
  s('SW1', 'sewage', 'Sewer overflow from a blocked main', 'Floors and contents; pathogens', 'Containment, disinfection, contents disposal', ['PPE', 'TRADE'], w([3], null, 'Cat 3')),
  s('SW2', 'sewage', 'Toilet or grey water backflow into a bathroom', 'Bathroom floor and porous materials', 'Remove porous materials', ['PPE'], w([2, 3], null, 'Cat 2 to 3')),
  s('SW3', 'sewage', 'Septic system failure on a rural block', 'Ground floor and groundwater', 'Stop the source; sanitise', ['PPE'], w([3], null, 'Cat 3'), DETACHED, RULE.detached),
  s('HS1', 'hoarding', 'Hoarded house with water damage', 'Fire load, blocked exits, pests, floor load', 'Safe access, triage, mental health referral', ['PPE', 'STRUC']),
  s('HS2', 'hoarding', 'Squalor with sewage', 'Pests, faecal contamination', 'Pest control; staged clean; waste', ['PPE', 'WASTE']),
  s('CL1', 'clandestine-lab', 'Former methamphetamine lab, police released', 'Corrosives and drug residues on surfaces', 'Testing, containment, removal, clearance sampling', ['POLICE', 'PPE', 'TRADE', 'WASTE']),
  s('CL2', 'clandestine-lab', 'Rental where occupants smoked methamphetamine', 'Smoking residue on surfaces', 'Test first; clean or strip', ['PPE']),
  s('AS1', 'asbestos', 'Fibro disturbed during a water-damage strip-out', 'Broken or cut asbestos-cement sheet', 'Stop work, assess, licensed removal where required', ['ASB'], null, PRE_1990, RULE.old),
  s('AS2', 'asbestos', 'Vinyl floor tiles under a flooded floor', 'Vinyl tiles and adhesive', 'Test before lifting', ['ASB'], null, PRE_1990, RULE.old),
].map(x => Object.freeze({ ...x, stops: Object.freeze([...x.stops]), houses: Object.freeze([...x.houses]),
  water: x.water ? Object.freeze({ ...x.water, categories: Object.freeze([...x.water.categories]),
    classes: x.water.classes ? Object.freeze([...x.water.classes]) : null }) : null }))

/** A3: one decision the full job makes, played after the stops and the water call. The reason is in our own words; the
 * source is a section of a standard we have read (IICRC S500:2021, S520, S700, S540 and S900 facts: rw-standards
 * docs/research/IICRC-S5xx-facts.md and IICRC-S700/S900-facts.md at 5a3d171), or a law, regulator or published
 * guidance read on 22/10/2026 (session-artifacts a3-sources-research) where no standard covers it; S700 by analogy for
 * bushfire, which S700:2025 leaves out. No standard text is quoted. */
export interface ScenarioDecision {
  readonly id: string
  readonly prompt: string
  readonly options: ReadonlyArray<Readonly<{ id: string; label: string }>>
  readonly right: string
  readonly why: string
  readonly source: string
}

function d(id: string, prompt: string, options: Array<[string, string]>, right: string, why: string, source: string): ScenarioDecision {
  return { id, prompt, options: options.map(([oid, label]) => ({ id: oid, label })), right, why, source }
}

/** Every catalogue scenario has two decisions. Wave 1 (21/10/2026): the water family. Wave 2 (22/10/2026): the other 39. */
export const DECISIONS: Readonly<Partial<Record<ScenarioId, readonly ScenarioDecision[]>>> = {
  W1: [
    d('carpet', 'The hall carpet and underlay are wet with Category 1 water. What happens to them?',
      [['discard-both', 'Throw out the carpet and the underlay'], ['dry-in-place', 'Lift, dry and relay them'], ['discard-underlay', 'Throw out the underlay only']],
      'dry-in-place', 'Carpet wet with clean water can usually be saved. Lifting it lets air underneath and shows the floor below.',
      'S500:2021 16.3.7; Appendix C (informative)'),
    d('air-movers', 'The laundry is 3 m by 4 m. The whole floor is wet and the walls only at the bottom. How many air movers do you start with?',
      [['one', '1'], ['three-four', '3 or 4'], ['eight', '8']],
      'three-four', 'One for the room, plus one for each 4.5 to 6.5 m2 of wet floor, rounded up: 1 plus 2 to 3.', 'S500:2021 12.5.3'),
  ],
  W2: [
    d('first-step', 'What do you do first at the leaking hot water unit?',
      [['extract', 'Start extracting water at once'], ['relief-valve', 'Open the relief valve to drain it'], ['isolate', 'Isolate its power and water, and let it cool']],
      'isolate', 'Check for shock risk before you work, and stop the source before drying. Stored water is kept at 60 C or more, which burns skin in seconds, so let it cool; a licensed plumber repairs the unit.',
      'S500:2021 12.2.4, 12.2.5; AS/NZS 3500.4 temperatures (60 C stored, 50 C at fixtures) per Tas CBOS 2020; scald times: Moritz and Henriques 1947'),
    d('plasterboard', 'The plasterboard behind the cupboard is wet but firm and undamaged. What do you do?',
      [['dry-monitor', 'Dry it in place and take readings every day'], ['remove', 'Remove it now']],
      'dry-monitor', 'Wallboard is removed when it sags or is physically damaged. Sound board wet with clean water can be dried.',
      'S500:2021 16.2.2, 12.5.6'),
  ],
  W3: [
    d('category', 'The water sat for three days while the owners were away, and it smells. How do you treat it?',
      [['cat-1', 'As Category 1, because it came from a supply line'], ['cat-2', 'As Category 2']],
      'cat-2', 'Time and warmth make clean water worse. A smell is a sign that it has gone bad.', 'S500:2021 Category definitions'),
    d('cabinets', 'The particleboard cabinet bases and kick boards are wet. What happens to them?',
      [['dry', 'Dry them in place'], ['remove', 'Remove and replace them']],
      'remove', 'After Category 2 water, particleboard and MDF are removed and replaced.', 'S500:2021 16.2.2.1'),
  ],
  W4: [
    d('thermal', 'The thermal camera shows a cool patch on the wall. What do you do next?',
      [['treat-wet', 'Treat the patch as the wet area'], ['cut-open', 'Cut the wall open there'], ['meter', 'Confirm it with a moisture meter']],
      'meter', 'A thermal camera only shows temperature. Confirm every suspect spot with a moisture meter.', 'S500:2021 10.6.8'),
    d('insulation', 'There is insulation inside the wet wall, and the water is Category 2. What happens to it?',
      [['remove', 'Remove it'], ['dry', 'Leave it in and dry it']],
      'remove', 'Wall insulation is removed after Category 2 water.', 'S500:2021 16.2.2.1'),
  ],
  W5: [
    d('repair', 'Who fixes the failed shower waterproofing?',
      [['us', 'We repair it as part of drying'], ['licensed-trade', 'A licensed trade engaged by the owner']],
      'licensed-trade', 'Fixing the source is the owner\'s job unless agreed otherwise. Licensed trades do the repairs.',
      'S500:2021 1.2.3, 1.2.5'),
    d('moisture-map', 'Where does your moisture map start and stop?',
      [['bathroom', 'Inside the bathroom only'], ['source-out', 'At the shower, out to the dry edge, including the next room']],
      'source-out', 'Start at the source and work outward until you find dry material. Water runs under walls into the next room.',
      'S500:2021 10.6.3'),
  ],
  W6: [
    d('ceiling', 'Part of the ceiling is sagging and soaked. What do you do?',
      [['remove', 'Keep people out from under it, then remove it'], ['dry', 'Dry it in place with air movers']],
      'remove', 'A sagging, saturated ceiling is removed whatever the Category.', 'S500:2021 16.2.2'),
    d('cellulose', 'Loose-fill cellulose insulation in the roof space is wet. What happens to it?',
      [['dry', 'Dry it in place'], ['remove', 'Remove it']],
      'remove', 'Wet loose-fill organic insulation is removed whatever the Category.', 'S500:2021 16.3.6'),
  ],
  W7: [
    d('authority', 'Who can authorise work on the shared ceiling between the units?',
      [['tenant', 'The tenant below'], ['owners-corp', 'The owners corporation (body corporate)'], ['nobody', 'Nobody needs to; start now']],
      'owners-corp', 'The ceiling between units is common property (in NSW a lot ends at the under surface of its ceiling). The owners corporation must repair common property, so it authorises the work.',
      'NSW SSMA 2015 s106, SSDA 2015 s6; Vic OC Act 2006 s46; Qld BCCM Act 1997 s152'),
    d('records', 'What records do you keep for a loss that crosses two units?',
      [['both-units', 'A moisture map of both units, with readings and photos'], ['our-unit', 'Readings in the unit we were called to']],
      'both-units', 'Follow the water from its source and record the wet and the dry areas wherever they are.',
      'S500:2021 10.6.3, 1.2.2'),
  ],
  W8: [
    d('dehumidifier', 'The slab is wet deep down (Class 4). Which dehumidifier do you use?',
      [['conventional', 'A conventional refrigerant dehumidifier'], ['lgr-desiccant', 'A low grain refrigerant or a desiccant dehumidifier']],
      'lgr-desiccant', 'The sizing guide gives no conventional refrigerant figure for Class 4.', 'S500:2021 Appendix B (informative)'),
    d('goal', 'How do you set the drying goal for the slab?',
      [['week', 'Take whatever the meter shows after a week'], ['dry-standard', 'Within 10% of a reading on unaffected slab']],
      'dry-standard', 'The goal comes from a dry standard: the same material where the water did not reach.', 'S500:2021 10.6.6'),
  ],
  W9: [
    d('dry-standard', 'How do you find the dry standard for the timber floor?',
      [['default', 'Use the meter\'s default scale'], ['unaffected', 'Read the same timber in a room the water did not reach']],
      'unaffected', 'The dry standard is the same material where it is unaffected. The Australian Timber Flooring Association is a named source.',
      'S500:2021 10.6.6'),
    d('cupping', 'The timber floor is cupped on day 1. What do you do?',
      [['replace', 'Replace it now'], ['dry-readings', 'Dry it with daily readings, and decide on replacement from the readings']],
      'dry-readings', 'Readings decide. Cupping often eases as the boards dry; sanding before the moisture evens out leaves a crowned floor. Change the plan if readings stop improving.',
      'S500:2021 12.5.6; ATFA Floor Choices, owner expectations for solid timber floors (no sanding until moisture evens out)'),
  ],
  W10: [
    d('chambers', 'Several rooms on two floors are wet. How do you plan the drying?',
      [['one-plan', 'One plan for the whole building'], ['chambers', 'A drying chamber for each area, each with its own Category and Class']],
      'chambers', 'One project can have several drying chambers, each with its own Category and Class.', 'S500:2021 Class definitions'),
    d('sprinkler-category', 'What do you check before you call the sprinkler water Category 1?',
      [['assume-clean', 'Nothing: sprinkler water is clean'], ['public-supply', 'That it came from the public supply with no additives']],
      'public-supply', 'Sprinkler water is Category 1 only when it comes from the public supply with no additives.', 'S500:2021 16.3.17'),
  ],
  WM1: [
    d('mould-found', 'You find mould on the back of the plasterboard. What first?',
      [['start-drying-once', 'Start drying at once'], ['spray-biocide-keep', 'Spray a biocide and keep drying'], ['stop-contain-follow', 'Stop, contain it, follow the mould standard']],
      'stop-contain-follow', 'Fast air over mould spreads it. Do not disturb it until it is contained.',
      'S500:2021 8.6; S520 1.3, 9.3.3'),
    d('skirting', 'Particleboard skirting and wall insulation are wet with Category 2 water.',
      [['remove', 'Remove'], ['dry-place', 'Dry in place']],
      'remove', 'After Category 2, particleboard and wall insulation come out.',
      'S500:2021 16.2.2.1'),
  ],
  WM2: [
    d('category-time', 'Clean supply water sat three warm days and smells. How do you treat it?',
      [['contaminated-category-2', 'As contaminated, Category 2 or 3'], ['category-1-came', 'Category 1, it came from a clean pipe'], ['test-first-work', 'Test first and work as Category 1 meanwhile']],
      'contaminated-category-2', 'Category gets worse with time and warmth; an odour shows clean water has gone bad.',
      'S500:2021 Category definitions'),
    d('order', 'In what order do you work?',
      [['dry-first-then', 'Dry first, then clean'], ['both-once', 'Both at once'], ['remove-clean-contaminated', 'Remove and clean contaminated material first, then dry']],
      'remove-clean-contaminated', 'With contamination present, remediate before drying.',
      'S500:2021 1.2.3, 12.3'),
  ],
  WM3: [
    d('insulation', 'The ceiling batts are soaked and flattened.',
      [['remove-them', 'Remove them'], ['dry-them-place', 'Dry them in place']],
      'remove-them', 'Collapsed insulation is removed in any Category.',
      'S500:2021 16.2.2'),
    d('bagging', 'How does the wet insulation come out?',
      [['pull-out-by', 'Pull it out by hand and carry it through'], ['cut-knife-bag', 'Cut it with a knife and bag it at once'], ['leave-roofer', 'Leave it for the roofer']],
      'cut-knife-bag', 'Cut, do not tear, and bag at once so it does not spread through the house.',
      'S500:2021 12.3'),
  ],
  WM4: [
    d('containment', 'You will lift tiles and open a wall where mould is likely. What goes up first?',
      [['nothing', 'Nothing'], ['air-mover-blowing', 'An air mover blowing out the window'], ['plastic-containment-air', 'Plastic containment with an air filtration device under negative pressure']],
      'plastic-containment-air', 'Contain near the source before disturbing it; hold the area at negative pressure.',
      'S500:2021 12.3, 8.6; S520 9.3.3'),
    d('readings', 'The bathroom shares a wall with a bedroom. Where do you read?',
      [['bathroom-bedroom-out', 'The bathroom and the bedroom, out to the dry edge'], ['bathroom-only', 'The bathroom only'], ['nowhere-until-tiles', 'Nowhere until the tiles are off']],
      'bathroom-bedroom-out', 'Work out from the source in every direction to the dry edge, next rooms included.',
      'S500:2021 10.6.3'),
  ],
  WM5: [
    d('entry', 'Before you go under the house, what do you check?',
      [['shock-risk-sharp', 'Shock risk, sharp objects, animals and air; treat it as a confined space'], ['nothing-go-straight', 'Nothing, go straight in'], ['just-take-torch', 'Just take a torch']],
      'shock-risk-sharp', 'Under-floor spaces carry shock, sharps, bites and bad air; many are confined spaces.',
      'S500:2021 10.7.5, 12.2.4'),
    d('system', 'Outdoor air is clearly drier than the air under the house. Which drying system?',
      [['closed-seal-dehumidify', 'Closed: seal and dehumidify'], ['none-let-dry', 'None, let it dry'], ['open-ventilate-outdoor', 'Open: ventilate with outdoor air']],
      'open-ventilate-outdoor', 'An open system works when outdoor air is clearly drier.',
      'S500:2021 12.5.1'),
  ],
  WM6: [
    d('source', 'Who repairs the air conditioner drain?',
      [['part-drying', 'You, as part of the drying'], ['owner-through-licensed', 'The owner, through a licensed trade'], ['nobody-dry-now', 'Nobody, it is dry now']],
      'owner-through-licensed', 'Fixing the source is the owner\'s job; repairs go to licensed trades.',
      'S500:2021 1.2.3, 1.2.5'),
    d('hvac', 'Can the building\'s air conditioning help the drying?',
      [['only-if-will', 'Only if it will not spread contaminants; it is not a dehumidifier'], ['yes-can-dry', 'Yes, it can dry the house alone'], ['never', 'Never']],
      'only-if-will', 'The HVAC can help but cannot make drying conditions alone, and must not spread contamination.',
      'S500:2021 12.5.5'),
  ],
  WM7: [
    d('records', 'What do you record on the first visit?',
      [['source-time-loss', 'Source, time of loss, pre-existing damage, visible mould and readings'], ['readings-only', 'Readings only'], ['nothing-until-landlord', 'Nothing until the landlord agrees']],
      'source-time-loss', 'The first visit records all of these.',
      'S500:2021 1.2.2.1'),
    d('authority', 'Who orders the work?',
      [['tenant', 'The tenant'], ['decide', 'You decide'], ['owner-landlord-or', 'The owner (landlord or agent)']],
      'owner-landlord-or', 'The landlord must keep the rental in repair and orders the work. A tenant may arrange urgent repairs only when the landlord does not act: up to $1,000 in NSW, $2,500 in Vic, where mould or damp from the building is urgent.',
      'NSW RTA 2010 urgent repairs (NSW Fair Trading: $1,000, repaid in 14 days); Vic RTA 1997 s72 (CAV: $2,500; mould or damp from the building)'),
  ],
  WM8: [
    d('plasterboard', 'Plasterboard soaked by Category 3 floodwater.',
      [['remove', 'Remove it'], ['dry-place', 'Dry it in place']],
      'remove', 'After Category 3, wallboard is removed.',
      'S500:2021 16.2.2.2'),
    d('iep', 'An elderly occupant with asthma wants to move back soon.',
      [['carry-normal', 'Carry on as normal'], ['recommend-indoor-environmental', 'Recommend an indoor environmental professional (IEP)'], ['spray-biocide-so', 'Spray a biocide so they can return']],
      'recommend-indoor-environmental', 'High-risk occupants and health complaints are a reason to bring in an IEP.',
      'S500:2021 10.6.7, 12.3; S520 1.2.1, 7.4'),
  ],
  WM9: [
    d('shared-wall', 'Who must agree before you open the shared wall?',
      [['unit-owner-alone', 'The unit owner alone'], ['neighbour', 'The neighbour'], ['owners-corporation', 'The owners corporation']],
      'owners-corporation', 'A wall between units is common property (in NSW a lot ends at its inner surface). A unit owner may not alter common property without the owners corporation.',
      'NSW SSDA 2015 s6, SSMA 2015 s106; Vic OC Act 2006 s46, s47A; Qld BCCM Act 1997 s152'),
    d('readings', 'Where do you take readings?',
      [['this-unit-only', 'This unit only'], ['both-units-out', 'Both units, out to the dry edge'], ['shared-wall-only', 'The shared wall only']],
      'both-units-out', 'Water runs under walls; check next door even if it looks dry.',
      'S500:2021 10.6.3'),
  ],
  WM10: [
    d('class4', 'Moisture is deep in the concrete slab. What does that mean?',
      [['normal-drying-few', 'Normal drying, a few days'], ['will-dry-once', 'It will dry once the floor is down'], ['class-4-special', 'Class 4: special methods and more time']],
      'class-4-special', 'Water deep in concrete is Class 4.',
      'S500:2021 Class definitions'),
    d('falling-rate', 'The slab surface reads dry but it is still wet inside. What changes?',
      [['more-air-movers', 'More air movers at full speed'], ['stop-surface-dry', 'Stop, the surface is dry'], ['slow-air-warm', 'Slow the air, warm the slab, dry the air']],
      'slow-air-warm', 'Later drying needs vapour pressure, not air speed; over-drying the surface slows the inside.',
      'S500:2021 12.5'),
  ],
  M1: [
    d('removal', 'The occupant asks you to spray a mould killer on the wall and go.',
      [['spray-leave', 'Spray it and leave'], ['paint-over-anti', 'Paint over it with anti-mould paint'], ['remove-growth-hepa', 'Remove the growth: HEPA vacuum and damp wipe, then dry']],
      'remove-growth-hepa', 'Killing or covering mould is not remediation. It must be physically removed.',
      'S520 1.4, 2.1.1, 2.2.1'),
    d('source', 'What stops the mould coming back?',
      [['stronger-spray-next', 'A stronger spray next time'], ['dehumidifier-day', 'A dehumidifier for the day'], ['fix-moisture-ventilation', 'Fix the moisture: ventilation and condensation control']],
      'fix-moisture-ventilation', 'The moisture problem must be found and fixed, or the mould returns.',
      'S520 1.5'),
  ],
  M2: [
    d('fan', 'Who fits the new extraction fan?',
      [['wire-yourself', 'You wire it in yourself'], ['occupant', 'The occupant'], ['licensed-electrician', 'A licensed electrician']],
      'licensed-electrician', 'Fixing the moisture source is part of the job; electrical work goes to a licensed trade.',
      'S520 1.5; S500:2021 1.2.5'),
    d('stain', 'The growth is gone but a grey stain stays in the grout.',
      [['scrub-bleach-until', 'Scrub with bleach until it is white'], ['remove-all-tiles', 'Remove all the tiles'], ['record-cosmetic-stain', 'Record it as cosmetic; stain removal is an extra the client may choose']],
      'record-cosmetic-stain', 'A stain left after removal is cosmetic. Stain remover comes last, for looks only.',
      'S520 9.3.8, 2.1.1'),
  ],
  M3: [
    d('triage', 'A mouldy leather jacket, a box of books and a wedding album.',
      [['dispose-all', 'Dispose of all of it'], ['sort-each-item', 'Sort each item: restore, dispose or preserve, by material, condition, cost and value'], ['clean-all-same', 'Clean all of it the same way']],
      'sort-each-item', 'Each item is judged on its own. Leather absorbs moisture; irreplaceable items may need a specialist.',
      'S520 11.1, 11.3.5, 11.4'),
    d('disposal', 'The client is out. Can you throw out the ruined mattress?',
      [['no-photograph-list', 'No: photograph it, list it and get written permission first'], ['yes-clearly-ruined', 'Yes, it is clearly ruined'], ['leave-kerb', 'Leave it on the kerb']],
      'no-photograph-list', 'Contents are disposed of only with the owner\'s written permission.',
      'S520 11.2, 11.5'),
  ],
  M4: [
    d('pressure', 'How do you set the air while removing mouldy material in the roof?',
      [['positive-pressure-push', 'Positive pressure, to push spores out'], ['none-roof-open', 'None, the roof is open'], ['negative-pressure-least', 'Negative pressure, at least -5 Pa, inside containment']],
      'negative-pressure-least', 'Positive pressure is not relied on. Containment is held negative.',
      'S520 3.2, 9.3.3'),
    d('timber', 'A rafter is soft and decayed.',
      [['cut-out-carry', 'Cut it out and carry on'], ['stop-structural-engineer', 'Stop: a structural engineer decides on load-bearing timber'], ['spray-leave', 'Spray it and leave it']],
      'stop-structural-engineer', 'Load-bearing parts are removed only with a structural engineer.',
      'S520 9, 9.3.7'),
  ],
  M5: [
    d('hvac', 'The family wants the air conditioning on tonight.',
      [['run-hot', 'Run it, it is hot'], ['keep-off-until', 'Keep it off until it is cleaned, repaired and confirmed back to Condition 1'], ['run-fan-only', 'Run the fan only']],
      'keep-off-until', 'A contaminated system stays off so it does not spread spores through the house.',
      'S520 10.2.2'),
    d('duct', 'The flexible duct has growth in its lining.',
      [['fog-biocide-through', 'Fog a biocide through the ducts'], ['remove-replace-that', 'Remove and replace that duct'], ['clean-coat', 'Clean it and coat it']],
      'remove-replace-that', 'Porous duct parts with growth are replaced. Fogging is not remediation.',
      'S520 10, 10.2.4, 9.1.7'),
  ],
  F1: [
    d('residue', 'A sticky yellow-brown film covers the cupboards. How do you clean it?',
      [['rub-dry-chem', 'Rub it with a dry chem sponge'], ['protein-residue-test', 'It is protein residue: test-clean, then wet clean with a degreaser'], ['paint-over', 'Paint over it']],
      'protein-residue-test', 'Protein residue is a greasy film. A dry sponge smears it.',
      'S700 3.1, 6.6.1.1, 6.5'),
    d('test', 'Where and how do you start test cleaning?',
      [['furthest-room-strongest', 'In the furthest room, strongest product first'], ['origin-gentlest-method', 'At the origin, gentlest method first, then step up'], ['skip-quote-from', 'Skip it and quote from photos']],
      'origin-gentlest-method', 'Test-clean from the worst area, gentle to strong, and record each test.',
      'S700 3.11'),
  ],
  F2: [
    d('power', 'The power points are covered in soot. Can you clean them now?',
      [['yes-damp-cloth', 'Yes, with a damp cloth'], ['spray-rust-inhibitor', 'Spray rust inhibitor into them'], ['no-never-work', 'No: never work on live systems; a licensed electrician checks them first']],
      'no-never-work', 'Nobody works on energised systems. Electrical items hit by residue go to a specialist.',
      'S700 5.5.3.2'),
    d('evidence', 'The fire investigator has taped off the wall where it started.',
      [['clean-so-family', 'Clean it so the family sees progress'], ['leave-until-investigator', 'Leave it until the investigator and owner release it'], ['take-burnt-wiring', 'Take the burnt wiring out for them']],
      'leave-until-investigator', 'Disturbing the origin can destroy evidence.',
      'S700 5.4.4'),
  ],
  F3: [
    d('corrosion', 'Burnt plastic left soot on the metal fittings and a laptop. When do you treat it?',
      [['now-burnt-plastic', 'Now: burnt plastic residue is acidic and corrodes metal fast'], ['full-restoration-stage', 'At the full restoration stage'], ['never-wiping-enough', 'Never, wiping is enough']],
      'now-burnt-plastic', 'Corrosion treatment starts at once, before rust shows.',
      'S700 3.13, 5.5.3, 5.5.3.2'),
    d('battery', 'The burnt e-bike battery is still in the hallway.',
      [['carry-wheelie-bin', 'Carry it to the wheelie bin'], ['do-not-handle', 'Do not handle it; keep people away and get fire service advice: it is stored outside, away from buildings, until a battery disposal service takes it'], ['put-bucket-water', 'Put it in a bucket of water in the laundry']],
      'do-not-handle', 'A fire-damaged lithium battery can reignite up to four weeks later. Fire services want it outside, 3 m (NSW) or 5 m (Vic) from buildings, never in a home bin; a bucket of water suits only small batteries.',
      'FRV What to do after a fire (reignition up to 4 weeks; 5 m); FRNSW e-bike battery safety (3 m; no home bins; water for small batteries only)'),
  ],
  F4: [
    d('water', 'Firefighters soaked the roof void. How do you treat that water?',
      [['category-1-was', 'Category 1, it was clean hose water'], ['ignore-will-dry', 'Ignore it, it will dry'], ['least-category-2', 'At least Category 2']],
      'least-category-2', 'Fire-fighting water is treated as at least Category 2. Here it has run through ash that can carry asbestos and metals from treated timber.',
      'S700 5.2.3 by analogy (S700:2025 excludes bushfire; a wildfire revision began 26/12/2025); NSW Gov bushfire clean-up advice 2023'),
    d('insulation', 'The roof batts are blackened, smell of smoke and are covered in ash.',
      [['blow-ash-off', 'Blow the ash off with compressed air and leave them'], ['fog-them-deodoriser', 'Fog them with deodoriser and leave them'], ['remove-them-burnt', 'Remove them: keep the ash damp, wear a P2 mask, and bag the batts and ash; never blow or sweep it']],
      'remove-them-burnt', 'Source removal comes first. Bushfire ash can carry asbestos and arsenic from treated timber, so it is kept damp and bagged, not blown into the air.',
      'S700 6.5.1, 8.4.1 by analogy; NSW Gov bushfire clean-up advice 2023 (damp, shovel, bag, P2); Alam et al. 2023 doi:10.1016/j.jhazmat.2022.130608'),
  ],
  F5: [
    d('soot', 'Black oily soot covers gloss-painted walls.',
      [['hepa-vacuum-loose', 'HEPA vacuum the loose soot, then test-clean wet'], ['rub-off-dry', 'Rub it off with a dry chem sponge'], ['paint-straight-over', 'Paint straight over it']],
      'hepa-vacuum-loose', 'Puffback soot is oily. A dry sponge smears it on gloss paint. Gentlest method first.',
      'S700 3.1, 6.6.1, 6.6.1.1'),
    d('clean', 'How do you show a wall is clean?',
      [['wipe-dry-white', 'Wipe it with a dry white cloth: no visible residue comes off'], ['looks-fine-from', 'It looks fine from the door'], ['spray-deodoriser', 'Spray a deodoriser']],
      'wipe-dry-white', 'The white glove test: a dry white wipe picks up no visible residue.',
      'S700 6.10.1'),
  ],
  C1: [
    d('release', 'The landlord wants work to start now. Police have not released the scene.',
      [['wait-police-release', 'Wait for police release and record it'], ['start-landlord-paying', 'Start, the landlord is paying'], ['start-rooms-that', 'Start in the rooms that are not taped off']],
      'wait-police-release', 'The standard assumes a released scene. Starting before release is a conflict: decline and record it.',
      'S540 A.1, 7.4'),
    d('carpet', 'Blood has soaked into the carpet and underlay.',
      [['clean-disinfect-surface', 'Clean and disinfect the surface, cut it out at least 15 cm past what you can see, and bag it as biohazard waste'], ['clean-place', 'Clean it in place'], ['steam-clean', 'Steam clean it']],
      'clean-disinfect-surface', 'Carpet and underlay are porous type 2. They come out with a margin and go out as infectious waste.',
      'S540 8.1, 8.10.1, 8.10.3'),
  ],
  C2: [
    d('family', 'A family member asks you to throw out everything in the room.',
      [['do-once', 'Do it at once'], ['refuse-discuss', 'Refuse to discuss it'], ['speak-calmly-explain', 'Speak calmly, explain what can be cleaned, and get signed authority for what goes']],
      'speak-calmly-explain', 'Grieving clients may ask to dispose of things they later miss. Disposal needs signed authority.',
      'S540 5.2.1, 8.10.3'),
    d('welfare', 'Your newest technician is shaken after the job.',
      [['send-them-next', 'Send them on to the next job'], ['debrief-them-offer', 'Debrief them and offer support; psychological risk is part of the hazard assessment'], ['tell-them-part', 'Tell them it is part of the job']],
      'debrief-them-offer', 'Psychological harm is a work hazard the employer must manage. StandBy (1300 727 247) supports people affected by suicide, service providers included; Lifeline is 13 11 14.',
      'S540 2.1; WHS Regs 2011 r55A-55D (from 1/4/2023); StandBy Support After Suicide; Lifeline 13 11 14'),
  ],
  C3: [
    d('spray', 'Capsicum spray was used in the hallway.',
      [['work-normal', 'Work as normal'], ['extra-ppe-work', 'Extra PPE and work steps for the spray residue'], ['wipe-dry-cloth', 'Wipe it with a dry cloth']],
      'extra-ppe-work', 'Pepper spray at a scene needs extra PPE and procedures.',
      'S540 7.3'),
    d('powder', 'Black fingerprint powder is on the door frames.',
      [['wipe-wet-cloth', 'Wipe it with a wet cloth at once'], ['treat-contaminant-hepa', 'Treat it as a contaminant: take the loose powder off dry (HEPA vacuum or dry cloth), then clean'], ['leave-owner', 'Leave it for the owner']],
      'treat-contaminant-hepa', 'Fingerprint powder is listed as scene contamination. Police advice: remove it dry first, then use a cleaner; wetting it first smears it.',
      'S540 8.1; NSW Police crime scene clean up (dry first, then an ammonia-based cleaner)'),
  ],
  B1: [
    d('spread', 'Fluids have run under the vinyl floor.',
      [['clean-top-vinyl', 'Clean the top of the vinyl'], ['lift-follow-fluid', 'Lift it, follow the fluid path, and remove affected porous material until nothing is detected'], ['spray-deodoriser', 'Spray deodoriser']],
      'lift-follow-fluid', 'Fluids follow the easiest path and hide. Subfloor may need removal.',
      'S540 8.3, 8.10.2'),
    d('odour', 'The smell stays after removal. When can you seal the floor?',
      [['seal-now-lock', 'Seal it now to lock the smell in'], ['never-seal', 'Never seal'], ['only-after-cleaning', 'Only after cleaning, disinfecting and drying']],
      'only-after-cleaning', 'Sealing comes last, after cleaning, disinfection and drying.',
      'S540 8.11.4, 8.11.5'),
  ],
  B2: [
    d('sharps', 'You find a syringe in the couch.',
      [['put-rubbish-bag', 'Put it in a rubbish bag'], ['into-closed-puncture', 'Into a closed, puncture-resistant sharps container with the biohazard label'], ['leave-tenant', 'Leave it for the tenant']],
      'into-closed-puncture', 'Sharps go only in a puncture-resistant, labelled container.',
      'S540 11.3.2'),
    d('needlestick', 'A technician gets a needlestick.',
      [['finish-shift-first', 'Finish the shift first'], ['first-aid-tell', 'First aid, tell the supervisor, leave the area, get medical follow-up'], ['put-plaster', 'Put a plaster on it']],
      'first-aid-tell', 'A needlestick is an exposure incident with a set response.',
      'S540 8.9'),
  ],
  B3: [
    d('order', 'What comes first on a soiled bench?',
      [['spray-disinfectant-straight', 'Spray disinfectant straight on'], ['disinfect-only', 'Disinfect only'], ['clean-detergent-then', 'Clean with detergent, then disinfect for the label dwell time']],
      'clean-detergent-then', 'Dirt stops a disinfectant working. Clean first, then hold the dwell time.',
      'S540 8.11.1, 8.11.3'),
    d('product', 'Which disinfectant?',
      [['whatever-cupboard', 'Whatever is in the cupboard'], ['bleach-any-strength', 'Bleach at any strength'], ['registered-product-that', 'A registered product that names the target germ, used to the label']],
      'registered-product-that', 'Only registered products, matched to the pathogen and used to the label.',
      'S540 3.2, 8.11.3'),
  ],
  CL1: [
    d('test', 'Who does the first testing?',
      [['quick-wipe-kit', 'You, with a quick wipe kit'], ['independent-specialist-wipe', 'An independent specialist, with wipe samples sent to a NATA-accredited lab'], ['nobody-police-already', 'Nobody, the police already know']],
      'independent-specialist-wipe', 'Testing should be independent of the cleaner. Quick kits show presence only, not amount.',
      'S900 3.5.2'),
    d('clear', 'You have cleaned. How is the house cleared for people to live in?',
      [['looks-smells-clean', 'It looks and smells clean'], ['independent-sampling-lab', 'Independent sampling with lab results against the legal limit'], ['own-quick-wipe', 'Your own quick wipe test']],
      'independent-sampling-lab', 'A visual check cannot verify a drug property. Clearance uses quantitative sampling by someone independent.',
      'S900 14.2, 14.2.1, 14.2.3, 1.2'),
  ],
  CL2: [
    d('first', 'The landlord wants it repainted before new tenants. What first?',
      [['paint-over', 'Paint over it'], ['test-first-find', 'Test first to find out what is there and how much'], ['clean-everything-bleach', 'Clean everything with bleach']],
      'test-first-find', 'Assess and test before the plan and the work.',
      'S900 10.1, 3.5.2'),
    d('hvac', 'The house has ducted heating. What happens to it?',
      [['run-air-house', 'Run it to air the house out'], ['leave', 'Leave it as is'], ['shut-down-until', 'Shut it down until it is checked; replace contaminated duct lining']],
      'shut-down-until', 'The HVAC can spread residue. Shut it down until checked; replace porous duct parts.',
      'S900 10.5'),
  ],
  ST2: [
    d('entry', 'Part of the roof is gone and a wall is cracked. Do you go in?',
      [['yes-quickly', 'Yes, quickly'], ['only-hard-hat', 'Only with a hard hat'], ['not-until-structure', 'Not until the structure is checked sound and power and gas are safe']],
      'not-until-structure', 'Check structural soundness, shock risk and gas before entry. Stabilise the building first.',
      'S500:2021 12.2.4; S700 5.3'),
    d('cover', 'Rain is still coming in. What first?',
      [['dry-ceiling-while', 'Dry the ceiling while it rains'], ['set-up-dehumidifiers', 'Set up dehumidifiers'], ['stop-water-temporary', 'Stop the water: a temporary roof cover fitted by a safe, qualified crew']],
      'stop-water-temporary', 'Stop the water source first. Tarping is part of stabilising the building.',
      'S500:2021 12.2.5; S700 5.3'),
  ],
  ST3: [
    d('ceiling', 'A wet plasterboard ceiling is sagging.',
      [['keep-everyone-out', 'Keep everyone out from under it until it is made safe'], ['stand-under-push', 'Stand under it and push it back up'], ['leave-dry', 'Leave it to dry']],
      'keep-everyone-out', 'Check structural soundness before entry; a wet ceiling can fall.',
      'S500:2021 12.2.4'),
    d('insulation', 'The ceiling batts are soaked and flattened.',
      [['dry-them-place', 'Dry them in place'], ['leave-them-roofer', 'Leave them for the roofer'], ['remove-them', 'Remove them']],
      'remove-them', 'Collapsed insulation is removed in any Category.',
      'S500:2021 16.2.2'),
  ],
  HS1: [
    d('access', 'Exits are blocked and the floors are piled high.',
      [['dig-straight-through', 'Dig straight through to the leak'], ['start-drying-around', 'Start drying around the piles'], ['make-safe-access', 'Make safe access first: clear an exit path and check hazards and floor load']],
      'make-safe-access', 'The hazard assessment comes before any work. Piled contents soaked with water are far heavier, so structural soundness is checked before anyone goes in.',
      'S500:2021 8.1, 12.2.4 (structural soundness before entry)'),
    d('person', 'The occupant is distressed about losing things.',
      [['treat-them-respect', 'Treat them with respect, agree in writing what goes, and offer a referral to support services'], ['throw-everything-out', 'Throw everything out to finish faster'], ['leave-without-talking', 'Leave without talking']],
      'treat-them-respect', 'Distressed clients need a calm, caring lead, and disposal needs agreement. A one-off forced clean-up causes great distress and does not last; refer them to support.',
      'S540 5.2.1, 8.10.3 (by analogy); WA Health Hoarding and squalor guideline 2026; Vic DH Responding to hoarding and squalor 2013'),
  ],
  HS2: [
    d('category', 'Sewage has been on the floors for months. Which Category?',
      [['1', '1'], ['2', '2'], ['3', '3']],
      '3', 'Sewage is Category 3.',
      'S500:2021 Category definitions'),
    d('pests', 'Rats and cockroaches are everywhere.',
      [['arrange-pest-control', 'Arrange pest control before or with the clean'], ['start-cleaning-they', 'Start cleaning, they will leave'], ['ignore-them', 'Ignore them']],
      'arrange-pest-control', 'Pests and their droppings are contamination. Baiting runs for weeks and clearing the clutter removes their harbourage, so the two go together.',
      'S540 8.1; AEPMA Rodent Management Code v1.3i 2026; Vic DH Responding to hoarding and squalor 2013'),
  ],
  AS1: [
    d('stop', 'A worker has cut through a fibro sheet in a 1970s house.',
      [['keep-going-one', 'Keep going, it is one sheet'], ['stop-work-keep', 'Stop work, keep people out, do not sweep; have it tested and removed safely, by a licensed removalist where the law requires'], ['wet-keep-cutting', 'Wet it and keep cutting']],
      'stop-work-keep', 'Stop any work that can make asbestos airborne; power tools on asbestos are restricted. Over 10 m2 of non-friable asbestos, or any friable asbestos, needs a licensed removalist; in the ACT, any amount does.',
      'S500:2021 8.7; S520 9; WHS Regs 2011 r446, r458 (Vic has its own regs); SWA Code: How to safely remove asbestos (10 m2 rule; not ACT)'),
    d('test', 'You are about to strip the next room.',
      [['assume-fine', 'Assume it is fine'], ['test-suspect-materials', 'Test suspect materials before cutting'], ['ask-owner-if', 'Ask the owner if it has asbestos']],
      'test-suspect-materials', 'Test before demolition. Do not assume a house is free of asbestos.',
      'S700 5.2.1; S520 7.3'),
  ],
  AS2: [
    d('lift', 'Old vinyl tiles are lifting under the wet floor.',
      [['scrape-them-up', 'Scrape them up to dry the slab'], ['pull-them-up', 'Pull them up dry'], ['test-tiles-adhesive', 'Test the tiles and the adhesive before lifting']],
      'test-tiles-adhesive', 'Vinyl tiles and their adhesive often contain asbestos.',
      'S500:2021 8.7; S700 5.2.1'),
    d('positive', 'The test is positive. How do you dry the floor?',
      [['dry-without-disturbing', 'Dry without disturbing them, or a licensed removalist removes them first'], ['lift-tiles-yourself', 'Lift the tiles yourself, carefully'], ['sand-them-flat', 'Sand them flat']],
      'dry-without-disturbing', 'Do not disturb asbestos; removal is licensed work.',
      'S500:2021 8.7'),
  ],
  SW1: [
    d('carpet', 'Carpet and underlay are soaked with sewage.',
      [['dry-them-place', 'Dry them in place'], ['clean-dry-carpet', 'Clean and dry the carpet, discard the underlay'], ['remove-both-then', 'Remove both, then assess the floor below']],
      'remove-both-then', 'After Category 3, carpet and underlay both come out.',
      'S500:2021 16.3.7, 16.2.2.2'),
    d('air', 'How is the air set while you remove contaminated material?',
      [['fast-air-movers', 'Fast air movers to dry it quickly'], ['open-windows-doors', 'Open the windows and doors'], ['negative-pressure-slow', 'Negative pressure, slow air over contaminated surfaces']],
      'negative-pressure-slow', 'Keep it at negative pressure and keep air slow while remediating.',
      'S500:2021 12.3, 12.3.5'),
  ],
  SW2: [
    d('category', 'Water came back from beyond the toilet trap. Which Category?',
      [['1', '1'], ['3', '3'], ['2', '2']],
      '3', 'Backflow from beyond a trap is Category 3.',
      'S500:2021 Category definitions'),
    d('debris', 'Bagged contaminated waste must pass through the clean hallway.',
      [['double-bag', 'Double-bag it'], ['one-bag', 'One bag'], ['carry-unbagged-quick', 'Carry it unbagged, it is quick']],
      'double-bag', 'Double-bag contaminated debris that passes through clean areas.',
      'S500:2021 12.3'),
  ],
  SW3: [
    d('source', 'What comes before cleaning?',
      [['clean-first', 'Clean first'], ['start-drying', 'Start drying'], ['stop-source-licensed', 'Stop the source: a licensed plumber fixes the septic system']],
      'stop-source-licensed', 'Stop the source first; repairs go to licensed trades.',
      'S500:2021 12.2.5, 1.2.3, 1.2.5'),
    d('ppe', 'What do you wear?',
      [['respirator-eye-protection', 'Respirator, eye protection, coveralls with hood and booties, gloves and boots'], ['gloves-only', 'Gloves only'], ['nothing-extra', 'Nothing extra']],
      'respirator-eye-protection', 'Category 3 work needs the full PPE list and clean work habits.',
      'S500:2021 8.4, 8.13'),
  ],
  ST1: [
    d('power', 'Floodwater reached the power points. What happens before anyone works inside?',
      [['switch-power-run', 'Switch the power on to run equipment'], ['wear-rubber-gloves', 'Wear rubber gloves'], ['power-stays-off', 'Power stays off until a qualified electrician checks it']],
      'power-stays-off', 'Wet electrical systems stay off until a qualified person checks them.',
      'S500:2021 16.3.15, 12.2.4'),
    d('wallboard', 'Plasterboard is wet to 1 m with floodwater.',
      [['dry-place', 'Dry it in place'], ['remove-dry-frame', 'Remove it, dry the frame to the goal, then refit']],
      'remove-dry-frame', 'After Category 3, wallboard comes out; dry behind it before refitting.',
      'S500:2021 16.2.2.2, 16.2.1'),
  ],
  ST4: [
    d('category', 'Sea water from the surge came in. Which Category?',
      [['1', '1'], ['2', '2'], ['3', '3']],
      '3', 'Sea water is Category 3.',
      'S500:2021 Category definitions'),
    d('carpet', 'Carpet and underlay are soaked with surge water.',
      [['dry-them-place', 'Dry them in place'], ['remove-both-then', 'Remove both, then assess the floor below'], ['clean-carpet-discard', 'Clean the carpet, discard the underlay']],
      'remove-both-then', 'After Category 3, carpet and underlay both come out.',
      'S500:2021 16.3.7'),
  ],
}

export type JobStage = 'on-site' | 'complete'

/** The service's judgement of the stops the player called before entry. */
export interface StopsCall {
  readonly called: readonly SafetyStop[]
  readonly required: readonly SafetyStop[]
  readonly missed: readonly SafetyStop[]
  /** Called but not required: not wrong, noted so the player learns what this job does not need. */
  readonly extra: readonly SafetyStop[]
  readonly correct: boolean
  readonly why: string
}

export interface WaterCall {
  readonly category: LibraryCategory
  readonly waterClass: WaterClass | null
  readonly acceptedCategories: readonly LibraryCategory[]
  readonly acceptedClasses: readonly WaterClass[] | null
  readonly correct: boolean
  readonly why: string
}

/** The service's judgement of one decision: the option called, the right one, why, and the source. */
export interface DecisionCall {
  readonly optionId: string
  readonly rightOptionId: string
  readonly correct: boolean
  readonly why: string
  readonly source: string
}

/** A decision as the job shows it: the prompt and options, and no answer until it is called. */
export interface JobDecision {
  readonly id: string
  readonly prompt: string
  readonly options: ReadonlyArray<Readonly<{ id: string; label: string }>>
  readonly call: DecisionCall | null
}

/** A library job: one scenario on one house, played at triage. Separate from the L2 claim, which is unchanged. */
export interface LibraryJob {
  readonly scenarioId: ScenarioId
  readonly houseType: HouseTypeId
  readonly title: string
  readonly family: ScenarioFamily
  readonly stage: JobStage
  /** What the technician is told and sees on arrival: the scenario's site and the house's build. Never the answers. */
  readonly briefing: readonly string[]
  readonly needsWaterCall: boolean
  readonly callsClass: boolean
  readonly stopsCall: StopsCall | null
  readonly waterCall: WaterCall | null
  /** A3: the scenario's decisions, in order; empty where none are written yet. */
  readonly decisions: readonly JobDecision[]
  /** What the full job decides, as the catalogue lists it; shown in the debrief. */
  readonly keyDecisions: string
  readonly evidenceLevel: 'indicative'
}

export function scenarioById(id: string): LibraryScenario | undefined {
  return SCENARIOS.find(x => x.id === id)
}

export function houseById(id: string): HouseType | undefined {
  return HOUSE_TYPES.find(h => h.id === id)
}

/** The stops a job needs: the scenario's own, plus asbestos and lead where the house's age presumes them. */
export function stopsFor(scenario: LibraryScenario, house: HouseType): readonly SafetyStop[] {
  const need = new Set<SafetyStop>(scenario.stops)
  if (house.asbestosPresumed) need.add('ASB')
  if (house.leadPaintPresumed) need.add('LEAD')
  return SAFETY_STOPS.filter(x => need.has(x))
}

export function newLibraryJob(scenario: LibraryScenario, house: HouseType): LibraryJob {
  return {
    scenarioId: scenario.id,
    houseType: house.id,
    title: `${scenario.title}: ${house.name}`,
    family: scenario.family,
    stage: 'on-site',
    briefing: [
      `The job: ${scenario.title}.`,
      `Affected: ${scenario.site}.`,
      `The house: ${house.name}, built ${house.era}. Storeys: ${house.storeys}.`,
      `Floor: ${house.floor}. Walls: ${house.walls}. Linings: ${house.lining}. Roof: ${house.roof}.`,
    ],
    needsWaterCall: scenario.water !== null,
    callsClass: scenario.water?.classes != null,
    stopsCall: null,
    waterCall: null,
    decisions: (DECISIONS[scenario.id] ?? []).map(x => ({ id: x.id, prompt: x.prompt, options: x.options, call: null })),
    keyDecisions: scenario.keyDecisions,
    evidenceLevel: 'indicative',
  }
}

export function judgeStops(scenario: LibraryScenario, house: HouseType, called: readonly SafetyStop[]): StopsCall {
  const required = stopsFor(scenario, house)
  const missed = required.filter(x => !called.includes(x))
  const extra = SAFETY_STOPS.filter(x => called.includes(x) && !required.includes(x))
  const correct = missed.length === 0
  const lines = [correct
    ? `Right: you called every stop this job needs (${required.length}).`
    : `Missed ${missed.length} of ${required.length}: ${missed.map(x => `${STOP_LABELS[x].label}. ${STOP_LABELS[x].why}`).join(' ')}`]
  if (extra.length > 0) lines.push(`Not needed on this job: ${extra.map(x => STOP_LABELS[x].label).join(', ')}.`)
  return { called: SAFETY_STOPS.filter(x => called.includes(x)), required, missed, extra, correct, why: lines.join(' ') }
}

export function judgeWater(answer: WaterAnswer, category: LibraryCategory, waterClass: WaterClass | null): WaterCall {
  const categoryRight = answer.categories.includes(category)
  const classRight = answer.classes === null || (waterClass !== null && answer.classes.includes(waterClass))
  const parts = [categoryRight ? `Category ${category} is right.` : `Category ${category} is wrong: this job is ${answer.categories.map(c => `Category ${c}`).join(' or ')}.`]
  if (answer.classes) {
    parts.push(classRight ? `Class ${waterClass} is right.` : `Class ${waterClass} is wrong: this job is ${answer.classes.map(c => `Class ${c}`).join(' or ')}.`)
  }
  parts.push(`The catalogue writes it as: ${answer.catalogue}.`)
  return {
    category, waterClass, acceptedCategories: answer.categories, acceptedClasses: answer.classes,
    correct: categoryRight && classRight, why: parts.join(' '),
  }
}

export function judgeDecision(decision: ScenarioDecision, optionId: string): DecisionCall {
  const right = decision.options.find(o => o.id === decision.right)
  const correct = optionId === decision.right
  return {
    optionId, rightOptionId: decision.right, correct, source: decision.source,
    why: `${correct ? 'Right.' : `Not this one. The right call: ${right?.label}.`} ${decision.why}`,
  }
}

/** What the entry panel shows for a scenario. It carries no answers: no stops, no Category, no Class. */
export interface ScenarioSummary {
  readonly id: ScenarioId
  readonly family: ScenarioFamily
  readonly title: string
  readonly houses: readonly HouseTypeId[]
  readonly houseRule: string | null
  readonly waterCall: 'none' | 'category' | 'category-and-class'
}

export interface Library {
  readonly families: ReadonlyArray<Readonly<{ id: ScenarioFamily; label: string }>>
  readonly houses: readonly HouseType[]
  readonly scenarios: readonly ScenarioSummary[]
  readonly stops: ReadonlyArray<Readonly<{ id: SafetyStop; label: string }>>
}

const FAMILY_LABELS: Readonly<Record<ScenarioFamily, string>> = {
  water: 'Water', 'water-mould': 'Water and mould', mould: 'Mould', fire: 'Fire and smoke', 'crime-scene': 'Crime scene',
  biohazard: 'Biohazard', storm: 'Storm and flood', sewage: 'Sewage', hoarding: 'Hoarding and squalor',
  'clandestine-lab': 'Drug lab residue', asbestos: 'Asbestos',
}

export const LIBRARY: Library = Object.freeze({
  families: Object.freeze((Object.keys(FAMILY_LABELS) as ScenarioFamily[]).map(id => Object.freeze({ id, label: FAMILY_LABELS[id] }))),
  houses: HOUSE_TYPES,
  scenarios: Object.freeze(SCENARIOS.map(x => Object.freeze({
    id: x.id, family: x.family, title: x.title, houses: x.houses, houseRule: x.houseRule,
    waterCall: (x.water === null ? 'none' : x.water.classes === null ? 'category' : 'category-and-class') as ScenarioSummary['waterCall'],
  }))),
  stops: Object.freeze(SAFETY_STOPS.map(id => Object.freeze({ id, label: STOP_LABELS[id].label }))),
})

/** Load-time checks on the data: refuses to start if a row is broken. Tests pass a changed house list or decision table. */
export function checkLibrary(houses: readonly HouseType[] = HOUSE_TYPES,
  decisions: Readonly<Partial<Record<string, readonly ScenarioDecision[]>>> = DECISIONS): void {
  const problems: string[] = []
  const ids = SCENARIOS.map(x => x.id)
  if (new Set(ids).size !== 49) problems.push(`${new Set(ids).size} distinct scenarios, expected 49`)
  if (houses.length !== 10 || new Set(houses.map(h => h.id)).size !== 10) problems.push('expected 10 distinct houses')
  for (const h of houses) {
    const m = h.model
    if (m.widthM % 2 !== 0 || m.depthM % 2 !== 0 || m.widthM < 4 || m.depthM < 4) problems.push(`${h.id} footprint is off the 2 m grid`)
    if (!Number.isInteger(m.storeys) || m.storeys < 1) problems.push(`${h.id} storeys must be a whole number from 1`)
    if ((m.roofForm === 'flat') !== (m.roofPitchDeg === 0)) problems.push(`${h.id} roof pitch does not match its form`)
    if (m.roofPitchDeg < 0 || m.roofPitchDeg > 45 || m.floorHeightM < 0 || m.floorHeightM > 3) problems.push(`${h.id} model number out of range`)
  }
  for (const x of SCENARIOS) {
    if (x.houses.length === 0) problems.push(`${x.id} suits no house`)
    if ((x.houses.length < 10) !== (x.houseRule !== null)) problems.push(`${x.id} house rule does not match its house list`)
    if (x.stops.length === 0) problems.push(`${x.id} has no stops`)
    if (x.water && x.water.categories.length === 0) problems.push(`${x.id} water call accepts no Category`)
  }
  for (const [id, list] of Object.entries(decisions)) {
    if (!ids.includes(id as ScenarioId)) problems.push(`decisions for unknown scenario ${id}`)
    if (new Set((list ?? []).map(x => x.id)).size !== (list ?? []).length) problems.push(`${id} repeats a decision id`)
    for (const x of list ?? []) {
      const options = x.options.map(o => o.id)
      if (options.length < 2 || new Set(options).size !== options.length) problems.push(`${id}/${x.id} needs two or more distinct options`)
      if (!options.includes(x.right)) problems.push(`${id}/${x.id} right option is not one of its options`)
      if (!x.why.trim() || !x.source.trim()) problems.push(`${id}/${x.id} has no reason or no source`)
    }
  }
  if (problems.length > 0) throw new Error('A1 scenario library refused: ' + problems.join('; '))
}
checkLibrary()

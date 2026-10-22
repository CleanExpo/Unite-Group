/**
 * The living business card editions, as shipped in the card kit
 * (Synthex business-card/brand-kits/phill-mcgurk.json @ f0398a22).
 * Media are byte-identical local copies under public/cards/media — never hotlinked.
 * Descriptions were written from frames of each clip (0.3 s, 1.5 s, 2.7 s), not from the edition names.
 */

export type Edition = {
  name: string
  label: string
  line: string
  video: string
  poster: string
  /** Seconds. The kit trims trailing frames by pausing here. */
  stopAt: number
  /** Higgsfield generation job the clip came from. */
  job: string
  /** Poster aspect: editions are 9:16, the signature reveal is square. */
  aspect: '9/16' | '1/1'
}

const media = (file: string) => `/cards/media/${file}`

function edition(name: string, label: string, line: string, job: string): Edition {
  return {
    name,
    label,
    line,
    video: media(`edition-${name}.mp4`),
    poster: media(`edition-${name}-poster.jpg`),
    stopAt: 3.95,
    job,
    aspect: '9/16',
  }
}

export const EDITIONS: readonly Edition[] = [
  {
    name: 'signature',
    label: 'Signature reveal',
    line: 'The original four-second logo reveal.',
    video: media('unite-nexus-reveal-h264.mp4'),
    poster: media('unite-nexus-reveal-poster.jpg'),
    stopAt: 3.35,
    job: '9d9d98d9-dc53-47df-a610-ede9fa7179d8',
    aspect: '1/1',
  },
  edition('blueprint', 'Blueprint', 'A spark draws the logo in white linework on navy, then it lights up.', '79c25c92-eac8-4b11-87e5-07f9422b3c4a'),
  edition('forge', 'Forge', 'Molten metal pours into a mould and sets as the logo in dark stone.', '4712e0de-ce47-46f8-b093-04520c11d639'),
  edition('constellation', 'Constellation', 'Stars join up into the logo across a night sky.', '54e6e2bf-e8c4-41f5-ba0d-a99a93b137b2'),
  edition('ink', 'Ink', 'One drop splashes, and the logo glows out of the swirl.', '90463cb2-9496-4070-b1d8-93327812edab'),
  edition('rewind', 'Rewind', 'Shattered glass lights up and pulls itself back together.', '62822ddf-df7b-406d-a52c-af4a1fb6acc4'),
  edition('skyline', 'Skyline', 'A fast flight through a city at night, up to the logo.', 'dd07eaba-07eb-4d50-96f8-37f80a4d3558'),
  edition('origami', 'Origami', 'Dark paper folds itself into the logo, then it lights up.', 'ac453c47-ca08-4e94-9e0f-761c69f6ab52'),
  edition('portal', 'Portal', 'A cracked phone screen gives way to a vortex that opens on the logo.', '911c388b-fe9e-4c61-ac3e-524b048017bc'),
  edition('restoration', 'Restoration', 'A stained, cracked wall cleans back to the logo.', 'cc159c97-8175-4f21-b5c1-49d68d63b72c'),
  edition('magnet', 'Magnet', 'Scattered metal beads are pulled together into the logo.', '74047787-3e84-4104-9ce8-85d3d227af18'),
]

export const AI_LABEL = 'AI-generated clip (Higgsfield)'

/** A known edition name from ?edition=, or null. Unknown and malformed values are ignored, never guessed. */
export function resolveEdition(param: string | string[] | undefined): Edition | null {
  const raw = Array.isArray(param) ? param[0] : param
  if (!raw) return null
  const name = raw.trim().toLowerCase()
  return EDITIONS.find((e) => e.name === name) ?? null
}

/** The referring card's ?ref=, reduced to the same safe alphabet the card itself uses. */
export function cleanRef(param: string | string[] | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param
  const ref = (raw ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 60)
  return ref || null
}

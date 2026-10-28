/**
 * The living business card editions, as shipped in the card kit
 * (Synthex business-card/site/media + brand-kits/phill-mcgurk.json), all ending on the
 * cracked-U logo Phill made current on 22/10/2026.
 * Media are byte-identical local copies under public/cards/media — never hotlinked.
 * stopAt values are the kit's, checked by eye on each clip's resting frame.
 * Descriptions were written from frames of each clip, not from the edition names.
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
  /** A 9:16 poster for the /cards/order picker, whose tiles are all 9:16. Only the square signature needs one. */
  pickerPoster?: string
}

const media = (file: string) => `/cards/media/${file}`

function edition(name: string, label: string, line: string, job: string, stopAt: number): Edition {
  return {
    name,
    label,
    line,
    video: media(`edition-${name}.mp4`),
    poster: media(`edition-${name}-poster.jpg`),
    stopAt,
    job,
    aspect: '9/16',
  }
}

export const EDITIONS: readonly Edition[] = [
  {
    name: 'signature',
    label: 'Signature reveal',
    line: 'Glowing shards fly together into the cracked U.',
    video: media('unite-nexus-u-reveal-h264.mp4'),
    poster: media('unite-nexus-u-reveal-poster.jpg'),
    stopAt: 4.4,
    job: 'f51278f4-e500-480c-9bde-fc2fe7674e5d',
    aspect: '1/1',
    pickerPoster: media('unite-nexus-u-reveal-poster-9x16.jpg'),
  },
  edition('blueprint', 'Blueprint', 'A spark sketches the U in white linework on navy, then it glows orange.', '77aaf2d3-29ec-4675-b3f6-025eb31c1071', 3.95),
  edition('forge', 'Forge', 'Molten metal pours into a stone mould and sets as the logo.', 'cb3e17f6-bb76-4ab5-9d8b-93f1b9b56c94', 3.95),
  edition('constellation', 'Constellation', 'Stars join up into the U across a night sky.', 'b5a430e5-0fd6-4512-bb40-9d308e7bbbc2', 3.95),
  edition('ink', 'Ink', 'One amber drop splashes, and the U glows out of the swirl.', 'e530a648-92d5-4b33-9a60-2a07d0be34c7', 3.95),
  edition('rewind', 'Rewind', 'Shattered glass lights up and pulls back together around the U.', 'e13f34a8-2f82-4bfa-bcb5-512d03a6dfe0', 3.95),
  edition('skyline', 'Skyline', 'A fast flight through a city at night, up to the logo.', 'b19f1950-7276-4a0a-a744-2de2a760c34f', 3.95),
  edition('origami', 'Origami', 'Dark paper folds itself into the U, then it lights up.', '99497770-0c6d-4e59-95df-0265cdac0735', 3.95),
  edition('portal', 'Portal', 'A cracked phone screen gives way to a vortex that opens on the logo.', '8e9d89bc-f798-4196-af4f-400838d99ae5', 3.95),
  edition('magnet', 'Magnet', 'Scattered beads are pulled together into the logo.', '0737511e-1b52-4b58-aab7-756189148826', 3.45),
]

/**
 * YouTube ids for each edition film, once Phill confirms them from YouTube Studio. Empty on purpose: never
 * guess an id. An edition with no id plays its hosted MP4.
 */
export const EDITION_YOUTUBE_IDS: Readonly<Record<string, string>> = {}

/** The configured YouTube id for an edition, or null. Only 11-character YouTube ids are accepted. */
export function youtubeIdFor(name: string, ids: Readonly<Record<string, string>> = EDITION_YOUTUBE_IDS): string | null {
  const id = ids[name]
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}

/** The edition the sample card and the receipt show. */
export const DEMO_EDITION = 'constellation'

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

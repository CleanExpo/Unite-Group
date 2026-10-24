// The films on the public home, named in ONE place. Swap a file here and nowhere else.
// The poster is the exact last frame of its film, so the hold after the film ends is not a jump.

export type Film = {
  mp4: string
  webm?: string
  poster: string
  width: number
  height: number
  /** What the poster shows, for the img alt. The film itself is decoration. */
  alt: string
}

// Hero: the shards fly in from both sides and lock into the copper U. 16:9, 8 s, no text in the picture.
export const HERO_FILM: Film = {
  mp4: '/landing/media/unite-group-hero-u-assemble-16x9-web.mp4',
  webm: '/landing/media/unite-group-hero-u-assemble-16x9.webm',
  poster: '/landing/media/unite-group-hero-u-poster-16x9.jpg',
  width: 1924,
  height: 1076,
  alt: 'A glowing copper U made of glass shards, lit from behind in a dark studio',
}

// The card strip: the U reveal film that ends on the Unite-Group Nexus name, square.
export const CARD_FILM: Film = {
  mp4: '/cards/media/unite-nexus-u-reveal-h264.mp4',
  poster: '/cards/media/unite-nexus-u-reveal-poster.jpg',
  width: 960,
  height: 960,
  alt: 'A frame from a video business card: a copper U that ends on the Unite-Group Nexus name',
}

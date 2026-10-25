import type { Pillar } from '@/lib/public-site'

// Real Unite-Group screens on the four pillar pages, captured from a local dev server with invented
// sample data only (founder rule 25/10/2026: the real product or the real job, never abstract art).
// Files sit in public/solutions at 2x or more of the largest size each is shown. The frame is CSS, not baked in.
export type Screen = {
  src: string
  width: number
  height: number
  alt: string
  frame: 'browser' | 'phone'
  /** The CSS width the screen was captured at; the frame never shows it wider, so text stays at or below its real size. */
  cssWidth: number
}

export type PillarScreens = { hero: Screen; support?: Screen }

const screen = (file: string, width: number, height: number, frame: Screen['frame'], alt: string, density = 2): Screen => ({
  src: `/solutions/${file}.webp`,
  width,
  height,
  alt,
  frame,
  cssWidth: width / density,
})

export const PILLAR_SCREENS: Record<Pillar['slug'], PillarScreens> = {
  visibility: {
    hero: screen('visibility-site-analytics', 1200, 900, 'browser', 'The Unite-Group site analytics screen with sample numbers: page views by day for the last 7 days, 176 in total'),
    support: screen('visibility-top-referrers', 1116, 803, 'browser', 'Top referrers from the same screen: google.com, chatgpt.com, bing.com, perplexity.ai and linkedin.com, with sample counts', 3),
  },
  experience: {
    hero: screen('experience-card-editions', 1360, 1190, 'browser', 'The living business card showroom: three of the ten editions, Blueprint, Forge and Constellation, each a short clip ending on the logo with a play button and a Choose this link'),
    support: screen('experience-cards-phone', 780, 1688, 'phone', 'The living business card page on a phone: the headline, a Get your own card button and the signature reveal clip'),
  },
  conversion: {
    hero: screen('conversion-sample-card', 780, 1688, 'phone', 'A sample living business card for Sam Sample of Sample Client Pty Ltd on a phone: Call, Email and Save contact buttons above a short enquiry form'),
  },
  intelligence: {
    hero: screen('intelligence-inbox', 1200, 900, 'browser', 'The Unite-Group inbox with sample enquiries, newest first, each tagged Card enquiry, Website lead or Card feedback'),
    support: screen('intelligence-top-pages', 1472, 467, 'browser', 'Top pages and call-to-action clicks from the site analytics screen, with sample counts'),
  },
}

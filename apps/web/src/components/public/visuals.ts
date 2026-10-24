// The pictures on the home page, named in ONE place. Swapping a picture is a one-line change here and nowhere else.
// Phill, 25/10/2026: the same picture must not appear twice on the page. So a slot is either a file no other slot
// uses, or null, and a null slot renders a plain glass card (no placeholder, no repeat). The look-dev pictures are
// not made yet; when one arrives in session-handoffs/landing-visuals, convert it to a webp about 1200 px wide in
// public/landing/visuals and put its path on that slot. Only slots that are null today need it.
// The pictures carry no text of their own: every word on the page is real HTML.
// A test fails if a file is mapped to two slots, or appears in more than one section of the page.

export type Visual = { src: string; width: number; height: number }

export type VisualSlot = 'intelligence' | 'nexus' | 'network' | 'visibility' | 'experience' | 'conversion' | 'stepPick' | 'stepSend' | 'stepApprove' | 'showroom'

export const VISUALS: Record<VisualSlot, Visual | null> = {
  // Intelligence picture: the Intelligence job card only.
  intelligence: { src: '/landing/visuals/intelligence.webp', width: 1200, height: 896 },
  // The U reveal still that already ships with the card showroom (9:16), on the Nexus media card.
  nexus: { src: '/cards/media/unite-nexus-u-reveal-poster-9x16.jpg', width: 720, height: 1280 },
  network: null,
  visibility: null,
  experience: null,
  conversion: null,
  stepPick: null,
  stepSend: null,
  stepApprove: null,
  showroom: null,
}

// The pictures on the home page, named in ONE place. Swapping a picture is a one-line change here and nowhere else.
// Phill, 25/10/2026: the same picture must not appear twice on the page, and each approved picture sits in its own slot.
// A slot is either a file (with a 640 px copy for small screens) used by no other slot, or null, and a null slot renders a
// plain glass card. The Nexus CRM card has no picture of its own yet, so it is null. Files are webp in public/landing/visuals,
// 1280 px wide with a 640 px copy, converted from the approved pictures in session-handoffs/landing-visuals.
// The pictures carry no text of their own: every word on the page is real HTML. Alt text says what each picture shows.
// A test fails if a file is mapped to two slots, or appears more than once on the page.

export type Visual = { src: string; small: string; width: number; height: number; alt: string }

export type VisualSlot = 'intelligence' | 'nexus' | 'network' | 'visibility' | 'experience' | 'conversion' | 'stepPick' | 'stepSend' | 'stepApprove' | 'showroom'

const picture = (name: string, width: number, height: number, alt: string): Visual => ({
  src: `/landing/visuals/${name}-1280.webp`,
  small: `/landing/visuals/${name}-640.webp`,
  width,
  height,
  alt,
})

export const VISUALS: Record<VisualSlot, Visual | null> = {
  intelligence: picture('intelligence', 1280, 956, 'A dark cracked sphere glowing orange at its core, joined by fine threads to amber shards around it'),
  nexus: null,
  network: picture('network', 1280, 714, 'A floating dark landmass threaded with glowing orange lines and bright points, set against a starry sky'),
  visibility: picture('visibility', 1280, 956, 'A glowing amber shard hovering above a bed of black gravel, lit from within'),
  experience: picture('experience', 1280, 956, 'A black card cracking open along glowing orange lines as fragments fly off'),
  conversion: picture('conversion', 1280, 956, 'A glowing amber shard shooting out of a stone furnace onto an anvil in a shower of sparks'),
  stepPick: picture('step-pick', 1280, 956, 'A row of glass panels in a dark hall with one panel lit orange at the centre'),
  stepSend: picture('step-send', 1280, 956, 'A glowing amber shard streaking across a starry sky, trailing fire'),
  stepApprove: picture('step-approve', 1280, 956, 'A dark boulder splitting in two with molten orange light inside'),
  showroom: picture('showroom', 1280, 714, 'A dark hall lined with plinths, each holding a glowing amber shard, leading to a lit doorway'),
}

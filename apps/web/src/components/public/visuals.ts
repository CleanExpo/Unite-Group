// The pictures on the home page, named in ONE place. Swapping a picture is a one-line change here and nowhere else.
// Phill, 25/10/2026: the same picture must not appear twice on the page, and each approved picture sits in its own slot.
// A slot is either a file (with a 640 px copy for small screens) used by no other slot, or null, and a null slot renders a
// plain glass card. Files are webp in public/landing/visuals, 1280 px wide with a 640 px copy, converted from the approved
// pictures in session-handoffs/landing-visuals. The Nexus CRM picture is a real screenshot of the product's Inbox with invented
// demo data (no real person), set in a tilted screen; Phill, 25/10/2026: it must show the actual product, not an abstract image.
// The pictures carry no text of their own: every word on the page is real HTML. Alt text says what each picture shows.
// A test fails if a file is mapped to two slots, or appears more than once on the page.
// The Four jobs and How it works cards no longer use this map: they show real product screens from home-screens.ts
// (Phill, 25/10/2026: abstract art is rejected). Their old files stay in public/landing/visuals, unreferenced by the home.

export type Visual = { src: string; small: string; width: number; height: number; alt: string }

export type VisualSlot = 'nexus' | 'network' | 'showroom'

const picture = (name: string, width: number, height: number, alt: string): Visual => ({
  src: `/landing/visuals/${name}-1280.webp`,
  small: `/landing/visuals/${name}-640.webp`,
  width,
  height,
  alt,
})

export const VISUALS: Record<VisualSlot, Visual | null> = {
  nexus: picture('nexus', 1280, 714, 'The Nexus CRM inbox showing new leads and their next steps'),
  network: picture('network', 1280, 714, 'A floating dark landmass threaded with glowing orange lines and bright points, set against a starry sky'),
  showroom: picture('showroom', 1280, 714, 'A dark hall lined with plinths, each holding a glowing amber shard, leading to a lit doorway'),
}

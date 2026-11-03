import { getPublishedCard, getStaffCard, type PublicCard } from './published'
import { isStaffSlug } from './slug'

/** Any card at /c/<slug>: staff slugs read the staff card, everything else the published profile. */
export async function getCard(slug: string): Promise<PublicCard | null> {
  return isStaffSlug(slug) ? getStaffCard(slug) : getPublishedCard(slug)
}

import type { ImageSlot } from './offer'
import s from './get-a-website.module.css'

/** One named picture. An empty slot renders nothing, never a placeholder. */
export function SlotImage({ slot }: { slot: ImageSlot }) {
  if (!slot.src) return null
  return (
    <figure className={s.picture} data-image-slot={slot.name}>
      <img src={slot.src} alt={slot.alt} width={slot.width} height={slot.height} decoding="async" />
    </figure>
  )
}

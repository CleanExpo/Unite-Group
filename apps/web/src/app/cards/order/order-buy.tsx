'use client'

import { useEffect, useState } from 'react'

import { EDITIONS } from '../editions'
import { Film } from './film'
import s from './order.module.css'

/** The id of the enquiry form; the edition radios join it through the form attribute. */
export const ENQUIRY_FORM_ID = 'card-enquiry'

/** The chosen edition's film with the edition strip under it. The strip is the form's edition choice. */
export function BuyFilm({ edition }: { edition: string | null }) {
  const [chosen, setChosen] = useState(edition)
  const shown = EDITIONS.find((e) => e.name === chosen) ?? EDITIONS[0]

  return (
    <div className={s.buyFilm}>
      <Film edition={shown} aspect="9/16" />
      <fieldset className={s.strip}>
        <legend className={s.stripLegend}>
          Your film: {chosen ? shown.label : 'not chosen yet, we can pick one with you'}
        </legend>
        {EDITIONS.map((e) => (
          <label key={e.name} className={s.thumb} title={e.label}>
            <input
              type="radio"
              name="edition"
              value={e.name}
              form={ENQUIRY_FORM_ID}
              checked={chosen === e.name}
              onChange={() => setChosen(e.name)}
              aria-label={e.label}
              className={s.thumbInput}
            />
            <img src={e.pickerPoster ?? e.poster} alt="" className={s.thumbImg} />
          </label>
        ))}
      </fieldset>
    </div>
  )
}

/** A bar with the product, price and one button, shown once the buy box has scrolled up out of view. */
export function StickyBar({ price }: { price: string | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const box = document.querySelector('[data-buy-box]')
    if (!box) return
    // A scroll check, not an IntersectionObserver: a jump straight past the box (anchor link,
    // End key) never changes its intersection, so an observer would never show the bar.
    const update = () => setVisible(box.getBoundingClientRect().bottom < 0)
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className={s.sticky} data-visible={visible} aria-hidden={!visible}>
      <div className={`${s.wrap} ${s.stickyRow}`}>
        <div>
          <p className={s.stickyName}>Living business card</p>
          <p className={s.stickyPrice}>{price ? `From ${price} AUD, GST included` : 'Ends on your logo'}</p>
        </div>
        <a href="#choose" data-track="cta" data-track-label="order-sticky-choose" className={s.primary} tabIndex={visible ? 0 : -1}>
          Choose your card
        </a>
      </div>
    </div>
  )
}

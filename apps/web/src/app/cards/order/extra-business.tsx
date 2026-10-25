'use client'

import { useState } from 'react'

import { PAYMENT_ENTITY_LINE } from '../payment-entity'
import s from './extra-business.module.css'

const plural = (n: number) => `${n} extra ${n === 1 ? 'business' : 'businesses'}`

/**
 * The extra-business add-on on the Made for you tier. Stripe Payment Link URLs take no quantity, so the
 * add-on is a second payment: the buyer's count is shown here and set again on Stripe. At zero no link renders.
 */
export function ExtraBusiness({ link, priceAud, maxQuantity }: { link: string; priceAud: number; maxQuantity: number }) {
  const [quantity, setQuantity] = useState(0)

  return (
    <div role="group" aria-labelledby="extra-business-label" className={s.box} data-extra-business>
      <p id="extra-business-label" className={s.label}>
        Add another business, AUD {priceAud} each, GST included
      </p>
      <div className={s.stepper}>
        <button
          type="button"
          className={s.step}
          aria-label="One fewer extra business"
          disabled={quantity <= 0}
          onClick={() => setQuantity((q) => Math.max(0, q - 1))}
        >
          &minus;
        </button>
        <span className={s.count} aria-hidden="true">
          {quantity}
        </span>
        <span className={s.srOnly} aria-live="polite">
          {plural(quantity)} selected
        </span>
        <button
          type="button"
          className={s.step}
          aria-label="One more extra business"
          disabled={quantity >= maxQuantity}
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
        >
          +
        </button>
      </div>
      {quantity > 0 ? (
        <div className={s.pay}>
          <p className={s.total}>
            {plural(quantity)}: AUD {priceAud * quantity}, GST included.
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            data-track="cta"
            data-track-label="order-extra-business"
            className={s.payLink}
          >
            Pay for {plural(quantity)}
          </a>
          <p className={s.note}>{PAYMENT_ENTITY_LINE}</p>
          <p className={s.note}>
            This is a second payment on Stripe and opens in a new tab. Set the quantity to {quantity} there.
          </p>
        </div>
      ) : null}
    </div>
  )
}

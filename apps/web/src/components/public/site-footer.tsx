import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'
import { readMargotPhoneNumber } from '@/lib/margot/phone-line'
import { PILLARS, pillarPath } from '@/lib/public-site'

import { HOME_FOOTER } from './home-copy'
import { MargotPhoneLine } from './margot-phone-line'
import f from './site-footer.module.css'

// Position 8 — premium footer with IA, CTA band, legal and founder login.
export function SiteFooter({ position = false }: { position?: boolean }) {
  return (
    <footer className={f.footer} {...(position ? { 'data-position': '', id: 'footer' } : {})}>
      <div className={f.shell}>
        <div className={f.ctaBand}>
          <div>
            <p className={f.ctaTitle}>{HOME_FOOTER.ctaTitle}</p>
            <p className={f.ctaLead}>{HOME_FOOTER.ctaLead}</p>
          </div>
          <div className={f.ctaActions}>
            <a href="/cards/order" className={f.ctaPrimary} data-track="cta" data-track-label="footer-order">
              {HOME_FOOTER.orderCta}
            </a>
            <a href="/#contact" className={f.ctaGhost} data-track="cta" data-track-label="footer-contact">
              {HOME_FOOTER.contactCta}
            </a>
          </div>
        </div>

        <div className={f.grid}>
          <div>
            <p className={f.colTitle}>Product</p>
            <ul className={f.links}>
              <li>
                <a href="/cards">Living cards</a>
              </li>
              <li>
                <a href="/pricing">Pricing</a>
              </li>
              <li>
                <a href="/signatures">Email signatures</a>
              </li>
            </ul>
          </div>
          <div>
            <p className={f.colTitle}>System</p>
            <ul className={f.links}>
              {PILLARS.map((p) => (
                <li key={p.slug}>
                  <a href={pillarPath(p.slug)}>{p.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={f.colTitle}>Company</p>
            <ul className={f.links}>
              <li>
                <a href="/#proof">Showroom</a>
              </li>
              <li>
                <a href="/#how">How it works</a>
              </li>
              <li>
                <a href="/#answers">FAQ</a>
              </li>
              <li>
                <a href="/#contact">Contact</a>
              </li>
            </ul>
          </div>
          <div>
            <p className={f.colTitle}>Legal</p>
            <ul className={f.links}>
              <li>
                <a href="/privacy-policy">Privacy</a>
              </li>
              <li>
                <a href="/terms-of-service">Terms</a>
              </li>
              <li>
                <a href="/cards/terms">Card terms</a>
              </li>
              <li>
                <a href="/auth/login" data-footer-login={true} className={f.founderLogin}>
                  Founder login
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={f.meta}>
          <p>
            {COMPANY_NAME} · {companyAbnLabel()}
          </p>
          <MargotPhoneLine number={readMargotPhoneNumber()} />
        </div>
      </div>
    </footer>
  )
}

import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'
import { readMargotPhoneNumber } from '@/lib/margot/phone-line'
import { PILLARS, pillarPath } from '@/lib/public-site'

import { HOME_FOOTER } from './home-copy'
import { MargotPhoneLine } from './margot-phone-line'
import f from './site-footer.module.css'

const PRODUCT_LINKS = [
  { href: '/cards', label: 'Living cards' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/signatures', label: 'Email signatures' },
] as const

const LEGAL_LINKS = [
  { href: '/privacy-policy', label: 'Privacy' },
  { href: '/terms-of-service', label: 'Terms' },
  { href: '/cards/terms', label: 'Card terms' },
  { href: '/auth/login', label: 'Founder login', founder: true },
] as const

// Position 8 — premium footer with IA, CTA band, legal and founder login.
export function SiteFooter({ position = false }: { position?: boolean }) {
  return (
    <footer className={f.footer} {...(position ? { 'data-position': '', id: 'footer' } : {})}>
      <div className={f.shell}>
        <section className={f.ctaBand} aria-labelledby="footer-cta-title">
          <div className={f.ctaCopy}>
            <h2 id="footer-cta-title" className={f.ctaTitle}>{HOME_FOOTER.ctaTitle}</h2>
            <p className={f.ctaLead}>{HOME_FOOTER.ctaLead}</p>
          </div>
          <div className={f.ctaActions}>
            <a
              href="/cards/order"
              className={`${f.ctaBtn} ${f.ctaPrimary}`}
              data-track="cta"
              data-track-label="footer-order"
            >
              {HOME_FOOTER.orderCta}
            </a>
            <a
              href="/#contact"
              className={`${f.ctaBtn} ${f.ctaGhost}`}
              data-track="cta"
              data-track-label="footer-contact"
            >
              {HOME_FOOTER.contactCta}
            </a>
          </div>
        </section>

        <div className={f.main}>
          <div className={f.brandCol}>
            <a href="/" className={f.brand}>
              <img src="/landing/logos/unite-group-nexus-mark.webp" alt="" width={40} height={40} />
              <span>Unite Group</span>
            </a>
            <p className={f.brandLine}>Living cards, growth work, and the system behind both — Australia &amp; New Zealand.</p>
          </div>

          <nav className={f.linkGrid} aria-label="Footer">
            <div>
              <p className={f.colTitle} id="footer-product">Product</p>
              <ul className={f.links} aria-labelledby="footer-product">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={f.colTitle} id="footer-system">System</p>
              <ul className={f.links} aria-labelledby="footer-system">
                {PILLARS.map((p) => (
                  <li key={p.slug}>
                    <a href={pillarPath(p.slug)}>{p.name}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={f.colTitle} id="footer-legal">Legal</p>
              <ul className={f.links} aria-labelledby="footer-legal">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      {...('founder' in link && link.founder ? { 'data-footer-login': true, className: f.founderLogin } : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
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

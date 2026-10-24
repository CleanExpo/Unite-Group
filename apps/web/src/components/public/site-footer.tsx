import { COMPANY_NAME, companyAbnLabel } from '@/lib/legal/company'
import { readMargotPhoneNumber } from '@/lib/margot/phone-line'

import { MargotPhoneLine } from './margot-phone-line'
import s from './public.module.css'

// Position 8. Legal name, the ABN line (or "ABN pending"), Privacy, Terms and the small founder link.
// The founder link is the only /auth/login link on the page and it must never read as a customer login.
export function SiteFooter({ position = false }: { position?: boolean }) {
  return (
    <footer className={s.footer} {...(position ? { 'data-position': '', id: 'footer' } : {})}>
      <div className={`${s.wrap} ${s.footerRow}`}>
        <p style={{ margin: 0 }}>
          {COMPANY_NAME} · {companyAbnLabel()}
        </p>
        <MargotPhoneLine number={readMargotPhoneNumber()} />
        <ul className={s.footerLinks}>
          <li>
            <a href="/privacy-policy">Privacy</a>
          </li>
          <li>
            <a href="/terms-of-service">Terms</a>
          </li>
          <li>
            <a href="/auth/login" data-footer-login className={s.founderLogin}>
              Founder login
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}

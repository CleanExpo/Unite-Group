import '@/styles/public-tokens.css'

import type { ReactNode } from 'react'

import { PublicPageShell } from './public-page-shell'
import { SiteFooter } from './site-footer'
import { SiteNav } from './site-nav'
import ls from './legal-shell.module.css'

export type LegalCrumb = { label: string; href?: string }

type Props = {
  title: string
  /** When the document body includes the sole page h1 (e.g. card order terms). */
  documentOwnsH1?: boolean
  eyebrow?: string
  lastUpdated?: string
  breadcrumb: LegalCrumb[]
  related?: { href: string; label: string }[]
  /** Full-width body on site canvas (privacy / terms). Default is a narrow light panel. */
  tone?: 'panel' | 'site'
  children: ReactNode
}

/** Legal and policy pages — cinema chrome, readable document column, shared footer. */
export function LegalPageShell({
  title,
  documentOwnsH1 = false,
  eyebrow = 'Legal',
  lastUpdated,
  breadcrumb,
  related,
  tone = 'panel',
  children,
}: Props) {
  const site = tone === 'site'
  return (
    <PublicPageShell>
      <SiteNav />
      <main id="main" className={[ls.root, site ? ls.rootSite : ''].filter(Boolean).join(' ')}>
        <section className={site ? ls.heroBandSite : ls.heroBand} aria-labelledby="legal-title">
          <div className={ls.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={ls.crumbs}>
                {breadcrumb.map((c, i) => (
                  <li key={`${c.label}-${i}`} {...(i === breadcrumb.length - 1 ? { 'aria-current': 'page' as const } : {})}>
                    {c.href ? <a href={c.href}>{c.label}</a> : c.label}
                  </li>
                ))}
              </ol>
            </nav>
            <p className={ls.eyebrow}>{eyebrow}</p>
            {documentOwnsH1 ? (
              <p id="legal-title" className={ls.title}>{title}</p>
            ) : (
              <h1 id="legal-title" className={ls.title}>{title}</h1>
            )}
            {lastUpdated ? <p className={ls.meta}>Last updated: {lastUpdated}</p> : null}
            {related && related.length > 0 ? (
              <ul className={ls.related}>
                {related.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
        <div className={site ? ls.docWrapSite : ls.docWrap}>
          {site ? (
            <div className={ls.wrap}>
              <div className={ls.proseSite}>{children}</div>
            </div>
          ) : (
            <div className={ls.docPanel}>
              <div className={ls.prose}>{children}</div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </PublicPageShell>
  )
}

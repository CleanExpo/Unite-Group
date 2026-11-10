import { PILLARS, SHIPPED_PILLAR, lowestCardPrice, pillarPath, type Pillar } from '@/lib/public-site'
import { PILLAR_EXTRA } from '@/lib/pillar-extra'

import { PILLAR_CHAPTER } from './pillar-page-copy'
import { PillarHeading, PillarSection } from './pillar-section'
import pp from './pillar-solution.module.css'
import { PublicPageShell } from '../layout/public-page-shell'
import { SiteFooter } from '../site/site-footer'
import { SiteNav } from '../site/site-nav'

export function PillarPage({ slug }: { slug: Pillar['slug'] }) {
  const pillar = PILLARS.find((p) => p.slug === slug)
  if (!pillar) throw new Error(`Unknown pillar ${slug}`)
  const extra = PILLAR_EXTRA[slug]
  const live = slug === SHIPPED_PILLAR
  const from = lowestCardPrice()
  const copy = PILLAR_CHAPTER[slug]
  const sisters = PILLARS.filter((p) => p.slug !== slug)
  const faqAll = [...pillar.faq, ...extra.extraFaq]

  return (
    <PublicPageShell>
      <SiteNav />
      <main id="main" className={pp.page} data-pillar={slug}>
        <PillarSection tone="hero" labelledBy="pillar-title">
          <div className={pp.wrap}>
            <nav aria-label="Breadcrumb">
              <ol className={pp.crumbs}>
                <li><a href="/">Unite Group</a></li>
                <li>Solutions</li>
                <li aria-current="page">{pillar.name}</li>
              </ol>
            </nav>
            <p className={pp.kicker}>{pillar.name}</p>
            <h1 id="pillar-title" className={pp.h1}>
              {pillar.headline}
            </h1>
            <p className={pp.heroLead}>{pillar.intro}</p>
            <p className={pp.heroMeta}>
              <span className={live ? pp.badgeLive : pp.badgeSoon}>{live ? 'Live' : 'Coming'}</span>
              {' '}
              {extra.shipNote}
            </p>
            <p className={pp.heroTagline}>{pillar.line}</p>
            <div className={pp.actions}>
              <a href="/#contact" className={pp.btnPrimary} data-track="cta" data-track-label={`pillar-${slug}-contact`}>
                Ask a question
              </a>
              <a href={live ? '/cards/order' : '/pricing'} className={pp.btnGhost}>
                {live ? 'Order a card' : 'View pricing'}
              </a>
            </div>
          </div>
        </PillarSection>

        <PillarSection labelledBy="pillar-story">
          <div className={pp.wrapNarrow}>
            <PillarHeading
              id="pillar-story"
              label="Overview"
              title="What this layer is"
              lead={extra.scope}
            />
            <p className={pp.body}>{extra.scopeDeep}</p>
            <dl className={pp.dlStack}>
              {extra.scopePillars.map((item) => (
                <div key={item.title}>
                  <dt>{item.title}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </PillarSection>

        <PillarSection tone="alt" labelledBy="pillar-will">
          <div className={pp.wrap}>
            <PillarHeading
              id="pillar-will"
              label="Capabilities"
              title={copy.capabilitiesTitle}
              lead={copy.capabilitiesLead}
            />
            <ol className={pp.stackList}>
              {pillar.will.map((title, index) => {
                const detail = extra.capabilityDetail[index]
                return (
                  <li key={title} className={pp.stackItem}>
                    <h3 className={pp.h3}>{title}</h3>
                    {detail ? <p className={pp.body}>{detail.body}</p> : null}
                    {detail?.includes.length ? (
                      <p className={pp.fine}>
                        <span className={pp.fineLabel}>Includes:</span> {detail.includes.join(' · ')}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </div>
        </PillarSection>

        <PillarSection labelledBy="pillar-intent">
          <div className={pp.wrap}>
            <PillarHeading
              id="pillar-intent"
              label="Fit"
              title="Who this is for, and what they search"
              lead={pillar.audience}
            />
            <p className={pp.body}>
              <span className={pp.fineLabel}>Typical searches:</span>{' '}
              {extra.searchExamples.join(' · ')}
            </p>
            <dl className={pp.dlColumns}>
              {extra.channels.map((ch) => (
                <div key={ch.title}>
                  <dt>{ch.title}</dt>
                  <dd>{ch.body}</dd>
                </div>
              ))}
            </dl>
            <p className={pp.fine}>
              <span className={pp.fineLabel}>Good fit if</span> {extra.fitCriteria.join(' · ')}
            </p>
          </div>
        </PillarSection>

        <PillarSection tone="alt" labelledBy="pillar-process">
          <div className={pp.wrapNarrow}>
            <PillarHeading
              id="pillar-process"
              label="Process"
              title="How it works when this layer ships"
              lead={extra.processLead}
            />
            <ol className={pp.stepFlow}>
              {extra.howItWorks.map((step, index) => (
                <li key={step.title}>
                  <span className={pp.stepIdx}>{index + 1}</span>
                  <div>
                    <h3 className={pp.h3}>{step.title}</h3>
                    <p className={pp.body}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </PillarSection>

        <PillarSection labelledBy="pillar-problems">
          <div className={pp.wrap}>
            <PillarHeading
              id="pillar-problems"
              label="Reality check"
              title="What goes wrong today — and what changes"
              lead="Symptoms we see on enquiry calls, and the practical shift this layer targets."
            />
            <ul className={pp.issueList}>
              {extra.problemsRich.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                  <em className={pp.issueSignal}>Signal: {item.signal}</em>
                </li>
              ))}
            </ul>
            <div id="pillar-compare" className={pp.splitPair}>
              <div>
                <h3 className={pp.h3}>{extra.beforeAfter.withoutLabel}</h3>
                <ul className={pp.bulletTight}>
                  {extra.beforeAfter.without.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className={pp.h3}>{extra.beforeAfter.withLabel}</h3>
                <ul className={pp.bulletTight}>
                  {extra.beforeAfter.with.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </PillarSection>

        <PillarSection tone="alt" labelledBy="pillar-deliverables">
          <div className={pp.wrap}>
            <PillarHeading id="pillar-deliverables" label="Deliverables" title="What you receive" />
            <ul className={pp.packageList}>
              {extra.deliverablesRich.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong> — {item.body}
                </li>
              ))}
            </ul>
            <h3 id="pillar-outcomes" className={pp.h3Spaced}>
              When it works
            </h3>
            <ul className={pp.packageList}>
              {extra.outcomesRich.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong> — {item.body}
                </li>
              ))}
            </ul>
          </div>
        </PillarSection>

        <PillarSection labelledBy="pillar-checks">
          <div className={pp.wrapNarrow}>
            <PillarHeading
              id="pillar-checks"
              label="Quality"
              title="How we verify the work"
              lead="Checks we run before we call a pass, and metrics we only report when they inform a decision."
            />
            <dl className={pp.proofList}>
              {extra.checkpointsRich.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.detail}</dd>
                </div>
              ))}
            </dl>
            <h3 id="pillar-measures" className={pp.h3Spaced}>
              What we measure
            </h3>
            <ul className={pp.bulletTight}>
              {extra.measures.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </PillarSection>

        <PillarSection tone="alt" labelledBy="pillar-faq">
          <div className={pp.wrapNarrow}>
            <PillarHeading id="pillar-faq" label="FAQ" title="Straight answers" />
            <div className={pp.faq}>
              {faqAll.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </PillarSection>

        {live ? (
          <PillarSection labelledBy="pillar-live">
            <div className={pp.wrapNarrow}>
              <PillarHeading
                id="pillar-live"
                label="Live today"
                title="Living business cards in this layer"
                lead={
                  from
                    ? `From ${from}, one-off, GST included. Private proof before anything goes public.`
                    : 'Send your details — we will contact you when online checkout is closed.'
                }
              />
              <div className={pp.actions}>
                <a href="/cards" className={pp.btnPrimary} data-track="cta" data-track-label="pillar-conversion-showroom">
                  See the showroom
                </a>
                <a href="/cards/order" className={pp.btnGhost}>
                  Order a card
                </a>
              </div>
            </div>
          </PillarSection>
        ) : null}

        <PillarSection tone="alt" labelledBy="pillar-related">
          <div className={pp.wrap}>
            <PillarHeading id="pillar-related" label="Continue" title="Elsewhere on the site" />
            <ul className={pp.linkList}>
              {extra.related.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                  <span>{link.desc}</span>
                </li>
              ))}
            </ul>
            <h3 id="pillar-sisters" className={pp.h3Spaced}>
              Other layers
            </h3>
            <ul className={pp.sisterList}>
              {sisters.map((p) => (
                <li key={p.slug}>
                  <a href={pillarPath(p.slug)}>{p.name}</a>
                  <span>{p.line}</span>
                </li>
              ))}
            </ul>
          </div>
        </PillarSection>

        <PillarSection tone="close" labelledBy="pillar-close">
          <div className={pp.wrapNarrow}>
            <PillarHeading id="pillar-close" label="Next step" title={copy.closeTitle} lead={copy.closeLead} />
            <div className={pp.actions}>
              <a href="/#contact" className={pp.btnPrimary}>
                Contact us
              </a>
              <a href="/pricing" className={pp.btnGhost}>
                Pricing
              </a>
            </div>
          </div>
        </PillarSection>
      </main>
      <SiteFooter />
    </PublicPageShell>
  )
}

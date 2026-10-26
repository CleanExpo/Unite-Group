import s from './public.module.css'
import c from './start-chooser.module.css'

// The one place the hero's primary step leads to (design-pass gaps 05.2 and 05.5). Five outcomes, one plain line each,
// no pictures. Diagnose is not live yet, so it says Coming; the Create tile is the only paid thing on sale.
const OPTIONS = [
  { key: 'discover', no: '01', name: 'Discover', href: '#group', line: 'See our businesses and what each one does' },
  { key: 'diagnose', no: '02', name: 'Diagnose', href: '/solutions/intelligence', line: 'A check of what is holding your business back', coming: true },
  { key: 'create', no: '03', name: 'Create', href: '/cards/order', line: 'Order a living video card, from $249', paid: true },
  { key: 'results', no: '04', name: 'Explore results', href: '/cards', line: 'Watch the living cards we have made' },
  { key: 'talk', no: '05', name: 'Talk', href: '#contact', line: 'Ask a question and we reply by email' },
] as const

export function StartChooser() {
  return (
    <section id="start" className={s.section} aria-labelledby="start-title">
      <div className={s.wrap}>
        <h2 id="start-title" className={s.h2}>
          Where do you want to start?
        </h2>
        <ol className={c.list}>
          {OPTIONS.map((o) => (
            <li key={o.key} className={c.item}>
              <a
                href={o.href}
                data-track="cta"
                data-track-label={`home-start-${o.key}`}
                className={`${c.tile} ${'paid' in o ? c.paid : ''}`}
              >
                <span className={c.no}>{o.no}</span>
                <span className={c.name}>{o.name}</span>
                <p className={c.line}>{o.line}</p>
                {'coming' in o && <span className={`${s.chip} ${c.coming}`}>Coming</span>}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

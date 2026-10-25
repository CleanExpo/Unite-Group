import type { ReportResult, SiteReport } from '@/lib/analytics/site-events-report'
import s from './site-analytics.module.css'

function pct(rate: number | null): string {
  return rate === null ? 'n/a' : `${Math.round(rate * 100)}%`
}

function BarChart({ data }: { data: SiteReport['pageViewsByDay'] }) {
  const width = 640
  const height = 160
  const pad = { top: 8, bottom: 22 }
  const max = Math.max(1, ...data.map((d) => d.views))
  const slot = width / data.length
  const barWidth = Math.max(2, slot * 0.7)
  const plotHeight = height - pad.top - pad.bottom
  return (
    <svg
      className={s.chart}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Page views per day, last ${data.length} days. Highest day: ${max}.`}
    >
      {data.map((d, i) => {
        const h = (d.views / max) * plotHeight
        const x = i * slot + (slot - barWidth) / 2
        return (
          <g key={d.day}>
            <rect className={s.bar} x={x} y={pad.top + plotHeight - h} width={barWidth} height={h}>
              <title>{`${d.day}: ${d.views}`}</title>
            </rect>
            {(i === 0 || i === data.length - 1 || data.length <= 7) && (
              <text className={s.axis} x={x + barWidth / 2} y={height - 6} textAnchor="middle">
                {d.day.slice(5)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function RankTable({ title, rows, empty }: { title: string; rows: { key: string; n: number }[]; empty: string }) {
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{title}</h2>
      {rows.length === 0 ? (
        <p className={s.stateBody}>{empty}</p>
      ) : (
        <table className={s.table}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td>{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export function SiteAnalyticsView({ result }: { result: ReportResult }) {
  const days = result.status === "ok" ? result.report.days : result.days
  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Site analytics</h1>
          <p className={s.note}>First-party, no cookies, no personal information. Days are Brisbane time.</p>
        </div>
        <nav className={s.range} aria-label="Date range">
          <a className={s.rangeLink} href="?days=7" aria-current={days === 7}>
            Last 7 days
          </a>
          <a className={s.rangeLink} href="?days=30" aria-current={days === 30}>
            Last 30 days
          </a>
        </nav>
      </div>

      {result.status === 'error' && (
        <div className={s.stateError} role="alert" data-state="error">
          <p className={s.stateTitle}>Could not load site analytics</p>
          <p className={s.stateBody}>
            The read failed, so these numbers are unknown, not zero. Detail: {result.message}
          </p>
        </div>
      )}

      {result.status === 'empty' && (
        <div className={s.state} data-state="empty">
          <p className={s.stateTitle}>No events yet</p>
          <p className={s.stateBody}>Nothing has been recorded in the last {days} days.</p>
        </div>
      )}

      {result.status === 'ok' && <Report report={result.report} />}
    </div>
  )
}

function Report({ report }: { report: SiteReport }) {
  return (
    <div className={s.grid} data-state="ok">
      <section className={s.cardWide}>
        <h2 className={s.cardTitle}>Page views by day ({report.totalPageViews} total)</h2>
        <BarChart data={report.pageViewsByDay} />
        <table className={s.table}>
          <thead>
            <tr>
              <th>Day</th>
              <th>Page views</th>
            </tr>
          </thead>
          <tbody>
            {report.pageViewsByDay.map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td>{d.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <RankTable title="Top pages" rows={report.topPages} empty="No page views." />
      <RankTable title="CTA clicks by label" rows={report.ctaClicks} empty="No CTA clicks." />

      <section className={s.card}>
        <h2 className={s.cardTitle}>
          Video ({report.videoPlays} plays, {pct(report.videoPlays > 0 ? Math.min(1, report.videoCompletes / report.videoPlays) : null)} completed)
        </h2>
        {report.videos.length === 0 ? (
          <p className={s.stateBody}>No video plays.</p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Video</th>
                <th>Plays / completion</th>
              </tr>
            </thead>
            <tbody>
              {report.videos.map((v) => (
                <tr key={v.key}>
                  <td>{v.key}</td>
                  <td>
                    {v.plays} / {pct(v.completionRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <RankTable title="Top referrers" rows={report.referrers} empty="No external referrers." />
      <RankTable title="Device split" rows={report.devices} empty="No device data." />
    </div>
  )
}

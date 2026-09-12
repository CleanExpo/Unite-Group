import type { MargotWeeklyPacket } from '@/lib/weekly-tasks/margot-packet'
import styles from '../../command-centre/founder-desk.module.css'

type Review = { source: 'not_configured' } | { source: 'local_preview'; packet: MargotWeeklyPacket }
function time(value: string) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function MargotWeeklyReview({ review }: { review: Review }) {
  if (review.source === 'not_configured') return <section className={styles.missionDetail} aria-labelledby="weekly-source">
    <h2 id="weekly-source">Weekly packet not connected</h2>
    <p>This is the place for your Margot campaign review. A verified current weekly packet has not been connected yet.</p>
    <p>No episode counts or delivery status are available here. The local editorial preview remains separate from this screen.</p>
    <p>Monday is your review day. Your week starts Thursday at 4pm, Australia/Brisbane.</p>
    <p>Viewing this page does not approve, generate, schedule or publish anything. Synthex release authority remains a separate decision.</p>
  </section>
  const packet = review.packet
  const references = packet.episodes.filter(item => item.videoId).length
  return <section className={styles.missionDetail} aria-label="Local Margot editorial packet">
    <h2>Local editorial preview</h2>
    <p>This packet is a local preview, not a connected campaign or publication decision.</p>
    <p>Week starts {time(packet.weekStartsAt)} · Australia/Brisbane. Monday review: {time(packet.reviewDueAt)} (proposed time).</p>
    <p>{references} existing master reference; {packet.episodes.length - references} unrendered drafts. Publication authority remains pending.</p>
    <p>Synthex distributes; NRPG is the proposed resource home, with relevant CARSI links when verified. Accounts and resource destinations are not verified by this packet.</p>
    {packet.episodes.map(item => <article key={item.id} className={styles.reviewSpec} aria-label={item.title}>
      <h3>{item.title}</h3><p>{time(item.slot)} · proposed slot, not scheduled</p>
      {item.videoId ? <p><a href={`https://app.heygen.com/videos/${item.videoId}`} target="_blank" rel="noopener noreferrer">Open existing master in HeyGen</a> · Playback access is checked in HeyGen.</p> : <p>Not rendered</p>}
      <p>Script review: {item.scriptApproval}. Release: pending.</p>
      <details className={styles.details}><summary>Script</summary><p style={{ whiteSpace: 'pre-wrap' }}>{item.script}</p></details>
      <details className={styles.details}><summary>Caption</summary><p style={{ whiteSpace: 'pre-wrap' }}>{item.caption}</p></details>
      <details className={styles.details}><summary>{item.resourceTitle}</summary><p style={{ whiteSpace: 'pre-wrap' }}>{item.resourceText}</p></details>
    </article>)}
  </section>
}

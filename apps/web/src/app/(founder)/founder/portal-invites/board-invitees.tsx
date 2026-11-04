import type { BoardInvitee } from '@/lib/portal/board/invitees'

import styles from './portal-invites.module.css'

/**
 * People waiting for a portal invite whose email address we do not have yet. Nothing here sends anything: once an
 * address is known, make the code in the form above (business short name iaq-magazine, bound to that address).
 */
export function BoardInvitees({ invitees }: { invitees: readonly BoardInvitee[] }) {
  return (
    <section className={styles.panel} aria-labelledby="board-invitees-title">
      <h2 id="board-invitees-title" className={styles.madeTitle}>IAQ Magazine board: waiting for email addresses</h2>
      <p className={styles.note}>
        Each person gets their own code for business short name <span className={styles.mono}>iaq-magazine</span>,
        bound to their email. Their page is /portal/board. No email has been sent.
      </p>
      <table className={styles.table} aria-label="IAQ Magazine board invitees">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Role</th>
            <th scope="col">Email</th>
          </tr>
        </thead>
        <tbody>
          {invitees.map((person) => (
            <tr key={person.name}>
              <td>{person.name}</td>
              <td>{person.role ?? 'Board member'}</td>
              <td>{person.email ?? 'Email needed'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

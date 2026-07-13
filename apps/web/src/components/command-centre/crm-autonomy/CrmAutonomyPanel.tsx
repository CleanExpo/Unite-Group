// UNI-2234 — CRM Mission Control autonomy panel (slice 3).
//
// The dormant face of the CRM system-of-action. Server component: reads the real
// CRM_AUTO_EXECUTE kill switch + the founder-approved risk matrix and shows the
// state model + per-subject-type tier honestly. No fake rows — when auto-execution
// is dormant (kill switch off, prod default) it says so; live CRM jobs list here
// once the Board-gated dispatch slice lands. See
// docs/superpowers/specs/2026-07-09-crm-mission-control-system-of-action-design.md.

import { AUTO_EXEC_MATRIX, AUTO_EXEC_CONFIG, type AutoExecuteSubjectType } from '@/lib/crm/auto-exec-matrix'
import type { CrmMissionControlJobsResult } from '@/lib/command-centre/crm-mission-control-jobs-supabase'
import styles from './CrmAutonomyPanel.module.css'

const STATES: { state: string; label: string; blurb: string }[] = [
  { state: 'queued', label: 'Queued', blurb: 'Admitted — awaiting the worker.' },
  { state: 'approved', label: 'Approved', blurb: 'Lifecycle may-execute and matrix-safe.' },
  { state: 'executing', label: 'Executing', blurb: 'Worker running (dispatch-gated).' },
  { state: 'executed', label: 'Executed', blurb: 'Mutation confirmed (write-then-confirm).' },
  { state: 'failed', label: 'Failed', blurb: 'Dispatch or confirm failed.' },
  { state: 'needs_review', label: 'Needs review', blurb: 'Held for founder review.' },
]

const SUBJECT_LABELS: Record<AutoExecuteSubjectType, string> = {
  lead_conversion: 'Lead conversion',
  opportunity_commitment: 'Opportunity commitment',
  client_merge: 'Client merge',
  data_export: 'Data export',
  other: 'Other',
}

function stateLabel(state: string): string {
  return STATES.find((s) => s.state === state)?.label ?? state
}

function subjectLabel(subject: string): string {
  return (SUBJECT_LABELS as Record<string, string>)[subject] ?? subject
}

export function CrmAutonomyPanel({ recentJobs }: { recentJobs?: CrmMissionControlJobsResult } = {}) {
  const armed = process.env.CRM_AUTO_EXECUTE === '1'
  const subjects = Object.keys(AUTO_EXEC_MATRIX) as AutoExecuteSubjectType[]

  return (
    <div className={styles.panel}>
      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>Auto-execution</span>
        <span className={styles.statusValue} data-armed={armed}>
          {armed ? 'ARMED' : 'DORMANT'}
        </span>
        <span className={styles.statusNote}>
          {armed
            ? 'Kill switch on — admitted approvals may dispatch (Board go-live).'
            : 'Kill switch off — every approval routes to needs-review. No CRM mutation runs.'}
        </span>
      </div>

      <div className={styles.grid}>
        <section>
          <h4 className={styles.subhead}>States</h4>
          <ul className={styles.list}>
            {STATES.map((s) => (
              <li key={s.state} data-state={s.state}>
                <span className={styles.term}>{s.label}</span>
                <span className={styles.def}>{s.blurb}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className={styles.subhead}>Risk tiers</h4>
          <ul className={styles.list}>
            {subjects.map((subject) => {
              const entry = AUTO_EXEC_MATRIX[subject]
              const disabled = subject === 'opportunity_commitment' && !AUTO_EXEC_CONFIG.l2_enabled
              return (
                <li key={subject} data-tier={entry.tier}>
                  <span className={styles.term}>
                    {entry.tier} · {SUBJECT_LABELS[subject]}
                    {disabled ? ' (deferred)' : ''}
                  </span>
                  <span className={styles.def}>{entry.description}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {recentJobs ? (
        <section>
          <h4 className={styles.subhead}>Recent CRM jobs</h4>
          {recentJobs.source !== 'connected' ? (
            <p className={styles.footnote}>
              {recentJobs.source === 'not_connected'
                ? 'Sign in to view recorded CRM jobs.'
                : 'CRM job history is temporarily unavailable.'}
            </p>
          ) : recentJobs.jobs.length === 0 ? (
            <p className={styles.footnote}>No CRM jobs recorded yet.</p>
          ) : (
            <ul className={styles.list}>
              {recentJobs.jobs.map((job) => (
                <li key={job.id} data-state={job.missionControlState}>
                  <span className={styles.term}>
                    {stateLabel(job.missionControlState)} · {subjectLabel(job.subjectType)}
                  </span>
                  <span className={styles.def}>{job.reason ?? 'No reason recorded.'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <p className={styles.footnote}>
        Live dispatch of a real CRM mutation is a separate Board gate + founder go-live
        (UNI-2234). This panel is read-only until then.
      </p>
    </div>
  )
}

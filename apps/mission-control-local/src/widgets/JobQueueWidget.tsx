import { formatAge } from '../../shared/format.ts';
import type { JobPhase } from '../../shared/types.ts';
import { FleetGate } from './FleetGate.tsx';
import styles from './widgets.module.css';

const PHASE_LABEL: Record<JobPhase, string> = {
  queued: 'Queued',
  claimed: 'Claimed',
  done: 'Done',
  unknown: 'Unknown',
};

export function JobQueueWidget() {
  return (
    <FleetGate>
      {(fleet) =>
        fleet.jobs.length === 0 ? (
          <p className={styles.note}>The broker reports no jobs.</p>
        ) : (
          <>
            <p className={styles.note}>
              {fleet.jobCounts.queued} queued, {fleet.jobCounts.claimed} claimed, {fleet.jobCounts.done} done
              {fleet.jobCounts.unknown > 0 ? `, ${fleet.jobCounts.unknown} unknown` : ''}
            </p>
            <table className={styles.jobs}>
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Machine</th>
                  <th>In phase</th>
                  <th>Created</th>
                  <th>Job</th>
                </tr>
              </thead>
              <tbody>
                {fleet.jobs.map((job, row) => (
                  <tr key={`${job.id}-${row}`}>
                    <td>{PHASE_LABEL[job.phase]}</td>
                    <td>{job.status}</td>
                    <td>{job.type}</td>
                    <td>{job.machineId ?? 'unassigned'}</td>
                    <td>{job.phaseAgeMs === null ? 'time unknown' : formatAge(job.phaseAgeMs)}</td>
                    <td>{formatAge(job.ageMs)}</td>
                    <td>
                      <code>{job.id}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fleet.jobsTotal > fleet.jobs.length ? (
              <p className={styles.note}>
                Showing the newest {fleet.jobs.length} of {fleet.jobsTotal} jobs.
              </p>
            ) : null}
          </>
        )
      }
    </FleetGate>
  );
}

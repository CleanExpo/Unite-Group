import { formatAge } from '../../shared/format.ts';
import { FleetGate } from './FleetGate.tsx';
import styles from './widgets.module.css';

export function JobQueueWidget() {
  return (
    <FleetGate>
      {(fleet) =>
        fleet.jobs.length === 0 ? (
          <p className={styles.note}>The broker reports no jobs.</p>
        ) : (
          <>
            <table className={styles.jobs}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Machine</th>
                  <th>Age</th>
                  <th>Job</th>
                </tr>
              </thead>
              <tbody>
                {fleet.jobs.map((job, row) => (
                  <tr key={`${job.id}-${row}`}>
                    <td>{job.status}</td>
                    <td>{job.type}</td>
                    <td>{job.machineId ?? 'unassigned'}</td>
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

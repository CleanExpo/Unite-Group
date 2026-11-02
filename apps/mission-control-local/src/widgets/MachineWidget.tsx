import { formatAge } from '../../shared/format.ts';
import type { MachineHealth, MachineId } from '../../shared/types.ts';
import { FleetGate } from './FleetGate.tsx';
import styles from './widgets.module.css';

const HEALTH: Record<MachineHealth, { label: string; led: string | undefined }> = {
  online: { label: 'Online', led: styles.ledGo },
  stale: { label: 'Stale', led: styles.ledAmber },
  offline: { label: 'Offline', led: styles.ledAbort },
  'not-reporting': { label: 'Not reporting', led: styles.ledAbort },
};

export function MachineWidget({ machineId }: { machineId: MachineId }) {
  return (
    <FleetGate>
      {(fleet) => {
        const machine = fleet.machines.find((m) => m.id === machineId);
        if (!machine) return <p className={styles.down}>No record for {machineId}.</p>;
        const health = HEALTH[machine.health];
        return (
          <div className={styles.machine}>
            <div className={styles.machineHead}>
              <span className={`${styles.led} ${health.led ?? ''}`} aria-hidden="true" />
              <strong>{health.label}</strong>
              <span className={styles.muted}>{machine.state}</span>
              <span className={styles.push}>seen {formatAge(machine.ageMs)}</span>
            </div>
            <div className={styles.muted}>{machine.label}</div>
            {machine.tailscaleIp ? <div className={styles.muted}>{machine.tailscaleIp}</div> : null}
            <ul className={styles.chips} aria-label="Capabilities">
              {machine.capabilities.map((c) => (
                <li key={c.name} className={c.enabled ? styles.chipOn : styles.chipOff}>
                  {c.name}
                  <span className={styles.srOnly}>{c.enabled ? ' available' : ' not available'}</span>
                </li>
              ))}
            </ul>
            <ul className={styles.repos} aria-label="Repositories">
              {machine.repos.map((r) => (
                <li key={r.name}>
                  <span>{r.name}</span>
                  {r.available ? (
                    <code>{r.headSha ?? 'no SHA'}</code>
                  ) : (
                    <span className={styles.warn}>not available</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      }}
    </FleetGate>
  );
}

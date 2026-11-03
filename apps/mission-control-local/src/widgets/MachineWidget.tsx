import { machineCardText } from '../../shared/machine-card.ts';
import type { CardTone } from '../../shared/machine-card.ts';
import type { MachineId } from '../../shared/types.ts';
import { useNow } from '../useNow.ts';
import { FleetGate } from './FleetGate.tsx';
import styles from './widgets.module.css';

const LED: Record<CardTone, string | undefined> = {
  go: styles.ledGo,
  amber: styles.ledAmber,
  abort: styles.ledAbort,
};

export function MachineWidget({ machineId }: { machineId: MachineId }) {
  // Re-renders every second, so a card turns Stale at 45 seconds between polls too.
  const now = useNow();
  return (
    <FleetGate>
      {(fleet, startedAt) => {
        const machine = fleet.machines.find((m) => m.id === machineId);
        if (!machine) return <p className={styles.down}>No record for {machineId}.</p>;
        // Every word below comes from machineCardText, which the tests check.
        const card = machineCardText(machine, now - startedAt);
        const { fresh } = card;
        return (
          <div className={styles.machine}>
            <div className={styles.machineHead}>
              <span className={`${styles.led} ${LED[card.tone] ?? ''}`} aria-hidden="true" />
              <strong>{card.health}</strong>
              <span className={styles.push}>{card.heartbeat}</span>
            </div>
            <div className={fresh ? undefined : styles.warn}>{card.state}</div>
            <div className={fresh || !machine.currentJob ? styles.muted : styles.warn}>{card.job}</div>
            {card.warning ? <div className={styles.warn}>{card.warning}</div> : null}
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

// Every fleet widget renders through this, so a broker failure always reads as a
// failure and never as an empty list.
import type { ReactNode } from 'react';
import { formatAge } from '../../shared/format.ts';
import type { BrokerFailure, FleetSnapshot } from '../../shared/types.ts';
import { useFleet } from '../useFleet.tsx';
import styles from './widgets.module.css';

const REASONS: Record<BrokerFailure, string> = {
  unreachable: 'The fleet broker is not answering.',
  timeout: 'The fleet broker took too long to answer.',
  'bad-status': 'The fleet broker returned an error.',
  'bad-payload': 'The fleet broker sent something this app cannot read.',
  'too-large': 'The fleet broker sent too much data.',
};

type Live = Extract<FleetSnapshot, { status: 'live' }>;

/** startedAt is when this window asked for the snapshot, by the browser's clock. */
export function FleetGate({ children }: { children: (fleet: Live, startedAt: number) => ReactNode }) {
  const fleet = useFleet();
  if (fleet.kind === 'loading') return <p className={styles.note}>Waiting for first reading.</p>;
  if (fleet.kind === 'signed-out') {
    return (
      <p className={styles.down} role="status">
        Signed out. No live data.
      </p>
    );
  }
  if (fleet.kind === 'server-unreachable') {
    return (
      <p className={styles.down} role="status">
        Mission Control server is not answering. No live data.
      </p>
    );
  }
  const { snapshot } = fleet;
  if (snapshot.status === 'down') {
    const seen =
      snapshot.lastGoodAt === null
        ? 'No good reading since this server started.'
        : `Last good reading ${formatAge(snapshot.fetchedAt - snapshot.lastGoodAt)}.`;
    return (
      <div className={styles.down} role="status">
        <strong>Broker down. No live data.</strong>
        <p>{REASONS[snapshot.reason]}</p>
        <p>{seen}</p>
      </div>
    );
  }
  return <>{children(snapshot, fleet.startedAt)}</>;
}

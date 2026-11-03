import { useEffect, useState } from 'react';
import styles from './widgets.module.css';

const TIME = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const DATE = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className={styles.clock}>
      <div className={styles.clockTime}>{TIME.format(now)}</div>
      <div className={styles.muted}>{DATE.format(now)} AEST</div>
    </div>
  );
}

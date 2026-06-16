// ClientOnboardingChecklist — Mission Control view of a client onboarding
// packet (UNI-2148).
//
// Presentational only: takes a built ClientLaunchPacket and renders its tasks
// as a checklist with status chips (ready / queued / blocked). Blocked tasks
// surface their exact `nextAction` so the operator knows the one thing to do.
// An embedded SourceBadge tells the operator whether the readiness is live or
// a fallback. The component NEVER fabricates readiness — an empty packet shows
// an honest empty state; a fully-blocked packet shows every blocker.
//
// Colour convention matches SourceBadge.colorFor: --cc-ink for ready/active,
// --cc-signal for blocked/alert, --cc-ink-hush for queued/muted. No new icon
// library, no new deps.

import type {
  ClientLaunchPacket,
  ClientLaunchTask,
  ClientLaunchTaskStatus,
} from '@/lib/empire/client-launch-packet';
import { SourceBadge, type SourceMode } from '../SourceBadge';

export interface ClientOnboardingChecklistProps {
  /** The built onboarding packet. When undefined, an honest empty state renders. */
  packet?: ClientLaunchPacket;
  /** Source classification for the embedded badge. Defaults to 'seed'. */
  sourceMode?: SourceMode;
  /** ISO timestamp of the readiness snapshot — rendered only for 'live'. */
  lastUpdatedAt?: string;
}

function chipColor(status: ClientLaunchTaskStatus): string {
  if (status === 'ready') return 'var(--cc-ink)';
  if (status === 'blocked') return 'var(--cc-signal)';
  return 'var(--cc-ink-hush)';
}

function StatusChip({ status }: { status: ClientLaunchTaskStatus }) {
  const color = chipColor(status);
  return (
    <span
      data-status={status}
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{ color }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
        }}
      />
      {status}
    </span>
  );
}

function TaskRow({ task }: { task: ClientLaunchTask }) {
  const isBlocked = task.status === 'blocked';
  return (
    <li
      data-task-id={task.id}
      className="flex flex-col gap-1.5 px-5 py-3"
      style={{ borderBottom: '1px solid var(--cc-grid)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px]" style={{ color: 'var(--cc-ink)' }}>
          {task.title}
          {task.approvalRequired && (
            <span
              className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--cc-ink-hush)' }}
            >
              · approval required
            </span>
          )}
        </span>
        <StatusChip status={task.status} />
      </div>
      {isBlocked && (
        <p
          data-next-action
          className="text-[12px]"
          style={{ color: 'var(--cc-signal)' }}
        >
          {task.nextAction}
        </p>
      )}
    </li>
  );
}

export function ClientOnboardingChecklist({
  packet,
  sourceMode = 'seed',
  lastUpdatedAt,
}: ClientOnboardingChecklistProps) {
  const tasks = packet?.tasks ?? [];
  const badgeLabel = packet
    ? `onboarding · ${packet.summary.ready}/${packet.summary.total} ready`
    : 'onboarding · no packet';

  return (
    <section
      className="flex flex-col"
      style={{ background: 'var(--cc-bg)', border: '1px solid var(--cc-grid)' }}
      aria-label="Client onboarding checklist"
    >
      <div
        className="flex items-center justify-between px-5 py-2"
        style={{ borderBottom: '1px solid var(--cc-grid)' }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          Onboarding packet
        </span>
        <SourceBadge mode={sourceMode} label={badgeLabel} lastUpdatedAt={lastUpdatedAt} />
      </div>

      {tasks.length === 0 ? (
        <p
          className="px-5 py-6 text-[12px]"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          No onboarding packet yet — create the client to generate one.
        </p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}

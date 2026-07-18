'use client'

import { useEffect, useMemo, useState } from 'react'

import type {
  MachineActivityDeviceView,
  MachineActivityView,
  MachineConnectionState,
  MachineScreenState,
} from '@/lib/command-centre/machine-activity'
import { MACHINE_ROSTER } from '@/lib/command-centre/machine-activity'
import { SourceBadge, type SourceMode } from '../SourceBadge'
import styles from './LiveMachineGrid.module.css'

const POLL_INTERVAL_MS = 15_000

function emptyView(): MachineActivityView {
  return {
    source: 'not_connected',
    reason: 'awaiting_first_snapshot',
    generatedAt: new Date(0).toISOString(),
    machines: MACHINE_ROSTER.map((machine): MachineActivityDeviceView => ({
      ...machine,
      connection: 'not_reporting',
      lastSeenAt: null,
      screens: [
        {
          screenId: 'primary',
          label: 'Screen 1',
          state: 'not_reporting',
          activity: 'unknown',
          tool: null,
          agent: null,
          projectKey: null,
          taskRef: null,
          lastSeenAt: null,
        },
        {
          screenId: 'secondary',
          label: 'Screen 2',
          state: 'not_reporting',
          activity: 'unknown',
          tool: null,
          agent: null,
          projectKey: null,
          taskRef: null,
          lastSeenAt: null,
        },
      ],
    })),
  }
}

function stateLabel(state: MachineConnectionState | MachineScreenState): string {
  return state.replace('_', ' ')
}

function stateClass(state: MachineConnectionState | MachineScreenState): string {
  if (state === 'active' || state === 'connected') return styles.good
  if (state === 'blocked' || state === 'stale') return styles.warning
  if (state === 'offline') return styles.offline
  return styles.quiet
}

function relativeAge(iso: string | null): string {
  if (!iso) return 'never'
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp)) return 'unknown'
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`
  return `${Math.floor(seconds / 86_400)}d ago`
}

function sourceMode(
  loading: boolean,
  view: MachineActivityView,
  fetchError: string | null,
): SourceMode {
  if (loading) return 'loading'
  if (fetchError || view.source !== 'connected') return 'degraded'
  return 'live'
}

export function LiveMachineGrid() {
  const [view, setView] = useState<MachineActivityView>(() => emptyView())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/command-centre/machine-activity', {
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(`machine_activity_http_${response.status}`)
        const next = (await response.json()) as MachineActivityView
        if (!cancelled) {
          setView(next)
          setFetchError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setFetchError(error instanceof Error ? error.message : 'machine_activity_fetch_failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const mode = sourceMode(loading, view, fetchError)
  const connectedCount = useMemo(
    () => view.machines.filter((machine) => machine.connection === 'connected').length,
    [view.machines],
  )
  const degradedReason = fetchError ?? (view.source !== 'connected' ? view.reason ?? view.source : null)

  return (
    <section aria-label="Live computer activity" className={styles.root}>
      <div className={styles.toolbar}>
        <div>
          <p className={styles.eyebrow}>Actual estate · structured telemetry only</p>
          <h3 className={styles.title}>Live Human Mission Control</h3>
        </div>
        <SourceBadge
          mode={mode}
          label={`${connectedCount} of ${view.machines.length} machines connected · 6 safe screens`}
          lastUpdatedAt={view.generatedAt}
        />
      </div>

      <p className={styles.safetyLine}>
        No screen video, prompts, messages, commands, paths, clipboard or private window content.
      </p>

      {degradedReason && (
        <div className={styles.degradedAlert} role="alert">
          Live machine activity is not connected ({degradedReason.replaceAll('_', ' ')}). No current
          activity is displayed.
        </div>
      )}

      <div className={styles.machineGrid}>
        {view.machines.map((machine) => (
          <article
            key={machine.deviceId}
            data-testid={`machine-${machine.deviceId}`}
            className={styles.machine}
            aria-label={`${machine.label}: ${stateLabel(machine.connection)}`}
          >
            <header className={styles.machineHeader}>
              <div>
                <div className={styles.machineTitleRow}>
                  <span className={`${styles.statusDot} ${stateClass(machine.connection)}`} aria-hidden />
                  <h4>{machine.label}</h4>
                </div>
                <p>{machine.role}</p>
              </div>
              <div className={styles.machineMeta}>
                <span>{machine.platform}</span>
                <strong className={stateClass(machine.connection)}>{stateLabel(machine.connection)}</strong>
                <time dateTime={machine.lastSeenAt ?? undefined}>{relativeAge(machine.lastSeenAt)}</time>
              </div>
            </header>

            <div className={styles.screenStack}>
              {machine.screens.map((slot) => {
                const current = machine.connection === 'connected'
                return (
                  <article
                    key={slot.screenId}
                    data-testid={`machine-screen-${machine.deviceId}-${slot.screenId}`}
                    className={`${styles.screen} ${stateClass(slot.state)}`}
                    aria-label={`${machine.label} ${slot.label}: ${stateLabel(slot.state)}`}
                  >
                    <div className={styles.screenTopline}>
                      <span>{slot.label}</span>
                      <strong className={stateClass(slot.state)}>{stateLabel(slot.state)}</strong>
                    </div>

                    {current && slot.state !== 'unknown' ? (
                      <div className={styles.activityBody}>
                        <p className={styles.activity}>{slot.activity}</p>
                        <dl className={styles.facts}>
                          <div>
                            <dt>Agent</dt>
                            <dd>{slot.agent ?? 'unknown'}</dd>
                          </div>
                          <div>
                            <dt>Tool</dt>
                            <dd>{slot.tool ?? 'none'}</dd>
                          </div>
                          <div>
                            <dt>Project</dt>
                            <dd>{slot.projectKey ?? 'unassigned'}</dd>
                          </div>
                          <div>
                            <dt>Task</dt>
                            <dd>{slot.taskRef ?? 'no ticket ref'}</dd>
                          </div>
                        </dl>
                      </div>
                    ) : (
                      <div className={styles.noCurrentActivity}>
                        <p>No current activity displayed</p>
                        <span>{slot.lastSeenAt ? `Last safe receipt ${relativeAge(slot.lastSeenAt)}` : 'Awaiting first safe receipt'}</span>
                      </div>
                    )}
                    <span className={styles.monitorStand} aria-hidden />
                  </article>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

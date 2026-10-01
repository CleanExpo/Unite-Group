'use client'

import { useEffect, useReducer, useRef } from 'react'
import { createWorld, reduceWorld, type WorldCommand, type WorldState } from '@/lib/restoration-world/scenario'
import styles from './mission-control-next.module.css'

interface PlaytestState { world: WorldState | null; notice: string }
type Action = { type: 'start' } | { type: 'close' } | { type: 'command'; command: WorldCommand }

function playtestReducer(state: PlaytestState, action: Action): PlaytestState {
  if (action.type === 'start') return { world: createWorld(), notice: 'A new fictional playtest has started.' }
  if (action.type === 'close') return { world: null, notice: 'Playtest closed. Nothing was saved.' }
  if (!state.world) return state
  const result = reduceWorld(state.world, action.command)
  if (!result.ok) return { ...state, notice: `No change: ${result.code.replaceAll('-', ' ')}. Use the current step.` }
  if (result.replayed) return { ...state, notice: 'That action was already applied. No extra progress was added.' }
  return {
    world: result.state,
    notice: result.state.stage === 'consequence'
      ? result.state.consequence?.summary ?? ''
      : result.state.stage === 'reflected'
        ? 'Reflection recorded for this fictional run only. No CARSI credit or professional evidence was issued.'
        : 'Fictional scenario complete. Nothing was saved or certified.',
  }
}

/** Optional local playtest. Intentionally separate from the unavailable live-world card. */
export function WorldPlaytest() {
  const [{ world, notice }, dispatch] = useReducer(playtestReducer, { world: null, notice: '' })
  const heading = useRef<HTMLHeadingElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const interacted = useRef(false)
  useEffect(() => {
    if (!interacted.current) return
    if (world) heading.current?.focus()
    else startButton.current?.focus()
  }, [world])

  function act(action: Action) {
    interacted.current = true
    dispatch(action)
  }

  return (
    <section className={styles.card} data-state="test" data-tone="neutral" aria-label="Fictional Restoration World playtest">
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle} ref={heading} tabIndex={-1}>Warehouse playtest</h2>
        <span className={styles.badge}>SIMULATION</span>
      </header>
      <p className={styles.detail}>Fictional playtest · not saved</p>
      <p className={styles.detail}>Refreshing, changing tabs or using another device starts over. This does not change real jobs, membership, CARSI credit or professional evidence.</p>
      {!world ? (
        <button className={styles.button} type="button" ref={startButton} onClick={() => act({ type: 'start' })}>
          Start fictional playtest
        </button>
      ) : (
        <>
          <div className={styles.playtestWarehouse}>
            <h3 className={styles.cardTitle}>{world.warehouse.name}</h3>
            <p className={styles.detail}>Role: technician · capacity units are fictional</p>
            <label className={styles.playtestCapacity}>
              Available capacity: {world.warehouse.availableCapacity} / 100
              <meter min={0} max={100} value={world.warehouse.availableCapacity} />
            </label>
          </div>
          {world.stage === 'briefing' ? (
            <>
              <h3 className={styles.cardTitle}>A water-loss call under pressure</h3>
              <p className={styles.detail}>A fictional customer wants an immediate response. You have limited capacity, and site risks and qualified support have not been confirmed. What do you do?</p>
              <div className={styles.playtestActions}>
                <button className={styles.button} type="button" onClick={() => act({ type: 'command', command: {
                  id: 'decision', expectedRevision: world.revision, type: 'decide', choice: 'seek-support',
                } })}>Request qualified support and explain the delay</button>
                <button className={styles.button} type="button" onClick={() => act({ type: 'command', command: {
                  id: 'decision', expectedRevision: world.revision, type: 'decide', choice: 'rush-response',
                } })}>Explore the consequence of rushing</button>
              </div>
            </>
          ) : (
            <>
              <h3 className={styles.cardTitle}>Consequence in this simulation</h3>
              <p className={styles.detail}>{world.consequence?.summary}</p>
              <p className={styles.detail}>This is a fictional capacity exercise, not field instructions or proof of workplace competence.</p>
              {world.stage === 'consequence' ? (
                <>
                  <p className={styles.detail}>Reflection: customer pressure does not remove uncertainty. Explain limits, seek appropriate support and do not describe unverified work as complete.</p>
                  <button className={styles.button} type="button" onClick={() => act({ type: 'command', command: {
                    id: 'reflection', expectedRevision: world.revision, type: 'reflect',
                  } })}>Acknowledge the reflection</button>
                </>
              ) : world.stage === 'reflected' ? (
                <button className={styles.button} type="button" onClick={() => act({ type: 'command', command: {
                  id: 'complete', expectedRevision: world.revision, type: 'complete',
                } })}>Finish fictional scenario</button>
              ) : <p className={styles.value}>Fictional scenario complete</p>}
              <p className={styles.detail}>
                <a className={styles.playtestLink} href="https://carsi.com.au/courses" target="_blank" rel="noopener noreferrer">Browse CARSI learning (new tab)</a>
                {' '}· catalogue link only; no course completion is recorded here
              </p>
            </>
          )}
          <p className={styles.detail}>Simulation only: {world.progression.reflections} reflection, {world.progression.completedScenarios} completed scenario. Professional evidence: not assessed.</p>
          <details className={styles.playtestSnapshot}>
            <summary>Inspect the same world snapshot · revision {world.revision}</summary>
            <pre>{JSON.stringify(world, null, 2)}</pre>
          </details>
          <div className={styles.playtestActions}>
            <button className={styles.button} type="button" onClick={() => act({ type: 'start' })}>Restart fictional playtest</button>
            <button className={styles.button} type="button" onClick={() => act({ type: 'close' })}>Close playtest</button>
          </div>
        </>
      )}
      <p className={styles.detail} role="status" aria-live="polite">{notice}</p>
    </section>
  )
}

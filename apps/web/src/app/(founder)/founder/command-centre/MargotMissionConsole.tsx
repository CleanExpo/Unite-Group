'use client'

import { useId, useMemo, useState } from 'react'
import type { DeliveryPreset } from '@/lib/command-centre/delivery-types'
import { RepositorySelector } from './RepositorySelector'
import styles from './founder-desk.module.css'

const AVAILABILITY: Record<DeliveryPreset['availability'], string> = {
  ready_to_reuse: 'Ready to reuse', needs_connection: 'Needs connection', new_work: 'Requires new work',
}

export function MargotMissionConsole({ projects, presets, busy, onPrepare }: {
  projects: Array<{ name: string }>
  presets: DeliveryPreset[]
  busy: boolean
  onPrepare: (idea: string, projectKey: string, presetIds: string[]) => void
}) {
  const fieldId = useId()
  const [idea, setIdea] = useState('')
  const [project, setProject] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const included = useMemo(() => {
    const result = new Map<string, DeliveryPreset>()
    function include(id: string) {
      const preset = presets.find(p => p.id === id)
      if (!preset || result.has(id)) return
      result.set(id, preset)
      preset.dependencies.forEach(include)
    }
    selected.forEach(include)
    return [...result.values()]
  }, [presets, selected])
  const requirements = [...new Set(included.flatMap(p => p.requirements))]
  const hasDraft = idea.trim().length > 0 || included.length > 0

  return (
    <section id="idea-console" className={styles.composerGrid} data-has-draft={hasDraft} aria-label="Start a mission with Margot">
      <form className={styles.composer} onSubmit={e => { e.preventDefault(); if (idea.trim() && !busy) onPrepare(idea.trim(), project, selected) }}>
        <div className={styles.margotHeading}>
          <span className={styles.margotMark} aria-hidden="true">M</span>
          <div><h2>What would you like to make happen?</h2><p>Tell Margot in your own words.</p></div>
        </div>
        <label className={styles.fieldLabel} htmlFor={`${fieldId}-idea`}>Your idea</label>
        <textarea id={`${fieldId}-idea`} className={styles.ideaInput} value={idea} onChange={e => setIdea(e.target.value)} disabled={busy} maxLength={12000} placeholder="I want our customers to see their job progress, approve quotes and know what happens next…" />
        <div className={styles.composerFooter}>
          <RepositorySelector value={project} onChange={setProject} projects={projects} disabled={busy} />
          <button className={styles.primaryButton} disabled={busy || !idea.trim()} type="submit">{busy ? 'Preparing your mission…' : 'Prepare my mission'}</button>
        </div>
        {presets.length > 0 && <fieldset className={styles.presets} disabled={busy}>
          <legend>Add capabilities <span>Optional — choose what helps your idea.{selected.length > 0 && ` ${selected.length} selected.`}</span></legend>
          <div className={styles.presetButtons}>{presets.map(p => <button key={p.id} type="button" aria-pressed={selected.includes(p.id)} className={styles.preset} onClick={() => setSelected(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])} title={p.description}>
            <span>{p.label}</span>{' '}<small>{AVAILABILITY[p.availability]}</small>
          </button>)}</div>
          <p className={styles.helper}>Choosing a capability adds requirements. It does not connect an account or start work.</p>
        </fieldset>}
      </form>
      {hasDraft && <aside className={styles.draftSpec} aria-label="Your draft specification" aria-live="polite">
        <div className={styles.sectionHeading}><h2>Your brief, taking shape</h2><span className={styles.status}>Draft</span></div>
        <p className={styles.draftIntro}>{idea.trim() || 'Your idea and selected capabilities appear here before Margot prepares the mission.'}</p>
        {project && <p className={styles.meta}>For {project}</p>}
        {requirements.length > 0 && <><h3>Included in your specification</h3><ul className={styles.requirements}>{requirements.map(r => <li key={r}>{r}</li>)}</ul></>}
        {included.some(p => !selected.includes(p.id)) && <p className={styles.helper}>Supporting capabilities: {included.filter(p => !selected.includes(p.id)).map(p => p.label).join(', ')}.</p>}
        <div className={styles.draftNext}><h3>What happens next</h3><p>Margot prepares a clear brief and recommends the expertise this mission needs. Any unresolved business questions come back here.</p></div>
      </aside>}
    </section>
  )
}

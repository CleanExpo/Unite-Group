'use client'

import { useId, useRef, useState } from 'react'
import { BUSINESSES, getBusinessByKey } from '@/lib/businesses'
import type { DeliveryMissionView } from '@/lib/command-centre/delivery-types'
import styles from './founder-desk.module.css'

export function MissionBusiness({ mission, disabled, onSaved }: { mission: DeliveryMissionView; disabled: boolean; onSaved?: () => void }) {
  const id = useId()
  const [selection, setSelection] = useState(mission.businessKey ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState(mission.businessKey ?? '')
  const [version, setVersion] = useState(mission.updatedAt)
  const submitting = useRef(false)
  const currentKey = savedKey
  const business = getBusinessByKey(currentKey)
  return <section className={styles.questions} aria-label="Mission business">
    <h3>Keep this mission with its business</h3>
    <p className={styles.helper}>Choose the same business as the left-hand My Businesses menu. Research, decisions and tasks stay with this mission. The build repository keeps its separate assignment.</p>
    <form onSubmit={async event => {
      event.preventDefault()
      if (disabled || submitting.current) return
      submitting.current = true
      setBusy(true); setError(null)
      try {
        const response = await fetch('/api/command-centre/missions/business', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: mission.taskId, expectedUpdatedAt: version, businessKey: selection || null }) })
        const body = await response.json() as { mission?: DeliveryMissionView; source?: string; error?: string }
        if (!response.ok || body.source !== 'supabase' || body.mission?.taskId !== mission.taskId || (body.mission.businessKey ?? '') !== selection) throw new Error(body.error || 'The business assignment was not confirmed. Refresh before retrying.')
        setSavedKey(selection)
        setVersion(body.mission.updatedAt)
        onSaved?.()
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'The business assignment could not be saved.') }
      finally { submitting.current = false; setBusy(false) }
    }}>
      <div className={styles.answerField}><label htmlFor={id}>Business for this mission</label><select id={id} value={selection} onChange={event => setSelection(event.target.value)} disabled={disabled || busy}>
        <option value="">Unassigned — choose a business</option>
        {BUSINESSES.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}
      </select></div>
      <button className={styles.secondaryButton} type="submit" disabled={disabled || busy}>{busy ? 'Saving business…' : 'Save business assignment'}</button>
    </form>
    {business && <p role="status">Filed under {business.name}. <a href={`/founder/${business.key}`}>Open business</a> · <a href={`/founder/command-centre?business=${business.key}`}>View its missions</a></p>}
    {!business && <p className={styles.helper}>Unassigned. Choose Unite-Group for shared platform work, or the business this mission serves.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>
}

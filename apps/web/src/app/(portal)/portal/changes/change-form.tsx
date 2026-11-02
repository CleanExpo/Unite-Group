'use client'

import { useRef, useState, type FormEvent } from 'react'

import { createClient } from '@/lib/supabase/client'
import { CHANGE_PAGES } from '@/lib/portal/changes/types'
import { PHOTO_BUCKET, REQUEST_TEXT_MAX, photoPathFor, validatePhotoFile } from '@/lib/portal/changes/validate'

import { submitChangeAction, type FormState } from './actions'
import u from './portal-ui.module.css'

/**
 * "Request a change". The optional photo is uploaded first, straight into the private bucket under her own
 * tenant folder (the storage rule refuses any other folder), then the request is saved with that path.
 */
export function ChangeForm({ tenantSlug }: { tenantSlug: string }) {
  const [state, setState] = useState<FormState>(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const file = form.get('photo')
    setBusy(true)
    setState(null)
    try {
      let photoPath: string | null = null
      if (file instanceof File && file.size > 0) {
        const problem = validatePhotoFile(file)
        if (problem) {
          setState({ ok: false, message: problem })
          return
        }
        photoPath = photoPathFor(tenantSlug, crypto.randomUUID(), file.type)
        if (!photoPath) {
          setState({ ok: false, message: 'Please choose a JPG, PNG or WebP photo.' })
          return
        }
        const { error } = await createClient().storage.from(PHOTO_BUCKET).upload(photoPath, file, { contentType: file.type, upsert: false })
        if (error) {
          setState({ ok: false, message: 'That photo did not upload. Please try again, or send the request without it.' })
          return
        }
      }
      const result = await submitChangeAction({
        page: String(form.get('page') ?? ''),
        requestText: String(form.get('requestText') ?? ''),
        photoPath,
      })
      setState(result)
      if (result?.ok) formRef.current?.reset()
    } catch {
      setState({ ok: false, message: 'Could not reach us. Check your connection and try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={u.form} aria-describedby="change-form-status">
      <div>
        <label htmlFor="page" className={u.label}>Which page?</label>
        <select id="page" name="page" required defaultValue="" className={u.field}>
          <option value="" disabled>Choose a page</option>
          {CHANGE_PAGES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="requestText" className={u.label}>What would you like changed?</label>
        <textarea id="requestText" name="requestText" required minLength={5} maxLength={REQUEST_TEXT_MAX} rows={5} className={u.field}
          placeholder="For example: change our phone number to 0400 000 000 on the contact page." />
      </div>
      <div>
        <label htmlFor="photo" className={u.label}>Add a photo (optional)</label>
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className={u.field} />
        <p className={u.hint}>JPG, PNG or WebP, up to 5 MB. Only you and our team can see it.</p>
      </div>
      <div className={u.actions}>
        <button type="submit" className={u.btn} disabled={busy}>{busy ? 'Sending…' : 'Send my request'}</button>
      </div>
      <div id="change-form-status" aria-live="polite">
        {state && <p role={state.ok ? 'status' : 'alert'} className={state.ok ? u.ok : u.err}>{state.message}</p>}
      </div>
    </form>
  )
}

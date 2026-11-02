'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'

import { REDEEM_COPY } from '@/lib/portal/invites/outcomes'
import { createClient } from '@/lib/supabase/client'

import styles from './join.module.css'

type Mode = 'loading' | 'verify' | 'enrol-start' | 'enrol-scan' | 'error'
type Enrolment = { factorId: string; qrCode: string; secret: string }

/**
 * Step 3: confirm it is you with an authenticator app (Supabase MFA, TOTP). This lifts the session to aal2.
 * An owner with a confirmed app enters a code; an owner without one sets it up first. No password anywhere.
 */
export function SecondFactorStep({ email }: { email: string | null }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    createClient().auth.mfa.listFactors().then(({ data, error }) => {
      if (cancelled) return
      if (error) { setMode('error'); return }
      const verified = data?.totp?.find((f) => f.status === 'verified')
      if (verified) { setFactorId(verified.id); setMode('verify') } else setMode('enrol-start')
    }).catch(() => { if (!cancelled) setMode('error') })
    return () => { cancelled = true }
  }, [])

  async function startEnrolment() {
    setProblem(null)
    setBusy(true)
    const supabase = createClient()
    try {
      // Clear only half-finished set-ups (never a confirmed app), so a retry does not fail on a duplicate name.
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const stale = (factors?.all ?? []).filter((f) => f.factor_type === 'totp' && f.status !== 'verified')
      await Promise.all(stale.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })))
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Business portal' })
      if (error || !data) { setProblem('We could not start the set-up. Please try again.'); return }
      setEnrolment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
      setFactorId(data.id)
      setMode('enrol-scan')
    } catch {
      setProblem('We could not start the set-up. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setProblem(null)
    setBusy(true)
    const supabase = createClient()
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError || !challenge) { setProblem('We could not check the code. Please try again.'); return }
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() })
      if (error) { setProblem('That code did not match. Codes change every 30 seconds: use the newest one.'); return }
      router.refresh()
    } catch {
      setProblem('We could not check the code. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const codeForm = (
    <form className={styles.form} onSubmit={onVerify}>
      <label>
        6-digit code from your app
        <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" />
      </label>
      <div className={styles.row}>
        <button type="submit" className={styles.button} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm'}</button>
      </div>
    </form>
  )

  return (
    <>
      <h2 id="join-step">{REDEEM_COPY.needs_second_factor.title}</h2>
      <p className={styles.body}>
        {email ? <>You are signed in as <strong>{email}</strong>. </> : null}
        {REDEEM_COPY.needs_second_factor.body}
      </p>
      {mode === 'loading' && <p role="status" className={styles.body}>Checking your sign-in…</p>}
      {mode === 'error' && <p role="alert" className={styles.problem}>We could not check your sign-in. Please refresh the page.</p>}
      {mode === 'verify' && codeForm}
      {mode === 'enrol-start' && (
        <>
          <p className={styles.body}>
            You need an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator. It
            takes about a minute, and keeps your portal safe even if someone gets into your email.
          </p>
          <div className={styles.row}>
            <button type="button" className={styles.button} onClick={startEnrolment} disabled={busy}>{busy ? 'Starting…' : 'Set up my app'}</button>
          </div>
        </>
      )}
      {mode === 'enrol-scan' && enrolment && (
        <>
          <p className={styles.body}>Open your authenticator app, add an account, and scan this code.</p>
          {/* The QR code is made by Supabase for this one set-up (a data URI), not page artwork. */}
          <img className={styles.qr} src={enrolment.qrCode} alt="QR code to add your business portal to your authenticator app" width={180} height={180} />
          <p className={styles.note}>Can&apos;t scan? Type this key into the app instead: <span className={styles.mono}>{enrolment.secret}</span></p>
          {codeForm}
        </>
      )}
      {problem && <p role="alert" className={styles.problem}>{problem}</p>}
    </>
  )
}

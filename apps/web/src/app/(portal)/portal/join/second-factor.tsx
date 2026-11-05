'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'

import { sendPortalEmailCodeAction, verifyPortalEmailCodeAction } from '@/lib/portal/email-second-factor-action'
import { REDEEM_COPY } from '@/lib/portal/invites/outcomes'
import { emailFactorIdFrom, emailFactorVerified, initialSecondFactorMode } from '@/lib/portal/second-factor-mode'
import { createClient } from '@/lib/supabase/client'

import styles from './join.module.css'

type Mode = 'loading' | 'error' | 'choose' | 'verify' | 'enrol-scan' | 'email'
type Enrolment = { factorId: string; qrCode: string; secret: string }
type EmailOutcome = 'signed_out' | 'no_email' | 'rate_limited' | 'bad_code' | 'needs_authenticator' | 'error'

/**
 * Step 3: confirm it is you. An authenticator app, or a 6-digit code we email, lifts the session to aal2.
 * The page only moves on once the server reads aal2. An app we did not set up for email is not removed.
 */
export function SecondFactorStep({
  email,
  title = REDEEM_COPY.needs_second_factor.title,
  body = REDEEM_COPY.needs_second_factor.body,
}: {
  email: string | null
  /** Wording for where the step is shown. Defaults to the invite-claim wording; /portal/verify passes its own. */
  title?: string
  body?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [hasApp, setHasApp] = useState(false)
  const [canEmail, setCanEmail] = useState(true)
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailNote, setEmailNote] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.getUser()]).then(([listed, current]) => {
      if (cancelled) return
      if (listed.error || current.error) { setMode('error'); return }
      const totp = (listed.data?.totp ?? []).map((factor) => ({ id: factor.id, status: factor.status }))
      // Ours is the factor id the server stored in app_metadata, never a display name.
      const emailFactorId = emailFactorIdFrom(current.data?.user?.app_metadata)
      const foreign = totp.find((factor) => factor.status === 'verified' && factor.id !== emailFactorId)
      setHasApp(Boolean(foreign))
      if (foreign) setFactorId(foreign.id)
      // Supabase will not add a second factor below aal2 once one is verified, so with
      // an app of their own, email can stand in only if our email factor is already verified.
      setCanEmail(!foreign || emailFactorVerified(totp, emailFactorId))
      setMode(initialSecondFactorMode(totp, emailFactorId))
    }).catch(() => { if (!cancelled) setMode('error') })
    return () => { cancelled = true }
  }, [])

  async function startEnrolment() {
    setProblem(null)
    setBusy(true)
    const supabase = createClient()
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const stale = (factors?.all ?? []).filter((factor) => factor.factor_type === 'totp' && factor.status !== 'verified')
      await Promise.all(stale.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })))
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Business portal' })
      if (error || !data || data.type !== 'totp') { setProblem('We could not start the set-up. Please try again.'); return }
      setEnrolment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
      setFactorId(data.id)
      setMode('enrol-scan')
    } catch {
      setProblem('We could not start the set-up. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyApp(e: FormEvent) {
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

  async function onSendEmail() {
    setProblem(null)
    setBusy(true)
    try {
      const result = await sendPortalEmailCodeAction()
      if (result.ok) {
        setEmailNote(emailSent ? 'We sent another code. Use the newest one.' : null)
        setEmailSent(true)
        setCode('')
        setMode('email')
        return
      }
      setProblem(emailProblem(result.outcome, result.retryAfterSeconds))
      if (emailSent) setMode('email')
    } catch {
      setProblem('We could not send the code. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyEmail(e: FormEvent) {
    e.preventDefault()
    setProblem(null)
    setBusy(true)
    try {
      const result = await verifyPortalEmailCodeAction(code)
      if (result.ok) { router.refresh(); return }
      setProblem(emailProblem(result.outcome, result.retryAfterSeconds))
    } catch {
      setProblem('We could not check the code. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  function showEmail() {
    setProblem(null)
    setCode('')
    setMode('email')
  }

  function showApp() {
    setProblem(null)
    setCode('')
    setMode(factorId ? 'verify' : 'choose')
  }

  const appForm = (
    <form className={styles.form} onSubmit={onVerifyApp}>
      <label>
        6-digit code from your app
        <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} autoComplete="one-time-code" />
      </label>
      <div className={styles.row}>
        <button type="submit" className={styles.button} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm'}</button>
      </div>
    </form>
  )

  return (
    <>
      <h2 id="join-step">{title}</h2>
      <p className={styles.body}>
        {email ? <>You are signed in as <strong>{email}</strong>. </> : null}
        {body}
      </p>
      {mode === 'loading' && <p role="status" className={styles.body}>Checking your sign-in…</p>}
      {mode === 'error' && <p role="alert" className={styles.problem}>We could not check your sign-in. Please refresh the page.</p>}
      {mode === 'verify' && (
        <>
          {appForm}
          {canEmail ? (
            <div className={styles.row}>
              <button type="button" className={styles.textButton} onClick={showEmail}>Use email instead</button>
            </div>
          ) : (
            <p className={styles.note}>This sign-in is protected by your authenticator app, so an emailed code cannot replace it here.</p>
          )}
        </>
      )}
      {mode === 'choose' && (
        <>
          <p className={styles.body}>
            An authenticator app is the stronger check. If you do not have one, we can email you a 6-digit code instead.
          </p>
          <div className={styles.row}>
            <button type="button" className={styles.button} onClick={startEnrolment} disabled={busy}>{busy ? 'Starting…' : 'Set up my app'}</button>
            <button type="button" className={styles.textButton} onClick={onSendEmail} disabled={busy || !email}>{busy ? 'Sending…' : 'Email me a code'}</button>
          </div>
        </>
      )}
      {mode === 'enrol-scan' && enrolment && (
        <>
          <p className={styles.body}>Open your authenticator app, add an account, and scan this code.</p>
          {/* The QR code is made by Supabase for this one set-up (a data URI), not page artwork. */}
          <img className={styles.qr} src={enrolment.qrCode} alt="QR code to add your business portal to your authenticator app" width={180} height={180} />
          <p className={styles.note}>Can&apos;t scan? Type this key into the app instead: <span className={styles.mono}>{enrolment.secret}</span></p>
          {appForm}
          <div className={styles.row}>
            <button type="button" className={styles.textButton} onClick={showEmail}>Use email instead</button>
          </div>
        </>
      )}
      {mode === 'email' && (
        <>
          {emailSent ? (
            <>
              <p className={styles.body}>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
                {emailNote ? <> {emailNote}</> : null}
              </p>
              <form className={styles.form} onSubmit={onVerifyEmail}>
                <label>
                  6-digit code from your email
                  <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} autoComplete="one-time-code" />
                </label>
                <div className={styles.row}>
                  <button type="submit" className={styles.button} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm'}</button>
                  <button type="button" className={styles.textButton} onClick={onSendEmail} disabled={busy}>{busy ? 'Sending…' : 'Resend code'}</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className={styles.body}>
                {email
                  ? <>We can email a 6-digit code to <strong>{email}</strong>.</>
                  : 'We do not have an email address for this sign-in.'}
              </p>
              <div className={styles.row}>
                <button type="button" className={styles.button} onClick={onSendEmail} disabled={busy || !email}>{busy ? 'Sending…' : 'Email me a code'}</button>
              </div>
            </>
          )}
          {hasApp && (
            <div className={styles.row}>
              <button type="button" className={styles.textButton} onClick={showApp}>Use your authenticator app instead</button>
            </div>
          )}
        </>
      )}
      {problem && <p role="alert" className={styles.problem}>{problem}</p>}
    </>
  )
}

function emailProblem(outcome: EmailOutcome, retryAfterSeconds?: number): string {
  if (outcome === 'rate_limited') return waitPhrase(retryAfterSeconds)
  if (outcome === 'bad_code') return 'That code did not match, or it has expired. You can ask for a new one.'
  if (outcome === 'needs_authenticator') return 'Your authenticator app is still required. Enter the current 6-digit code from the app.'
  if (outcome === 'signed_out') return 'Your sign-in ended. Refresh the page and sign in again.'
  if (outcome === 'no_email') return 'We do not have an email address for this sign-in.'
  return 'We could not check that. Please try again.'
}

function waitPhrase(seconds: number | undefined): string {
  const shown = seconds && seconds > 0 ? seconds : 60
  if (shown >= 120) return 'Please wait ' + String(Math.ceil(shown / 60)) + ' minutes before trying again.'
  return 'Please wait ' + String(shown) + ' seconds before asking for another code.'
}

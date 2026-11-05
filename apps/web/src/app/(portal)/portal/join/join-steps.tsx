'use client'

import { useState, type FormEvent } from 'react'

import { REDEEM_COPY, type RedeemAppOutcome, type RedeemOutcome } from '@/lib/portal/invites/outcomes'

import { redeemInviteAction, requestJoinLinkAction, type JoinLinkResult } from './actions'
import styles from './join.module.css'
import { SecondFactorStep } from './second-factor'

export type JoinStep = 'code' | 'sign-in' | 'second-factor' | 'claim'

const STEP_NUMBER: Record<JoinStep, number> = { code: 1, 'sign-in': 2, 'second-factor': 3, claim: 4 }

function linkCopy(outcome: Extract<JoinLinkResult, { ok: false }>['outcome']): { title: string; body: string } {
  if (outcome === 'bad_email') return { title: 'Check your email address', body: 'That email address does not look right.' }
  return REDEEM_COPY[outcome]
}

function Message({ copy, tone }: { copy: { title: string; body: string }; tone: 'ok' | 'problem' }) {
  return (
    <div role={tone === 'problem' ? 'alert' : 'status'} className={tone === 'problem' ? styles.problem : styles.success}>
      <p className={styles.messageTitle}>{copy.title}</p>
      <p className={styles.messageBody}>{copy.body}</p>
    </div>
  )
}

/** One step at a time, so a non-technical owner always sees one clear thing to do. */
export function JoinSteps({ step, code, email }: { step: JoinStep; code: string; email: string | null }) {
  return (
    <section className={styles.panel} aria-labelledby="join-step">
      <p className={styles.stepCount}>Step {STEP_NUMBER[step]} of 4</p>
      {step === 'code' && <CodeStep />}
      {step === 'sign-in' && <SignInStep code={code} />}
      {step === 'second-factor' && <SecondFactorStep email={email} />}
      {step === 'claim' && <ClaimStep code={code} email={email} />}
    </section>
  )
}

function CodeStep() {
  return (
    <>
      <h2 id="join-step">Enter your invite code</h2>
      <p className={styles.body}>{REDEEM_COPY.no_code.body}</p>
      <form className={styles.form} method="get" action="/portal/join">
        <label>
          Invite code
          <input name="code" required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" />
        </label>
        <div className={styles.row}><button type="submit" className={styles.button}>Continue</button></div>
      </form>
    </>
  )
}

function SignInStep({ code }: { code: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [resent, setResent] = useState(false)
  const [problem, setProblem] = useState<Extract<JoinLinkResult, { ok: false }> | null>(null)

  async function send(e?: FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setProblem(null)
    try {
      const result = await requestJoinLinkAction(code, email)
      if (result.ok) {
        setResent(sent)
        setSent(true)
      } else {
        setProblem(result)
      }
    } catch {
      setProblem({ ok: false, outcome: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2 id="join-step">Sign in with your email</h2>
      <p className={styles.body}>We will email you a sign-in link. Nothing to remember: the link signs you in.</p>
      {sent ? (
        <>
          <Message tone="ok" copy={{
            title: 'Check your email',
            body: resent
              ? 'We sent another sign-in link. Open the newest one, on this device. It brings you back here.'
              : 'Open the sign-in link we just sent, on this device. It brings you back here.',
          }} />
          <div className={styles.row}>
            <button type="button" className={styles.textButton} onClick={() => { void send() }} disabled={busy}>
              {busy ? 'Sending…' : 'Resend sign-in link'}
            </button>
          </div>
          {problem && <Message tone="problem" copy={linkCopy(problem.outcome)} />}
        </>
      ) : (
        <form className={styles.form} onSubmit={send}>
          <label>
            Your email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <div className={styles.row}>
            <button type="submit" className={styles.button} disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
          </div>
          {problem && <Message tone="problem" copy={linkCopy(problem.outcome)} />}
        </form>
      )}
    </>
  )
}

function ClaimStep({ code, email }: { code: string; email: string | null }) {
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<RedeemOutcome | RedeemAppOutcome | null>(null)

  async function onClaim() {
    setBusy(true)
    try {
      setOutcome(await redeemInviteAction(code))
    } catch {
      setOutcome('error')
    } finally {
      setBusy(false)
    }
  }

  if (outcome === 'redeemed') {
    return (
      <>
        <h2 id="join-step">All done</h2>
        <Message tone="ok" copy={REDEEM_COPY.redeemed} />
        <div className={styles.row}><a className={styles.button} href="/portal">Go to my portal</a></div>
      </>
    )
  }

  return (
    <>
      <h2 id="join-step">Claim your portal</h2>
      <p className={styles.body}>{email ? <>You are signed in as <strong>{email}</strong>.</> : 'You are signed in.'} One tap and your portal is yours.</p>
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={onClaim} disabled={busy}>{busy ? 'Claiming…' : 'Claim my portal'}</button>
      </div>
      {outcome && <Message tone="problem" copy={REDEEM_COPY[outcome]} />}
    </>
  )
}

'use client'

import { useState } from 'react'
import { Lock, KeyRound, Eye, EyeOff } from 'lucide-react'
import { verifyVaultPassword, resetVaultPassword } from '@/lib/vault-password'
import { PasswordField } from './PasswordField'

interface VaultLockProps { onUnlock: () => void }

type Mode = 'unlock' | 'reset'

// Password field with a show/hide eye toggle.
function PasswordField(props: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  error: boolean
  show: boolean
  onToggle: () => void
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        type={props.show ? 'text' : 'password'}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        className="w-full px-3 pr-9 h-9 rounded-sm text-[13px] text-[#0A0A0A] outline-none transition-colors"
        style={{
          background: 'var(--surface-card)',
          border: `1px solid ${props.error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        }}
      />
      <button
        type="button"
        onClick={props.onToggle}
        tabIndex={-1}
        aria-label={props.show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors hover:opacity-80"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {props.show ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export function VaultLock({ onUnlock }: VaultLockProps) {
  const [mode, setMode]           = useState<Mode>('unlock')
  const [value, setValue]         = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [checking, setChecking]   = useState(false)
  const [showPw, setShowPw]       = useState(false)

  // ── Unlock ──────────────────────────────────────────────────────────────
  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setChecking(true)
    const ok = await verifyVaultPassword(value)
    setChecking(false)
    if (ok) { onUnlock() } else {
      setError('Incorrect password')
      setValue('')
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (value.length < 6) { setError('Password must be at least 6 characters'); return }
    if (value !== confirm) { setError('Passwords do not match'); return }
    setChecking(true)
    await resetVaultPassword(value)
    setChecking(false)
    onUnlock()
  }

  function enterResetMode() {
    setValue(''); setConfirm(''); setError(null); setMode('reset')
  }

  function enterUnlockMode() {
    setValue(''); setConfirm(''); setError(null); setMode('unlock')
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-10"
      style={{ background: 'var(--surface-sidebar)' }}
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-xs px-4">

        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3">
          {mode === 'unlock'
            ? <Lock size={32} strokeWidth={1.5} style={{ color: '#15803d' }} />
            : <KeyRound size={32} strokeWidth={1.5} style={{ color: '#15803d' }} />
          }
          <p className="text-[14px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {mode === 'unlock'
              ? 'Enter your master password to access the Vault'
              : 'Set a new master password for the Vault'
            }
          </p>
        </div>

        {/* Unlock form */}
        {mode === 'unlock' && (
          <form onSubmit={handleUnlock} className="w-full flex flex-col gap-3">
            <PasswordField
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null) }}
              placeholder="Master password"
              error={!!error}
              show={showPw}
              onToggle={() => setShowPw((s) => !s)}
              autoFocus
            />
            {error && (
              <p className="text-[12px] text-center" style={{ color: 'var(--color-danger)' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={checking || !value}
              className="h-9 rounded-sm text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#16a34a', color: '#fffdf7' }}
            >
              {checking ? 'Checking...' : 'Unlock Vault'}
            </button>
            <button
              type="button"
              onClick={enterResetMode}
              className="text-[12px] text-center transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              Forgot password?
            </button>
          </form>
        )}

        {/* Reset form */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} className="w-full flex flex-col gap-3">
            <PasswordField
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null) }}
              placeholder="New password (min 6 chars)"
              error={!!error}
              show={showPw}
              onToggle={() => setShowPw((s) => !s)}
              autoFocus
            />
            <PasswordField
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null) }}
              placeholder="Confirm new password"
              error={!!error}
              show={showPw}
              onToggle={() => setShowPw((s) => !s)}
            />
            {error && (
              <p className="text-[12px] text-center" style={{ color: 'var(--color-danger)' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={checking || !value || !confirm}
              className="h-9 rounded-sm text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#16a34a', color: '#fffdf7' }}
            >
              {checking ? 'Saving...' : 'Set Password & Unlock'}
            </button>
            <button
              type="button"
              onClick={enterUnlockMode}
              className="text-[12px] text-center transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              Back to unlock
            </button>
          </form>
        )}

      </div>
    </div>
  )
}

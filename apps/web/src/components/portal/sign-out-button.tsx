'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

import s from './portal.module.css'

export function SignOutButton() {
  const [busy, setBusy] = useState(false)
  async function signOut() {
    setBusy(true)
    try {
      await createClient().auth.signOut()
    } finally {
      // A full navigation, so the server sees the cleared session cookies on the next request.
      window.location.assign('/')
    }
  }
  return (
    <button type="button" className={s.signOut} onClick={signOut} disabled={busy}>
      <LogOut size={15} aria-hidden="true" />
      {busy ? 'Signing out' : 'Sign out'}
    </button>
  )
}

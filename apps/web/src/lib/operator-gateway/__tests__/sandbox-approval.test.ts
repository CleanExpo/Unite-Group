import { describe, it, expect, afterEach } from 'vitest'
import { getApprovedSandboxProjectRef, isApprovedSandboxSupabaseUrl } from '../jobs'

const ORIG = process.env.OPERATOR_GATEWAY_SANDBOX_PROJECT_REF

afterEach(() => {
  if (ORIG === undefined) delete process.env.OPERATOR_GATEWAY_SANDBOX_PROJECT_REF
  else process.env.OPERATOR_GATEWAY_SANDBOX_PROJECT_REF = ORIG
})

describe('operator-gateway sandbox approval (env-driven)', () => {
  it('approves no sandbox URL when the ref env var is unset (honest not_connected)', () => {
    delete process.env.OPERATOR_GATEWAY_SANDBOX_PROJECT_REF
    expect(getApprovedSandboxProjectRef()).toBeNull()
    expect(isApprovedSandboxSupabaseUrl('https://anything.supabase.co')).toBe(false)
  })

  it('does NOT approve the deleted legacy mirror project by default', () => {
    delete process.env.OPERATOR_GATEWAY_SANDBOX_PROJECT_REF
    // The old hardcoded ref must no longer be implicitly trusted.
    expect(isApprovedSandboxSupabaseUrl('https://xgqwfwqumliuguzhshwv.supabase.co')).toBe(false)
  })

  it('approves only a URL matching the configured ref', () => {
    process.env.OPERATOR_GATEWAY_SANDBOX_PROJECT_REF = 'newsandboxref'
    expect(getApprovedSandboxProjectRef()).toBe('newsandboxref')
    expect(isApprovedSandboxSupabaseUrl('https://newsandboxref.supabase.co')).toBe(true)
    expect(isApprovedSandboxSupabaseUrl('https://someotherproject.supabase.co')).toBe(false)
    expect(isApprovedSandboxSupabaseUrl(undefined)).toBe(false)
  })

  it('treats a whitespace-only ref as unset', () => {
    process.env.OPERATOR_GATEWAY_SANDBOX_PROJECT_REF = '   '
    expect(getApprovedSandboxProjectRef()).toBeNull()
    expect(isApprovedSandboxSupabaseUrl('https://anything.supabase.co')).toBe(false)
  })
})

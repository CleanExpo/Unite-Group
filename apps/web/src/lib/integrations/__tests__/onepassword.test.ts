import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { resolve, createClient } = vi.hoisted(() => {
  const resolve = vi.fn(async () => 'resolved-secret')
  const createClient = vi.fn(async () => ({ secrets: { resolve } }))
  return { resolve, createClient }
})

vi.mock('@1password/sdk', () => ({ createClient }))
vi.mock('../onepassword-grants', () => ({ hasActiveOpGrant: vi.fn() }))

import { hasActiveOpGrant } from '../onepassword-grants'
import { isOpConfigured, readOpSecret, OpNotConfiguredError, OpAccessNotGrantedError } from '../onepassword'

const grantMock = hasActiveOpGrant as unknown as ReturnType<typeof vi.fn>

describe('onepassword read gate', () => {
  const original = process.env.OP_SERVICE_ACCOUNT_TOKEN

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OP_SERVICE_ACCOUNT_TOKEN = 'ops_test_token'
  })
  afterEach(() => {
    if (original === undefined) delete process.env.OP_SERVICE_ACCOUNT_TOKEN
    else process.env.OP_SERVICE_ACCOUNT_TOKEN = original
  })

  it('isOpConfigured reflects the token presence', () => {
    expect(isOpConfigured()).toBe(true)
    delete process.env.OP_SERVICE_ACCOUNT_TOKEN
    expect(isOpConfigured()).toBe(false)
  })

  it('throws OpNotConfiguredError when the token is unset', async () => {
    delete process.env.OP_SERVICE_ACCOUNT_TOKEN
    await expect(readOpSecret('f1', 'op://v/i/f')).rejects.toBeInstanceOf(OpNotConfiguredError)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('refuses the read when the founder has no active grant', async () => {
    grantMock.mockResolvedValue(false)
    await expect(readOpSecret('f1', 'op://v/i/f')).rejects.toBeInstanceOf(OpAccessNotGrantedError)
    expect(resolve).not.toHaveBeenCalled()
  })

  it('resolves the secret when a grant is active', async () => {
    grantMock.mockResolvedValue(true)
    const value = await readOpSecret('f1', 'op://v/i/f')
    expect(value).toBe('resolved-secret')
    expect(resolve).toHaveBeenCalledWith('op://v/i/f')
  })
})

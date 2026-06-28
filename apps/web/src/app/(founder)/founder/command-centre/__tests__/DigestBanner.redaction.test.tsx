import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DigestBanner } from '../DigestBanner'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DigestBanner', () => {
  it('redacts sensitive headline and attention copy from the overnight digest response', async () => {
    const boardRef = ['BOARD', '2026', '06', '27', 'DIGEST'].join('-')
    const email = ['lead', 'restoreassist.example'].join('@')
    const bearer = ['Bearer ', 'eyJheader', '.', 'eyJpayload', '.', 'signature'].join('')
    const phone = ['+61', '400', '555', '121'].join(' ')
    const card = ['card ending', '4242'].join(' ')
    const secretAssignment = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_') + '=' + ['daily', 'fixture'].join('_')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          digest: {
            generatedAt: '2026-06-27T12:15:00Z',
            tasks: { total: 3, needsDecision: 1, queued: 1, blocked: 1, failed: 0, done: 1 },
            sessions: { total: 1 },
            headline: `Review ${boardRef} for ${email}`,
            attention: [`Rotate ${secretAssignment} after ${bearer}`, `Call ${phone}; payment ${card}`],
          },
        }),
      })),
    )

    render(<DigestBanner />)

    await waitFor(() => expect(screen.getByText('Morning Digest')).toBeTruthy())

    const digestText = document.body.textContent ?? ''
    expect(digestText).not.toContain(boardRef)
    expect(digestText).not.toContain(email)
    expect(digestText).not.toContain(secretAssignment)
    expect(digestText).not.toContain(bearer)
    expect(digestText).not.toContain(phone)
    expect(digestText).not.toContain(card)
    expect(digestText).toContain('[REDACTED]')
  })

  it('redacts unquoted HTTP header values with spaces from attention copy', async () => {
    const headerName = ['X', 'Access', 'Token'].join('-')
    const headerValue = ['unquoted', 'banner', 'fixture', 'with', 'spaces'].join(' ')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          digest: {
            generatedAt: '2026-06-27T12:15:00Z',
            tasks: { total: 1, needsDecision: 1, queued: 0, blocked: 0, failed: 0, done: 0 },
            sessions: { total: 1 },
            headline: 'Header rotation required',
            attention: [`Check --header ${headerName}: ${headerValue}; then refresh the banner.`],
          },
        }),
      })),
    )

    render(<DigestBanner />)

    await waitFor(() => expect(screen.getByText('Morning Digest')).toBeTruthy())

    const digestText = document.body.textContent ?? ''
    expect(digestText).not.toContain(headerValue)
    expect(digestText).toContain(`--header ${headerName}: [REDACTED]; then refresh the banner.`)
  })

  it('redacts URL userinfo credentials from headline and attention copy', async () => {
    const userinfo = ['operator', 'opaque-value'].join(':')
    const host = ['127', '0', '0', '1'].join('.')
    const credentialedUrl = `https://${userinfo}@${host}:3990/status`

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          digest: {
            generatedAt: '2026-06-27T12:15:00Z',
            tasks: { total: 1, needsDecision: 0, queued: 1, blocked: 0, failed: 0, done: 0 },
            sessions: { total: 1 },
            headline: `Local status probe failed at ${credentialedUrl}`,
            attention: [`Check ${credentialedUrl} before the next digest.`],
          },
        }),
      })),
    )

    render(<DigestBanner />)

    await waitFor(() => expect(screen.getByText('Morning Digest')).toBeTruthy())

    const digestText = document.body.textContent ?? ''
    expect(digestText).not.toContain(userinfo)
    expect(digestText).not.toContain(credentialedUrl)
    expect(digestText).toContain(`https://[REDACTED]@${host}:3990/status`)
  })
})

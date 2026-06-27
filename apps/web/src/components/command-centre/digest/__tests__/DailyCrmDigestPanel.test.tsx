import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DailyCrmDigestPanel } from '../DailyCrmDigestPanel'

describe('DailyCrmDigestPanel', () => {
  it('redacts sensitive operator-facing digest free text while preserving safe section copy', () => {
    const email = ['lead', 'restoreassist.example'].join('@')
    const boardRef = ['BOARD', '2026', '06', '26', 'CRM', '512'].join('-')
    const secretAssignment = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_') + '=' + ['service', 'role', 'fixture'].join('_')
    const bearer = ['Bearer ', 'eyJheader', '.', 'eyJpayload', '.', 'signature'].join('')
    const phone = ['+61', '400', '123', '456'].join(' ')
    const card = ['card ending', '4242'].join(' ')

    render(
      <DailyCrmDigestPanel
        summary={{ leadCount: 1, opportunityCount: 2, approvalRequiredCount: 1 }}
        operatorPriorities={[`Follow up ${email} with ${secretAssignment}`]}
        approvals={[`Review ${boardRef} after ${bearer}`]}
        blockers={[`Call ${phone}; payment ${card}`]}
      />,
    )

    const digestText = document.body.textContent ?? ''

    expect(digestText).not.toContain(email)
    expect(digestText).not.toContain(boardRef)
    expect(digestText).not.toContain(secretAssignment)
    expect(digestText).not.toContain(bearer)
    expect(digestText).not.toContain(phone)
    expect(digestText).not.toContain(card)
    expect(digestText).toContain('[REDACTED]')
    expect(screen.getByText('Operator priorities')).toBeInTheDocument()
    expect(screen.getByText('Board decisions')).toBeInTheDocument()
    expect(screen.getAllByText('Blockers').length).toBeGreaterThanOrEqual(1)
  })

  it('redacts CLI flags and HTTP header values before rendering digest copy', () => {
    const cliFlagValue = ['quoted', 'cli', 'fixture'].join(' ')
    const cliFlag = `--client_secret='${cliFlagValue}'`
    const headerName = ['X', 'API', 'Key'].join('-')
    const headerValue = ['header', 'fixture', 'with', 'spaces'].join(' ')
    const header = `--header "${headerName}: ${headerValue}"`

    render(
      <DailyCrmDigestPanel
        operatorPriorities={[`Rotate ${cliFlag}`]}
        approvals={[`Check ${header}`]}
      />,
    )

    const digestText = document.body.textContent ?? ''

    expect(digestText).not.toContain(cliFlagValue)
    expect(digestText).not.toContain(headerValue)
    expect(digestText).toContain("--client_secret='[REDACTED]'")
    expect(digestText).toContain(`--header "${headerName}: [REDACTED]"`)
  })

  it('redacts unquoted HTTP header values with spaces before rendering digest copy', () => {
    const headerName = ['X', 'Access', 'Token'].join('-')
    const headerValue = ['unquoted', 'header', 'fixture', 'with', 'spaces'].join(' ')

    render(
      <DailyCrmDigestPanel
        approvals={[`Check --header ${headerName}: ${headerValue}; then rerun the digest.`]}
      />,
    )

    const digestText = document.body.textContent ?? ''

    expect(digestText).not.toContain(headerValue)
    expect(digestText).toContain(`--header ${headerName}: [REDACTED]; then rerun the digest.`)
  })
})

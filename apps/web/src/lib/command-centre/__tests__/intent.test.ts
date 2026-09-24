import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/ai/client', () => ({ getAIClient: vi.fn(() => { throw new Error('no live client in tests') }) }))

import {
  generateIntent,
  parseIntentMarkdown,
  renderIntentMarkdown,
  setIntentStatus,
  INTENT_SECTIONS,
  type IntentDoc,
} from '../intent'

const DOC: IntentDoc = {
  title: 'Contractors see claim report status',
  problem: 'Contractors phone the office to ask whether a report was sent.',
  proposedOutcome: 'One page shows each report status.',
  affectedUsersAndSystems: 'Contractors, office staff, the reports module.',
  constraints: ['No new login system', 'Works on a phone'],
  openQuestions: ['Do insurers expose a status we can read?'],
}

const OPTS = { author: 'founder@example.com', status: 'draft' as const, createdAt: '2026-09-24T07:00:00.000Z', taskId: 'task-1' }

function modelReturning(text: string, stop_reason: string | null = 'end_turn') {
  return { messages: { create: vi.fn(async () => ({ content: [{ type: 'text', text }], stop_reason })) } }
}

describe('renderIntentMarkdown / parseIntentMarkdown', () => {
  it('renders the exact stager format and round-trips through the parser', () => {
    const md = renderIntentMarkdown(DOC, OPTS)
    expect(md.startsWith('---\nstatus: draft\nauthor: founder@example.com\ncreated: 2026-09-24T07:00:00.000Z\ntask: task-1\n---\n# Intent: Contractors see claim report status\n')).toBe(true)
    for (const name of INTENT_SECTIONS) expect(md).toContain(`\n## ${name}\n`)
    expect(md).toContain('## Constraints\n- No new login system\n- Works on a phone\n')
    expect(md).toContain('## Open questions\n- Do insurers expose a status we can read?\n')
    expect(parseIntentMarkdown(md)).toEqual({ ok: true, title: 'Contractors see claim report status' })
  })

  it.each(INTENT_SECTIONS)('rejects a document missing the "%s" section', (name) => {
    const md = renderIntentMarkdown(DOC, OPTS)
    const withoutHeading = md.replace(`## ${name}\n`, '')
    const result = parseIntentMarkdown(withoutHeading)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain(name)
  })

  it('rejects a section that is present but empty', () => {
    const md = renderIntentMarkdown(DOC, OPTS).replace(
      '## Problem\nContractors phone the office to ask whether a report was sent.\n',
      '## Problem\n   \n',
    )
    expect(parseIntentMarkdown(md)).toEqual({ ok: false, reason: 'Section "## Problem" is empty' })
  })

  it('rejects a document with no "# Intent:" title', () => {
    const md = renderIntentMarkdown(DOC, OPTS).replace('# Intent: Contractors see claim report status\n', '')
    const result = parseIntentMarkdown(md)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/title/i)
  })

  it('accepts CRLF line endings', () => {
    const md = renderIntentMarkdown(DOC, OPTS).replace(/\n/g, '\r\n')
    expect(parseIntentMarkdown(md).ok).toBe(true)
  })
})

describe('setIntentStatus', () => {
  it('replaces the draft frontmatter with an accepted one and keeps the body', () => {
    const draft = renderIntentMarkdown(DOC, OPTS)
    const accepted = setIntentStatus(draft, { status: 'accepted', author: 'phill@example.com', createdAt: '2026-09-25T00:00:00.000Z', taskId: 'task-1' })
    expect(accepted.startsWith('---\nstatus: accepted\nauthor: phill@example.com\ncreated: 2026-09-25T00:00:00.000Z\ntask: task-1\n---\n# Intent: ')).toBe(true)
    expect(accepted).not.toContain('status: draft')
    expect(accepted.split('\n---\n')[1]).toBe(draft.split('\n---\n')[1])
  })

  it('adds frontmatter when the edited markdown has none', () => {
    const body = renderIntentMarkdown(DOC, OPTS).split('\n---\n')[1]
    const accepted = setIntentStatus(body, { status: 'accepted', author: 'a@b.c', createdAt: 'now', taskId: 't' })
    expect(accepted.startsWith('---\nstatus: accepted\n')).toBe(true)
    expect(parseIntentMarkdown(accepted).ok).toBe(true)
  })
})

describe('generateIntent', () => {
  it('returns ok:false (never a blank doc) when the model returns bad JSON', async () => {
    const result = await generateIntent('Build a portal', undefined, modelReturning('not json') as never)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/invalid_json/)
  })

  it('returns ok:false when a field is empty', async () => {
    const result = await generateIntent('Build a portal', undefined, modelReturning(JSON.stringify({ ...DOC, problem: '  ' })) as never)
    expect(result).toEqual({ ok: false, reason: 'The model returned an incomplete intent (empty: problem)' })
  })

  it('returns ok:false when a list field is empty', async () => {
    const result = await generateIntent('Build a portal', undefined, modelReturning(JSON.stringify({ ...DOC, openQuestions: [] })) as never)
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when the response is truncated', async () => {
    const result = await generateIntent('Build a portal', undefined, modelReturning(JSON.stringify(DOC), 'max_tokens') as never)
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when the model call throws', async () => {
    const client = { messages: { create: vi.fn(async () => { throw new Error('network') }) } }
    const result = await generateIntent('Build a portal', undefined, client as never)
    expect(result.ok).toBe(false)
  })

  it('returns ok:true with the doc for good JSON and sends the clarify answers', async () => {
    const client = modelReturning(JSON.stringify(DOC))
    const result = await generateIntent(
      'Build a portal',
      { questions: ['Who is it for?'], answers: { 'Who is it for?': 'Contractors' } },
      client as never,
    )
    expect(result).toEqual({ ok: true, doc: DOC })
    const args = client.messages.create.mock.calls[0][0] as { messages: Array<{ content: string }> }
    expect(args.messages[0].content).toContain('Q: Who is it for?\nA: Contractors')
  })
})

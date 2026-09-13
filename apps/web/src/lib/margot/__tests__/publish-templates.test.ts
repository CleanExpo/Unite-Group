import { describe, expect, it } from 'vitest'
import {
  DISCLOSURE_MARKER,
  PUBLISH_CHANNELS,
  SYNTHETIC_PRESENTER_DISCLOSURE,
  SYNTHETIC_PRESENTER_DISCLOSURE_SHORT,
  bodyLimitFor,
  disclosureFor,
  renderAllChannels,
  renderPublishCopy,
  type MargotEpisode,
} from '../publish-templates'

// A real episode shape, taken from the live HeyGen v1/video.list read on 2026-09-10.
const EPISODE: MargotEpisode = {
  id: '399eb949aeda',
  title: 'Margot — Episode 05 — Keep one improvement that held',
  summary:
    'A short walk through the one improvement worth keeping this week, why it held, ' +
    'and the single question to ask the next customer who reports the same thing.',
  videoUrl: 'https://res.cloudinary.com/unite-group/video/upload/margot-ep05.mp4',
}

// Deliberately long, to force truncation on every capped channel.
const LONG_EPISODE: MargotEpisode = {
  ...EPISODE,
  summary: 'x'.repeat(8000),
}

describe('Margot publish templates [UNI-2717]', () => {
  it('exports at least one channel, so the guard below cannot pass vacuously', () => {
    expect(PUBLISH_CHANNELS.length).toBeGreaterThan(0)
  })

  // The founder standing rule. Iterates the module's OWN exported channel list, so a
  // channel added to PUBLISH_CHANNELS is covered here without this test being edited.
  it('every channel carries the synthetic-presenter disclosure', () => {
    for (const channel of PUBLISH_CHANNELS) {
      const copy = renderPublishCopy(EPISODE, channel)

      expect(copy.body, `channel ${channel} body is missing the disclosure marker`).toContain(
        DISCLOSURE_MARKER,
      )
      expect(copy.disclosure, `channel ${channel} disclosure field is missing the marker`).toContain(
        DISCLOSURE_MARKER,
      )

      const usesAKnownForm =
        copy.body.includes(SYNTHETIC_PRESENTER_DISCLOSURE) ||
        copy.body.includes(SYNTHETIC_PRESENTER_DISCLOSURE_SHORT)
      expect(usesAKnownForm, `channel ${channel} body carries no recognised disclosure form`).toBe(
        true,
      )
    }
  })

  it('keeps the disclosure even when the episode text must be truncated away', () => {
    for (const channel of PUBLISH_CHANNELS) {
      const copy = renderPublishCopy(LONG_EPISODE, channel)
      expect(copy.body, `channel ${channel} dropped the disclosure under truncation`).toContain(
        DISCLOSURE_MARKER,
      )
    }
  })

  it('respects every channel body limit', () => {
    for (const channel of PUBLISH_CHANNELS) {
      const limit = bodyLimitFor(channel)
      if (limit === null) continue
      const copy = renderPublishCopy(LONG_EPISODE, channel)
      expect(
        copy.body.length,
        `channel ${channel} body is ${copy.body.length} chars, over its ${limit} limit`,
      ).toBeLessThanOrEqual(limit)
    }
  })

  it('fits the disclosure inside the tightest channel', () => {
    const copy = renderPublishCopy(LONG_EPISODE, 'x')
    const limit = bodyLimitFor('x')
    expect(limit).toBe(280)
    expect(copy.body.length).toBeLessThanOrEqual(280)
    expect(copy.body).toContain(DISCLOSURE_MARKER)
    expect(copy.disclosure).toBe(SYNTHETIC_PRESENTER_DISCLOSURE_SHORT)
  })

  it('never claims credentials for Margot — expertise is attributed to Phill', () => {
    for (const channel of PUBLISH_CHANNELS) {
      expect(disclosureFor(channel)).toContain('Phill McGurk')
    }
    expect(SYNTHETIC_PRESENTER_DISCLOSURE).toContain('not hers')
  })

  it('carries no emoji in any rendered body', () => {
    const emoji = /\p{Extended_Pictographic}/u
    for (const channel of PUBLISH_CHANNELS) {
      const copy = renderPublishCopy(EPISODE, channel)
      expect(emoji.test(copy.body), `channel ${channel} body contains an emoji`).toBe(false)
    }
  })

  it('renderAllChannels covers exactly the exported channel list', () => {
    const rendered = renderAllChannels(EPISODE).map((c) => c.channel)
    expect(rendered).toEqual([...PUBLISH_CHANNELS])
  })

  it('handles an episode with no video URL yet', () => {
    const pending: MargotEpisode = { ...EPISODE, videoUrl: null }
    for (const channel of PUBLISH_CHANNELS) {
      const copy = renderPublishCopy(pending, channel)
      expect(copy.body).toContain(DISCLOSURE_MARKER)
      expect(copy.body).not.toContain('null')
    }
  })

  it('derives the headline from the last em-dash segment', () => {
    expect(renderPublishCopy(EPISODE, 'site').title).toBe('Keep one improvement that held')
  })
})

// src/lib/margot/publish-templates.ts
// Per-channel publish copy for Margot episodes [UNI-2717].
//
// Pure functions only — no network, no database, no posting. Callers own delivery.
//
// FOUNDER STANDING RULE, structurally enforced here: Margot's synthetic nature is
// disclosed on the channel, in the content, and to anyone who asks. Every channel's
// body is built through one chokepoint, `compose`, which appends the disclosure. A
// new channel cannot ship without it unless someone edits `compose` itself — and
// scripts/verify-uni-2717-disclosure.sh proves that edit turns the suite red.
//
// Margot never claims credentials. The expertise is Phill McGurk's and the copy says so.

/**
 * Every channel Margot episodes publish to. The disclosure test iterates THIS list
 * rather than a copy of it, so adding a channel here extends the guard automatically.
 */
export const PUBLISH_CHANNELS = [
  'youtube',
  'linkedin',
  'x',
  'facebook',
  'reddit',
  'site',
] as const

export type PublishChannel = (typeof PUBLISH_CHANNELS)[number]

/**
 * The load-bearing substring present in BOTH disclosure forms. The guard asserts on
 * this, so a channel that silently swaps the long form for the short one stays covered.
 */
export const DISCLOSURE_MARKER = 'AI presenter'

/** Full disclosure. Used wherever the channel gives us the room. */
export const SYNTHETIC_PRESENTER_DISCLOSURE =
  'Margot is an AI presenter. Her voice is cloned from Phill McGurk with his permission ' +
  'and her face is synthetic. The expertise and the credentials are his, not hers.'

/** Short disclosure, for channels with a hard character cap. Still names the AI presenter. */
export const SYNTHETIC_PRESENTER_DISCLOSURE_SHORT =
  'Margot is an AI presenter. Expertise is Phill McGurk’s.'

/** Hard body caps per channel. `null` means the channel imposes no practical limit. */
const CHANNEL_BODY_LIMIT: Record<PublishChannel, number | null> = {
  youtube: 5000,
  linkedin: 3000,
  x: 280,
  facebook: 5000,
  reddit: 10000,
  site: null,
}

/** Below this cap the short disclosure is used, so the disclosure is never the text that gets cut. */
const SHORT_DISCLOSURE_THRESHOLD = 600

export interface MargotEpisode {
  /** HeyGen video id, e.g. `399eb949aeda...`. */
  id: string
  title: string
  /** One-paragraph plain-language summary of the episode. */
  summary: string
  /** Rendered video URL once hosted; null while the episode is still being produced. */
  videoUrl: string | null
}

export interface PublishCopy {
  channel: PublishChannel
  title: string
  /** Full publish body, disclosure already included. */
  body: string
  /** The exact disclosure string used, so a caller can render it in a separate field too. */
  disclosure: string
}

/** Strips the episode-number prefix HeyGen titles carry, leaving the human headline. */
function headline(episode: MargotEpisode): string {
  const parts = episode.title.split('—').map((s) => s.trim())
  const last = parts[parts.length - 1]
  return last && last.length > 0 ? last : episode.title.trim()
}

/**
 * The single chokepoint every channel's body passes through. The disclosure is appended
 * here, and the episode text — never the disclosure — absorbs any truncation.
 */
function compose(channel: PublishChannel, lead: string): PublishCopy['body'] {
  const limit = CHANNEL_BODY_LIMIT[channel]
  const disclosure = disclosureFor(channel)

  if (limit === null) return `${lead}\n\n${disclosure}`

  const separator = '\n\n'
  const room = limit - disclosure.length - separator.length
  if (room <= 0) {
    // No room for any episode text: the disclosure still ships, on its own.
    return disclosure
  }

  const trimmedLead = lead.length > room ? `${lead.slice(0, Math.max(0, room - 1)).trimEnd()}…` : lead
  return `${trimmedLead}${separator}${disclosure}`
}

/** The disclosure form this channel has room for. Both forms contain DISCLOSURE_MARKER. */
export function disclosureFor(channel: PublishChannel): string {
  const limit = CHANNEL_BODY_LIMIT[channel]
  if (limit !== null && limit < SHORT_DISCLOSURE_THRESHOLD) {
    return SYNTHETIC_PRESENTER_DISCLOSURE_SHORT
  }
  return SYNTHETIC_PRESENTER_DISCLOSURE
}

/** The character cap this channel enforces, or null when it has none. */
export function bodyLimitFor(channel: PublishChannel): number | null {
  return CHANNEL_BODY_LIMIT[channel]
}

function leadFor(channel: PublishChannel, episode: MargotEpisode): string {
  const title = headline(episode)
  const link = episode.videoUrl

  switch (channel) {
    case 'youtube':
      return link ? `${episode.summary}\n\nWatch: ${link}` : episode.summary
    case 'linkedin':
      return `${title}\n\n${episode.summary}${link ? `\n\n${link}` : ''}`
    case 'x':
      return link ? `${title} ${link}` : title
    case 'facebook':
      return `${title}\n\n${episode.summary}${link ? `\n\n${link}` : ''}`
    case 'reddit':
      return `${episode.summary}${link ? `\n\n${link}` : ''}`
    case 'site':
      return `${episode.summary}${link ? `\n\n${link}` : ''}`
  }
}

/** Builds the publish copy for one episode on one channel. */
export function renderPublishCopy(
  episode: MargotEpisode,
  channel: PublishChannel,
): PublishCopy {
  return {
    channel,
    title: headline(episode),
    body: compose(channel, leadFor(channel, episode)),
    disclosure: disclosureFor(channel),
  }
}

/** Builds the publish copy for one episode across every channel. */
export function renderAllChannels(episode: MargotEpisode): PublishCopy[] {
  return PUBLISH_CHANNELS.map((channel) => renderPublishCopy(episode, channel))
}

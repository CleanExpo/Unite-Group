import { z } from 'zod'

const text = z.string().trim().min(1).max(20000)
const date = z.string().datetime({ offset: true })
const episode = z.object({
  id: z.string().min(1).max(160), title: text, slot: date,
  timezone: z.literal('Australia/Brisbane'), script: text, caption: text,
  resourceTitle: text, resourceText: text,
  productionStatus: z.enum(['existing-owner-approved-master', 'script-draft-not-rendered']),
  scriptApproval: z.enum(['approved', 'pending']), releaseApproval: z.literal('pending'),
  videoId: z.string().regex(/^[a-f0-9]{32}$/).optional(),
}).strict().refine(value => (value.productionStatus === 'existing-owner-approved-master') === Boolean(value.videoId), 'Media status and reference disagree')

// This contract describes a local editorial preview, never publication consent.
const schema = z.object({
  schemaVersion: z.literal(1), weekStartsAt: date, reviewDueAt: date,
  timezone: z.literal('Australia/Brisbane'), scheduleStatus: z.literal('proposed-not-scheduled'),
  reviewTimeStatus: z.literal('proposed'), distributionSystem: z.literal('Synthex'),
  primarySite: z.literal('NRPG'), optionalContextualSite: z.literal('CARSI'), sourceDocument: text,
  episodes: z.array(episode).length(5),
}).strict().superRefine((packet, ctx) => {
  const start = Date.parse(packet.weekStartsAt)
  const review = Date.parse(packet.reviewDueAt)
  const localStart = new Date(start + 10 * 3600000)
  const localReview = new Date(review + 10 * 3600000)
  if (localStart.getUTCDay() !== 4 || localStart.getUTCHours() !== 16 || localStart.getUTCMinutes() !== 0 || localStart.getUTCSeconds() !== 0)
    ctx.addIssue({ code: 'custom', message: 'Week must start Thursday at 16:00 Brisbane', path: ['weekStartsAt'] })
  if (localReview.getUTCDay() !== 1 || review >= start || start - review > 7 * 86400000)
    ctx.addIssue({ code: 'custom', message: 'Review must precede this Thursday batch on Monday', path: ['reviewDueAt'] })
  if (new Set(packet.episodes.map(item => item.id)).size !== packet.episodes.length)
    ctx.addIssue({ code: 'custom', message: 'Episode identities must be unique', path: ['episodes'] })
  if (packet.episodes.some(item => Date.parse(item.slot) < start || Date.parse(item.slot) >= start + 7 * 86400000))
    ctx.addIssue({ code: 'custom', message: 'Proposed slots must belong to this Thursday week', path: ['episodes'] })
})

export type MargotWeeklyPacket = z.infer<typeof schema>
export function parseMargotWeeklyPacket(input: unknown) { return schema.safeParse(input) }

import { z } from 'zod';

/**
 * AI Front Desk — per-brand configuration contract.
 *
 * Mirrors the scaffold shape in `/frontdesk/frontdesk.config.example.ts` (#750). The
 * shared runtime is configured once per brand; this schema validates that config so a
 * misconfigured desk fails loudly at load rather than mid-conversation. Ships dark —
 * `enabled` is driven by `UNITE_FRONT_DESK_ENABLED` (see `flag.ts`).
 */
export const frontDeskConfigSchema = z.object({
  project: z.string().min(1),
  enabled: z.boolean(),
  brand: z.object({
    assistantName: z.string().min(1),
    accent: z.string().min(1),
    logoUrl: z.string().url().optional(),
  }),
  voice: z.object({
    provider: z.literal('elevenlabs'),
    voiceId: z.string().min(1),
    locale: z.literal('en-AU'),
  }),
  knowledge: z.object({
    kind: z.enum(['existing-assistant', 'vector', 'prompt']),
    source: z.string().min(1),
  }),
  channels: z.array(z.enum(['chat', 'voice', 'phone-in', 'phone-out'])).min(1),
  vendor: z.enum(['elevenlabs', 'vapi', 'livekit']),
  phoneNumber: z.string().nullable(),
  tools: z.array(z.string()),
  compliance: z.object({
    businessIdentity: z.string().min(1),
    recordingDisclosure: z.boolean(),
    aiDisclosure: z.boolean(),
    dncrScrub: z.boolean(),
  }),
});

export type FrontDeskConfig = z.infer<typeof frontDeskConfigSchema>;

export function parseFrontDeskConfig(input: unknown): FrontDeskConfig {
  return frontDeskConfigSchema.parse(input);
}

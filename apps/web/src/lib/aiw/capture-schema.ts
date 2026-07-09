import { z } from 'zod';

/**
 * AI-Website lead-capture payload.
 *
 * Capture is a plain structured form POST (NOT an LLM tool-call) so prompt-injection
 * — via user input or RAG-retrieved page content — cannot forge or exfiltrate records.
 * Validated server-side before it is written to the append-only `aiw_lead_intake`
 * table. `company_website` is a honeypot: real users never fill it; bots do.
 */

/** Max qualifying answers the widget collects before the contact ask (conversion UX rule). */
export const AIW_MAX_QUALIFYING_ANSWERS = 3;

export const aiwCaptureSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200).optional(),
    phone: z.string().trim().min(6).max(40).optional(),
    message: z.string().trim().max(2000).optional(),
    qualifyingAnswers: z.array(z.string().max(500)).max(AIW_MAX_QUALIFYING_ANSWERS).default([]),
    sourcePath: z.string().startsWith('/').max(300),
    company_website: z.string().max(0).optional(), // honeypot — must be empty
  })
  .refine((v) => Boolean(v.email || v.phone), {
    message: 'Provide at least an email or a phone number',
    path: ['email'],
  });

export type AiwCapturePayload = z.infer<typeof aiwCaptureSchema>;

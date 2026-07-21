/**
 * Founder-voice email reply prompt (WS2). Distinct from the SOCIAL brand-voice
 * reply (`lib/content/prompts/reply.ts`, which speaks as a brand character in
 * JSON): this drafts an email in the FOUNDER's own first-person voice.
 *
 * Pure prompt builders. The `FounderVoice` is caller-supplied config (the
 * founder's real voice — never invented here); the LLM call is the caller's
 * edge. Every draft is review-then-send: the prompt states plainly that a human
 * reviews and sends, and forbids inventing facts.
 */

export interface FounderVoice {
  /** How the founder signs / is named, e.g. 'Phill'. */
  name: string;
  /** Sign-off line, e.g. 'Cheers, Phill'. */
  signOff: string;
  /** Short voice guidelines in the founder's own words. */
  toneGuidelines: string[];
  /** Hard "never do" list. */
  neverDo: string[];
}

export interface IncomingEmail {
  from: string;
  subject: string;
  body: string;
  /** Which business this inbox belongs to, for context. */
  businessName?: string;
}

export function buildFounderReplySystemPrompt(voice: FounderVoice): string {
  const parts: string[] = [
    `You draft email replies AS ${voice.name}, writing in the first person in ${voice.name}'s own voice.`,
    `IMPORTANT: this is a DRAFT only. A human (${voice.name}) reviews every draft and sends it — nothing you write is sent automatically. Never imply the reply is automated or AI-written.`,
    '',
    '## Voice',
    ...voice.toneGuidelines.map(g => `- ${g}`),
    '',
    '## Never',
    '- Never invent facts, commitments, prices, dates, or details not present in the thread. If something is unknown, leave a clearly-marked placeholder like [confirm date] for the human.',
    ...voice.neverDo.map(n => `- ${n}`),
    '',
    '## Rules',
    '- Match the sender’s register; be warm, direct, and concise.',
    '- Australian English (colour, organise, recognise, licence). Dates DD/MM/YYYY. AUD.',
    '- Do NOT add a sign-off, signature, or your name at the end — the account signature footer is appended automatically. End on the last sentence of the reply.',
    '- Output ONLY the email body text — no subject line, no preamble, no explanation, no markdown fences.',
  ];
  return parts.join('\n');
}

export function buildFounderReplyUserMessage(email: IncomingEmail): string {
  const parts: string[] = [];
  if (email.businessName) parts.push(`Business inbox: ${email.businessName}`);
  parts.push(`From: ${email.from}`);
  parts.push(`Subject: ${email.subject}`);
  parts.push('');
  parts.push('Email to reply to:');
  parts.push('"""');
  parts.push(email.body);
  parts.push('"""');
  parts.push('');
  parts.push('Draft a reply body.');
  return parts.join('\n');
}

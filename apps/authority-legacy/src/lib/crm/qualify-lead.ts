export type LeadQualificationBand = 'needs_review' | 'qualified' | 'nurture' | 'spam_risk';

export interface LeadQualificationInput {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  message?: string | null;
  interests?: string | string[] | null;
  referralSource?: string | null;
  marketingConsent?: boolean | null;
  additionalData?: Record<string, unknown> | null;
}

export interface LeadQualificationRecommendation {
  score: number;
  band: LeadQualificationBand;
  reasons: string[];
  operatorNotes: string[];
}

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'proton.me',
  'protonmail.com',
]);

const DISPOSABLE_OR_RISKY_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'example.com',
  'test.com',
  'invalid.com',
]);

const COMMERCIAL_INTENT_TERMS = [
  'crm',
  'automation',
  'ai',
  'integration',
  'integrations',
  'portal',
  'client portal',
  'website',
  'operations',
  'workflow',
  'strategy',
  'buildout',
  'implementation',
];

const SPAM_TERMS = [
  'casino',
  'crypto',
  'forex',
  'loan',
  'viagra',
  'backlinks',
  'seo backlinks',
  'rank first',
  'guaranteed traffic',
];

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeInterests(interests: LeadQualificationInput['interests']): string {
  if (Array.isArray(interests)) {
    return interests.map(text).filter(Boolean).join(' ');
  }

  return text(interests);
}

function emailDomain(email: string): string {
  const [, domain = ''] = email.toLowerCase().split('@');
  return domain.trim();
}

function hasAnyTerm(haystack: string, terms: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function countUrls(value: string): number {
  return (value.match(/https?:\/\//gi) || []).length + (value.match(/www\./gi) || []).length;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function bandFor(score: number, spamSignals: number): LeadQualificationBand {
  if (spamSignals >= 2 || score <= 20) {
    return 'spam_risk';
  }

  if (score >= 70) {
    return 'qualified';
  }

  if (score >= 50) {
    return 'needs_review';
  }

  return 'nurture';
}

/**
 * Deterministic, recommendation-only lead qualification.
 *
 * This helper is intentionally pure: it performs no network calls, writes no
 * database records, and must not be used as the sole authority to convert a
 * lead into a client. Conversion still requires explicit identity gates and an
 * operator-approved workflow.
 */
export function qualifyLead(input: LeadQualificationInput): LeadQualificationRecommendation {
  const reasons: string[] = [];
  const operatorNotes: string[] = [
    'Recommendation only: do not auto-convert or overwrite CRM identity from this score.',
  ];

  const email = text(input.email).toLowerCase();
  const company = text(input.company);
  const jobTitle = text(input.jobTitle);
  const phone = text(input.phone);
  const message = text(input.message);
  const interests = normalizeInterests(input.interests);
  const referralSource = text(input.referralSource);
  const combinedText = `${message} ${interests} ${company} ${jobTitle}`;

  let score = 25;
  let spamSignals = 0;
  let freeEmailDomain = false;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    score += 15;
    reasons.push('valid email supplied');

    const domain = emailDomain(email);
    if (DISPOSABLE_OR_RISKY_DOMAINS.has(domain)) {
      score -= 25;
      spamSignals += 1;
      reasons.push('email domain is disposable, test, or high risk');
    } else if (FREE_EMAIL_DOMAINS.has(domain)) {
      freeEmailDomain = true;
      reasons.push('free email domain needs human context');
      operatorNotes.push('Free email domain is not disqualifying, but confirm organization identity before conversion.');
    } else {
      score += 10;
      reasons.push('business email domain supplied');
    }
  } else {
    score -= 35;
    spamSignals += 1;
    reasons.push('missing or invalid email');
  }

  if (company) {
    score += 15;
    reasons.push('company supplied');
  } else {
    reasons.push('company missing');
    operatorNotes.push('Ask for company or business context before marking qualified.');
  }

  if (jobTitle) {
    score += 8;
    reasons.push('role supplied');
  }

  if (phone) {
    score += 5;
    reasons.push('phone supplied');
  }

  if (message.length >= 40) {
    score += 15;
    reasons.push('specific message supplied');
  } else if (message.length >= 10) {
    score += 8;
    reasons.push('short message supplied');
  } else {
    reasons.push('message missing or too short');
    operatorNotes.push('Request a clearer problem statement or desired outcome before prioritizing.');
  }

  if (hasAnyTerm(combinedText, COMMERCIAL_INTENT_TERMS)) {
    score += 12;
    reasons.push('commercial intent matches Unite-Group services');
  }

  if (input.marketingConsent === true) {
    score += 5;
    reasons.push('marketing consent supplied');
  }

  if (referralSource) {
    score += 5;
    reasons.push('referral source supplied');
  }

  if (hasAnyTerm(combinedText, SPAM_TERMS)) {
    score -= 30;
    spamSignals += 1;
    reasons.push('spam-like terms detected');
  }

  if (countUrls(combinedText) > 2) {
    score -= 20;
    spamSignals += 1;
    reasons.push('excessive links detected');
  }

  if (/([a-z])\1{5,}/i.test(combinedText) || /\b(?:asdf|qwer|lorem ipsum)\b/i.test(combinedText)) {
    score -= 15;
    spamSignals += 1;
    reasons.push('low-quality filler text detected');
  }

  const finalScore = clampScore(freeEmailDomain && spamSignals === 0 ? Math.min(score, 69) : score);
  const band = bandFor(finalScore, spamSignals);

  if (band === 'qualified') {
    operatorNotes.push('Qualified means prioritize human review; it is not approval to create a client record.');
  }

  if (band === 'spam_risk') {
    operatorNotes.push('Do not discard automatically; review safely and avoid external follow-up until identity is checked.');
  }

  return {
    score: finalScore,
    band,
    reasons,
    operatorNotes,
  };
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_PATTERN = /https?:\/\/[^\s)\]}>"]+/gi;
const CARD_CONTEXT_PATTERN = /\b(?:visa|mastercard|amex|american\s+express|discover)(?:\s+card)?\s+(?:ending\s+)?\d{4}\b/gi;
const LONG_CARD_DIGITS_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9._-]{4,}\b/g,
  /\b[A-Za-z0-9_ -]*(?:api\s*[_-]?\s*key|secret|token)[A-Za-z0-9_ -]*\s*(?:is|=|:)\s*\S+/gi,
];

export function redactSensitiveText(value: string): string {
  const urlRedacted = value.replace(URL_PATTERN, '[redacted-url]');
  const emailRedacted = urlRedacted.replace(EMAIL_PATTERN, '[redacted-email]');
  const cardContextRedacted = emailRedacted.replace(CARD_CONTEXT_PATTERN, '[redacted-card]');
  const cardRedacted = cardContextRedacted.replace(LONG_CARD_DIGITS_PATTERN, '[redacted-card]');

  return SECRET_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, '[redacted-secret]'),
    cardRedacted,
  );
}

export function redactSensitiveMetadata(value: string): string {
  const urlRedacted = value.replace(URL_PATTERN, '[redacted-url]');
  const emailRedacted = urlRedacted.replace(EMAIL_PATTERN, '[redacted-email]');
  const cardContextRedacted = emailRedacted.replace(CARD_CONTEXT_PATTERN, '[redacted-card]');
  const cardRedacted = cardContextRedacted.replace(LONG_CARD_DIGITS_PATTERN, '[redacted-card]');
  return SECRET_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, '[redacted-secret]'),
    cardRedacted,
  );
}

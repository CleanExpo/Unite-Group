// src/lib/brand/voice-rules.ts
// Single source-of-truth for the brand-guardian linter and any runtime voice checks.
// Mirrors the Nexus Human Voice Spec v1 (Brain-1 wiki: nexus-human-voice-2026-05-11.md).

export interface VoiceRule {
  id: string;
  severity: "error" | "warn";
  description: string;
  /** Regex matched against each sentence (with case-insensitive flag pre-applied). */
  match: RegExp;
  /** Examples that MUST match (true positives, for self-test). */
  positiveExamples: string[];
  /** Examples that MUST NOT match (true negatives). */
  negativeExamples: string[];
  /** Human-friendly remediation hint. */
  fix: string;
}

export const FORBIDDEN_WORDS = [
  "harness", "unleash", "leverage", "transformative",
  "holistic", "synergy", "ecosystem", "journey", "paradigm",
  "empower", "empowering", "enabling", "stakeholders",
  "industry-leading", "world-class", "best-of-breed",
  "robust", "seamless", "cutting-edge", "next-gen", "next-generation",
  "delve", "tapestry", "elevate", "navigate the complexities",
];

export const VOICE_RULES: VoiceRule[] = [
  {
    id: "parallel-triplet",
    severity: "error",
    description: "AI-slop parallel triplet (\"not just X, but Y, and ultimately Z\")",
    match: /\bnot just\b[^.]*\bbut\b[^.]*\b(and|but)\b/i,
    positiveExamples: ["Not just a membership, but a movement, and ultimately the future of Australian trades."],
    negativeExamples: ["You don't just buy a membership. You buy the cert."],
    fix: "Replace with one concrete declarative sentence about a named person.",
  },
  {
    id: "today-fast-paced",
    severity: "error",
    description: "Auto-reject opener \"In today's fast-paced world\"",
    match: /\bin today's (fast[-\s]?paced|ever[-\s]?changing|modern|digital)\b/i,
    positiveExamples: ["In today's fast-paced world, restoration crews need…"],
    negativeExamples: ["Today, Karen runs a five-van crew."],
    fix: "Open on a named human in a specific situation.",
  },
  {
    id: "important-to-note",
    severity: "error",
    description: "Auto-reject filler \"It's important to note that\"",
    match: /\b(it's|it is) important to note that\b/i,
    positiveExamples: ["It's important to note that pricing is bespoke."],
    negativeExamples: ["Pricing is bespoke — see the schedule overleaf."],
    fix: "Delete the throat-clearing. The note IS the sentence.",
  },
  {
    id: "rhetorical-audience-question",
    severity: "warn",
    description: "Lazy bridge — rhetorical question to the audience",
    match: /\bwhat does this mean for you\b\??/i,
    positiveExamples: ["But what does this mean for you?"],
    negativeExamples: ["Here's what this means for your crew."],
    fix: "Replace with a sentence that states the connection.",
  },
  {
    id: "hedge-stack",
    severity: "warn",
    description: "Two or more hedge modifiers stacked",
    match: /\b(could|may|might) (potentially|possibly|theoretically|perhaps)\b/i,
    positiveExamples: ["could potentially become the standard"],
    negativeExamples: ["becomes the standard once IICRC adopts S500-2027"],
    fix: "Pick one modifier or commit. Hedges cluster around AI summaries.",
  },
  {
    id: "compound-abstraction",
    severity: "warn",
    description: "Compound abstraction (\"industry-leading solutions architects\")",
    match: /\b(industry-leading|world-class|best-of-breed|next[-\s]?gen|cutting-edge|enterprise-grade) [a-z]+s?\b/i,
    positiveExamples: ["industry-leading solutions architects", "world-class platform"],
    negativeExamples: ["a Brisbane water-damage crew with seventeen vans"],
    fix: "Replace with a concrete noun phrase naming a specific operator or town.",
  },
  {
    id: "em-dash-throwaway",
    severity: "warn",
    description: "Em-dashes around throwaway clause (an AI tell)",
    match: /\s—\s[^—]{1,40}\s—\s/,
    positiveExamples: ["We — a trusted partner — believe that"],
    negativeExamples: ["Right — here's what the audit actually found."],
    fix: "Em-dashes allowed only at genuine pivots, max once per 200 words. Default to periods.",
  },
  {
    id: "stakeholders",
    severity: "error",
    description: "Generic-audience word \"stakeholders\"",
    match: /\bstakeholders?\b/i,
    positiveExamples: ["Stakeholders across the property services value chain"],
    negativeExamples: ["If you run a five-to-fifty-van crew"],
    fix: "Replace with second-person \"you\" or with the named role (firm owner / foreman / insurance manager).",
  },
  {
    id: "forbidden-words",
    severity: "error",
    description: "Forbidden BrandConfig vocabulary",
    match: new RegExp(`\\b(${FORBIDDEN_WORDS.join("|")})\\b`, "i"),
    positiveExamples: ["unleash your team's potential", "leverage our ecosystem"],
    negativeExamples: ["seventeen vans operating out of Caboolture"],
    fix: "Find the concrete verb. \"Unleash\" → \"use\". \"Leverage\" → \"use\". \"Ecosystem\" → name the participants. \"Journey\" → cut.",
  },
];

export function lintSentence(s: string): Array<{ ruleId: string; severity: "error" | "warn"; fix: string }> {
  return VOICE_RULES.filter((r) => r.match.test(s)).map((r) => ({
    ruleId: r.id, severity: r.severity, fix: r.fix,
  }));
}

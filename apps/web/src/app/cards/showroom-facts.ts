// The facts the /cards showroom publishes. Nothing here is written fresh: every sentence is copied
// word for word from the approved order terms (terms/terms-content.ts, section numbers in the
// comments). showroom-facts.test.tsx proves that by substring,
// so an invented claim fails the build. Prices are not stored here; the page builds them from CARD_TIERS.

/** Order terms section 3.2, word for word. */
export const PRICE_NOTE = 'Prices are in Australian dollars and include GST. You pay the full price up front.'

/** Each tier's line as the terms put it (section 2). The order page's own lines say "below", which points the wrong way here. */
export const TIER_LINES: Record<'ready' | 'custom', string> = {
  ready: 'You pick one of our ten card films. It ends on your logo and details.', // 2
  custom: 'We make a film for your business, instead of you picking one of the ten.', // 2
}

export const HOSTING_FACTS = [
  'We host your card for 12 months from the day it goes live. There is no monthly fee.', // 7.1
  'We email you at least 30 days before hosting ends with the renewal price. Hosting does not renew unless you choose to pay.', // 7.2
]

export const EXCLUSION_FACTS = [
  'A new concept or full redesign is not a revision; we quote it first.', // 6.3
  'More rounds than included are quoted before we do them.', // 6.4
  'Other changes are quoted before we do them.', // 8.2
  'Some music and footage is licensed to us; you may not take it out of the card and use it separately.', // 10.2
  'We do not promise that your card will win you work or customers.', // 11.1
]

export type FaqFact = { question: string; answer: string[] }

// Questions are headings, not claims; the answers are the quoted sentences.
export const FAQ_FACTS: FaqFact[] = [
  {
    question: 'How long does it take?',
    answer: [
      'We aim to send your private preview within 5 business days after we have everything in section 4.', // 5.1
      'These are targets, not promises. If we will be late, we will email you.', // 5.3
    ],
  },
  {
    question: 'What happens when the 12 months of hosting ends?',
    answer: [
      'If you do not renew, the card goes offline when hosting ends. You can ask for a copy of your finished film before then.', // 7.3
    ],
  },
  {
    question: 'How many rounds of changes do I get?',
    answer: [
      'Ready-made includes 3 rounds. Made for you includes up to 10 rounds.', // 6.2
      'A round covers corrections and small changes.', // 6.3
    ],
  },
  {
    question: 'Can I get a refund?',
    answer: [
      'Cancel by email before we send your first preview and we refund you in full.', // 9.1
      'After we send your first preview, we do not give refunds for change of mind.', // 9.2
      'If something is wrong with the card, email contact@unite-group.in and we will fix it.', // 9.3
      'Our services come with guarantees that cannot be excluded under the Australian Consumer Law.', // 12.1
    ],
  },
  {
    question: 'Can I change something after my card is live?',
    answer: [
      'One small change (for example a new email address or logo file) within 30 days of going live is included.', // 8.1
      'Other changes are quoted before we do them.', // 8.2
    ],
  },
]

/** Every quoted string the provenance test checks (price lines are built from CARD_TIERS, so excluded). */
export const provenanceStrings = () => [
  PRICE_NOTE,
  ...Object.values(TIER_LINES),
  ...HOSTING_FACTS,
  ...EXCLUSION_FACTS,
  ...FAQ_FACTS.flatMap((f) => f.answer),
]

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remainder of your billing cycle. When downgrading, the change takes effect at the start of your next billing period.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes! Professional plans come with a 14-day free trial — no credit card required. You get full access to all Professional features during the trial period. Starter plans can be started immediately with monthly billing.",
  },
  {
    question: "How does annual billing work?",
    answer:
      "With annual billing, you pay for 10 months and get 2 months free. That's a ~17% discount compared to monthly billing. Annual plans are billed upfront for the full year.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express), as well as bank transfers for annual Enterprise plans. All payments are processed securely through Stripe.",
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Yes. There are no long-term contracts or cancellation fees. Monthly plans can be cancelled at any time, and you'll retain access until the end of your current billing period. Annual plans can be cancelled with a prorated refund within the first 30 days.",
  },
  {
    question: "Do you offer discounts for nonprofits or education?",
    answer:
      "Yes, we offer special pricing for registered nonprofits and educational institutions. Contact our sales team to learn more about our discount programs.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "After cancellation, you have 30 days to export your data. After that period, your data is permanently deleted from our servers in accordance with our data retention policy. Enterprise plans include custom data retention terms.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security is our top priority. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We're SOC 2 Type II compliant, perform regular penetration testing, and offer additional security features like SSO and audit logs on Enterprise plans.",
  },
  {
    question: "Do you offer onboarding support?",
    answer:
      "Professional plans include onboarding assistance via email and chat. Enterprise plans come with a dedicated account manager and custom onboarding program including data migration, team training, and integration setup.",
  },
  {
    question: "Can I add more team members beyond my plan limit?",
    answer:
      "On Starter and Professional plans, you'll need to upgrade to add more team members beyond your plan limit. Enterprise plans offer unlimited users. Contact sales if you need a custom arrangement.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PricingFaq() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-400">
          Everything you need to know about our pricing and plans
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {FAQ_ITEMS.map((item, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="border-slate-700/50 px-4 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
          >
            <AccordionTrigger className="text-slate-200 hover:text-teal-400 hover:no-underline text-left">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

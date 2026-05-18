"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * Encode a JSON-LD payload for embedding inside a `<script type="application/ld+json">`
 * tag. Standard JSON.stringify is unsafe because a string value containing
 * `</script>` would close the surrounding tag and let arbitrary markup
 * through. Escaping `<` → `<` keeps the JSON parser happy and prevents
 * tag breakout. Exported for regression testing — see SchemaMarkup test.
 */
export function encodeJsonLd(payload: unknown): string {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export interface SchemaMarkupProps {
  title?: string;
  description?: string;
  type?: "WebPage" | "Organization" | "Service" | "LocalBusiness" | "FAQPage" | "Article" | "BreadcrumbList" | "Person";
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  services?: Array<{
    name: string;
    description: string;
    price?: string;
    url: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  contactPoint?: {
    telephone: string;
    email: string;
    contactType: string;
  };
}

/**
 * SchemaMarkup component for structured data implementation
 */
export default function SchemaMarkup({
  title = "Unite Group — Empire Command Centre",
  description = "Private CEO command centre for the Unite Group portfolio of businesses.",
  type = "WebPage",
  datePublished,
  dateModified,
  author,
  services,
  faqs,
  address = {
    streetAddress: "",
    addressLocality: "Sydney",
    addressRegion: "NSW",
    postalCode: "2000",
    addressCountry: "Australia",
  },
  contactPoint = {
    telephone: "",
    email: "contact@unite-group.in",
    contactType: "Internal",
  },
}: SchemaMarkupProps) {
  const pathname = usePathname();
  const url = `https://unite-group.in${pathname}`;
  const currentDate = new Date().toISOString();

  // Base schema for the organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://unite-group.in/#organization",
    name: "Unite Group",
    url: "https://unite-group.in",
    description: "Private CEO command centre for the Unite Group portfolio.",
    contactPoint,
  };

  // Schema for WebPage
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: {
      "@id": "https://unite-group.in/#website",
    },
    inLanguage: "en-AU",
    datePublished: datePublished || currentDate,
    dateModified: dateModified || currentDate,
  };

  // Schema for FAQs
  const faqSchema = faqs
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${url}#faqpage`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
    : null;

  // Schema for Article
  const articleSchema =
    type === "Article"
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": `${url}#article`,
          headline: title,
          description,
          author: {
            "@type": "Person",
            name: author || "Unite Group",
          },
          publisher: {
            "@id": "https://unite-group.in/#organization",
          },
          datePublished: datePublished || currentDate,
          dateModified: dateModified || currentDate,
          mainEntityOfPage: {
            "@id": `${url}#webpage`,
          },
        }
      : null;

  const schemas = [organizationSchema, webPageSchema];

  if (faqs && faqs.length > 0) {
    schemas.push(faqSchema as unknown as typeof organizationSchema);
  }

  if (type === "Article" && articleSchema) {
    schemas.push(articleSchema as unknown as typeof organizationSchema);
  }

  return (
    <Script
      id="schema-markup"
      type="application/ld+json"
      // Per UNI-1958: this is the canonical Next.js pattern for JSON-LD.
      // encodeJsonLd JSON.stringifies the payload and escapes `<` to prevent
      // `</script>` inside a string value from breaking out of the
      // surrounding script tag.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: encodeJsonLd(schemas) }}
      strategy="afterInteractive"
    />
  );
}

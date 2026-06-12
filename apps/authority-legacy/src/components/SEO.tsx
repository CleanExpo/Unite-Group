"use client";

import SchemaMarkup, { SchemaMarkupProps } from "./SchemaMarkup";

type SEOProps = {
  title?: string;
  description?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
  type?: SchemaMarkupProps["type"];
  datePublished?: string;
  dateModified?: string;
  author?: string;
  services?: SchemaMarkupProps["services"];
  faqs?: SchemaMarkupProps["faqs"];
  address?: SchemaMarkupProps["address"];
  contactPoint?: SchemaMarkupProps["contactPoint"];
};

/**
 * SEO component — structured data only (meta tags handled by Next.js Metadata API)
 */
export default function SEO({
  title = "Unite Group — Empire Command Centre",
  description = "Private CEO command centre for the Unite Group portfolio of businesses.",
  type = "WebPage",
  datePublished,
  dateModified,
  author,
  services,
  faqs,
  address,
  contactPoint,
}: SEOProps) {
  return (
    <SchemaMarkup
      title={title}
      description={description}
      type={type}
      datePublished={datePublished}
      dateModified={dateModified}
      author={author}
      services={services}
      faqs={faqs}
      address={address}
      contactPoint={contactPoint}
    />
  );
}

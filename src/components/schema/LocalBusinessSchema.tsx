/**
 * SYN-512: LocalBusiness JSON-LD Schema Component
 * Injects structured data for Google's E.E.A.T. assessment.
 * Must pass Google's Rich Results Test before marking SYN-512 done.
 */
import type { ClientRecord } from '@/lib/clients/getClientBySlug';

interface Props {
  client: ClientRecord;
}

export function LocalBusinessSchema({ client }: Props) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: client.business_name,
  };

  if (client.description) schema.description = client.description;
  if (client.website_url) schema.url = client.website_url;
  if (client.phone) schema.telephone = client.phone;
  if (client.logo_url) {
    schema.logo = { '@type': 'ImageObject', url: client.logo_url };
  }

  // Address
  const hasAddress = client.address_street || client.address_suburb || client.address_state;
  if (hasAddress) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(client.address_street ? { streetAddress: client.address_street } : {}),
      ...(client.address_suburb ? { addressLocality: client.address_suburb } : {}),
      ...(client.address_state ? { addressRegion: client.address_state } : {}),
      ...(client.address_postcode ? { postalCode: client.address_postcode } : {}),
      addressCountry: client.address_country ?? 'AU',
    };
  }

  // Geo coordinates
  if (client.geo_lat != null && client.geo_lng != null) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: client.geo_lat,
      longitude: client.geo_lng,
    };
  }

  // Opening hours
  if (client.opening_hours_json && client.opening_hours_json.length > 0) {
    schema.openingHours = client.opening_hours_json;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

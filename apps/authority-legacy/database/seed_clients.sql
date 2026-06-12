-- SYN-512: Seed first real client record for Authority Hub
-- Replace placeholder values with real client data before running in production.

insert into clients (
  slug,
  business_name,
  business_type,
  tagline,
  description,
  telephone,
  email,
  website_url,
  address_street,
  address_suburb,
  address_state,
  address_postcode,
  address_country,
  latitude,
  longitude,
  opening_hours,
  featured_programme_status,
  is_active
) values (
  'unite-group',
  'UNITE Group',
  'LocalBusiness',
  'Content strategy and social media growth for local businesses',
  'UNITE Group helps Australian small businesses grow their online presence through data-driven content strategy, social media management, and AI-powered analytics.',
  '+61 7 0000 0000',
  'hello@unitegroup.com.au',
  'https://unitegroup.com.au',
  '123 Example Street',
  'Brisbane City',
  'QLD',
  '4000',
  'AU',
  -27.4698,
  153.0251,
  '["Mo-Fr 09:00-17:00"]',
  'not_applied',
  true
)
on conflict (slug) do update set
  business_name = excluded.business_name,
  is_active = excluded.is_active;

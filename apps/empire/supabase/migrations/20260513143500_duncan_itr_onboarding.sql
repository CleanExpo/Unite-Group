-- Duncan Perkins / ITR Platform onboarding
-- Created: 2026-05-13
--
-- Inserts the initial nexus_clients row for Duncan Perkins (Home Loan Essentials)
-- for the "Dimitri ITR Platform" engagement.
--
-- NOTE: slug 'dimitri-itr' is a placeholder. Duncan will choose the final button
-- name (Otto / Sorted / Beau / Tick / Lodgey). When chosen, rename the slug here
-- AND the portal route at src/app/clients/{slug}/page.tsx.
--
-- pi_ceo_key: NULL — provision after Duncan signs.
-- stripe_*:   NULL — provision when Stripe subscription is created.

INSERT INTO public.nexus_clients (
  slug,
  company_name,
  contact_name,
  contact_email,
  website_url,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  plan,
  pi_ceo_key,
  brand_config,
  created_at
) VALUES (
  'dimitri-itr',
  'Duncan Perkins Home Loan Essentials — ITR Platform',
  'Duncan Perkins',
  'Duncan@homeloanessentials.com.au',
  'https://homeloanessentials.com.au',
  'onboarding',
  NULL,
  NULL,
  NULL,
  NULL,
  '{"working_name": "Otto", "candidates": ["Otto", "Sorted", "Beau", "Tick", "Lodgey"]}'::jsonb,
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

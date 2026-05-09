-- Nexus Wave 1: Seed the 6 Unite-Group portfolio businesses
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- Board Mandate: Nexus Wave 1

INSERT INTO public.businesses (slug, name, pi_ceo_key, status, arr_aud) VALUES
  ('synthex',           'Synthex',       'synthex',           'operational', 0),
  ('restoreassist',     'RestoreAssist', 'restoreassist',     'building',    0),
  ('dr-nrpg',           'NRPG',          'dr-nrpg',           'building',    0),
  ('carsi',             'CARSI',         'carsi',             'operational', 0),
  ('ccw-crm',           'CCW-CRM',       'ccw-crm',           'operational', 33000),
  ('disaster-recovery', 'DR Platform',   'disaster-recovery', 'operational', 0)
ON CONFLICT (slug) DO NOTHING;

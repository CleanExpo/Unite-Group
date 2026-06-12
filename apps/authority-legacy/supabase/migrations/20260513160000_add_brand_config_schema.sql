-- ============================================================================
-- UNI-1991: Typed brand_config schema for nexus_clients
-- ============================================================================
-- Upgrades nexus_clients.brand_config from untyped JSONB to a typed shape.
-- Does NOT drop or rename the column — only adds a CHECK constraint that
-- validates the new typed keys WHEN PRESENT. Legacy keys (working_name,
-- candidates, or any other unknown key) are allowed to coexist so existing
-- rows (e.g. Duncan Perkins / dimitri-itr) remain valid.
--
-- Typed schema (every key optional, validated only if present):
--   logo_url       TEXT  — URL string, nullable
--   primary_color  TEXT  — hex '#RRGGBB' (regex-validated)
--   accent_color   TEXT  — hex '#RRGGBB' (regex-validated)
--   font_family    TEXT  — enum 'Inter' | 'Syne' | 'JetBrains'
--   voice_tone     TEXT  — enum 'formal' | 'casual' | 'technical'
--   tagline        TEXT  — max 200 chars, nullable
--
-- Migration is idempotent — safe to run twice.
-- ============================================================================

-- Drop any prior version of the constraint so re-running this migration is safe.
ALTER TABLE public.nexus_clients
  DROP CONSTRAINT IF EXISTS nexus_clients_brand_config_typed_keys;

-- Add the typed-keys CHECK constraint.
-- Each clause: "the typed key is either absent, OR present and valid".
-- Legacy keys are not mentioned and therefore freely allowed.
ALTER TABLE public.nexus_clients
  ADD CONSTRAINT nexus_clients_brand_config_typed_keys
  CHECK (
    brand_config IS NULL
    OR (
      jsonb_typeof(brand_config) = 'object'

      -- logo_url: absent, null, or a text value
      AND (
        NOT (brand_config ? 'logo_url')
        OR jsonb_typeof(brand_config->'logo_url') IN ('string', 'null')
      )

      -- primary_color: absent, null, or '#RRGGBB' hex
      AND (
        NOT (brand_config ? 'primary_color')
        OR jsonb_typeof(brand_config->'primary_color') = 'null'
        OR (
          jsonb_typeof(brand_config->'primary_color') = 'string'
          AND (brand_config->>'primary_color') ~ '^#[0-9a-fA-F]{6}$'
        )
      )

      -- accent_color: absent, null, or '#RRGGBB' hex
      AND (
        NOT (brand_config ? 'accent_color')
        OR jsonb_typeof(brand_config->'accent_color') = 'null'
        OR (
          jsonb_typeof(brand_config->'accent_color') = 'string'
          AND (brand_config->>'accent_color') ~ '^#[0-9a-fA-F]{6}$'
        )
      )

      -- font_family: absent, or one of the allowed enum values
      AND (
        NOT (brand_config ? 'font_family')
        OR (brand_config->>'font_family') IN ('Inter', 'Syne', 'JetBrains')
      )

      -- voice_tone: absent, or one of the allowed enum values
      AND (
        NOT (brand_config ? 'voice_tone')
        OR (brand_config->>'voice_tone') IN ('formal', 'casual', 'technical')
      )

      -- tagline: absent, null, or a string ≤ 200 chars
      AND (
        NOT (brand_config ? 'tagline')
        OR jsonb_typeof(brand_config->'tagline') = 'null'
        OR (
          jsonb_typeof(brand_config->'tagline') = 'string'
          AND char_length(brand_config->>'tagline') <= 200
        )
      )
    )
  );

COMMENT ON CONSTRAINT nexus_clients_brand_config_typed_keys ON public.nexus_clients IS
  'UNI-1991: validates typed brand_config keys when present (logo_url, primary_color, accent_color, font_family, voice_tone, tagline). Legacy keys (working_name, candidates, etc.) are permitted.';

-- ============================================================================
-- UNI-1947 Pillar 2 — Typed portal_content schema for nexus_clients
-- ============================================================================
-- Adds a JSONB `portal_content` column to nexus_clients with an idempotent
-- CHECK constraint that validates the top-level typed shape. Per-element
-- validation (deliverable status enum, touchpoint domain length, etc.) is
-- handled by Zod in app code (src/types/portal-content.ts) — the constraint
-- here only guards type-of and gross-shape mistakes so a bad UPSERT can't
-- silently corrupt the column.
--
-- Typed schema (every key optional, validated only when present):
--   welcome_text  TEXT       — string, max 2000 chars
--   deliverables  JSONB[]    — array of objects (per-element via Zod)
--   touchpoints   JSONB[]    — array of objects (per-element via Zod)
--   quick_links   JSONB[]    — array of objects (per-element via Zod)
--
-- Migration is idempotent — safe to run twice.
-- ============================================================================

-- Add the JSONB column with a safe empty-object default.
ALTER TABLE public.nexus_clients
  ADD COLUMN IF NOT EXISTS portal_content JSONB DEFAULT '{}'::jsonb;

-- Drop any prior version of the constraint so re-running is safe.
ALTER TABLE public.nexus_clients
  DROP CONSTRAINT IF EXISTS nexus_clients_portal_content_typed_keys;

-- Add the typed-keys CHECK constraint. Each clause: "the typed key is either
-- absent, OR present and the right top-level shape".
ALTER TABLE public.nexus_clients
  ADD CONSTRAINT nexus_clients_portal_content_typed_keys
  CHECK (
    portal_content IS NULL
    OR (
      jsonb_typeof(portal_content) = 'object'

      -- welcome_text: absent, null, or string ≤ 2000 chars
      AND (
        NOT (portal_content ? 'welcome_text')
        OR jsonb_typeof(portal_content->'welcome_text') = 'null'
        OR (
          jsonb_typeof(portal_content->'welcome_text') = 'string'
          AND char_length(portal_content->>'welcome_text') <= 2000
        )
      )

      -- deliverables: absent or array
      AND (
        NOT (portal_content ? 'deliverables')
        OR jsonb_typeof(portal_content->'deliverables') = 'array'
      )

      -- touchpoints: absent or array
      AND (
        NOT (portal_content ? 'touchpoints')
        OR jsonb_typeof(portal_content->'touchpoints') = 'array'
      )

      -- quick_links: absent or array
      AND (
        NOT (portal_content ? 'quick_links')
        OR jsonb_typeof(portal_content->'quick_links') = 'array'
      )
    )
  );

COMMENT ON CONSTRAINT nexus_clients_portal_content_typed_keys ON public.nexus_clients IS
  'UNI-1947 Pillar 2 — validates typed portal_content top-level shape (welcome_text scalar; deliverables/touchpoints/quick_links arrays). Per-element validation enforced by Zod in app code.';

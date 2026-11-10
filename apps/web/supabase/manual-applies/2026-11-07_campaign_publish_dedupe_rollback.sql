-- Rollback for migrations/20261107120000_campaign_publish_dedupe.sql (UNI-2326).
--
-- Order matters: set CAMPAIGN_PUBLISH_DEDUPE_ENABLED off (unset) in Vercel and
-- redeploy BEFORE running this, because the guarded publish path writes both
-- columns below. With the switch off, nothing reads or writes them.
--
-- Effect: removes the unique key and the two columns. Every social_posts row is
-- kept; only the link from a draft to its campaign and platform is dropped.
-- Proven by scripts/campaign-publish-dedupe-db-proof.mjs (rollback, then the
-- forward migration applies again).

ALTER TABLE public.social_posts
  DROP CONSTRAINT IF EXISTS social_posts_campaign_platform_key;

ALTER TABLE public.social_posts
  DROP COLUMN IF EXISTS campaign_platform,
  DROP COLUMN IF EXISTS campaign_id;

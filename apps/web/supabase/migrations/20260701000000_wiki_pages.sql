-- wiki_pages: the shared 2nd-Brain knowledge base surfaced in the founder
-- command-centre Wiki section. Global (not founder-scoped) content synced from
-- the vault by a service-role writer. The four /api/wiki/* routes read it with
-- the user-scoped client, so RLS must permit authenticated reads.
--
-- Fixes UNI-2218's sibling UNI-2217: the routes queried this table but no
-- migration created it, so every request 500'd and the whole Wiki section was
-- dead. `id` is a human slug (routes do .eq('id','exit-thesis') and
-- .eq('id','operational-priorities-q2-2026')), not a uuid.

CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  word_count  integer NOT NULL DEFAULT 0,
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- List/search route orders and filters by title.
CREATE INDEX IF NOT EXISTS wiki_pages_title_idx ON public.wiki_pages (title);

ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

-- Shared reference content: any authenticated user may read. Writes happen via
-- the service role (vault sync), which bypasses RLS, so no user write policy.
DROP POLICY IF EXISTS wiki_pages_read_authenticated ON public.wiki_pages;
CREATE POLICY wiki_pages_read_authenticated ON public.wiki_pages
  FOR SELECT TO authenticated USING (true);

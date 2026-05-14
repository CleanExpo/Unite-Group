-- Security P0 fix — token-hash storage for client_approvals
--
-- Per deepsec-2026-05-14 P0-3: token lookup by raw value leaks timing on
-- B-tree index miss vs prefix match. The fix is to store sha256(token) and
-- look up by hash — hash distribution is uniform so the timing oracle dies.
--
-- Strategy: ADDITIVE migration only — add token_hash column, backfill from
-- existing rows, add UNIQUE index. The raw `token` column stays for now so
-- in-flight magic links continue to resolve via the fallback read path in
-- src/app/api/approvals/[token]/route.ts. A future migration drops the raw
-- column once all unhashed rows have expired (max 60 days from today).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.client_approvals
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

UPDATE public.client_approvals
  SET token_hash = encode(digest(token, 'sha256'), 'hex')
  WHERE token_hash IS NULL AND token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS client_approvals_token_hash_unique
  ON public.client_approvals(token_hash);

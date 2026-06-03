-- Bookkeeper email receipt ledger
-- Stores receipt/invoice evidence discovered from connected mailboxes.

CREATE TABLE IF NOT EXISTS public.bookkeeper_email_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_key TEXT NOT NULL,
  account_email TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'imap')),
  source_message_id TEXT NOT NULL,
  source_thread_id TEXT,
  source_attachment_id TEXT,
  filename TEXT,
  mime_type TEXT,
  sender TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ,
  vendor TEXT,
  invoice_number TEXT,
  receipt_date DATE,
  total_amount_cents BIGINT,
  currency TEXT NOT NULL DEFAULT 'AUD',
  gst_amount_cents BIGINT,
  extraction_status TEXT NOT NULL DEFAULT 'candidate' CHECK (
    extraction_status IN ('candidate', 'extracted', 'needs_review', 'ignored')
  ),
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (
    match_status IN ('unmatched', 'candidate_match', 'matched', 'rejected')
  ),
  matched_transaction_id UUID REFERENCES public.bookkeeper_transactions(id) ON DELETE SET NULL,
  match_confidence NUMERIC(3,2),
  raw_email_metadata JSONB NOT NULL DEFAULT '{}',
  extracted_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookkeeper_email_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookkeeper_email_receipts_select" ON public.bookkeeper_email_receipts;
CREATE POLICY "bookkeeper_email_receipts_select"
  ON public.bookkeeper_email_receipts FOR SELECT
  USING (founder_id = auth.uid());

DROP POLICY IF EXISTS "bookkeeper_email_receipts_update" ON public.bookkeeper_email_receipts;
CREATE POLICY "bookkeeper_email_receipts_update"
  ON public.bookkeeper_email_receipts FOR UPDATE
  USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

DROP POLICY IF EXISTS "bookkeeper_email_receipts_service_role" ON public.bookkeeper_email_receipts;
CREATE POLICY "bookkeeper_email_receipts_service_role"
  ON public.bookkeeper_email_receipts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookkeeper_email_receipts_source
  ON public.bookkeeper_email_receipts(
    founder_id,
    account_email,
    source_message_id,
    COALESCE(source_attachment_id, 'message')
  );

CREATE INDEX IF NOT EXISTS idx_bookkeeper_email_receipts_founder_business
  ON public.bookkeeper_email_receipts(founder_id, business_key);

CREATE INDEX IF NOT EXISTS idx_bookkeeper_email_receipts_received
  ON public.bookkeeper_email_receipts(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookkeeper_email_receipts_match_status
  ON public.bookkeeper_email_receipts(match_status);

DROP TRIGGER IF EXISTS update_bookkeeper_email_receipts_updated_at ON public.bookkeeper_email_receipts;
CREATE TRIGGER update_bookkeeper_email_receipts_updated_at
  BEFORE UPDATE ON public.bookkeeper_email_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

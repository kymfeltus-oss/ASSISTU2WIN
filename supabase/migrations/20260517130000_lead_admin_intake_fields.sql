-- Admin intake expansion: queryable buyer/co-buyer, location, financing, and follow-up fields.
-- Communication automation toggles (non-reporting) live in communication_preferences jsonb.
-- Idempotent; does not alter RLS policies.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS market_readiness_score integer,
  ADD COLUMN IF NOT EXISTS loan_type text,
  ADD COLUMN IF NOT EXISTS co_buyer_name text,
  ADD COLUMN IF NOT EXISTS co_buyer_email text,
  ADD COLUMN IF NOT EXISTS co_buyer_phone text,
  ADD COLUMN IF NOT EXISTS co_buyer_relationship text,
  ADD COLUMN IF NOT EXISTS lead_source_other text,
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS current_housing_status text,
  ADD COLUMN IF NOT EXISTS dti_ratio numeric(6, 3),
  ADD COLUMN IF NOT EXISTS credit_score_range text,
  ADD COLUMN IF NOT EXISTS down_payment_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS monthly_payment_comfort numeric(14, 2),
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS lender_name text,
  ADD COLUMN IF NOT EXISTS welcome_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_frequency text,
  ADD COLUMN IF NOT EXISTS first_follow_up_date date,
  ADD COLUMN IF NOT EXISTS preferred_communication_channel text,
  ADD COLUMN IF NOT EXISTS preferred_contact_window text,
  ADD COLUMN IF NOT EXISTS custom_communication_notes text,
  ADD COLUMN IF NOT EXISTS communication_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.leads.co_buyer_name IS 'Co-buyer / Client Name on the file.';
COMMENT ON COLUMN public.leads.lead_source_other IS 'Free-text source when lead_source is Other.';
COMMENT ON COLUMN public.leads.street_address IS 'Current residence street (admin intake).';
COMMENT ON COLUMN public.leads.city IS 'Current residence city (admin intake).';
COMMENT ON COLUMN public.leads.state IS 'Current residence state (admin intake).';
COMMENT ON COLUMN public.leads.lender_name IS 'Mortgage lender or LO name (distinct from mortgage_lender_email).';
COMMENT ON COLUMN public.leads.communication_preferences IS 'Automation toggles: consultation invite, pre-approval reminder, market updates, etc.';

CREATE INDEX IF NOT EXISTS leads_target_zip_code_idx ON public.leads (target_zip_code)
  WHERE target_zip_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_city_state_idx ON public.leads (city, state)
  WHERE city IS NOT NULL AND state IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_first_follow_up_date_idx ON public.leads (first_follow_up_date)
  WHERE first_follow_up_date IS NOT NULL;

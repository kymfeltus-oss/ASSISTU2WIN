-- Representation agreement pending flag (Communication Plan toggle)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS rep_agreement_pending boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leads.rep_agreement_pending IS 'True when buyer representation agreement is still pending.';

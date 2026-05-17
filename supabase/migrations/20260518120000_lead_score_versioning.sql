-- =============================================================================
-- Lead score versioning + explanation auditability (Pass E)
-- Idempotent, non-destructive.
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score_version text,
  ADD COLUMN IF NOT EXISTS score_explanation jsonb,
  ADD COLUMN IF NOT EXISTS score_last_calculated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_score_version
  ON public.leads (score_version);

COMMENT ON COLUMN public.leads.score_version IS
  'Semantic version of the deterministic buyer index scoring model (e.g. v1.0).';

COMMENT ON COLUMN public.leads.score_explanation IS
  'JSON audit trail: version, weighted factors, computedAt.';

COMMENT ON COLUMN public.leads.score_last_calculated_at IS
  'UTC timestamp of the last explicit score recalculation.';
